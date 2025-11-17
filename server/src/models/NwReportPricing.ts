import {
  AllowNull,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
  Unique,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";
import { NwUser } from "./NwUser.js";

@Table({ tableName: "nw_report_pricing" })
export class NwReportPricing extends BaseModel<NwReportPricing> {
  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  declare countryCode: string;

  @AllowNull(false)
  @Default("INR")
  @Column(DataType.STRING)
  declare currencyCode: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare amount: number;

  @AllowNull(true)
  @ForeignKey(() => NwUser)
  @Column(DataType.UUID)
  declare updatedByUserId: string | null;
}






