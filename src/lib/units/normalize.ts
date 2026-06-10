export type UnitFamily = "mass" | "volume" | "count" | "other";

type UnitInfo = {
  code: string;
  label: string;
  family: UnitFamily;
  factorToBase: number;
  baseUnit: string;
};

const UNITS: Record<string, UnitInfo> = {
  kg: { code: "kg", label: "kg", family: "mass", factorToBase: 1000, baseUnit: "g" },
  g: { code: "g", label: "g", family: "mass", factorToBase: 1, baseUnit: "g" },
  gr: { code: "g", label: "g", family: "mass", factorToBase: 1, baseUnit: "g" },
  mg: { code: "mg", label: "mg", family: "mass", factorToBase: 0.001, baseUnit: "g" },
  lb: { code: "lb", label: "lb", family: "mass", factorToBase: 453.59237, baseUnit: "g" },
  oz: { code: "oz", label: "oz", family: "mass", factorToBase: 28.349523125, baseUnit: "g" },
  l: { code: "l", label: "l", family: "volume", factorToBase: 1000, baseUnit: "ml" },
  lt: { code: "l", label: "l", family: "volume", factorToBase: 1000, baseUnit: "ml" },
  ml: { code: "ml", label: "ml", family: "volume", factorToBase: 1, baseUnit: "ml" },
  cl: { code: "cl", label: "cl", family: "volume", factorToBase: 10, baseUnit: "ml" },
  u: { code: "u", label: "u", family: "count", factorToBase: 1, baseUnit: "u" },
  un: { code: "u", label: "u", family: "count", factorToBase: 1, baseUnit: "u" },
  und: { code: "u", label: "u", family: "count", factorToBase: 1, baseUnit: "u" },
  unidad: { code: "u", label: "u", family: "count", factorToBase: 1, baseUnit: "u" },
  unidades: { code: "u", label: "u", family: "count", factorToBase: 1, baseUnit: "u" },
  pza: { code: "u", label: "u", family: "count", factorToBase: 1, baseUnit: "u" },
  pzas: { code: "u", label: "u", family: "count", factorToBase: 1, baseUnit: "u" },
};

function normalizeRawUnit(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "");
}

export function getUnitInfo(value: string | null | undefined): UnitInfo {
  const raw = normalizeRawUnit(value);
  const known = UNITS[raw];
  if (known) return known;
  if (!raw) {
    return {
      code: "u",
      label: "u",
      family: "count",
      factorToBase: 1,
      baseUnit: "u",
    };
  }
  return {
    code: raw,
    label: raw,
    family: "other",
    factorToBase: 1,
    baseUnit: raw,
  };
}

export function normalizeQuantityToBase(params: {
  quantity: number;
  unit: string | null | undefined;
}) {
  const unitInfo = getUnitInfo(params.unit);
  const quantity = Number(params.quantity ?? 0);
  const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
  const baseQuantity = safeQuantity * unitInfo.factorToBase;
  return {
    family: unitInfo.family,
    unitCode: unitInfo.code,
    unitLabel: unitInfo.label,
    baseUnit: unitInfo.baseUnit,
    factorToBase: unitInfo.factorToBase,
    quantity: safeQuantity,
    baseQuantity,
  };
}

export function normalizeUnitCostToBase(params: {
  unitCost: number;
  unit: string | null | undefined;
}) {
  const unitInfo = getUnitInfo(params.unit);
  const unitCost = Number(params.unitCost ?? 0);
  const safeUnitCost = Number.isFinite(unitCost) ? unitCost : 0;
  const baseUnitCost = unitInfo.factorToBase > 0 ? safeUnitCost / unitInfo.factorToBase : safeUnitCost;
  return {
    family: unitInfo.family,
    unitCode: unitInfo.code,
    unitLabel: unitInfo.label,
    baseUnit: unitInfo.baseUnit,
    factorToBase: unitInfo.factorToBase,
    unitCost: safeUnitCost,
    baseUnitCost,
  };
}


