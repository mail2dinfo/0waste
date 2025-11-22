import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

async function createReportPaymentsTable() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await queryInterface.describeTable("nw_report_payments");
    console.log("nw_report_payments table already exists. No action needed.");
    return;
  } catch (error) {
    console.log("nw_report_payments table missing. Creating table...");
  }

  await queryInterface.createTable("nw_report_payments", {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "nw_users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "nw_events",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    currencyCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "success",
    },
    paymentDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("nw_report_payments", ["eventId"]);
  await queryInterface.addIndex("nw_report_payments", ["userId"]);

  console.log("nw_report_payments table created successfully.");
}

createReportPaymentsTable()
  .catch((error) => {
    console.error("Failed to create nw_report_payments table", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });













