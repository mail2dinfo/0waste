import {
  AllowNull,
  Column,
  DataType,
  PrimaryKey,
  Table,
  Default,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";

@Table({ tableName: "nw_settings" })
export class NwSettings extends BaseModel<NwSettings> {
  @PrimaryKey
  @Column(DataType.STRING)
  declare key: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare value: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare description: string | null;
}

