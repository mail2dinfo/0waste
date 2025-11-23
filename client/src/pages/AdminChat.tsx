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
            if (data.sender === "user" && data.userId) {
              setActiveChats((prev) => {
                const existing = prev.find((chat) => chat.userId === data.userId);
                let updated;
                if (existing) {
                  // Update existing chat - increment unread count if not currently viewing this chat
                  updated = prev.map((chat) =>
                    chat.userId === data.userId
                      ? {
                          ...chat,
                          lastMessage: data.message,
                          lastMessageTime: new Date(data.timestamp),
                          unreadCount: chat.userId === selectedUserId ? 0 : chat.unreadCount + 1,
                        }
                      : chat
                  );
                } else {
                  // Add new chat - show as unread if not currently selected
                  updated = [
                    ...prev,
                    {
                      userId: data.userId,
                      userName: data.userName || `User ${data.userId.substring(0, 8)}`,
                      lastMessage: data.message,
                      lastMessageTime: new Date(data.timestamp),
                      unreadCount: data.userId === selectedUserId ? 0 : 1,
                    },
                  ];
                }
                // Sort by most recent message first (newest conversations on top)
                return updated.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
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
            
            // Build active chats from history - only from user messages
            const userChats = new Map<string, ActiveChat>();
            historyMessages.forEach((msg: ChatMessage) => {
              // Only process user messages (not admin messages) to build chat list
              if (msg.sender === "user" && msg.userId) {
                if (!userChats.has(msg.userId)) {
                  userChats.set(msg.userId, {
                    userId: msg.userId,
                    userName: msg.userName || `User ${msg.userId.substring(0, 8)}`,
                    lastMessage: msg.message,
                    lastMessageTime: msg.timestamp,
                    unreadCount: 0, // Will be recalculated based on unread admin messages
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

  const sendMessage = () => {
    console.log("=== SEND MESSAGE FUNCTION CALLED ===");
    console.log("Call stack:", new Error().stack);
    
    // Use ref for immediate access (avoids stale closure issues)
    // Try ref first, then state
    const currentSelectedUserId = selectedUserIdRef.current || selectedUserId;
    
    console.log("selectedUserId from state:", selectedUserId);
    console.log("selectedUserId from ref:", selectedUserIdRef.current);
    console.log("currentSelectedUserId (ref || state):", currentSelectedUserId);
    console.log("currentSelectedUserId type:", typeof currentSelectedUserId);
    console.log("currentSelectedUserId truthy?", !!currentSelectedUserId);
    
    // ABSOLUTE FIRST CHECK - if no selectedUserId, abort immediately
    if (!currentSelectedUserId) {
      console.error("✗✗✗ CRITICAL: sendMessage called without selectedUserId! ✗✗✗");
      console.error("This should NEVER happen - validation should have prevented this!");
      console.error("selectedUserId state:", selectedUserId);
      console.error("selectedUserId ref:", selectedUserIdRef.current);
      alert("ERROR: No user selected. Please select a user from the sidebar first.");
      return;
    }
    
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
    
    // CRITICAL: Get targetUserId from multiple sources and validate
    // Try ref first (most up-to-date), then state, then fail
    let targetUserIdValue: string | null = null;
    
    // Try 1: Use ref (most reliable)
    if (selectedUserIdRef.current && typeof selectedUserIdRef.current === "string") {
      targetUserIdValue = selectedUserIdRef.current.trim();
    }
    
    // Try 2: Use state if ref doesn't have it
    if (!targetUserIdValue && selectedUserId && typeof selectedUserId === "string") {
      targetUserIdValue = selectedUserId.trim();
    }
    
    // Try 3: Use currentSelectedUserId if neither works
    if (!targetUserIdValue && currentSelectedUserId && typeof currentSelectedUserId === "string") {
      targetUserIdValue = currentSelectedUserId.trim();
    }
    
    // FINAL CHECK - if still no targetUserId, abort
    if (!targetUserIdValue || targetUserIdValue === "") {
      console.error("✗✗✗ CRITICAL ERROR: No targetUserId available from ANY source!");
      console.error("selectedUserIdRef.current:", selectedUserIdRef.current);
      console.error("selectedUserId state:", selectedUserId);
      console.error("currentSelectedUserId:", currentSelectedUserId);
      console.error("targetUserIdValue:", targetUserIdValue);
      alert("ERROR: Please select a user from the sidebar to chat with first.");
      return;
    }
    
    // Validate format
    if (targetUserIdValue.length < 10) {
      console.error("✗✗✗ ERROR: Invalid targetUserId format (too short):", targetUserIdValue);
      alert("Invalid user selected. Please select a user from the sidebar.");
      return;
    }
    
    const finalTrimmedTargetUserId = targetUserIdValue;
    
    // CRITICAL: Create payload object directly with all required fields
    // Do NOT rely on any variables - use finalTrimmedTargetUserId directly
    const payload = {
      type: "message" as const,
      message: messageText,
      targetUserId: finalTrimmedTargetUserId, // MUST be included - this is the validated value
    };
    
    // Verify payload was created correctly
    if (Object.keys(payload).length !== 3) {
      console.error("✗✗✗ CRITICAL: Payload has wrong number of keys!");
      console.error("Payload keys:", Object.keys(payload));
      alert("Internal error: Message payload invalid.");
      return;
    }
    
    // IMMEDIATE validation after payload creation
    if (!payload.targetUserId) {
      console.error("✗✗✗ CRITICAL ERROR: Payload missing targetUserId after assignment!");
      console.error("Payload:", payload);
      console.error("finalTrimmedTargetUserId:", finalTrimmedTargetUserId);
      alert("Internal error: Cannot send message. Please refresh the page.");
      return;
    }
    
    if (typeof payload.targetUserId !== "string" || payload.targetUserId.trim() === "") {
      console.error("✗✗✗ CRITICAL ERROR: Payload has invalid targetUserId!");
      console.error("payload.targetUserId:", payload.targetUserId);
      console.error("payload.targetUserId type:", typeof payload.targetUserId);
      alert("Internal error: Cannot send message. Please refresh the page.");
      return;
    }
    
    // Verify payload has exactly 3 keys: type, message, targetUserId
    const payloadKeys = Object.keys(payload);
    if (payloadKeys.length !== 3 || !payloadKeys.includes("targetUserId")) {
      console.error("✗✗✗ CRITICAL ERROR: Payload structure is invalid!");
      console.error("Payload keys:", payloadKeys);
      console.error("Expected: ['type', 'message', 'targetUserId']");
      console.error("Payload:", payload);
      alert("Internal error: Message payload is invalid. Please refresh the page.");
      return;
    }
    
    console.log("=== ADMIN SENDING MESSAGE ===");
    console.log("Target user ID:", finalTrimmedTargetUserId);
    console.log("Message text:", messageText);
    console.log("Full payload object:", payload);
    console.log("Payload keys:", Object.keys(payload));
    console.log("Payload has targetUserId property?", "targetUserId" in payload);
    console.log("payload.targetUserId value:", payload.targetUserId);
    console.log("payload.targetUserId type:", typeof payload.targetUserId);
    console.log("Expected targetUserId:", finalTrimmedTargetUserId);
    console.log("Match check:", payload.targetUserId === finalTrimmedTargetUserId);
    
    // ONE MORE SAFETY CHECK - verify payload.targetUserId is actually set
    if (!payload.targetUserId || payload.targetUserId !== finalTrimmedTargetUserId) {
      console.error("✗✗✗ CRITICAL ERROR: Payload.targetUserId mismatch!");
      console.error("Expected:", finalTrimmedTargetUserId);
      console.error("Actual:", payload.targetUserId);
      console.error("Full payload:", payload);
      alert("Internal error: Message payload invalid. Please refresh the page.");
      return;
    }
    
    // CRITICAL: One final check before building payload
    // Re-verify targetUserId exists one more time
    const verifyTargetUserId = selectedUserIdRef.current || selectedUserId;
    console.log("=== FINAL VERIFICATION ===");
    console.log("verifyTargetUserId:", verifyTargetUserId);
    console.log("verifyTargetUserId type:", typeof verifyTargetUserId);
    console.log("selectedUserIdRef.current:", selectedUserIdRef.current);
    console.log("selectedUserId:", selectedUserId);
    console.log("finalTrimmedTargetUserId:", finalTrimmedTargetUserId);
    
    if (!verifyTargetUserId) {
      console.error("✗✗✗ FINAL VERIFICATION FAILED: verifyTargetUserId is falsy!");
      alert("ERROR: No target user selected. Please select a user from the sidebar.");
      return;
    }
    
    if (typeof verifyTargetUserId !== "string") {
      console.error("✗✗✗ FINAL VERIFICATION FAILED: verifyTargetUserId is not a string!");
      console.error("Type:", typeof verifyTargetUserId);
      alert("ERROR: Invalid user selection. Please select a user from the sidebar.");
      return;
    }
    
    const verifiedTargetUserId = verifyTargetUserId.trim();
    
    if (verifiedTargetUserId === "" || verifiedTargetUserId === "undefined" || verifiedTargetUserId === "null") {
      console.error("✗✗✗ FINAL VERIFICATION FAILED: verifiedTargetUserId is empty or invalid!");
      console.error("Value:", verifiedTargetUserId);
      alert("ERROR: Invalid user selection. Please select a user from the sidebar.");
      return;
    }
    
    if (verifiedTargetUserId.length < 10) {
      console.error("✗✗✗ FINAL VERIFICATION FAILED: verifiedTargetUserId is too short!");
      console.error("Length:", verifiedTargetUserId.length);
      alert("ERROR: Invalid user selection. Please select a user from the sidebar.");
      return;
    }
    
    // Use the verified value, prioritize verifiedTargetUserId over finalTrimmedTargetUserId
    const actualTargetUserId = verifiedTargetUserId || finalTrimmedTargetUserId;
    
    if (!actualTargetUserId || actualTargetUserId === "" || actualTargetUserId === "undefined" || actualTargetUserId === "null") {
      console.error("✗✗✗ ABORT: No valid targetUserId after final verification!");
      console.error("actualTargetUserId:", actualTargetUserId);
      alert("ERROR: Cannot determine target user. Please select a user from the sidebar.");
      return;
    }
    
    if (actualTargetUserId.length < 10) {
      console.error("✗✗✗ ABORT: actualTargetUserId is too short!");
      console.error("Length:", actualTargetUserId.length);
      alert("ERROR: Invalid target user. Please select a user from the sidebar.");
      return;
    }
    
    console.log("✓ Final verified targetUserId:", actualTargetUserId);
    
    // Serialize payload to JSON - use actualTargetUserId
    let payloadString: string;
    try {
      // Create payload object fresh with verified targetUserId
      // DO NOT use any variables except the actual values
      const safePayload = {
        type: "message" as const,
        message: messageText,
        targetUserId: actualTargetUserId, // Use the verified value
      };
      
      // Verify safePayload has targetUserId before stringifying
      if (!safePayload.targetUserId || safePayload.targetUserId !== actualTargetUserId) {
        console.error("✗✗✗ ABORT: safePayload.targetUserId mismatch!");
        console.error("Expected:", actualTargetUserId);
        console.error("Got:", safePayload.targetUserId);
        alert("ERROR: Payload validation failed. Please try again.");
        return;
      }
      
      payloadString = JSON.stringify(safePayload);
      console.log("Payload JSON string:", payloadString);
      
      // Verify targetUserId is in the JSON string IMMEDIATELY after stringify
      if (!payloadString.includes('"targetUserId"')) {
        console.error("✗✗✗ ABORT: targetUserId missing from JSON after stringify!");
        console.error("JSON:", payloadString);
        alert("ERROR: Message payload invalid. Please refresh the page.");
        return;
      }
      
      if (!payloadString.includes(actualTargetUserId)) {
        console.error("✗✗✗ ABORT: targetUserId value missing from JSON!");
        console.error("Looking for:", actualTargetUserId);
        console.error("JSON:", payloadString);
        alert("ERROR: Message payload invalid. Please refresh the page.");
        return;
      }
    } catch (error) {
      console.error("✗✗✗ ERROR: Failed to stringify payload:", error);
      alert("Failed to prepare message. Please try again.");
      return;
    }
    
    // FINAL VERIFICATION - ensure targetUserId is in the JSON string
    // This is the last line of defense before sending
    if (!payloadString.includes('"targetUserId"')) {
      console.error("✗✗✗ CRITICAL ERROR: targetUserId key missing from JSON!");
      console.error("JSON string:", payloadString);
      console.error("Payload object:", payload);
      console.error("This should NEVER happen - aborting send!");
      alert("Internal error: Message payload invalid. Please refresh the page.");
      return;
    }
    
    if (!payloadString.includes(actualTargetUserId)) {
      console.error("✗✗✗ CRITICAL ERROR: targetUserId value missing from JSON!");
      console.error("Looking for:", actualTargetUserId);
      console.error("JSON string:", payloadString);
      console.error("Payload object:", payload);
      alert("Internal error: Message payload invalid. Please refresh the page.");
      return;
    }
    
    // ABSOLUTE FINAL CHECK - parse JSON back and verify
    try {
      const parsedBack = JSON.parse(payloadString);
      if (!parsedBack.targetUserId || typeof parsedBack.targetUserId !== "string" || parsedBack.targetUserId.trim() === "" || parsedBack.targetUserId !== actualTargetUserId) {
        console.error("✗✗✗ CRITICAL ERROR: targetUserId missing or invalid after JSON roundtrip!");
        console.error("Parsed back:", parsedBack);
        console.error("Expected targetUserId:", actualTargetUserId);
        console.error("Got targetUserId:", parsedBack.targetUserId);
        console.error("Parsed keys:", Object.keys(parsedBack));
        alert("Internal error: Message payload invalid. Please refresh the page.");
        return;
      }
      
      // Verify parsed payload has all required fields
      if (!parsedBack.type || !parsedBack.message || !parsedBack.targetUserId) {
        console.error("✗✗✗ CRITICAL ERROR: Parsed payload missing required fields!");
        console.error("Parsed payload:", parsedBack);
        alert("Internal error: Message payload invalid. Please refresh the page.");
        return;
      }
    } catch (error) {
      console.error("✗✗✗ ERROR: Failed to parse JSON back:", error);
      alert("Internal error: Message payload invalid. Please refresh the page.");
      return;
    }
    
    // ALL CHECKS PASSED - Safe to send
    try {
      console.log("✓✓✓ ALL VALIDATIONS PASSED - SENDING WEBSOCKET MESSAGE");
      console.log("Final payload string:", payloadString);
      console.log("Target user ID:", actualTargetUserId);
      console.log("Payload verified with targetUserId from safePayload:", actualTargetUserId);
      
      // ONE ABSOLUTE FINAL CHECK - parse and verify one more time
      const finalCheck = JSON.parse(payloadString);
      if (!finalCheck.targetUserId || finalCheck.targetUserId !== actualTargetUserId) {
        console.error("✗✗✗ FINAL CHECK FAILED - ABORTING SEND!");
        console.error("finalCheck:", finalCheck);
        alert("ERROR: Final validation failed. Please try again.");
        return;
      }
      
      // Last check before sending - verify WebSocket is open
      if (!wsRef.current) {
        console.error("WebSocket ref is null!");
        alert("Connection lost. Please refresh the page.");
        return;
      }
      
      if (wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not open, readyState:", wsRef.current.readyState);
        alert("Connection lost. Please refresh the page.");
        return;
      }
      
      // ABSOLUTE FINAL SEND - this should never fail validation now
      console.log("=== SENDING TO WEBSOCKET ===");
      console.log("Payload JSON:", payloadString);
      
      // ONE ABSOLUTE FINAL PARSE CHECK - verify targetUserId exists before sending
      let finalPayload: { type: string; message: string; targetUserId: string };
      try {
        finalPayload = JSON.parse(payloadString);
        console.log("Parsed payload before send:", finalPayload);
        console.log("Payload keys:", Object.keys(finalPayload));
        console.log("targetUserId in payload?", "targetUserId" in finalPayload);
        console.log("targetUserId value:", finalPayload.targetUserId);
        console.log("targetUserId type:", typeof finalPayload.targetUserId);
        
        if (!finalPayload.targetUserId || 
            typeof finalPayload.targetUserId !== "string" || 
            finalPayload.targetUserId.trim() === "" ||
            finalPayload.targetUserId === "undefined" ||
            finalPayload.targetUserId === "null" ||
            finalPayload.targetUserId !== actualTargetUserId) {
          console.error("✗✗✗ FINAL PRE-SEND CHECK FAILED - ABORTING! ✗✗✗");
          console.error("Expected targetUserId:", actualTargetUserId);
          console.error("Got targetUserId:", finalPayload.targetUserId);
          console.error("Payload:", finalPayload);
          alert("ERROR: Message validation failed. Please select a user and try again.");
          return;
        }
        
        console.log("✓✓✓ FINAL PRE-SEND CHECK PASSED - targetUserId confirmed:", finalPayload.targetUserId);
      } catch (parseError) {
        console.error("✗✗✗ CRITICAL: Failed to parse payload before send!", parseError);
        console.error("Payload string:", payloadString);
        alert("ERROR: Message payload invalid. Please try again.");
        return;
      }
      
      // LAST CHECK - verify WebSocket is still open
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not available or not open!");
        alert("Connection lost. Please refresh the page.");
        return;
      }
      
      // NOW SEND - with absolute confidence that targetUserId is present
      wsRef.current.send(payloadString);
      setInputMessage("");
      console.log("✓✓✓✓✓ Message sent successfully to user:", actualTargetUserId);
      console.log("✓✓✓✓✓ Verified payload had targetUserId:", finalPayload.targetUserId);
    } catch (error) {
      console.error("✗✗✗ Error sending message:", error);
      console.error("Error details:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      
      // STRICT CHECK before calling sendMessage
      const currentSelectedUserId = selectedUserIdRef.current || selectedUserId;
      
      console.log("=== ENTER KEY PRESSED ===");
      console.log("selectedUserId from state:", selectedUserId);
      console.log("selectedUserId from ref:", selectedUserIdRef.current);
      console.log("currentSelectedUserId:", currentSelectedUserId);
      
      if (!currentSelectedUserId) {
        console.error("✗✗✗ Cannot send: No user selected ✗✗✗");
        alert("Please select a user from the sidebar to chat with first.");
        return;
      }
      
      if (typeof currentSelectedUserId !== "string" || currentSelectedUserId.trim() === "") {
        console.error("✗✗✗ Cannot send: Invalid user selected ✗✗✗");
        alert("Please select a valid user from the sidebar.");
        return;
      }
      
      // Only call sendMessage if we have a valid selectedUserId
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
                      console.log("User selected in sidebar:", chat.userId);
                      console.log("Setting selectedUserId to:", chat.userId);
                      setSelectedUserId(chat.userId);
                      selectedUserIdRef.current = chat.userId; // Update ref immediately
                      window.history.pushState({}, "", `/admin/chat/${chat.userId}`);
                      // Reset unread count for selected chat
                      setActiveChats((prev) =>
                        prev.map((c) =>
                          c.userId === chat.userId ? { ...c, unreadCount: 0 } : c
                        )
                      );
                      console.log("selectedUserId after setting:", selectedUserIdRef.current);
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
                        
                        // TRIPLE-CHECK before calling sendMessage
                        const currentSelectedUserId = selectedUserIdRef.current || selectedUserId;
                        
                        console.log("=== SEND BUTTON CLICKED ===");
                        console.log("selectedUserId from state:", selectedUserId);
                        console.log("selectedUserId from ref:", selectedUserIdRef.current);
                        console.log("currentSelectedUserId:", currentSelectedUserId);
                        
                        if (!currentSelectedUserId) {
                          console.error("✗✗✗ Send button clicked but no user selected ✗✗✗");
                          alert("Please select a user from the sidebar to chat with first.");
                          return;
                        }
                        
                        if (typeof currentSelectedUserId !== "string" || currentSelectedUserId.trim() === "") {
                          console.error("✗✗✗ Send button clicked but invalid user selected ✗✗✗");
                          alert("Please select a valid user from the sidebar.");
                          return;
                        }
                        
                        // Only call sendMessage if we have a valid selectedUserId
                        sendMessage();
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

