export const DATE_DEBUT_CAISSE_PAR_DEFAUT = "2025-07-01";

export interface ContributionMonthRecord {
  membreId?: string;
  moisCouverts?: unknown;
  nombreMois?: unknown;
  nombreMoisPayes?: unknown;
  datePaiement?: unknown;
}

export const normaliserDateFirestore = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
  }
  return "";
};

const extraireCleMois = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{1,2})(?:$|[^\d])/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${String(month).padStart(2, "0")}`;
};

const incrementerMois = (key: string): string => {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const obtenirMoisCouvertsParContributions = (
  contributions: readonly ContributionMonthRecord[],
  dateDebutCaisse: string
): string[][] => {
  const startKey = extraireCleMois(dateDebutCaisse) || extraireCleMois(DATE_DEBUT_CAISSE_PAR_DEFAUT)!;
  const moisExplicites = contributions.map((contribution) => {
    if (!Array.isArray(contribution.moisCouverts)) return [];
    return [...new Set(contribution.moisCouverts.map(extraireCleMois).filter((month): month is string => month !== null))];
  });
  const moisReserves = new Set(moisExplicites.flat());
  const moisAttribues = new Set(moisReserves);
  const resultats = moisExplicites.map((months) => [...months]);
  const order = contributions
    .map((contribution, index) => ({ index, date: Date.parse(normaliserDateFirestore(contribution.datePaiement)) || 0 }))
    .filter(({ index }) => moisExplicites[index].length === 0)
    .sort((a, b) => a.date - b.date || a.index - b.index);

  let prochainMois = startKey;
  order.forEach(({ index }) => {
    const countValue = Number(contributions[index].nombreMois ?? contributions[index].nombreMoisPayes ?? 0);
    const count = Number.isFinite(countValue) ? Math.max(0, Math.floor(countValue)) : 0;
    while (resultats[index].length < count) {
      if (!moisAttribues.has(prochainMois)) {
        resultats[index].push(prochainMois);
        moisAttribues.add(prochainMois);
      }
      prochainMois = incrementerMois(prochainMois);
    }
  });

  const nombreMoisComptabilises = contributions.reduce((total, contribution, index) => {
    const countValue = Number(contribution.nombreMois ?? contribution.nombreMoisPayes ?? 0);
    const count = Number.isFinite(countValue) ? Math.max(0, Math.floor(countValue)) : 0;
    return total + Math.max(count, moisExplicites[index].length);
  }, 0);
  let moisManquants = Math.max(0, nombreMoisComptabilises - moisAttribues.size);
  const indexDerniereContribution = contributions
    .map((contribution, index) => ({ index, date: Date.parse(normaliserDateFirestore(contribution.datePaiement)) || 0 }))
    .sort((a, b) => b.date - a.date || b.index - a.index)[0]?.index;

  while (moisManquants > 0 && indexDerniereContribution !== undefined) {
    if (!moisAttribues.has(prochainMois)) {
      resultats[indexDerniereContribution].push(prochainMois);
      moisAttribues.add(prochainMois);
      moisManquants -= 1;
    }
    prochainMois = incrementerMois(prochainMois);
  }

  return resultats;
};