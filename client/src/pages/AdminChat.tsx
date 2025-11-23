import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getWebSocketUrl() {
  const apiUrl = API_BASE_URL.replace(/\/api$/, "");
  if (apiUrl.startsWith("https://")) {
    return `wss://${apiUrl.replace(/^https:\/\//, "")}/chat`;
  } else if (apiUrl.startsWith("http://")) {
    return `ws://${apiUrl.replace(/^http:\/\//, "")}/chat`;
  }
  if (apiUrl.includes("onrender.com") || apiUrl.includes("zerovaste.com")) {
    return `wss://${apiUrl}/chat`;
  }
  return `ws://${apiUrl}/chat`;
}
const WS_URL = getWebSocketUrl();

interface ChatMessage {
  id: string;
  roomId: string;
  sender: "user" | "admin";
  message: string;
  timestamp: Date;
  userName?: string | null;
}

interface ChatRoom {
  roomId: string;
  userId: string;
  userName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

function AdminChat() {
  const { roomId: roomIdFromUrl } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(roomIdFromUrl || null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get admin userId from localStorage
  useEffect(() => {
    const storedUserId = window.localStorage.getItem("nowasteUserId");
    setCurrentUserId(storedUserId);
  }, []);

  // Update selectedRoomId when URL param changes
  useEffect(() => {
    if (roomIdFromUrl) {
      setSelectedRoomId(roomIdFromUrl);
    }
  }, [roomIdFromUrl]);

  // WebSocket connection
  useEffect(() => {
    if (!currentUserId) return;

    const wsUrl = `${WS_URL}?userId=${currentUserId}`;
    console.log("[AdminChat] Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[AdminChat] WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[AdminChat] Received:", data.type);

        if (data.type === "connected") {
          console.log("[AdminChat] Connection confirmed, isAdmin:", data.isAdmin);
        } else if (data.type === "rooms") {
          // Initial room list
          setRooms(data.rooms || []);
        } else if (data.type === "room_update") {
          // Room updated (new message)
          setRooms((prev) => {
            const existing = prev.find((r) => r.roomId === data.room.roomId);
            if (existing) {
              return prev.map((r) =>
                r.roomId === data.room.roomId ? { ...data.room } : r
              );
            } else {
              return [...prev, data.room].sort((a, b) => {
                const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                return timeB - timeA;
              });
            }
          });
        } else if (data.type === "message") {
          // New message
          const newMessage: ChatMessage = {
            id: data.id,
            roomId: data.roomId,
            sender: data.sender,
            message: data.message,
            timestamp: new Date(data.timestamp),
            userName: data.userName || null,
          };

          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === data.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        } else if (data.type === "history") {
          // Chat history
          const historyMessages: ChatMessage[] = (data.messages || []).map((msg: any) => ({
            id: msg.id,
            roomId: msg.roomId,
            sender: msg.sender,
            message: msg.message,
            timestamp: new Date(msg.timestamp),
            userName: msg.userName || null,
          }));

          setMessages(historyMessages);
        }
      } catch (error) {
        console.error("[AdminChat] Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[AdminChat] WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("[AdminChat] WebSocket closed");
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedRoomId]);

  // Send message
  const sendMessage = () => {
    if (!selectedRoomId || !inputMessage.trim()) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const messageText = inputMessage.trim();
    wsRef.current.send(JSON.stringify({
      type: "message",
      roomId: selectedRoomId,
      message: messageText,
    }));

    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filter messages for selected room
  const filteredMessages = selectedRoomId
    ? messages.filter((msg) => msg.roomId === selectedRoomId)
    : [];

  // Handle room selection
  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    navigate(`/admin/chat/${roomId}`);
    
    // Reset unread count for this room
    setRooms((prev) =>
      prev.map((room) =>
        room.roomId === roomId ? { ...room, unreadCount: 0 } : room
      )
    );
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">Admin Chat Support</h1>
          <p className="mt-2 text-sm text-slate-600">Manage customer support conversations</p>
        </header>

        <div className="grid h-[600px] gap-4 lg:grid-cols-[300px_1fr]">
          {/* Sidebar - Chat Rooms */}
          <div className="rounded-2xl border border-orange-100 bg-white p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-600">
              Chat Rooms
            </h2>
            <div className="space-y-2">
              {rooms.length === 0 ? (
                <p className="text-xs text-slate-500">No active chats</p>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.roomId}
                    onClick={() => handleRoomSelect(room.roomId)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedRoomId === room.roomId
                        ? "border-brand-500 bg-brand-50"
                        : "border-orange-100 hover:bg-orange-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900">{room.userName}</p>
                      {room.unreadCount > 0 && (
                        <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    {room.lastMessage && (
                      <>
                        <p className="mt-1 truncate text-[11px] text-slate-600">{room.lastMessage}</p>
                        {room.lastMessageTime && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {new Date(room.lastMessageTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex flex-col rounded-2xl border border-orange-100 bg-white">
            {selectedRoomId ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-orange-100 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}></div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {(() => {
                        const room = rooms.find((r) => r.roomId === selectedRoomId);
                        return room ? `Chat with ${room.userName}` : `Chat Room ${selectedRoomId.substring(0, 8)}`;
                      })()}
                    </h3>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {filteredMessages.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 mt-8">
                      {isConnected ? "No messages yet. Start the conversation!" : "Connecting..."}
                    </div>
                  ) : (
                    filteredMessages.map((msg) => (
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

                {/* Input */}
                <div className="border-t border-orange-100 p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={!isConnected}
                      className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                  {isConnected ? "Select a chat room from the sidebar" : "Connecting to chat server..."}
                </p>
                <p className="text-xs text-slate-500 text-center">
                  {rooms.length > 0
                    ? `${rooms.length} active conversation${rooms.length === 1 ? "" : "s"} available`
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

