import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
// Remove /api from URL for WebSocket since it's mounted on the server root
// Convert http/https to ws/wss for WebSocket protocol
// Handle the conversion more robustly
function getWebSocketUrl() {
  const apiUrl = API_BASE_URL.replace(/\/api$/, ""); // Remove trailing /api
  // Convert protocol: https -> wss, http -> ws
  if (apiUrl.startsWith("https://")) {
    return `wss://${apiUrl.replace(/^https:\/\//, "")}/chat`;
  } else if (apiUrl.startsWith("http://")) {
    return `ws://${apiUrl.replace(/^http:\/\//, "")}/chat`;
  }
  // If no protocol, assume it's just a domain/host
  // For production, default to wss
  if (apiUrl.includes("onrender.com") || apiUrl.includes("zerovaste.com")) {
    return `wss://${apiUrl}/chat`;
  }
  // For localhost, use ws
  return `ws://${apiUrl}/chat`;
}
const WS_URL = getWebSocketUrl();

interface ChatMessage {
  id: string;
  sender: "user" | "admin";
  message: string;
  timestamp: Date;
}

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  // Keep isOpenRef in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const storedUserId = window.localStorage.getItem("nowasteUserId");
    setUserId(storedUserId);
  }, []);

  useEffect(() => {
    // Always connect when userId is available, not just when chat is open
    // This ensures users receive admin messages even if chat widget is closed
    if (!userId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Only create new connection if we don't have one or it's closed
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      const wsUrl = `${WS_URL}?userId=${userId}`;
      console.log("Connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected for user:", userId);
        setIsConnected(true);
        // ALWAYS request chat history when connection opens
        // This ensures users receive admin messages even if chat widget is closed
        // Server also auto-loads history, but explicitly requesting ensures we get it
        console.log("Requesting chat history on connection...");
        ws.send(JSON.stringify({ type: "load_history" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("=== USER RECEIVED WEBSOCKET MESSAGE ===");
          console.log("Raw message:", event.data);
          console.log("Parsed data:", data);
          console.log("Message type:", data.type);
          console.log("Sender:", data.sender);
          
          if (data.type === "message") {
            console.log("✓ Processing message type");
            console.log("  - Sender:", data.sender);
            console.log("  - Message:", data.message);
            console.log("  - Message ID:", data.id);
            console.log("  - UserId:", data.userId);
            console.log("  - Timestamp:", data.timestamp);
            
            // Always add message to state, even if chat is closed
            // User will see it when they open the chat
            setMessages((prev) => {
              // Check if this is a confirmation of our own message (replace temp message)
              const tempMessageIndex = prev.findIndex(
                (msg) => msg.id.startsWith("temp-") && msg.message === data.message && data.sender === "user"
              );
              
              if (tempMessageIndex !== -1) {
                console.log("Replacing temp message with real one");
                // Replace temp message with real one from server
                const updated = [...prev];
                updated[tempMessageIndex] = {
                  id: data.id || prev[tempMessageIndex].id,
                  sender: data.sender,
                  message: data.message,
                  timestamp: new Date(data.timestamp || Date.now()),
                };
                return updated;
              }
              
              // Check if message already exists (to avoid duplicates)
              const exists = prev.some((msg) => msg.id === data.id);
              if (exists) {
                console.log("Message already exists, skipping duplicate");
                // Message already exists, don't add duplicate
                return prev;
              }
              
              // Add new message (from admin or new user message)
              console.log("Adding new message to state:");
              console.log("  - Sender:", data.sender);
              console.log("  - Message:", data.message);
              console.log("  - Is from admin?", data.sender === "admin");
              
              // Validate sender - must be "admin" or "user"
              const validSender = data.sender === "admin" || data.sender === "user" ? data.sender : "user";
              if (data.sender !== validSender) {
                console.warn("Invalid sender detected, defaulting to 'user':", data.sender);
              }
              
              const newMessage = {
                id: data.id || `msg-${Date.now()}-${Math.random()}`,
                sender: validSender,
                message: data.message,
                timestamp: new Date(data.timestamp || Date.now()),
              };
              console.log("New message object created:", newMessage);
              console.log("Current messages count:", prev.length);
              console.log("New messages count:", prev.length + 1);
              
              // Increment unread count if message is from admin and chat is closed
              if (validSender === "admin" && !isOpenRef.current) {
                console.log("✓ Admin message received while chat is closed - incrementing unread count");
                setUnreadCount((prev) => {
                  const newCount = prev + 1;
                  console.log(`Unread count: ${prev} -> ${newCount}`);
                  return newCount;
                });
              } else if (validSender === "admin") {
                console.log("✓ Admin message received while chat is open");
              }
              
              console.log("Adding message to state...");
              return [...prev, newMessage];
            });
          } else if (data.type === "history") {
            console.log("=== RECEIVED CHAT HISTORY ===");
            console.log("Total messages in history:", data.messages.length);
            console.log("Raw history data:", data.messages);
            
            const historyMessages = data.messages.map((msg: any) => {
              const validSender = msg.sender === "admin" || msg.sender === "user" ? msg.sender : "user";
              return {
                id: msg.id,
                sender: validSender,
                message: msg.message,
                timestamp: new Date(msg.timestamp),
              };
            });
            
            // Count admin vs user messages
            const adminMessages = historyMessages.filter((m: any) => m.sender === "admin");
            const userMessages = historyMessages.filter((m: any) => m.sender === "user");
            console.log(`History breakdown: ${adminMessages.length} admin messages, ${userMessages.length} user messages`);
            console.log("Processed history messages:", historyMessages);
            
            setMessages(historyMessages);
            
            // Update unread count based on admin messages if chat is closed
            if (!isOpenRef.current && adminMessages.length > 0) {
              console.log(`Setting unread count to ${adminMessages.length} (admin messages in history)`);
              setUnreadCount(adminMessages.length);
            }
            // Clear unread count when history is loaded (user opened chat)
            if (isOpenRef.current) {
              setUnreadCount(0);
            }
          } else if (data.type === "connected") {
            console.log("Connection confirmed, isAdmin:", data.isAdmin);
          } else if (data.type === "unread_count") {
            console.log("Unread message count:", data.count);
            setUnreadCount(data.count);
          } else if (data.type === "error") {
            console.error("WebSocket error from server:", data.message);
          }
        } catch (error) {
          console.error("Error parsing message:", error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        // Attempt to reconnect after a delay (exponential backoff)
        // Don't reconnect if it was a normal closure (code 1000) and we're closing intentionally
        if (event.code !== 1000 && userId) {
          const reconnectDelay = 3000; // Start with 3 seconds
          console.log(`Attempting to reconnect in ${reconnectDelay}ms...`);
          setTimeout(() => {
            if (userId && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
              console.log("Reconnecting WebSocket...");
              // Force reconnection by clearing the ref
              wsRef.current = null;
              // Trigger effect by setting a dummy state or force re-render
              setIsConnected(false);
            }
          }, reconnectDelay);
        }
      };
    } else if (isOpen && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Connection exists and chat just opened, load history
      wsRef.current.send(JSON.stringify({ type: "load_history" }));
    }

    return () => {
      // Don't close connection when component unmounts or chat closes
      // Keep connection alive to receive admin messages
      // Only close if userId changes (handled at the top)
      // Note: We keep the connection open even when chat widget is closed
      // so users can receive admin messages when they're not actively chatting
    };
  }, [userId, isOpen]);

  // Separate effect to load history when chat opens (if connection already exists)
  useEffect(() => {
    if (isOpen && wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isConnected) {
      console.log("Chat opened, loading history");
      wsRef.current.send(JSON.stringify({ type: "load_history" }));
    }
  }, [isOpen, isConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const messageText = inputMessage.trim();
    if (messageText && wsRef.current && isConnected && userId) {
      // Optimistically add message to UI
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        sender: "user",
        message: messageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setInputMessage("");

      // Send to server
      try {
        wsRef.current.send(
          JSON.stringify({
            type: "message",
            message: messageText,
          })
        );
        console.log("Message sent to server:", messageText);
      } catch (error) {
        console.error("Error sending message:", error);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        setInputMessage(messageText);
      }
    } else {
      console.log("Cannot send message:", { 
        hasMessage: !!inputMessage.trim(), 
        hasWs: !!wsRef.current, 
        isConnected, 
        hasUserId: !!userId 
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button - Only show when chat is closed */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/50 transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-600/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 z-50"
          aria-label="Open chat"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window - Rendered via portal to ensure it's above everything */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            style={{ zIndex: 9998 }}
          />
          <div 
            className="fixed top-20 right-6 h-96 w-80 rounded-2xl border border-emerald-200 bg-white shadow-2xl flex flex-col"
            style={{ zIndex: 9999 }}
          >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-emerald-500 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-300" : "bg-red-300"}`}></div>
              <h3 className="text-sm font-semibold text-white">Support Chat</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-emerald-100 transition-colors"
              aria-label="Close chat"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-slate-500 mt-8">
                {isConnected ? "Start a conversation with our support team" : "Connecting..."}
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${
                      msg.sender === "user"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p>{msg.message}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        msg.sender === "user" ? "text-emerald-100" : "text-slate-500"
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
          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={!isConnected}
                className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-100"
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || !inputMessage.trim()}
                className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Send
              </button>
            </div>
          </div>
        </div>
        </>,
        document.body
      )}
    </>
  );
}

export default ChatWidget;

