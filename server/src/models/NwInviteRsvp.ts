import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";
import type { NwEvent } from "./NwEvent.js";

@Table({ tableName: "nw_invite_rsvps" })
export class NwInviteRsvp extends BaseModel<NwInviteRsvp> {
  @ForeignKey(() => NwEvent)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare eventId: string;

  @BelongsTo(() => NwEvent)
  declare event?: NwEvent;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare attending: boolean;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare adults: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare kids: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare arrivalSlot: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare transportMode: string | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare reminderPreference: string[] | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare notes: string | null;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare carCount: number;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare bikeCount: number;
}
