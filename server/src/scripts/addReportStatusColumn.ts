import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

async function addReportStatusColumn() {
  const queryInterface = sequelize.getQueryInterface();

  const tableDescription = await queryInterface.describeTable("nw_events");
  if (tableDescription.reportStatus) {
    console.log("reportStatus column already exists on nw_events. No action needed.");
    return;
  }

  await queryInterface.addColumn("nw_events", "reportStatus", {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "unpaid",
  });

  console.log("reportStatus column added to nw_events.");
}

addReportStatusColumn()
  .catch((error) => {
    console.error("Failed to add reportStatus column", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });










