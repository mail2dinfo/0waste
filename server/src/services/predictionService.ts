import { NwPrediction } from "../models/NwPrediction.js";
import { ruleBasedEstimator } from "../utils/ruleBasedEstimator.js";

export async function listPredictions(eventId: string) {
  return NwPrediction.findAll({
    where: { eventId },
    order: [["createdAt", "DESC"]],
  });
}

export async function createRuleBasedPrediction(
  eventId: string,
  input: Record<string, unknown>
) {
  const recommendation = ruleBasedEstimator(input);
  return NwPrediction.create({
    eventId,
    inputSnapshot: input,
    outputRecommendation: recommendation as any,
    generator: "rule-based",
  } as any);
}









