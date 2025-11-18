import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";

@Table({ tableName: "nw_guests" })
export class NwGuest extends BaseModel<NwGuest> {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare fullName: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare phoneNumber: string | null;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare rsvpStatus: "yes" | "no" | "maybe" | "pending";

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare adultCount: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare kidCount: number;

  @Column(DataType.TEXT)
  declare notes: string | null;

  @ForeignKey(() => require("./NwEvent.js").NwEvent)
  @Column(DataType.UUID)
  declare eventId: string;

  @BelongsTo(() => require("./NwEvent.js").NwEvent)
  declare event?: any;
}









