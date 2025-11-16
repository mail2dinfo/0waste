import {
  Column,
  CreatedAt,
  DataType,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { Model } from "sequelize-typescript";

@Table({ timestamps: true, paranoid: false })
export class BaseModel<T> extends Model<T> {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
  declare id: string;

  @CreatedAt
  @Column({ type: DataType.DATE })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  declare updatedAt: Date;
}

