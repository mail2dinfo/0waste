import { NwSettings } from "../models/NwSettings.js";

const DEFAULT_UPI_ID = "zerowaste@upi";
const DEFAULT_UPI_NAME = "Zerowaste";

export async function getUpiSettings() {
  const upiIdSetting = await NwSettings.findOne({ where: { key: "upi_id" } });
  const upiNameSetting = await NwSettings.findOne({ where: { key: "upi_name" } });
  const qrCodeSetting = await NwSettings.findOne({ where: { key: "qr_code_image" } });

  return {
    upiId: upiIdSetting?.value ?? DEFAULT_UPI_ID,
    upiName: upiNameSetting?.value ?? DEFAULT_UPI_NAME,
    qrCodeImage: qrCodeSetting?.value ?? null,
  };
}

export async function updateUpiSettings(upiId: string, upiName: string, qrCodeImage?: string | null) {
  if (!upiId || !upiId.trim()) {
    throw new Error("UPI ID is required");
  }
  if (!/^[\w.\-]{2,}@([\w\-]{2,})$/.test(upiId.trim())) {
    throw new Error("Invalid UPI ID format");
  }

  // Find or create settings by key
  let upiIdSetting = await NwSettings.findOne({ where: { key: "upi_id" } });
  if (upiIdSetting) {
    upiIdSetting.value = upiId.trim();
    upiIdSetting.description = "UPI ID for receiving payments";
    await upiIdSetting.save();
  } else {
    upiIdSetting = await NwSettings.create({
      key: "upi_id",
      value: upiId.trim(),
      description: "UPI ID for receiving payments",
    });
  }

  let upiNameSetting = await NwSettings.findOne({ where: { key: "upi_name" } });
  if (upiNameSetting) {
    upiNameSetting.value = (upiName || DEFAULT_UPI_NAME).trim();
    upiNameSetting.description = "Display name for UPI payments";
    await upiNameSetting.save();
  } else {
    upiNameSetting = await NwSettings.create({
      key: "upi_name",
      value: (upiName || DEFAULT_UPI_NAME).trim(),
      description: "Display name for UPI payments",
    });
  }

  // Handle QR code image upload
  if (qrCodeImage !== undefined) {
    let qrCodeSetting = await NwSettings.findOne({ where: { key: "qr_code_image" } });
    if (qrCodeImage && qrCodeImage.trim()) {
      if (qrCodeSetting) {
        qrCodeSetting.value = qrCodeImage.trim();
        qrCodeSetting.description = "Uploaded QR code image (base64)";
        await qrCodeSetting.save();
      } else {
        await NwSettings.create({
          key: "qr_code_image",
          value: qrCodeImage.trim(),
          description: "Uploaded QR code image (base64)",
        });
      }
    } else if (qrCodeSetting) {
      // Remove QR code if empty string is passed
      await qrCodeSetting.destroy();
    }
  }

  const qrCodeSetting = await NwSettings.findOne({ where: { key: "qr_code_image" } });

  return {
    upiId: upiIdSetting.value,
    upiName: upiNameSetting.value,
    qrCodeImage: qrCodeSetting?.value ?? null,
  };
}

export async function ensureDefaultSettings() {
  const existing = await NwSettings.findOne({ where: { key: "upi_id" } });
  if (!existing) {
    await NwSettings.create({
      key: "upi_id",
      value: DEFAULT_UPI_ID,
      description: "UPI ID for receiving payments",
    });
  }

  const existingName = await NwSettings.findOne({ where: { key: "upi_name" } });
  if (!existingName) {
    await NwSettings.create({
      key: "upi_name",
      value: DEFAULT_UPI_NAME,
      description: "Display name for UPI payments",
    });
  }
}

