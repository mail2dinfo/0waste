import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
// Remove /api from URL for WebSocket since it's mounted on the server root
const WS_BASE_URL = API_BASE_URL.replace(/\/api$/, "").replace(/^https/, "wss").replace(/^http/, "ws");
const WS_URL = `${WS_BASE_URL}/chat`;

interface ChatMessage {
  id: string;
  sender: "user" | "admin";
  message: string;
  timestamp: Date;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
}

interface ActiveChat {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

function AdminChat() {
  const { userId: userIdFromUrl } = useParams<{ userId?: string }>();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(userIdFromUrl || null);
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update selectedUserId when URL param changes
  useEffect(() => {
    if (userIdFromUrl) {
      setSelectedUserId(userIdFromUrl);
    }
  }, [userIdFromUrl]);

  useEffect(() => {
    const storedUserId = window.localStorage.getItem("nowasteUserId");
    setCurrentUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (currentUserId) {
      const wsUrl = `${WS_URL}?userId=${currentUserId}`;
      console.log("Admin connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "load_history" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Admin received WebSocket message:", data);
          
          if (data.type === "message") {
            const newMessage: ChatMessage = {
              id: data.id || Date.now().toString(),
              sender: data.sender,
              message: data.message,
              timestamp: new Date(data.timestamp || Date.now()),
              userId: data.userId || selectedUserId || "",
              userName: data.userName || null,
              userEmail: data.userEmail || null,
            };
            
            // Always add message to messages list (will be filtered by selectedUserId in display)
            setMessages((prev) => {
              // Check if message already exists
              const exists = prev.some((msg) => msg.id === data.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
            
            // Update active chats when user sends a message
            if (data.sender === "user" && data.userId) {
              setActiveChats((prev) => {
                const existing = prev.find((chat) => chat.userId === data.userId);
                if (existing) {
                  return prev.map((chat) =>
                    chat.userId === data.userId
                      ? {
                          ...chat,
                          lastMessage: data.message,
                          lastMessageTime: new Date(data.timestamp),
                          unreadCount: chat.userId === selectedUserId ? 0 : chat.unreadCount + 1,
                        }
                      : chat
                  );
                }
                // Add new chat
                return [
                  ...prev,
                  {
                    userId: data.userId,
                    userName: data.userName || `User ${data.userId.substring(0, 8)}`,
                    lastMessage: data.message,
                    lastMessageTime: new Date(data.timestamp),
                    unreadCount: data.userId === selectedUserId ? 0 : 1,
                  },
                ];
              });
            }
          } else if (data.type === "history") {
            console.log("Loading chat history:", data.messages.length, "messages");
            const historyMessages = data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
              userId: msg.userId || "",
              userName: msg.userName || null,
              userEmail: msg.userEmail || null,
            }));
            setMessages(historyMessages);
            
            // Build active chats from history
            const userChats = new Map<string, ActiveChat>();
            historyMessages.forEach((msg: ChatMessage) => {
              if (msg.sender === "user" && msg.userId) {
                if (!userChats.has(msg.userId)) {
                  userChats.set(msg.userId, {
                    userId: msg.userId,
                    userName: msg.userName || `User ${msg.userId.substring(0, 8)}`,
                    lastMessage: msg.message,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0,
                  });
                } else {
                  const chat = userChats.get(msg.userId)!;
                  if (msg.timestamp > chat.lastMessageTime) {
                    chat.lastMessage = msg.message;
                    chat.lastMessageTime = msg.timestamp;
                  }
                  // Update user name if available
                  if (msg.userName && !chat.userName.startsWith("User ")) {
                    chat.userName = msg.userName;
                  }
                }
              }
            });
            setActiveChats(Array.from(userChats.values()));
          } else if (data.type === "connected") {
            console.log("Admin WebSocket connected, isAdmin:", data.isAdmin);
          }
        } catch (error) {
          console.error("Error parsing message:", error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      return () => {
        ws.close();
      };
    }
  }, [currentUserId, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const messageText = inputMessage.trim();
    
    // Validate all required conditions
    if (!messageText) {
      console.log("Cannot send: no message text");
      return;
    }
    
    if (!wsRef.current) {
      console.log("Cannot send: no WebSocket connection");
      return;
    }
    
    if (!isConnected) {
      console.log("Cannot send: WebSocket not connected");
      return;
    }
    
    // CRITICAL: Check selectedUserId with strict validation
    if (!selectedUserId || selectedUserId.trim() === "") {
      console.error("ERROR: No selectedUserId! Cannot send message without a target user.");
      console.error("selectedUserId value:", selectedUserId);
      alert("Please select a user to chat with first.");
      return;
    }
    
    const payload = {
      type: "message",
      message: messageText,
      sender: "admin",
      targetUserId: selectedUserId,
    };
    
    console.log("Sending admin message:", payload);
    console.log("Payload JSON:", JSON.stringify(payload));
    
    try {
      wsRef.current.send(JSON.stringify(payload));
      setInputMessage("");
      console.log("✓ Message sent successfully");
    } catch (error) {
      console.error("✗ Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">Admin Chat Support</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage customer support conversations
          </p>
        </header>

        <div className="grid h-[600px] gap-4 lg:grid-cols-[300px_1fr]">
          {/* Active Chats Sidebar */}
          <div className="rounded-2xl border border-orange-100 bg-white p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-600">
              Active Chats
            </h2>
            <div className="space-y-2">
              {activeChats.length === 0 ? (
                <p className="text-xs text-slate-500">No active chats</p>
              ) : (
                activeChats.map((chat) => (
                  <button
                    key={chat.userId}
                    onClick={() => {
                      setSelectedUserId(chat.userId);
                      window.history.pushState({}, "", `/admin/chat/${chat.userId}`);
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedUserId === chat.userId
                        ? "border-brand-500 bg-brand-50"
                        : "border-orange-100 hover:bg-orange-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900">{chat.userName}</p>
                      {chat.unreadCount > 0 && (
                        <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-600">
                      {chat.lastMessage}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {chat.lastMessageTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex flex-col rounded-2xl border border-orange-100 bg-white">
            {selectedUserId ? (
              <>
                <div className="flex items-center justify-between border-b border-orange-100 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}></div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {(() => {
                        const chat = activeChats.find((c) => c.userId === selectedUserId);
                        return chat ? `Chat with ${chat.userName}` : `Chat with User ${selectedUserId.substring(0, 8)}`;
                      })()}
                    </h3>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {messages.filter((msg) => msg.userId === selectedUserId).length === 0 ? (
                    <div className="text-center text-xs text-slate-500 mt-8">
                      {isConnected ? "No messages yet. Start the conversation!" : "Connecting..."}
                    </div>
                  ) : (
                    messages
                      .filter((msg) => msg.userId === selectedUserId)
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                              msg.sender === "admin"
                                ? "bg-brand-500 text-white"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            <p>{msg.message}</p>
                            <p
                              className={`mt-1 text-xs ${
                                msg.sender === "admin" ? "text-brand-100" : "text-slate-500"
                              }`}
                            >
                              {msg.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-orange-100 p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={!isConnected}
                      className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!isConnected || !inputMessage.trim()}
                      className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6">
                <div className={`mb-4 h-3 w-3 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}></div>
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  {isConnected ? "Select a chat from the sidebar" : "Connecting to chat server..."}
                </p>
                <p className="text-xs text-slate-500 text-center">
                  {activeChats.length > 0 
                    ? `${activeChats.length} active conversation${activeChats.length === 1 ? '' : 's'} available`
                    : "No active conversations yet. User messages will appear here."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminChat;

