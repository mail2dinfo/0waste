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

const defaultRenderConfig = {
  host: "dpg-d4dmojemcj7s73edtop0-a",
  database: "zerovaste",
  username: "zerovaste_user",
  password: "TDN6XLUg84Xzb0u4lDkeZiIsYrEWFI27",
  port: 5432,
  ssl: true,
};

function buildSequelize(): Sequelize {
  if (env.databaseUrl) {
    return new Sequelize(env.databaseUrl, {
      logging: env.databaseLogging ? console.log : false,
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

  const hostConfig = env.dbHost
    ? {
      host: env.dbHost,
      database: env.dbName,
      username: env.dbUser,
      password: env.dbPassword,
      port: env.dbPort,
      ssl: env.dbSsl,
    }
    : defaultRenderConfig;

  return new Sequelize({
    database: hostConfig.database,
    username: hostConfig.username,
    password: hostConfig.password,
    host: hostConfig.host,
    port: hostConfig.port,
    dialect: "postgres",
    logging: env.databaseLogging ? console.log : false,
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

