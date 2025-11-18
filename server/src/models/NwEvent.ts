import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";
import { getNwUser, getNwGuest, getNwFoodItem, getNwPrediction, getNwInviteRsvp } from "./modelLoader.js";

@Table({ tableName: "nw_events" })
export class NwEvent extends BaseModel<NwEvent> {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare title: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare eventDate: string;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  declare surveyCutoffDate: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare location: string | null;

  @AllowNull(false)
  @Default("draft")
  @Column(DataType.STRING)
  declare status: "draft" | "published" | "survey_completed" | "completed";

  @AllowNull(false)
  @Default("unpaid")
  @Column(DataType.STRING)
  declare reportStatus: "unpaid" | "pending" | "paid";

  @AllowNull(true)
  @Column(DataType.FLOAT)
  declare plannedFoodKg: number | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare inviteLink: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare notes: string | null;

  @ForeignKey(() => getNwUser())
  @Column(DataType.UUID)
  declare ownerId: string;

  @BelongsTo(() => getNwUser())
  declare owner?: any;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare scheduleSnapshot: Record<string, unknown>[] | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare expectedSnapshot: Record<string, unknown> | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare menuSnapshot: Record<string, unknown>[] | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare surveySnapshot: Record<string, unknown> | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare impactSnapshot:
    | {
      foodSavedKg?: number;
      moneySavedInr?: number;
      mealsSupported?: number;
    }
    | null;

  @HasMany(() => getNwGuest())
  declare guests?: any[];

  @HasMany(() => getNwFoodItem())
  declare menu?: any[];

  @HasMany(() => getNwPrediction())
  declare predictions?: any[];

  @HasMany(() => getNwInviteRsvp())
  declare inviteRsvps?: any[];
}

