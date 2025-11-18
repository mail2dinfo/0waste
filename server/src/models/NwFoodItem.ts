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

@Table({ tableName: "nw_food_items" })
export class NwFoodItem extends BaseModel<NwFoodItem> {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare category: "starter" | "main_course" | "dessert" | "beverage" | "other";

  @AllowNull(false)
  @Column(DataType.FLOAT)
  declare perAdultKg: number;

  @AllowNull(false)
  @Column(DataType.FLOAT)
  declare perKidKg: number;

  @ForeignKey(() => NwEvent)
  @Column(DataType.UUID)
  declare eventId: string;

  @BelongsTo(() => NwEvent)
  declare event?: NwEvent;
}









