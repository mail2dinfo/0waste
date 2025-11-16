import express from "express";
import {
  listGuestsHandler,
  upsertGuestHandler,
  deleteGuestHandler,
} from "../controllers/guestController.js";

export const guestRouter = express.Router({ mergeParams: true });

guestRouter.get("/", listGuestsHandler);
guestRouter.post("/", upsertGuestHandler);
guestRouter.delete("/:guestId", deleteGuestHandler);

