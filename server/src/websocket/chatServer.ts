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
              console.log(`Received message from ${isAdmin ? "admin" : "user"} ${userId}:`, message);
              console.log(`Raw message string:`, messageStr);
              console.log(`Message has targetUserId:`, !!message.targetUserId, `value:`, message.targetUserId);
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
            this.clients.delete(userId);
            if (isAdmin) {
              this.adminClients.delete(userId);
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
      console.log(`Processing message from ${isAdmin ? "admin" : "user"} ${userId}:`, message);
      const targetUserId = isAdmin ? message.targetUserId : userId;
      
      if (!targetUserId) {
        console.error(`ERROR: No targetUserId! isAdmin: ${isAdmin}, message.targetUserId: ${message.targetUserId}, userId: ${userId}`);
        const client = this.clients.get(userId);
        if (client) {
          client.ws.send(
            JSON.stringify({
              type: "error",
              message: "Target user ID required",
            })
          );
        }
        return;
      }
      
      console.log(`Message targetUserId: ${targetUserId}`);

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

      const messageData = {
        type: "message",
        id: chatMessage.id,
        sender: chatMessage.sender,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt.toISOString(),
        userId: targetUserId,
        userName: userName,
        userEmail: userEmail,
      };

      console.log(`Broadcasting message:`, messageData);
      console.log(`Sender isAdmin: ${isAdmin}, sender userId: ${userId}, targetUserId: ${targetUserId}`);
      console.log(`Active admins:`, Array.from(this.adminClients));
      console.log(`Active clients:`, Array.from(this.clients.keys()));

      if (!isAdmin) {
        // User sent message - send confirmation back to user (to replace optimistic update)
        // and send to all admins
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
        console.log(`User message - notifying ${this.adminClients.size} admins`);
        if (this.adminClients.size === 0) {
          console.warn("WARNING: No admin clients connected to receive user message!");
        }
        this.adminClients.forEach((adminId) => {
          const adminClient = this.clients.get(adminId);
          if (adminClient && adminClient.ws.readyState === WebSocket.OPEN) {
            console.log(`Sending to admin ${adminId} (readyState: ${adminClient.ws.readyState})`);
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
        const targetClient = this.clients.get(targetUserId);
        if (targetClient) {
          console.log(`[ADMIN->USER] Target user client found: ${targetUserId}, readyState: ${targetClient.ws.readyState}, OPEN: ${WebSocket.OPEN}`);
          if (targetClient.ws.readyState === WebSocket.OPEN) {
            try {
              const messageStr = JSON.stringify(messageData);
              console.log(`[ADMIN->USER] Sending message string to user ${targetUserId}:`, messageStr);
              console.log(`[ADMIN->USER] Message data structure:`, {
                type: messageData.type,
                id: messageData.id,
                sender: messageData.sender,
                message: messageData.message,
                timestamp: messageData.timestamp,
                userId: messageData.userId,
              });
              targetClient.ws.send(messageStr);
              console.log(`[ADMIN->USER] ✓ Message sent successfully to user ${targetUserId}`);
              // Mark message as read since it was delivered
              await NwChatMessage.update(
                { isRead: true },
                { where: { id: chatMessage.id } }
              );
            } catch (error) {
              console.error(`[ADMIN->USER] ✗ Failed to send to user ${targetUserId}:`, error);
              console.error(`[ADMIN->USER] Error details:`, error);
              console.error(`[ADMIN->USER] Error stack:`, (error as Error).stack);
            }
          } else {
            console.warn(`[ADMIN->USER] Target user ${targetUserId} WebSocket not OPEN (readyState: ${targetClient.ws.readyState})`);
            console.warn(`[ADMIN->USER] WebSocket states: OPEN=${WebSocket.OPEN}, CONNECTING=${WebSocket.CONNECTING}, CLOSING=${WebSocket.CLOSING}, CLOSED=${WebSocket.CLOSED}`);
            console.warn(`[ADMIN->USER] Message saved to database (id: ${chatMessage.id}), will be delivered when user reconnects`);
          }
        } else {
          console.warn(`[ADMIN->USER] Target user ${targetUserId} not found in clients map`);
          console.warn(`[ADMIN->USER] Available clients:`, Array.from(this.clients.keys()));
          console.warn(`[ADMIN->USER] Total active clients: ${this.clients.size}`);
          console.warn(`[ADMIN->USER] Message saved to database (id: ${chatMessage.id}), will be delivered when user reconnects`);
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
}

export const chatServer = new ChatServer();

