import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { NwChatMessage } from "../models/NwChatMessage.js";
import { NwUser } from "../models/NwUser.js";

interface ChatClient {
  ws: WebSocket;
  userId: string;
  isAdmin: boolean;
  userName?: string;
}

// Room represents a chat between a user and admin
interface ChatRoom {
  roomId: string; // userId of the user
  userId: string;
  userName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

class ChatServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ChatClient> = new Map(); // userId -> client
  private adminClients: Set<string> = new Set(); // Set of admin userIds
  private rooms: Map<string, ChatRoom> = new Map(); // roomId (userId) -> room info
  private isOriginAllowed: ((origin: string | undefined) => boolean) | null = null;

  initialize(server: any, originChecker?: (origin: string | undefined) => boolean) {
    this.isOriginAllowed = originChecker || null;
    
    this.wss = new WebSocketServer({ 
      server,
      path: "/chat",
      verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
        if (this.isOriginAllowed) {
          return this.isOriginAllowed(info.origin);
        }
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

      this.handleConnection(ws, userId);
    });

    // Periodic cleanup of stale connections (every 60 seconds)
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000);
  }

  private async handleConnection(ws: WebSocket, userId: string) {
    try {
      const user = await NwUser.findByPk(userId);
      if (!user) {
        ws.close(1008, "User not found");
        return;
      }

      const isAdmin = user.role === "admin";
      const userName = user.fullName || `User ${userId.substring(0, 8)}`;

      console.log(`[ChatServer] ${isAdmin ? "Admin" : "User"} ${userId} (${userName}) connecting`);

      // Store client
      this.clients.set(userId, { ws, userId, isAdmin, userName });

      // If admin, add to admin set and broadcast availability
      if (isAdmin) {
        this.adminClients.add(userId);
        console.log(`[ChatServer] Admin ${userId} online. Total admins: ${this.adminClients.size}`);
        this.broadcastAdminStatus(true);
        // Send list of online users to admin
        this.sendOnlineUsersToAdmin(userId);
      } else {
        // Notify all admins that user came online (only if connection is actually open)
        if (ws.readyState === WebSocket.OPEN) {
          this.broadcastUserStatus(userId, true);
        }
      }

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: "connected",
        isAdmin,
        userId,
        userName,
      }));

      // If user (not admin), send admin status
      if (!isAdmin) {
        const adminOnline = this.adminClients.size > 0;
        ws.send(JSON.stringify({
          type: "admin_status",
          isOnline: adminOnline,
        }));
      }

      // Load chat history
      await this.loadChatHistory(userId, ws, isAdmin);

      // Set up ping/pong to detect dead connections
      let pongReceived = true;
      let missedPongs = 0;
      
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            // If we haven't received pong from last ping, increment missed count
            if (!pongReceived) {
              missedPongs++;
              console.log(`[ChatServer] User ${userId} missed ${missedPongs} pong(s)`);
              
              // If missed 2 pongs in a row, consider connection dead
              if (missedPongs >= 2) {
                console.log(`[ChatServer] User ${userId} connection appears dead, closing`);
                clearInterval(pingInterval);
                ws.terminate();
                this.clients.delete(userId);
                if (isAdmin) {
                  this.adminClients.delete(userId);
                } else {
                  this.broadcastUserStatus(userId, false);
                }
                return;
              }
            }
            
            pongReceived = false;
            ws.ping();
          } catch (error) {
            console.error(`[ChatServer] Error sending ping to ${userId}:`, error);
            clearInterval(pingInterval);
            this.clients.delete(userId);
            if (isAdmin) {
              this.adminClients.delete(userId);
            } else {
              this.broadcastUserStatus(userId, false);
            }
          }
        } else {
          clearInterval(pingInterval);
        }
      }, 30000); // Ping every 30 seconds

      // Handle pong responses
      ws.on("pong", () => {
        pongReceived = true;
        missedPongs = 0; // Reset missed pongs counter
      });

      // Handle messages
      ws.on("message", async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(userId, message, isAdmin);
        } catch (error) {
          console.error(`[ChatServer] Error handling message from ${userId}:`, error);
          ws.send(JSON.stringify({
            type: "error",
            message: "Failed to process message",
          }));
        }
      });

      // Handle close
      ws.on("close", (code, reason) => {
        console.log(`[ChatServer] ${isAdmin ? "Admin" : "User"} ${userId} disconnected (code: ${code}, reason: ${reason.toString()})`);
        clearInterval(pingInterval);
        
        // Only notify if we still have this client (might have been removed already)
        const hadClient = this.clients.has(userId);
        this.clients.delete(userId);
        
        if (isAdmin) {
          this.adminClients.delete(userId);
          if (this.adminClients.size === 0) {
            this.broadcastAdminStatus(false);
          }
        } else if (hadClient) {
          // Notify all admins that user went offline (only if they were actually connected)
          this.broadcastUserStatus(userId, false);
        }
      });

      // Handle error
      ws.on("error", (error: Error) => {
        console.error(`[ChatServer] WebSocket error for ${userId}:`, error);
        this.clients.delete(userId);
        if (isAdmin) {
          this.adminClients.delete(userId);
        }
      });

    } catch (error) {
      console.error(`[ChatServer] Error handling connection for ${userId}:`, error);
      ws.close(1008, "Connection error");
    }
  }

  private async loadChatHistory(userId: string, ws: WebSocket, isAdmin: boolean) {
    try {
      let messages;
      
      if (isAdmin) {
        // Admin sees all messages from all rooms
        messages = await NwChatMessage.findAll({
          include: [{ 
            model: NwUser, 
            as: "user", 
            attributes: ["id", "fullName", "email"] 
          }],
          order: [["createdAt", "ASC"]],
          limit: 500,
        });

        // Build room list for admin
        const roomMap = new Map<string, ChatRoom>();
          messages.forEach((msg) => {
            const roomId = msg.userId; // userId is the room identifier
            if (!roomMap.has(roomId)) {
              const user = (msg as any).user;
              roomMap.set(roomId, {
                roomId,
                userId: roomId,
                userName: user?.fullName || `User ${roomId.substring(0, 8)}`,
                lastMessage: msg.message,
                lastMessageTime: msg.createdAt,
                unreadCount: 0,
              });
            } else {
              const room = roomMap.get(roomId)!;
              if (msg.createdAt > room.lastMessageTime!) {
                room.lastMessage = msg.message;
                room.lastMessageTime = msg.createdAt;
              }
            }
          });

        // Send room list to admin
        ws.send(JSON.stringify({
          type: "rooms",
          rooms: Array.from(roomMap.values()),
        }));

      } else {
        // User sees only their room messages
        messages = await NwChatMessage.findAll({
          where: { userId: userId }, // userId is the room identifier
          order: [["createdAt", "ASC"]],
          limit: 500,
        });

        // Mark admin messages as read
        const unreadIds = messages
          .filter((msg) => msg.sender === "admin" && !msg.isRead)
          .map((msg) => msg.id);
        
        if (unreadIds.length > 0) {
          await NwChatMessage.update(
            { isRead: true },
            { where: { id: unreadIds, userId: userId } }
          );
        }
      }

      // Send history
      ws.send(JSON.stringify({
        type: "history",
        messages: messages.map((msg) => ({
          id: msg.id,
          roomId: msg.userId, // userId is the room identifier
          sender: msg.sender,
          message: msg.message,
          timestamp: msg.createdAt.toISOString(),
          userName: (msg as any).user?.fullName || null,
        })),
      }));

    } catch (error) {
      console.error(`[ChatServer] Error loading history for ${userId}:`, error);
    }
  }

  private async handleMessage(userId: string, message: any, isAdmin: boolean) {
    if (message.type === "load_history") {
      const client = this.clients.get(userId);
      if (client) {
        await this.loadChatHistory(userId, client.ws, isAdmin);
      }
      return;
    }

    if (message.type === "message") {
      const roomId = isAdmin ? message.roomId : userId;
      
      if (!roomId) {
        console.error(`[ChatServer] No roomId in message from ${isAdmin ? "admin" : "user"} ${userId}`);
        const client = this.clients.get(userId);
        if (client) {
          client.ws.send(JSON.stringify({
            type: "error",
            message: "Room ID required",
          }));
        }
        return;
      }

      // Validate message text
      const messageText = message.message?.trim();
      if (!messageText) {
        return;
      }

      // Create message in database
      // roomId is stored as userId in the database
      const chatMessage = await NwChatMessage.create({
        userId: roomId, // userId column stores the room identifier
        sender: isAdmin ? "admin" : "user",
        message: messageText,
        adminId: isAdmin ? userId : null,
        isRead: false,
      } as any);

      // Get user info for display
      let userName: string | null = null;
      if (!isAdmin) {
        try {
          const user = await NwUser.findByPk(roomId);
          userName = user?.fullName || null;
        } catch (error) {
          console.error(`[ChatServer] Error fetching user info:`, error);
        }
      }

      const messageData = {
        type: "message",
        id: chatMessage.id,
        roomId,
        sender: chatMessage.sender,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt.toISOString(),
        userName,
      };

      if (isAdmin) {
        // Admin sent message - send to the user in that room
        const targetClient = this.clients.get(roomId);
        if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
          targetClient.ws.send(JSON.stringify(messageData));
          // Mark as read since delivered
          await NwChatMessage.update(
            { isRead: true },
            { where: { id: chatMessage.id } }
          );
        }

        // Send confirmation to admin
        const adminClient = this.clients.get(userId);
        if (adminClient && adminClient.ws.readyState === WebSocket.OPEN) {
          adminClient.ws.send(JSON.stringify(messageData));
        }

        // Update room info for all admins
        this.broadcastRoomUpdate(roomId, messageData);

      } else {
        // User sent message - send to all admins
        const userClient = this.clients.get(userId);
        if (userClient && userClient.ws.readyState === WebSocket.OPEN) {
          userClient.ws.send(JSON.stringify(messageData));
        }

        // Send to all admins
        this.adminClients.forEach((adminId) => {
          const adminClient = this.clients.get(adminId);
          if (adminClient && adminClient.ws.readyState === WebSocket.OPEN) {
            adminClient.ws.send(JSON.stringify(messageData));
          }
        });

        // Update room info for admins
        this.broadcastRoomUpdate(roomId, messageData);
      }
    }
  }

  private async broadcastRoomUpdate(roomId: string, messageData: any) {
    try {
      // Get user info for room
      const user = await NwUser.findByPk(roomId);
      const userName = user?.fullName || `User ${roomId.substring(0, 8)}`;

      // Get unread count (admin messages not read by user)
      const unreadCount = await NwChatMessage.count({
        where: { 
          userId: roomId, // userId column stores the room identifier
          sender: "admin", 
          isRead: false 
        },
      });

      const roomUpdate = {
        type: "room_update",
        room: {
          roomId,
          userId: roomId,
          userName,
          lastMessage: messageData.message,
          lastMessageTime: messageData.timestamp,
          unreadCount,
        },
      };

      // Send to all admins
      this.adminClients.forEach((adminId) => {
        const adminClient = this.clients.get(adminId);
        if (adminClient && adminClient.ws.readyState === WebSocket.OPEN) {
          adminClient.ws.send(JSON.stringify(roomUpdate));
        }
      });
    } catch (error) {
      console.error(`[ChatServer] Error broadcasting room update:`, error);
    }
  }

  private broadcastAdminStatus(isOnline: boolean) {
    const statusMessage = {
      type: "admin_status",
      isOnline,
    };

    // Send to all non-admin users
    this.clients.forEach((client, clientUserId) => {
      if (!client.isAdmin && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(statusMessage));
        } catch (error) {
          console.error(`[ChatServer] Error sending admin status to ${clientUserId}:`, error);
        }
      }
    });
  }

  private sendOnlineUsersToAdmin(adminId: string) {
    const adminClient = this.clients.get(adminId);
    if (!adminClient || adminClient.ws.readyState !== WebSocket.OPEN) return;

    // Get all online non-admin user IDs - ONLY if their WebSocket is OPEN
    const onlineUserIds = Array.from(this.clients.entries())
      .filter(([id, client]) => {
        // Only include non-admin users with OPEN WebSocket connections
        return !client.isAdmin && client.ws.readyState === WebSocket.OPEN;
      })
      .map(([id]) => id);

    try {
      adminClient.ws.send(JSON.stringify({
        type: "online_users",
        userIds: onlineUserIds,
      }));
      console.log(`[ChatServer] Sent ${onlineUserIds.length} online users to admin ${adminId}`);
    } catch (error) {
      console.error(`[ChatServer] Error sending online users to admin ${adminId}:`, error);
    }
  }

  private broadcastUserStatus(userId: string, isOnline: boolean) {
    // Verify the user's actual connection state before broadcasting
    if (isOnline) {
      const userClient = this.clients.get(userId);
      // Only broadcast online if connection is actually OPEN
      if (!userClient || userClient.ws.readyState !== WebSocket.OPEN) {
        console.log(`[ChatServer] User ${userId} not actually online (readyState: ${userClient?.ws.readyState}), skipping online broadcast`);
        return;
      }
    }

    const statusMessage = {
      type: "user_status",
      userId,
      isOnline,
    };

    // Send to all admins
    this.adminClients.forEach((adminId) => {
      const adminClient = this.clients.get(adminId);
      if (adminClient && adminClient.ws.readyState === WebSocket.OPEN) {
        try {
          adminClient.ws.send(JSON.stringify(statusMessage));
        } catch (error) {
          console.error(`[ChatServer] Error sending user status to admin ${adminId}:`, error);
        }
      }
    });
  }

  // Periodic cleanup of stale connections
  private cleanupStaleConnections() {
    const staleUsers: string[] = [];
    
    this.clients.forEach((client, userId) => {
      // Remove clients with closed/closing connections
      if (client.ws.readyState === WebSocket.CLOSED || client.ws.readyState === WebSocket.CLOSING) {
        staleUsers.push(userId);
      }
    });

    staleUsers.forEach((userId) => {
      console.log(`[ChatServer] Cleaning up stale connection for ${userId}`);
      const client = this.clients.get(userId);
      this.clients.delete(userId);
      
      if (client?.isAdmin) {
        this.adminClients.delete(userId);
        if (this.adminClients.size === 0) {
          this.broadcastAdminStatus(false);
        }
      } else {
        this.broadcastUserStatus(userId, false);
      }
    });

    if (staleUsers.length > 0) {
      console.log(`[ChatServer] Cleaned up ${staleUsers.length} stale connection(s)`);
    }
  }
}

export const chatServer = new ChatServer();

