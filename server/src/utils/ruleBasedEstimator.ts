interface EstimatorInput {
  adults?: number;
  kids?: number;
  menu?: Array<{
    id: string;
    name: string;
    perAdultKg: number;
    perKidKg: number;
  }>;
}

interface EstimatorOutput {
  totalKg: number;
  breakdown: Array<{ id: string; name: string; quantityKg: number }>;
}

export function ruleBasedEstimator(
  input: EstimatorInput = {}
): EstimatorOutput {
  const adults = input.adults ?? 0;
  const kids = input.kids ?? 0;
  const menu = input.menu ?? [];

  const breakdown = menu.map((item) => ({
    id: item.id,
    name: item.name,
    quantityKg: Number(
      (adults * item.perAdultKg + kids * item.perKidKg).toFixed(2)
    ),
  }));

  const totalKg = Number(
    breakdown.reduce((sum, item) => sum + item.quantityKg, 0).toFixed(2)
  );

  return { totalKg, breakdown };
}










