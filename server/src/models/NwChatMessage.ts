import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";
import { getNwUser } from "./modelLoader.js";

@Table({ tableName: "nw_chat_messages" })
export class NwChatMessage extends BaseModel<NwChatMessage> {
  // userId represents the room - each user has their own room with admin
  @ForeignKey(() => getNwUser())
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string; // This identifies the chat room (user's room)

  @BelongsTo(() => getNwUser(), { foreignKey: "userId" })
  declare user?: any;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare sender: "user" | "admin";

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare message: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  declare adminId: string | null; // Admin who sent the message (if sender is admin)

  @AllowNull(false)
  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare isRead: boolean;
}

