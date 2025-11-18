import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { BaseModel } from "./BaseModel.js";

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

  @ForeignKey(() => require("./NwEvent.js").NwEvent)
  @Column(DataType.UUID)
  declare eventId: string;

  @BelongsTo(() => require("./NwEvent.js").NwEvent)
  declare event?: any;
}









