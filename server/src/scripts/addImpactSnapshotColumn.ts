import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

async function addImpactSnapshotColumn() {
  const queryInterface = sequelize.getQueryInterface();

  const tableDescription = await queryInterface.describeTable("nw_events");
  if (tableDescription.impactSnapshot) {
    console.log("impactSnapshot column already exists. No action needed.");
    return;
  }

  await queryInterface.addColumn("nw_events", "impactSnapshot", {
    type: DataTypes.JSONB,
    allowNull: true,
  });

  console.log("impactSnapshot column added to nw_events.");
}

addImpactSnapshotColumn()
  .catch((error) => {
    console.error("Failed to add impactSnapshot column", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });








