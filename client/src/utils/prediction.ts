export interface PredictionInput {
  adults: number;
  kids: number;
  menu: Array<{ id: string; perAdultKg: number; perKidKg: number }>;
}

export interface PredictionOutput {
  totalKg: number;
  breakdown: Array<{ id: string; quantityKg: number }>;
}

export function ruleBasedPrediction(
  input: PredictionInput
): PredictionOutput {
  const breakdown = input.menu.map((item) => ({
    id: item.id,
    quantityKg:
      input.adults * item.perAdultKg + input.kids * item.perKidKg,
  }));

  const totalKg = breakdown.reduce((sum, entry) => sum + entry.quantityKg, 0);

  return {
    totalKg,
    breakdown,
  };
}







