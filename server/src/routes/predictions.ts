import express from "express";
import {
  createPredictionHandler,
  listPredictionsHandler,
} from "../controllers/predictionController.js";

export const predictionRouter = express.Router({ mergeParams: true });

predictionRouter.get("/", listPredictionsHandler);
predictionRouter.post("/", createPredictionHandler);

