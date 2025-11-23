import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { NwChatMessage } from "../models/NwChatMessage.js";
import { NwUser } from "../models/NwUser.js";

interface ChatClient {
  ws: WebSocket;
  userId: string;
  isAdmin: boolean;
}

class ChatServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ChatClient> = new Map();
  private adminClients: Set<string> = new Set();
  private isOriginAllowed: ((origin: string | undefined) => boolean) | null = null;

  initialize(server: any, originChecker?: (origin: string | undefined) => boolean) {
    this.isOriginAllowed = originChecker || null;
    
    this.wss = new WebSocketServer({ 
      server,
      path: "/chat",
      verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
        // Verify origin if checker is provided
        if (this.isOriginAllowed) {
          return this.isOriginAllowed(info.origin);
        }
        // If no checker provided, allow all (for backward compatibility)
        return true;
      }
    });

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || "", `http://${req.headers.host || "localhost:4000"}`);
      const userId = url.searchParams.get("userId");

      if (!userId) {
        ws.close(1008, "User ID required");
        return;
      }

      // Check if user is admin and handle connection
      (async () => {
        try {
          const user = await NwUser.findByPk(userId);
          const isAdmin = user?.role === "admin";
          
          console.log(`User ${userId} connecting - isAdmin: ${isAdmin}, role: ${user?.role}`);
          
          if (isAdmin) {
            this.adminClients.add(userId);
            console.log(`Admin ${userId} added. Total admins: ${this.adminClients.size}`);
            
            // Broadcast admin online status to all connected users
            this.broadcastAdminStatus(true);
          }

          this.clients.set(userId, { ws, userId, isAdmin });
          console.log(`Client ${userId} added. Total clients: ${this.clients.size}`);

          // Send connection confirmation
          ws.send(
            JSON.stringify({
              type: "connected",
              isAdmin,
            })
          );

          // If user (not admin), send current admin status
          if (!isAdmin) {
            const adminOnline = this.adminClients.size > 0;
            ws.send(
              JSON.stringify({
                type: "admin_status",
                isOnline: adminOnline,
                message: adminOnline ? "Admin is available for chat" : "Admin is offline",
              })
            );
          }

          // Set up ping/pong to keep connection alive (important for Render and other cloud providers)
          const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.ping();
              } catch (error) {
                console.error(`Error sending ping to ${userId}:`, error);
                clearInterval(pingInterval);
              }
            } else {
              clearInterval(pingInterval);
            }
          }, 30000); // Ping every 30 seconds

          // Load chat history for this user (includes any undelivered messages)
          await this.loadChatHistory(userId, ws);
          
          // After loading history, check for any unread messages and send them as notifications
          if (!isAdmin) {
            const unreadCount = await NwChatMessage.count({
              where: { userId, sender: "admin", isRead: false },
            });
            
            if (unreadCount > 0) {
              console.log(`User ${userId} has ${unreadCount} unread messages`);
              // The history already contains these messages, so they'll be displayed
              // But we can send a notification count if needed
              ws.send(
                JSON.stringify({
                  type: "unread_count",
                  count: unreadCount,
                })
              );
            }
          }

          ws.on("message", async (data: Buffer) => {
            try {
              const messageStr = data.toString();
              const message = JSON.parse(messageStr);
              
              // Only log targetUserId for actual chat messages (type: "message")
              if (message.type === "message") {
                console.log(`Received CHAT message from ${isAdmin ? "admin" : "user"} ${userId}:`, message);
                console.log(`Raw message string:`, messageStr);
                console.log(`Message type: ${message.type}, has targetUserId: ${!!message.targetUserId}, value: ${message.targetUserId || "undefined"}`);
              } else {
                console.log(`Received ${message.type} from ${isAdmin ? "admin" : "user"} ${userId}`);
              }
              
              await this.handleMessage(userId, message, isAdmin);
            } catch (error) {
              console.error("Error handling message:", error);
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Failed to process message",
                })
              );
            }
          });

          ws.on("close", () => {
            console.log(`WebSocket closed for user ${userId}`);
            clearInterval(pingInterval);
            const wasAdmin = isAdmin;
            this.clients.delete(userId);
            if (wasAdmin) {
              this.adminClients.delete(userId);
              console.log(`Admin ${userId} disconnected. Total admins: ${this.adminClients.size}`);
              
              // Broadcast admin offline status to all connected users if no admins left
              if (this.adminClients.size === 0) {
                this.broadcastAdminStatus(false);
              }
            }
          });

          ws.on("error", (error: Error) => {
            console.error("WebSocket error:", error);
            this.clients.delete(userId);
            if (isAdmin) {
              this.adminClients.delete(userId);
            }
          });
        } catch (error) {
          console.error("Error finding user:", error);
          ws.close(1008, "User not found");
        }
      })();
    });
  }

  private async loadChatHistory(userId: string, ws: WebSocket) {
    try {
      const client = this.clients.get(userId);
      const isAdmin = client?.isAdmin || false;

      let messages;
      if (isAdmin) {
        // For admins, load all messages (they can see all conversations)
        // Include user information for better display
        messages = await NwChatMessage.findAll({
          include: [{ model: NwUser, as: "user", attributes: ["id", "fullName", "email"] }],
          order: [["createdAt", "ASC"]],
          limit: 100,
        });
      } else {
        // For users, load only their messages
        // Always load all messages for the user to ensure they get any undelivered messages
        messages = await NwChatMessage.findAll({
          where: { userId },
          order: [["createdAt", "ASC"]],
          // Remove limit or increase it significantly to ensure all messages are loaded
          limit: 500,
        });
      }

      ws.send(
        JSON.stringify({
          type: "history",
          messages: messages.map((msg) => ({
            id: msg.id,
            sender: msg.sender,
            message: msg.message,
            timestamp: msg.createdAt.toISOString(),
            userId: msg.userId,
            userName: (msg as any).user?.fullName || null,
            userEmail: (msg as any).user?.email || null,
          })),
        })
      );
      
      // After sending history, mark unread messages as read for this user (if not admin)
      if (!isAdmin && messages.length > 0) {
        const unreadIds = messages
          .filter((msg) => msg.sender === "admin" && !msg.isRead)
          .map((msg) => msg.id);
        
        if (unreadIds.length > 0) {
          await NwChatMessage.update(
            { isRead: true },
            { where: { id: unreadIds, userId } }
          );
          console.log(`Marked ${unreadIds.length} messages as read for user ${userId}`);
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }

  private async handleMessage(
    userId: string,
    message: any,
    isAdmin: boolean
  ) {
    if (message.type === "load_history") {
      const client = this.clients.get(userId);
      if (client) {
        await this.loadChatHistory(userId, client.ws);
      }
      return;
    }

    if (message.type === "message") {
      console.log(`=== PROCESSING MESSAGE ===`);
      console.log(`From: ${isAdmin ? "admin" : "user"} ${userId}`);
      console.log(`Raw message object:`, message);
      console.log(`Message keys:`, Object.keys(message));
      console.log(`Has targetUserId?`, !!message.targetUserId);
      console.log(`targetUserId value:`, message.targetUserId);
      
      // For admin messages, targetUserId MUST be in the message payload
      // For user messages, targetUserId is the userId (they're sending to admin)
      const targetUserId = isAdmin ? message.targetUserId : userId;
      
      // STRICT VALIDATION - reject admin messages without targetUserId
      if (isAdmin && !message.targetUserId) {
        console.error(`✗✗✗ CRITICAL ERROR: Admin message missing targetUserId! ✗✗✗`);
        console.error(`  Admin userId: ${userId}`);
        console.error(`  message.targetUserId: ${message.targetUserId}`);
        console.error(`  message.targetUserId type: ${typeof message.targetUserId}`);
        console.error(`  Full message:`, JSON.stringify(message));
        console.error(`  Message keys:`, Object.keys(message));
        
        const adminClient = this.clients.get(userId);
        if (adminClient && adminClient.ws.readyState === WebSocket.OPEN) {
          adminClient.ws.send(
            JSON.stringify({
              type: "error",
              message: "ERROR: Cannot send message. Please select a user from the sidebar to chat with first.",
            })
          );
        }
        
        // DO NOT PROCESS THIS MESSAGE - reject it completely
        console.error(`✗✗✗ REJECTING admin message without targetUserId ✗✗✗`);
        return;
      }
      
      // For users, targetUserId should be their own userId
      if (!isAdmin && !userId) {
        console.error(`✗✗✗ ERROR: User message without userId! ✗✗✗`);
        const userClient = this.clients.get(userId);
        if (userClient) {
          userClient.ws.send(
            JSON.stringify({
              type: "error",
              message: "User ID missing",
            })
          );
        }
        return;
      }
      
      // Final check - ensure targetUserId exists
      if (!targetUserId) {
        console.error(`✗✗✗ ERROR: No targetUserId after validation! ✗✗✗`);
        console.error(`  isAdmin: ${isAdmin}`);
        console.error(`  message.targetUserId: ${message.targetUserId}`);
        console.error(`  userId: ${userId}`);
        console.error(`  Final targetUserId: ${targetUserId}`);
        
        const client = this.clients.get(userId);
        if (client) {
          client.ws.send(
            JSON.stringify({
              type: "error",
              message: "Cannot send message: target user not specified",
            })
          );
        }
        return;
      }
      
      console.log(`✓ Target user ID: ${targetUserId}`);

      const chatMessage = await NwChatMessage.create({
        userId: targetUserId,
        sender: isAdmin ? "admin" : "user",
        message: message.message,
        adminId: isAdmin ? userId : null,
        isRead: false,
      } as any);

      // Fetch user info if this is a user message (for admin display)
      let userName: string | null = null;
      let userEmail: string | null = null;
      if (!isAdmin) {
        try {
          const user = await NwUser.findByPk(targetUserId);
          if (user) {
            userName = user.fullName;
            userEmail = user.email;
          }
        } catch (error) {
          console.error("Error fetching user info:", error);
        }
      }

      // CRITICAL: For user messages, userId in messageData should be the user who sent it
      // For admin messages, userId should be the target user
      const messageData = {
        type: "message",
        id: chatMessage.id,
        sender: chatMessage.sender,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt.toISOString(),
        userId: isAdmin ? targetUserId : userId, // For users: userId = sender. For admin: userId = target
        userName: userName,
        userEmail: userEmail,
      };

      console.log(`Broadcasting message:`, messageData);
      console.log(`Sender isAdmin: ${isAdmin}, sender userId: ${userId}, targetUserId: ${targetUserId}`);
      console.log(`messageData.userId: ${messageData.userId} (should be sender's userId for user messages)`);
      console.log(`Active admins:`, Array.from(this.adminClients));
      console.log(`Active clients:`, Array.from(this.clients.keys()));

      if (!isAdmin) {
        // User sent message - send confirmation back to user (to replace optimistic update)
        // and send to all admins
        // CRITICAL: messageData.userId = userId (the user who sent it) - this is correct
        const userClient = this.clients.get(userId);
        if (userClient && userClient.ws.readyState === WebSocket.OPEN) {
          console.log(`Sending confirmation to user ${userId} (to replace optimistic update)`);
          try {
            userClient.ws.send(JSON.stringify(messageData));
            console.log(`✓ Confirmation sent successfully to user ${userId}`);
          } catch (error) {
            console.error(`✗ Failed to send confirmation to user ${userId}:`, error);
          }
        }
        
        // Send to all admins
        // CRITICAL: messageData.userId tells admin which user sent this message
        console.log(`User message - notifying ${this.adminClients.size} admins`);
        console.log(`Message userId (which user sent it): ${messageData.userId}`);
        if (this.adminClients.size === 0) {
          console.warn("WARNING: No admin clients connected to receive user message!");
        }
        this.adminClients.forEach((adminId) => {
          const adminClient = this.clients.get(adminId);
          if (adminClient && adminClient.ws.readyState === WebSocket.OPEN) {
            console.log(`Sending to admin ${adminId} (readyState: ${adminClient.ws.readyState})`);
            console.log(`  Message userId: ${messageData.userId} (this identifies which user sent it)`);
            try {
              adminClient.ws.send(JSON.stringify(messageData));
              console.log(`✓ Message sent successfully to admin ${adminId}`);
            } catch (error) {
              console.error(`✗ Failed to send to admin ${adminId}:`, error);
            }
          } else {
            console.warn(`Admin ${adminId} not available (client: ${!!adminClient}, readyState: ${adminClient?.ws.readyState})`);
          }
        });
      } else {
        // Admin sent message - send to the target user AND confirmation to admin
        console.log(`[ADMIN->USER] Admin message - sending to target user ${targetUserId}`);
        console.log(`[ADMIN->USER] Message data:`, JSON.stringify(messageData));
        console.log(`[ADMIN->USER] Current active clients:`, Array.from(this.clients.keys()));
        
        // Send to the target user (the user who owns this conversation)
        console.log(`[ADMIN->USER] Looking for user ${targetUserId} in clients map...`);
        console.log(`[ADMIN->USER] Total active clients: ${this.clients.size}`);
        console.log(`[ADMIN->USER] Active client IDs:`, Array.from(this.clients.keys()));
        
        const targetClient = this.clients.get(targetUserId);
        if (targetClient) {
          console.log(`[ADMIN->USER] ✓ Target user client found: ${targetUserId}`);
          console.log(`[ADMIN->USER] WebSocket readyState: ${targetClient.ws.readyState} (OPEN=${WebSocket.OPEN})`);
          
          if (targetClient.ws.readyState === WebSocket.OPEN) {
            try {
              // Ensure messageData has correct structure
              const messageToSend = {
                type: "message",
                id: messageData.id,
                sender: "admin", // Explicitly set to "admin"
                message: messageData.message,
                timestamp: messageData.timestamp,
                userId: messageData.userId,
              };
              
              const messageStr = JSON.stringify(messageToSend);
              console.log(`[ADMIN->USER] Preparing to send message to user ${targetUserId}:`);
              console.log(`[ADMIN->USER] Message string:`, messageStr);
              console.log(`[ADMIN->USER] Message structure:`, messageToSend);
              
              targetClient.ws.send(messageStr);
              console.log(`[ADMIN->USER] ✓✓✓ Message sent successfully to user ${targetUserId} ✓✓✓`);
              
              // Mark message as read since it was delivered
              await NwChatMessage.update(
                { isRead: true },
                { where: { id: chatMessage.id } }
              );
              console.log(`[ADMIN->USER] Message marked as read in database`);
            } catch (error) {
              console.error(`[ADMIN->USER] ✗✗✗ FAILED to send to user ${targetUserId} ✗✗✗`);
              console.error(`[ADMIN->USER] Error:`, error);
              console.error(`[ADMIN->USER] Error type:`, (error as any)?.constructor?.name);
              console.error(`[ADMIN->USER] Error stack:`, (error as Error).stack);
            }
          } else {
            const stateNames: Record<number, string> = {
              [WebSocket.CONNECTING]: "CONNECTING",
              [WebSocket.OPEN]: "OPEN",
              [WebSocket.CLOSING]: "CLOSING",
              [WebSocket.CLOSED]: "CLOSED",
            };
            const stateName = stateNames[targetClient.ws.readyState] || `UNKNOWN(${targetClient.ws.readyState})`;
            console.warn(`[ADMIN->USER] ✗ Target user ${targetUserId} WebSocket not OPEN`);
            console.warn(`[ADMIN->USER] Current state: ${stateName} (${targetClient.ws.readyState})`);
            console.warn(`[ADMIN->USER] Message saved to database (id: ${chatMessage.id}), will be delivered when user reconnects`);
          }
        } else {
          console.warn(`[ADMIN->USER] ✗ Target user ${targetUserId} NOT FOUND in clients map`);
          console.warn(`[ADMIN->USER] Available clients:`, Array.from(this.clients.keys()));
          console.warn(`[ADMIN->USER] Total active clients: ${this.clients.size}`);
          console.warn(`[ADMIN->USER] Message saved to database (id: ${chatMessage.id}), will be delivered when user reconnects`);
          console.warn(`[ADMIN->USER] User should receive message when they connect or reload history`);
        }

        // Also send confirmation to admin
        const adminClient = this.clients.get(userId);
        if (adminClient && adminClient.ws.readyState === WebSocket.OPEN) {
          console.log(`Sending confirmation to admin ${userId} (readyState: ${adminClient.ws.readyState})`);
          try {
            adminClient.ws.send(JSON.stringify(messageData));
            console.log(`✓ Confirmation sent successfully to admin ${userId}`);
          } catch (error) {
            console.error(`✗ Failed to send confirmation to admin ${userId}:`, error);
          }
        } else {
          console.warn(`Admin ${userId} not available for confirmation (client: ${!!adminClient}, readyState: ${adminClient?.ws.readyState})`);
        }
      }
    }
  }

  broadcastToAdmins(message: any) {
    this.adminClients.forEach((adminId) => {
      const adminClient = this.clients.get(adminId);
      if (adminClient) {
        adminClient.ws.send(JSON.stringify(message));
      }
    });
  }

  // Broadcast admin online/offline status to all non-admin users
  broadcastAdminStatus(isOnline: boolean) {
    const statusMessage = {
      type: "admin_status",
      isOnline,
      message: isOnline ? "Admin is now available for chat" : "Admin is offline",
    };

    console.log(`Broadcasting admin ${isOnline ? "online" : "offline"} status to all users...`);
    
    // Send to all non-admin users
    this.clients.forEach((client, clientUserId) => {
      if (!client.isAdmin && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(statusMessage));
          console.log(`Admin status sent to user ${clientUserId}`);
        } catch (error) {
          console.error(`Error sending admin status to user ${clientUserId}:`, error);
        }
      }
    });
  }

  // Get admin online status
  getAdminStatus(): boolean {
    return this.adminClients.size > 0;
  }
}

export const chatServer = new ChatServer();

