import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

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
  console.log("🔵 ADMIN CHAT COMPONENT LOADED - VERSION WITH FIXED SEND MESSAGE 🔵");
  
  const { userId: userIdFromUrl } = useParams<{ userId?: string }>();
  // CRITICAL: selectedUserId is the userId that admin clicked in sidebar
  // This becomes the targetUserId when admin sends a message
  const [selectedUserId, setSelectedUserId] = useState<string | null>(userIdFromUrl || null);
  const selectedUserIdRef = useRef<string | null>(userIdFromUrl || null); // Ref for immediate access
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
    console.log("selectedUserId updated:", selectedUserId);
  }, [selectedUserId]);

  // Update selectedUserId when URL param changes
  useEffect(() => {
    if (userIdFromUrl) {
      console.log("URL param changed, setting selectedUserId to:", userIdFromUrl);
      setSelectedUserId(userIdFromUrl);
      selectedUserIdRef.current = userIdFromUrl;
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
            // CRITICAL: userId must come from server data, not fallback to selectedUserId
            // The userId indicates which user this message belongs to
            // For user messages: userId = the user who sent it
            // For admin messages: userId = the target user (who should receive it)
            const messageUserId = data.userId;
            
            if (!messageUserId) {
              console.error("ERROR: Received message without userId!", data);
              return; // Don't add messages without userId
            }
            
            const newMessage: ChatMessage = {
              id: data.id || Date.now().toString(),
              sender: data.sender,
              message: data.message,
              timestamp: new Date(data.timestamp || Date.now()),
              userId: messageUserId, // Always use the userId from server, never fallback
              userName: data.userName || null,
              userEmail: data.userEmail || null,
            };
            
            console.log(`Admin received message - Sender: ${data.sender}, UserId: ${messageUserId}, Message: ${data.message}`);
            
            // Always add message to messages list (will be filtered by selectedUserId in display)
            setMessages((prev) => {
              // Check if message already exists
              const exists = prev.some((msg) => msg.id === data.id);
              if (exists) {
                console.log("Message already exists, skipping duplicate:", data.id);
                return prev;
              }
              console.log(`Adding message to state - UserId: ${messageUserId}, Total messages: ${prev.length + 1}`);
              return [...prev, newMessage];
            });
            
            // Update active chats when user sends a message
            // CRITICAL: Each user must have their own separate chat in sidebar
            if (data.sender === "user" && data.userId) {
              console.log(`📝 Processing user message for chat sidebar - UserId: ${data.userId}, Message: ${data.message}`);
              
              setActiveChats((prev) => {
                const existing = prev.find((chat) => chat.userId === data.userId);
                
                console.log(`  Existing chats: ${prev.length}`);
                console.log(`  Looking for userId: ${data.userId}`);
                console.log(`  Found existing chat?: ${!!existing}`);
                
                let updated: ActiveChat[];
                
                if (existing) {
                  // Update existing chat - increment unread count if not currently viewing this chat
                  console.log(`  ✅ Updating existing chat for user ${data.userId}`);
                  updated = prev.map((chat) => {
                    if (chat.userId === data.userId) {
                      return {
                        ...chat,
                        lastMessage: data.message,
                        lastMessageTime: new Date(data.timestamp),
                        unreadCount: chat.userId === selectedUserId ? 0 : chat.unreadCount + 1,
                        userName: data.userName || chat.userName, // Update name if available
                      };
                    }
                    return chat;
                  });
                } else {
                  // Add new chat - show as unread if not currently selected
                  console.log(`  ✅ Creating NEW chat for user ${data.userId}`);
                  const newChat: ActiveChat = {
                    userId: data.userId,
                    userName: data.userName || `User ${data.userId.substring(0, 8)}`,
                    lastMessage: data.message,
                    lastMessageTime: new Date(data.timestamp),
                    unreadCount: data.userId === selectedUserId ? 0 : 1,
                  };
                  
                  updated = [...prev, newChat];
                  console.log(`  Added new chat - Total chats now: ${updated.length}`);
                }
                
                // Sort by most recent message first (newest conversations on top)
                const sorted = updated.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
                console.log(`  Sorted chats - Top chat: ${sorted[0]?.userName} (${sorted[0]?.userId})`);
                return sorted;
              });
              
              // Auto-scroll to bottom if this message is for the currently selected chat
              if (data.userId === selectedUserId) {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }
          } else if (data.type === "history") {
            console.log("Loading chat history:", data.messages.length, "messages");
            console.log("Raw history data:", data.messages);
            
            // Process history messages - CRITICAL: only use userId from server, never fallback
            const historyMessages = data.messages
              .filter((msg: any) => msg.userId) // Only include messages with userId
              .map((msg: any) => ({
                id: msg.id,
                sender: msg.sender,
                message: msg.message,
                timestamp: new Date(msg.timestamp),
                userId: msg.userId, // Always use userId from server, never fallback
                userName: msg.userName || null,
                userEmail: msg.userEmail || null,
              }));
            
            console.log("Processed history messages:", historyMessages);
            setMessages(historyMessages);
            
            // Build active chats from history - CRITICAL: Each user gets their own separate chat
            console.log("🔍 Building active chats from history...");
            const userChats = new Map<string, ActiveChat>();
            
            historyMessages.forEach((msg: ChatMessage) => {
              // Only process user messages (not admin messages) to build chat list
              if (msg.sender === "user" && msg.userId) {
                console.log(`  Processing message - UserId: ${msg.userId}, Message: ${msg.message}`);
                
                if (!userChats.has(msg.userId)) {
                  // Create new chat for this user
                  console.log(`    ✅ Creating NEW chat for user ${msg.userId}`);
                  userChats.set(msg.userId, {
                    userId: msg.userId,
                    userName: msg.userName || `User ${msg.userId.substring(0, 8)}`,
                    lastMessage: msg.message,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0, // Will be recalculated based on unread admin messages
                  });
                } else {
                  // Update existing chat - keep latest message
                  const chat = userChats.get(msg.userId)!;
                  if (msg.timestamp > chat.lastMessageTime) {
                    chat.lastMessage = msg.message;
                    chat.lastMessageTime = msg.timestamp;
                  }
                  // Update user name if available
                  if (msg.userName && !chat.userName.startsWith("User ")) {
                    chat.userName = msg.userName;
                  }
                  console.log(`    ✅ Updated existing chat for user ${msg.userId}`);
                }
              } else if (msg.sender === "user" && !msg.userId) {
                console.warn(`    ⚠️ Skipping message without userId:`, msg);
              }
            });
            
            console.log(`✅ Built ${userChats.size} separate chats from history`);
            // Sort by most recent message first (newest on top)
            const sortedChats = Array.from(userChats.values()).sort(
              (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
            );
            setActiveChats(sortedChats);
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

      ws.onclose = (event) => {
        console.log("Admin WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        // Attempt to reconnect after a delay
        if (event.code !== 1000 && currentUserId) {
          setTimeout(() => {
            if (currentUserId && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
              console.log("Admin reconnecting WebSocket...");
              setIsConnected(false);
            }
          }, 3000);
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [currentUserId, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * SEND MESSAGE - REDESIGNED with multiple fallbacks
   * 
   * Problem: Server doesn't know which user to send to (missing targetUserId)
   * Solution: Get targetUserId from multiple sources with fallbacks
   * 
   * Flow:
   * 1. Admin clicks user in sidebar → selectedUserId is set
   * 2. Admin types message and clicks Send
   * 3. Get targetUserId from: ref → state → URL param → activeChats[0]
   * 4. Create payload with targetUserId
   * 5. Server uses targetUserId to route message to that specific user
   */
  const sendMessage = () => {
    console.log("═══════════════════════════════════════");
    console.log("🚀 ADMIN SEND MESSAGE - REDESIGNED 🚀");
    console.log("═══════════════════════════════════════");
    
    // STEP 1: Get targetUserId from MULTIPLE sources (with fallbacks)
    // Priority: ref → state → URL param → first active chat
    let targetUserId: string | null = null;
    
    console.log("📍 Step 1: Finding targetUserId...");
    console.log("  - selectedUserIdRef.current:", selectedUserIdRef.current);
    console.log("  - selectedUserId (state):", selectedUserId);
    console.log("  - userIdFromUrl (URL param):", userIdFromUrl);
    console.log("  - activeChats count:", activeChats.length);
    
    // Try 1: Use ref (most current)
    if (selectedUserIdRef.current && typeof selectedUserIdRef.current === "string" && selectedUserIdRef.current.trim().length >= 10) {
      targetUserId = selectedUserIdRef.current.trim();
      console.log("  ✅ Found in ref:", targetUserId);
    }
    // Try 2: Use state
    else if (selectedUserId && typeof selectedUserId === "string" && selectedUserId.trim().length >= 10) {
      targetUserId = selectedUserId.trim();
      console.log("  ✅ Found in state:", targetUserId);
    }
    // Try 3: Use URL parameter
    else if (userIdFromUrl && typeof userIdFromUrl === "string" && userIdFromUrl.trim().length >= 10) {
      targetUserId = userIdFromUrl.trim();
      console.log("  ✅ Found in URL param:", targetUserId);
      // Also update selectedUserId for next time
      setSelectedUserId(targetUserId);
      selectedUserIdRef.current = targetUserId;
    }
    // Try 4: Use first active chat (last resort)
    else if (activeChats.length > 0 && activeChats[0].userId && typeof activeChats[0].userId === "string" && activeChats[0].userId.trim().length >= 10) {
      targetUserId = activeChats[0].userId.trim();
      console.log("  ✅ Found in first active chat:", targetUserId);
      // Also update selectedUserId for next time
      setSelectedUserId(targetUserId);
      selectedUserIdRef.current = targetUserId;
    }
    
    console.log("📍 Final targetUserId:", targetUserId);
    
    console.log("targetUserId (ref || state):", targetUserId);
    console.log("targetUserId type:", typeof targetUserId);
    console.log("targetUserId truthy?", !!targetUserId);
    
    // STEP 2: Validate targetUserId
    if (!targetUserId || typeof targetUserId !== "string" || targetUserId.length < 10) {
      console.error("✗✗✗ VALIDATION FAILED: No valid targetUserId found!");
      console.error("  targetUserId:", targetUserId);
      console.error("  selectedUserIdRef:", selectedUserIdRef.current);
      console.error("  selectedUserId:", selectedUserId);
      console.error("  userIdFromUrl:", userIdFromUrl);
      console.error("  activeChats:", activeChats.map(c => ({ userId: c.userId, userName: c.userName })));
      
      alert(
        "ERROR: Cannot determine which user to send to.\n\n" +
        "Please:\n" +
        "1. Click a user in the sidebar to select them\n" +
        "2. Then type your message\n" +
        "3. Click Send\n\n" +
        "If you see users in the sidebar, click on one first."
      );
      return;
    }
    
    console.log("✅ targetUserId validated:", targetUserId);
    
    // STEP 2: Get message text
    const messageText = inputMessage.trim();
    if (!messageText) {
      return; // No message to send
    }
    
    // STEP 3: Check WebSocket connection
    if (!wsRef.current || !isConnected || wsRef.current.readyState !== WebSocket.OPEN) {
      alert("Not connected. Please refresh the page.");
      return;
    }
    
    // STEP 5: Create payload - ALWAYS include targetUserId
    // THIS IS THE FIX: targetUserId tells server which user to send to
    const payload = {
      type: "message" as const,
      message: messageText,
      targetUserId: targetUserId, // ← THIS TELLS SERVER WHICH USER TO SEND TO
    };
    
    console.log("📍 Step 5: Created payload");
    console.log("  Payload keys:", Object.keys(payload));
    console.log("  payload.type:", payload.type);
    console.log("  payload.message:", payload.message);
    console.log("  payload.targetUserId:", payload.targetUserId);
    console.log("  Has targetUserId?:", "targetUserId" in payload);
    console.log("  targetUserId type:", typeof payload.targetUserId);
    
    // STEP 5: Verify payload has all 3 required fields
    if (!payload.targetUserId || !payload.message || !payload.type) {
      console.error("✗✗✗ Payload validation failed!");
      console.error("Payload:", payload);
      alert("Error: Invalid message. Please try again.");
      return;
    }
    
    // Verify targetUserId is actually in the payload
    if (!("targetUserId" in payload)) {
      console.error("✗✗✗ CRITICAL: targetUserId key missing from payload!");
      console.error("Payload:", payload);
      alert("Error: Message payload invalid. Please refresh the page.");
      return;
    }
    
    // STEP 6: Send the message
    try {
      const payloadJson = JSON.stringify(payload);
      
      console.log("📍 Step 7: Sending message...");
      console.log("  Payload JSON:", payloadJson);
      console.log("  JSON contains 'targetUserId':", payloadJson.includes('"targetUserId"'));
      console.log("  JSON contains targetUserId value:", payloadJson.includes(targetUserId));
      
      // Final verification: Parse back and check
      const parsed = JSON.parse(payloadJson);
      if (!parsed.targetUserId || parsed.targetUserId !== targetUserId) {
        console.error("✗✗✗ CRITICAL: targetUserId missing after JSON stringify/parse!");
        console.error("  Parsed payload:", parsed);
        console.error("  Expected targetUserId:", targetUserId);
        alert("ERROR: Message validation failed. Please refresh the page.");
        return;
      }
      
      console.log("✅ Final verification passed");
      console.log("═══════════════════════════════════════");
      console.log("📤 SENDING MESSAGE TO USER:", targetUserId);
      console.log("   Message:", messageText);
      console.log("   Payload:", payloadJson);
      console.log("═══════════════════════════════════════");
      
      wsRef.current.send(payloadJson);
      setInputMessage(""); // Clear input
      
      console.log("✅✅✅ MESSAGE SENT SUCCESSFULLY ✅✅✅");
      console.log("   To user:", targetUserId);
    } catch (error) {
      console.error("✗✗✗ Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      sendMessage(); // sendMessage() will handle validation
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
                      console.log("=== USER CLICKED IN SIDEBAR ===");
                      console.log("Clicked user ID:", chat.userId);
                      console.log("Chat object:", chat);
                      
                      setSelectedUserId(chat.userId);
                      selectedUserIdRef.current = chat.userId; // Update ref immediately
                      
                      console.log("selectedUserId state set to:", chat.userId);
                      console.log("selectedUserIdRef.current set to:", selectedUserIdRef.current);
                      console.log("Verification: selectedUserIdRef.current === chat.userId?", selectedUserIdRef.current === chat.userId);
                      
                      window.history.pushState({}, "", `/admin/chat/${chat.userId}`);
                      
                      // Reset unread count for selected chat
                      setActiveChats((prev) =>
                        prev.map((c) =>
                          c.userId === chat.userId ? { ...c, unreadCount: 0 } : c
                        )
                      );
                      
                      console.log("✓ User selection complete");
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
                  {(() => {
                    // Filter messages by selectedUserId - only show messages for the selected user
                    const filteredMessages = messages.filter((msg) => {
                      const matches = msg.userId === selectedUserId;
                      if (!matches && msg.userId) {
                        // Log messages that don't match (for debugging)
                        console.log(`Message filtered out - msg.userId: ${msg.userId}, selectedUserId: ${selectedUserId}`);
                      }
                      return matches;
                    });
                    
                    console.log(`Displaying chat for user ${selectedUserId}: ${filteredMessages.length} messages`);
                    
                    return filteredMessages.length === 0 ? (
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
                    );
                  })()}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-orange-100 p-4">
                  {!selectedUserId && (
                    <div className="mb-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                      <p className="text-xs text-yellow-800 font-semibold">
                        ⚠️ Please select a user from the sidebar to start chatting
                      </p>
                      <p className="text-[10px] text-yellow-700 mt-1">
                        Click on a user's name in the left sidebar to select them as your conversation partner
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => {
                        // Prevent input if no user selected
                        if (!selectedUserId) {
                          alert("Please select a user from the sidebar first!");
                          return;
                        }
                        setInputMessage(e.target.value);
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder={selectedUserId ? "Type your message..." : "⚠️ Select a user from sidebar first..."}
                      disabled={!isConnected || !selectedUserId}
                      readOnly={!selectedUserId}
                      className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("🔴🔴🔴 SEND BUTTON CLICKED IN ADMIN CHAT 🔴🔴🔴");
                        console.log("selectedUserId:", selectedUserId);
                        console.log("selectedUserIdRef.current:", selectedUserIdRef.current);
                        console.log("Button disabled?:", !isConnected || !inputMessage.trim() || !selectedUserId);
                        sendMessage(); // sendMessage() will handle validation
                      }}
                      disabled={!isConnected || !inputMessage.trim() || !selectedUserId}
                      className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                      title={!selectedUserId ? "Please select a user to chat with first" : "Send message"}
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

