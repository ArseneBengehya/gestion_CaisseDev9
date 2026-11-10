import { collection, doc, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface Penalite {
  id: string;
  membreId: string;
  moisDeclenchement: number;
  moisDeclenchementKey: string;
  montantDu: number;
  montantPaye: number;
  statut: 'A_PAYER' | 'PARTIELLE' | 'PAYEE';
  dateCreation: string;
  dateDernierPaiement?: string;
}

export const soldePenalite = (penalite: Pick<Penalite, 'montantDu' | 'montantPaye'>) =>
  Math.max(0, penalite.montantDu - penalite.montantPaye);

export function nombreMoisAttendus(dateDebutCaisse: string, dateReference = new Date()) {
  const [anneeDebut, moisDebut] = dateDebutCaisse.slice(0, 7).split('-').map(Number);
  if (!anneeDebut || !moisDebut) return 0;

  const nombreMois =
    (dateReference.getFullYear() - anneeDebut) * 12 +
    (dateReference.getMonth() + 1 - moisDebut) +
    1;
  return Math.max(0, nombreMois);
}

export function moisImpayesPour(
  dateDebutCaisse: string,
  nombreMoisAttendus: number,
  contributions: { nombreMois: number; moisSelectionnes?: string[] }[]
) {
  const [startYear, startMonth] = dateDebutCaisse.slice(0, 7).split('-').map(Number);
  if (!startYear || !startMonth) return [];

  const moisAttendus = Array.from({ length: Math.max(0, nombreMoisAttendus) }, (_, index) => {
    const date = new Date(startYear, startMonth - 1 + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const moisPayes = new Set<string>();

  contributions.forEach((contribution) => {
    contribution.moisSelectionnes?.forEach((mois) => moisPayes.add(mois.slice(0, 7)));
  });

  contributions.forEach((contribution) => {
    if (Array.isArray(contribution.moisSelectionnes)) return;
    let index = 0;
    for (let mois = 0; mois < contribution.nombreMois && index < 1200; mois++) {
      while (moisPayes.has(moisAttendus[index] || '') && index < 1200) index++;
      if (moisAttendus[index]) moisPayes.add(moisAttendus[index]);
      index++;
    }
  });

  return moisAttendus.filter((mois) => !moisPayes.has(mois));
}

export async function assurerPenalites(
  membreId: string,
  moisImpayes: string[],
  seuilMois: number,
  montantPenalite: number
) {
  if (!membreId || seuilMois < 1 || montantPenalite <= 0) return;

  for (let index = seuilMois - 1; index < moisImpayes.length; index += seuilMois) {
    const moisDeclenchement = index + 1;
    const moisDeclenchementKey = moisImpayes[index];
    const id = `${membreId}_${moisDeclenchementKey}`;
    const penaliteRef = doc(db, 'penalites', id);

    await runTransaction(db, async (transaction) => {
      const penaliteSnapshot = await transaction.get(penaliteRef);
      if (!penaliteSnapshot.exists()) {
        transaction.set(penaliteRef, {
          membreId,
          moisDeclenchement,
          moisDeclenchementKey,
          montantDu: montantPenalite,
          montantPaye: 0,
          statut: 'A_PAYER',
          dateCreation: new Date().toISOString(),
        });
      }
    });
  }
}

export async function synchroniserMontantPenalites(montantPenalite: number) {
  if (!Number.isFinite(montantPenalite) || montantPenalite < 0) {
    throw new Error('Le montant de pénalité doit être positif ou nul.');
  }

  const snapshot = await getDocs(collection(db, 'penalites'));
  await Promise.all(snapshot.docs.map(async (penaliteDoc) => {
    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(penaliteDoc.ref);
      if (!current.exists()) return;

      const data = current.data();
      const montantPaye = Number(data.montantPaye) || 0;
      const ancienMontantDu = Number(data.montantDu) || 0;
      if (montantPaye >= ancienMontantDu || ancienMontantDu === montantPenalite) return;
      const montantDu = montantPenalite;
      transaction.update(penaliteDoc.ref, {
        montantDu,
        statut: montantPaye >= montantDu ? 'PAYEE' : montantPaye > 0 ? 'PARTIELLE' : 'A_PAYER',
      });
    });
  }));
}
