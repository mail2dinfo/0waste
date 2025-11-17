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
import { NwUser } from "./NwUser.js";
import { NwGuest } from "./NwGuest.js";
import { NwFoodItem } from "./NwFoodItem.js";
import { NwPrediction } from "./NwPrediction.js";
import { NwInviteRsvp } from "./NwInviteRsvp.js";

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

  @ForeignKey(() => NwUser)
  @Column(DataType.UUID)
  declare ownerId: string;

  @BelongsTo(() => NwUser)
  declare owner?: NwUser;

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

  @HasMany(() => NwGuest)
  declare guests?: NwGuest[];

  @HasMany(() => NwFoodItem)
  declare menu?: NwFoodItem[];

  @HasMany(() => NwPrediction)
  declare predictions?: NwPrediction[];

  @HasMany(() => NwInviteRsvp)
  declare inviteRsvps?: NwInviteRsvp[];
}

