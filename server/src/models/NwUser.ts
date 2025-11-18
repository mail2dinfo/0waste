import {
  AllowNull,
  Column,
  DataType,
  HasMany,
  Table,
  Unique,
  Default,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";
import { NwEvent } from "./NwEvent.js";

@Table({ tableName: "nw_users" })
export class NwUser extends BaseModel<NwUser> {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare fullName: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare phoneNumber: string | null;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare passwordHash: string;

  @AllowNull(false)
  @Default("product_owner")
  @Column(DataType.STRING)
  declare role: "admin" | "product_owner";

  @HasMany(() => NwEvent)
  declare events?: NwEvent[];
}

