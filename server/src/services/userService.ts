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
  } as any);
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
      fullName: "ZeroVaste Admin",
      email: DEFAULT_ADMIN_EMAIL,
      phoneNumber: DEFAULT_ADMIN_PHONE,
      passwordHash: DEFAULT_ADMIN_PASSWORD,
      role: "admin",
    } as any,
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

export async function ensureEmailColumnNullable() {
  try {
    // Check if email column has NOT NULL constraint by querying the database directly
    const [results] = await sequelize.query(`
      SELECT 
        column_name, 
        is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'nw_users' 
      AND column_name = 'email';
    `) as Array<Array<{ column_name: string; is_nullable: string }>>;
    
    if (results && results.length > 0 && results[0].is_nullable === 'NO') {
      // Email column exists but is NOT NULL, need to make it nullable
      await sequelize.query(
        'ALTER TABLE "nw_users" ALTER COLUMN "email" DROP NOT NULL;'
      );
      console.log("Updated email column to allow NULL values");
    }
  } catch (error) {
    console.error("Failed to update email column to allow NULL", error);
    // Don't throw - allow server to continue even if migration fails
  }
}

export async function ensurePasswordHashColumnNullable() {
  try {
    // Check if passwordHash column has NOT NULL constraint by querying the database directly
    const [results] = await sequelize.query(`
      SELECT 
        column_name, 
        is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'nw_users' 
      AND column_name = 'passwordHash';
    `) as Array<Array<{ column_name: string; is_nullable: string }>>;
    
    if (results && results.length > 0 && results[0].is_nullable === 'NO') {
      // passwordHash column exists but is NOT NULL, need to make it nullable
      await sequelize.query(
        'ALTER TABLE "nw_users" ALTER COLUMN "passwordHash" DROP NOT NULL;'
      );
      console.log("Updated passwordHash column to allow NULL values");
    }
  } catch (error) {
    console.error("Failed to update passwordHash column to allow NULL", error);
    // Don't throw - allow server to continue even if migration fails
  }
}

