import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";
import { NwUser } from "./NwUser.js";

@Table({ tableName: "nw_chat_messages" })
export class NwChatMessage extends BaseModel<NwChatMessage> {
  @ForeignKey(() => NwUser)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => NwUser)
  declare user?: NwUser;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare sender: "user" | "admin";

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare message: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  declare adminId: string | null;

  @AllowNull(false)
  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare isRead: boolean;
}

