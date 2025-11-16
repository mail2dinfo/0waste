import { Op } from "sequelize";
import { NwReportPricing } from "../models/NwReportPricing.js";

const DEFAULT_PRICING: Record<string, { currencyCode: string; amount: number }> = {
  IN: { currencyCode: "INR", amount: 99 },
  US: { currencyCode: "USD", amount: 9 },
  SG: { currencyCode: "SGD", amount: 12 },
  AE: { currencyCode: "AED", amount: 35 },
};

export async function ensureDefaultReportPricing() {
  const countryCodes = Object.keys(DEFAULT_PRICING);
  const existing = await NwReportPricing.findAll({
    where: { countryCode: { [Op.in]: countryCodes } },
  });

  const existingMap = new Map(existing.map((item) => [item.countryCode, item]));

  for (const code of countryCodes) {
    if (!existingMap.has(code)) {
      const defaults = DEFAULT_PRICING[code];
      await NwReportPricing.create({
        countryCode: code,
        currencyCode: defaults.currencyCode,
        amount: defaults.amount,
      });
    }
  }
}

export async function listReportPricing() {
  return NwReportPricing.findAll({ order: [["countryCode", "ASC"]] });
}

export async function getReportPricingForCountry(countryCode: string) {
  const code = countryCode.toUpperCase();
  const existing = await NwReportPricing.findOne({ where: { countryCode: code } });
  if (existing) {
    return existing;
  }

  const defaults = DEFAULT_PRICING[code] ?? DEFAULT_PRICING.IN;
  return NwReportPricing.create({
    countryCode: code,
    currencyCode: defaults.currencyCode,
    amount: defaults.amount,
  });
}

interface UpsertPayload {
  currencyCode: string;
  amount: number;
  updatedByUserId: string;
}

export async function upsertReportPricing(
  countryCode: string,
  payload: UpsertPayload
) {
  const code = countryCode.toUpperCase();
  const existing = await NwReportPricing.findOne({ where: { countryCode: code } });
  if (!existing) {
    return NwReportPricing.create({ countryCode: code, ...payload });
  }
  await existing.update(payload);
  return existing;
}
