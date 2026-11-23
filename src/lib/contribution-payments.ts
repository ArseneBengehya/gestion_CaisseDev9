import type {
  AllocationCotisation,
  ApercuRepartitionCotisation,
  EtatMoisCotisation,
  StatutMoisCotisation,
  TypeCotisation,
} from '@/src/types';
import {
  obtenirMoisCouvertsParContributions,
  normaliserDateFirestore,
  type ContributionMonthRecord,
} from '@/src/lib/contribution-months';

export interface ContributionPaymentRecord extends ContributionMonthRecord {
  montantVerse?: unknown;
  typeContribution?: unknown;
  moisSpecial?: unknown;
  repartition?: unknown;
}

export const normaliserMoisSpecial = (value: string): string => {
  const match = value.match(/^(?:\d{4}-)?(\d{1,2})$/);
  const month = match ? Number(match[1]) : 0;
  return month >= 1 && month <= 12 ? String(month).padStart(2, '0') : '';
};

export const estMoisSpecialApplicable = (
  mois: string,
  moisSpecial: string,
  actifDepuis?: string
): boolean => {
  const monthNumber = normaliserMoisSpecial(moisSpecial);
  if (!monthNumber || !mois.endsWith(`-${monthNumber}`)) return false;
  if (actifDepuis === undefined) return true;

  const activationDate = actifDepuis.match(/^(\d{4})-(0[1-9]|1[0-2])/);
  if (!activationDate) return false;

  const premiereAnneeSpeciale = Number(activationDate[2]) <= Number(monthNumber)
    ? Number(activationDate[1])
    : Number(activationDate[1]) + 1;
  return Number(mois.slice(0, 4)) >= premiereAnneeSpeciale;
};

export const statutMoisCotisation = (
  montantPaye: number,
  montantRequis: number
): StatutMoisCotisation => {
  if (montantRequis <= 0) return 'PAYE';
  if (montantPaye <= 0) return 'NON_PAYE';
  return montantPaye >= montantRequis ? 'PAYE' : 'EN_COURS';
};

