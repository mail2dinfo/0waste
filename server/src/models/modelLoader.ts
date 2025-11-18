// Lazy loader for models to avoid circular dependencies in ES modules
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

let NwEventClass: any = null;
let NwUserClass: any = null;
let NwGuestClass: any = null;
let NwFoodItemClass: any = null;
let NwPredictionClass: any = null;
let NwInviteRsvpClass: any = null;

// Synchronous getters for use in decorators
export function getNwEvent() {
  if (!NwEventClass) {
    const module = require("./NwEvent.js");
    NwEventClass = module.NwEvent;
  }
  return NwEventClass;
}

export function getNwUser() {
  if (!NwUserClass) {
    const module = require("./NwUser.js");
    NwUserClass = module.NwUser;
  }
  return NwUserClass;
}

export function getNwGuest() {
  if (!NwGuestClass) {
    const module = require("./NwGuest.js");
    NwGuestClass = module.NwGuest;
  }
  return NwGuestClass;
}

export function getNwFoodItem() {
  if (!NwFoodItemClass) {
    const module = require("./NwFoodItem.js");
    NwFoodItemClass = module.NwFoodItem;
  }
  return NwFoodItemClass;
}

export function getNwPrediction() {
  if (!NwPredictionClass) {
    const module = require("./NwPrediction.js");
    NwPredictionClass = module.NwPrediction;
  }
  return NwPredictionClass;
}

export function getNwInviteRsvp() {
  if (!NwInviteRsvpClass) {
    const module = require("./NwInviteRsvp.js");
    NwInviteRsvpClass = module.NwInviteRsvp;
  }
  return NwInviteRsvpClass;
}

