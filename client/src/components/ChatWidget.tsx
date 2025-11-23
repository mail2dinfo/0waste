import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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
}

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminOnline, setAdminOnline] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const storedUserId = window.localStorage.getItem("nowasteUserId");
    setUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (!userId) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      const wsUrl = `${WS_URL}?userId=${userId}`;
      console.log("[ChatWidget] Connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[ChatWidget] WebSocket connected");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[ChatWidget] Received:", data.type);

          if (data.type === "connected") {
            console.log("[ChatWidget] Connection confirmed");
          } else if (data.type === "admin_status") {
            setAdminOnline(data.isOnline);
          } else if (data.type === "message") {
            const newMessage: ChatMessage = {
              id: data.id,
              roomId: data.roomId,
              sender: data.sender,
              message: data.message,
              timestamp: new Date(data.timestamp),
            };

            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === data.id);
              if (exists) return prev;
              
              // Increment unread if admin message and chat is closed
              if (data.sender === "admin" && !isOpenRef.current) {
                setUnreadCount((prev) => prev + 1);
              }
              
              return [...prev, newMessage];
            });
          } else if (data.type === "history") {
            const historyMessages: ChatMessage[] = (data.messages || []).map((msg: any) => ({
              id: msg.id,
              roomId: msg.roomId,
              sender: msg.sender,
              message: msg.message,
              timestamp: new Date(msg.timestamp),
            }));

            setMessages(historyMessages);
            
            // Count unread admin messages if chat is closed
            if (!isOpenRef.current) {
              const unread = historyMessages.filter((m) => m.sender === "admin").length;
              setUnreadCount(unread);
            } else {
              setUnreadCount(0);
            }
          }
        } catch (error) {
          console.error("[ChatWidget] Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[ChatWidget] WebSocket error:", error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log("[ChatWidget] WebSocket closed:", event.code);
        setIsConnected(false);
        // Reconnect after delay
        if (event.code !== 1000 && userId) {
          setTimeout(() => {
            if (userId && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
              wsRef.current = null;
              setIsConnected(false);
            }
          }, 3000);
        }
      };
    }

    return () => {
      // Keep connection alive
    };
  }, [userId, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const messageText = inputMessage.trim();
    if (messageText && wsRef.current && isConnected && userId) {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        roomId: userId,
        sender: "user",
        message: messageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setInputMessage("");

      // Send to server
      try {
        wsRef.current.send(JSON.stringify({
          type: "message",
          message: messageText,
        }));
      } catch (error) {
        console.error("[ChatWidget] Error sending message:", error);
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        setInputMessage(messageText);
      }
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
      {/* Chat Button */}
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

      {/* Chat Window */}
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
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-white">Support Chat</h3>
                  {adminOnline && (
                    <span className="text-[10px] text-emerald-100">Admin Available</span>
                  )}
                </div>
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
                  {isConnected ? (
                    <div className="flex flex-col items-center gap-2">
                      <p>Start a conversation with our support team</p>
                      {adminOnline && (
                        <p className="text-emerald-600 font-semibold">✓ Admin is available</p>
                      )}
                      {!adminOnline && isConnected && (
                        <p className="text-slate-400">Admin is currently offline</p>
                      )}
                    </div>
                  ) : (
                    "Connecting..."
                  )}
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