export const genererEtatsMoisCotisation = (
  contributions: readonly ContributionPaymentRecord[],
  dateDebut: string,
  dateFin: string,
  montantMensuel: number,
  moisSpecial: string,
  montantMoisSpecial: number,
  moisAdditionnels = 0,
  moisSpecialActifDepuis?: string
): EtatMoisCotisation[] => {
  const monthNumber = normaliserMoisSpecial(moisSpecial);
  const contributionMonths = obtenirMoisCouvertsParContributions(contributions, dateDebut);
  const amounts = new Map<string, number>();
  const amountsPaidBeforeActivation = new Map<string, number>();
  const activationTime = moisSpecialActifDepuis === undefined
    ? Number.NaN
    : Date.parse(normaliserDateFirestore(moisSpecialActifDepuis));

  contributions.forEach((contribution, index) => {
    const contributionTime = Date.parse(normaliserDateFirestore(contribution.datePaiement));
    const wasPaidBeforeActivation = Number.isFinite(activationTime) &&
      Number.isFinite(contributionTime) &&
      contributionTime < activationTime;
    if (Array.isArray(contribution.repartition)) {
      contribution.repartition.forEach((rawAllocation) => {
        if (!rawAllocation || typeof rawAllocation !== 'object') return;
        const allocation = rawAllocation as Partial<AllocationCotisation>;
        if (typeof allocation.mois !== 'string' ||
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(allocation.mois)) return;
        const amount = Number(allocation.montantVerse);
        if (Number.isFinite(amount) && amount > 0) {
          amounts.set(allocation.mois, (amounts.get(allocation.mois) || 0) + amount);
          if (wasPaidBeforeActivation) {
            amountsPaidBeforeActivation.set(
              allocation.mois,
              (amountsPaidBeforeActivation.get(allocation.mois) || 0) + amount
            );
          }
        }
      });
      return;
    }

    const isSpecial = contribution.typeContribution === 'MOIS_SPECIAL';
    const explicitSpecial = typeof contribution.moisSpecial === 'string'
      ? contribution.moisSpecial
      : '';
    const covered = /^\d{4}-(0[1-9]|1[0-2])$/.test(explicitSpecial)
      ? [explicitSpecial]
      : contributionMonths[index] || [];
    covered.forEach((month) => {
      const required = isSpecial ? montantMoisSpecial : montantMensuel;
      amounts.set(month, Math.max(amounts.get(month) || 0, required));
      if (wasPaidBeforeActivation) {
        amountsPaidBeforeActivation.set(
          month,
          (amountsPaidBeforeActivation.get(month) || 0) + required
        );
      }
    });
  });

  const start = normalizeMonthKey(dateDebut.slice(0, 7));
  const end = normalizeMonthKey(dateFin.slice(0, 7));
  if (!start || !end || start > end) return [];

  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  const totalMonths = (endYear - startYear) * 12 + endMonth - startMonth + 1 + Math.max(0, moisAdditionnels);
  const states: EtatMoisCotisation[] = [];

  for (let index = 0; index < totalMonths; index += 1) {
    const date = new Date(startYear, startMonth - 1 + index, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const activationMonth = moisSpecialActifDepuis?.slice(0, 7);
    const paidBeforeActivation = activationMonth === monthKey &&
      (amountsPaidBeforeActivation.get(monthKey) || 0) >= montantMensuel;
    const type: TypeCotisation = monthNumber &&
      estMoisSpecialApplicable(monthKey, monthNumber, moisSpecialActifDepuis) &&
      !paidBeforeActivation
      ? 'SPECIALE'
      : 'NORMALE';
    const amountPaid = amounts.get(monthKey) || 0;
    const required = type === 'SPECIALE' ? montantMoisSpecial : montantMensuel;
    states.push({
      mois: monthKey,
      montantRequis: required,
      montantPaye: Math.min(amountPaid, required),
      statut: statutMoisCotisation(amountPaid, required),
      type,
    });
  }
  return states;
};

export const repartirPaiementNormal = (
  montant: number,
  moisDisponibles: readonly EtatMoisCotisation[]
): ApercuRepartitionCotisation => {
  if (!Number.isSafeInteger(montant) || montant <= 0) {
    return {
      allocations: [],
      moisSoldes: [],
      montantAvance: 0,
      montantRestant: Number.isFinite(montant) ? Math.max(0, montant) : 0,
    };
  }

  let remaining = montant;
  const allocations: AllocationCotisation[] = [];
  const moisSoldes: string[] = [];
  let moisEnCours: string | undefined;

  for (const month of moisDisponibles) {
    if (remaining <= 0) break;
    if (month.type === 'SPECIALE' || month.statut === 'PAYE') continue;
    const balance = Math.max(0, month.montantRequis - month.montantPaye);
    if (balance === 0) continue;
    const allocated = Math.min(remaining, balance);
    allocations.push({ mois: month.mois, montantVerse: allocated, type: 'NORMALE' });
    remaining -= allocated;
    if (allocated === balance) moisSoldes.push(month.mois);
    else {
      moisEnCours = month.mois;
      break;
    }
  }

  return {
    allocations,
    moisSoldes,
    moisEnCours,
    montantAvance: moisEnCours ? allocations[allocations.length - 1].montantVerse : 0,
    montantRestant: remaining,
  };
};

export const repartirPaiementSpecial = (
  montant: number,
  mois: EtatMoisCotisation
): AllocationCotisation | null => {
  if (!Number.isSafeInteger(montant) || montant <= 0 || mois.type !== 'SPECIALE' || mois.statut === 'PAYE') return null;
  const balance = Math.max(0, mois.montantRequis - mois.montantPaye);
  if (!balance) return null;
  return { mois: mois.mois, montantVerse: Math.min(montant, balance), type: 'SPECIALE' };
};

const normalizeMonthKey = (value: string): string =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : '';
