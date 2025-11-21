import type { Request, Response } from "express";
import {
  createRuleBasedPrediction,
  listPredictions,
} from "../services/predictionService.js";

export async function listPredictionsHandler(
  req: Request<{ eventId: string }>,
  res: Response
) {
  const predictions = await listPredictions(req.params.eventId);
  return res.json(predictions);
}

export async function createPredictionHandler(
  req: Request<{ eventId: string }>,
  res: Response
) {
  const prediction = await createRuleBasedPrediction(
    req.params.eventId,
    req.body
  );
  return res.status(201).json(prediction);
}














