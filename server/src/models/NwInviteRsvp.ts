import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";
import { getNwEvent } from "./modelLoader.js";

@Table({ tableName: "nw_invite_rsvps" })
export class NwInviteRsvp extends BaseModel<NwInviteRsvp> {
  @ForeignKey(() => getNwEvent())
  @AllowNull(false)
  @Column(DataType.UUID)
  declare eventId: string;

  @BelongsTo(() => getNwEvent())
  declare event?: any;

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

  // Legacy fields - kept for backward compatibility
  @AllowNull(true)
  @Column(DataType.JSONB)
  declare scheduleIds: string[] | null;

  // New field: schedule-specific responses
  @AllowNull(true)
  @Column(DataType.JSONB)
  declare scheduleResponses: Record<string, {
    attending: boolean;
    adults: number;
    kids: number;
    arrivalSlot: string | null;
    transportMode: string | null;
    reminderPreference: string[] | null;
    carCount: number;
    bikeCount: number;
  }> | null;
}
