import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";

@Table({ tableName: "nw_predictions" })
export class NwPrediction extends BaseModel<NwPrediction> {
  @AllowNull(false)
  @Column(DataType.JSONB)
  declare inputSnapshot: Record<string, unknown>;

  @AllowNull(false)
  @Column(DataType.JSONB)
  declare outputRecommendation: Record<string, unknown>;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare generator: "rule-based" | "ai";

  @ForeignKey(() => require("./NwEvent.js").NwEvent)
  @Column(DataType.UUID)
  declare eventId: string;

  @BelongsTo(() => require("./NwEvent.js").NwEvent)
  declare event?: any;
}









