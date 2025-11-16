import { NwUser } from "../models/NwUser.js";
import { sequelize } from "../db/sequelize.js";

const DEFAULT_ADMIN_PHONE = "9942393231";
const DEFAULT_ADMIN_EMAIL = "admin@nowaste.in";
const DEFAULT_ADMIN_PASSWORD = "1";

export async function createUser(payload: Partial<NwUser>) {
  const role = payload.role ?? "product_owner";
  return NwUser.create({
    ...payload,
    role,
  });
}

export async function findUserByEmail(email: string) {
  return NwUser.findOne({ where: { email } });
}

export async function findUserByPhone(phoneNumber: string) {
  return NwUser.findOne({ where: { phoneNumber } });
}

export function findUserById(id: string) {
  return NwUser.findByPk(id);
}

export async function requestOtp(phoneNumber: string) {
  // TODO: Integrate with SMS provider (e.g., Twilio/WhatsApp)
  const otp = "000000";
  console.log(`[OTP] Sending login code ${otp} to ${phoneNumber}`);
  return { phoneNumber, otp };
}

export async function verifyOtp(phoneNumber: string, otp: string) {
  console.log(`[OTP] Verifying code ${otp} for ${phoneNumber}`);
  return otp === "000000";
}

export async function ensureDefaultAdmin() {
  await ensureUserRoleColumn();

  const [admin, created] = await NwUser.findOrCreate({
    where: { phoneNumber: DEFAULT_ADMIN_PHONE },
    defaults: {
      fullName: "ZeroWaste Admin",
      email: DEFAULT_ADMIN_EMAIL,
      phoneNumber: DEFAULT_ADMIN_PHONE,
      passwordHash: DEFAULT_ADMIN_PASSWORD,
      role: "admin",
    },
  });

  if (!created) {
    const updates: Partial<NwUser> = {};
    if (admin.role !== "admin") {
      updates.role = "admin";
    }
    if (admin.passwordHash !== DEFAULT_ADMIN_PASSWORD) {
      updates.passwordHash = DEFAULT_ADMIN_PASSWORD;
    }
    if (!admin.email) {
      updates.email = DEFAULT_ADMIN_EMAIL;
    }
    if (Object.keys(updates).length > 0) {
      await admin.update(updates);
    }
  }
}

export async function ensureUserRoleColumn() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const description = await queryInterface.describeTable("nw_users").catch(() => null);
    const hasRoleColumn = description ? "role" in description : false;
    if (!hasRoleColumn) {
      await sequelize.query(
        'ALTER TABLE "nw_users" ADD COLUMN "role" VARCHAR(32) NOT NULL DEFAULT \'product_owner\';'
      );
    }
  } catch (error) {
    console.error("Failed to ensure role column on nw_users", error);
    throw error;
  }
}

