import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";

@Table({ tableName: "nw_report_payments" })
export class NwReportPayment extends BaseModel<NwReportPayment> {
  @ForeignKey(() => require("./NwUser.js").NwUser)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => require("./NwUser.js").NwUser)
  declare user?: any;

  @ForeignKey(() => require("./NwEvent.js").NwEvent)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare eventId: string;

  @BelongsTo(() => require("./NwEvent.js").NwEvent)
  declare event?: any;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare currencyCode: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare amount: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare method: "upi" | "card";

  @AllowNull(false)
  @Default("success")
  @Column(DataType.STRING)
  declare status: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare paymentDetails: Record<string, unknown> | null;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare paidAt: Date;
}





