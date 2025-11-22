import { Sequelize } from "sequelize-typescript";
import { env } from "../config/env.js";
import { NwUser } from "../models/NwUser.js";
import { NwEvent } from "../models/NwEvent.js";
import { NwGuest } from "../models/NwGuest.js";
import { NwFoodItem } from "../models/NwFoodItem.js";
import { NwPrediction } from "../models/NwPrediction.js";
import { NwInviteRsvp } from "../models/NwInviteRsvp.js";
import { NwReportPricing } from "../models/NwReportPricing.js";
import { NwReportPayment } from "../models/NwReportPayment.js";
import { NwSettings } from "../models/NwSettings.js";
import { NwChatMessage } from "../models/NwChatMessage.js";

// Custom logger that only logs when explicitly enabled
function createDatabaseLogger() {
  if (!env.databaseLogging) {
    // Return a no-op function to completely disable logging
    return () => {};
  }
  // Only log SQL queries, not connection pool messages
  return (msg: string) => {
    // Filter out verbose connection pool messages
    if (msg.includes("@node") || msg.includes("connection pool")) {
      return;
    }
    console.log(msg);
  };
}

function buildSequelize(): Sequelize {
  const logger = createDatabaseLogger();
  
  // Use DATABASE_URL if provided (e.g., Render PostgreSQL connection string)
  if (env.databaseUrl) {
    return new Sequelize(env.databaseUrl, {
      logging: logger,
      models: [
        NwUser,
        NwEvent,
        NwGuest,
        NwFoodItem,
        NwPrediction,
        NwInviteRsvp,
        NwReportPricing,
        NwReportPayment,
        NwSettings,
        NwChatMessage,
      ],
      dialectOptions: env.dbSsl
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : undefined,
    });
  }

  // Use individual DB config from environment variables
  if (!env.dbHost) {
    throw new Error(
      "Database configuration missing. Please set DB_HOST or DATABASE_URL environment variable."
    );
  }

  const hostConfig = {
    host: env.dbHost,
    database: env.dbName,
    username: env.dbUser,
    password: env.dbPassword,
    port: env.dbPort,
    ssl: env.dbSsl,
  };

  return new Sequelize({
    database: hostConfig.database,
    username: hostConfig.username,
    password: hostConfig.password,
    host: hostConfig.host,
    port: hostConfig.port,
    dialect: "postgres",
    logging: logger,
    dialectOptions: hostConfig.ssl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : undefined,
    pool: { max: 10, min: 0, acquire: 60000, idle: 20000 },
    models: [
      NwUser,
      NwEvent,
      NwGuest,
      NwFoodItem,
      NwPrediction,
      NwInviteRsvp,
      NwReportPricing,
      NwReportPayment,
      NwSettings,
      NwChatMessage,
    ],
  });
}

export const sequelize = buildSequelize();

