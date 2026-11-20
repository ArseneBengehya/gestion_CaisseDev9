import { collection, doc, getDocs, query, runTransaction, where, writeBatch } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { moisImpayesPour, nombreMoisAttendus } from '@/src/lib/contribution-months';

export { moisImpayesPour, nombreMoisAttendus };

export interface Penalite {
  id: string;
  membreId: string;
  moisDeclenchement: number;
  moisDeclenchementKey: string;
  montantDu: number;
  montantPaye: number;
  statut: string;
  dateCreation: string;
  dateDernierPaiement?: string;
}

export interface AllocationPaiementPenalite {
  penaliteId: string;
  montantVerse: number;
}

export interface PaiementPenalite {
  id: string;
  membreId: string;
  montantVerse: number;
  modePaiement: string;
  datePaiement: string;
  penalites: AllocationPaiementPenalite[];
}

export const soldePenalite = (penalite: Pick<Penalite, 'montantDu' | 'montantPaye'>): number =>
  Math.max(0, (Number(penalite.montantDu) || 0) - (Number(penalite.montantPaye) || 0));

export const enregistrerPaiementPenalite = async (
  membreId: string,
  montantVerse: number,
  modePaiement: string
): Promise<PaiementPenalite> => {
  if (!membreId.trim()) throw new Error('Un membre doit être sélectionné pour payer une pénalité.');
  if (!Number.isSafeInteger(montantVerse) || montantVerse <= 0) {
    throw new Error('Le montant du paiement doit être un nombre entier supérieur à zéro.');
  }
  if (!modePaiement.trim()) throw new Error('Le mode de paiement doit être précisé.');

  const penalitesQuery = query(collection(db, 'penalites'), where('membreId', '==', membreId));
  const snapshot = await getDocs(penalitesQuery);
  const penalites = snapshot.docs
    .map((penaliteDoc) => {
      const data = penaliteDoc.data();
      return {
        ref: penaliteDoc.ref,
        id: penaliteDoc.id,
        moisDeclenchementKey: String(data.moisDeclenchementKey || ''),
      };
    })
    .sort((a, b) => a.moisDeclenchementKey.localeCompare(b.moisDeclenchementKey));

  if (penalites.length === 0) throw new Error('Ce membre n’a aucune pénalité enregistrée.');

  const paymentRef = doc(collection(db, 'paiements_penalites'));
  const datePaiement = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const freshPenalites = await Promise.all(penalites.map(({ ref }) => transaction.get(ref)));
    const remaining = freshPenalites.map((penaliteDoc, index) => {
      if (!penaliteDoc.exists()) return null;
      const data = penaliteDoc.data();
      return {
        ref: penaliteDoc.ref,
        id: penalites[index].id,
        montantDu: Number(data.montantDu) || 0,
        montantPaye: Number(data.montantPaye) || 0,
      };
    }).filter((penalite): penalite is NonNullable<typeof penalite> => penalite !== null)
      .map((penalite) => ({ ...penalite, solde: soldePenalite(penalite) }))
      .filter((penalite) => penalite.solde > 0);

    const totalDu = remaining.reduce((total, penalite) => total + penalite.solde, 0);
    if (totalDu === 0) throw new Error('Ce membre n’a plus de pénalité à payer.');
    if (montantVerse > totalDu) {
      throw new Error(`Le montant dépasse le solde dû (${totalDu.toLocaleString()} FC).`);
    }

    let montantRestant = montantVerse;
    const allocations: AllocationPaiementPenalite[] = [];
    remaining.forEach((penalite) => {
      if (montantRestant <= 0) return;
      const montantAffecte = Math.min(montantRestant, penalite.solde);
      const nouveauMontantPaye = penalite.montantPaye + montantAffecte;
      transaction.update(penalite.ref, {
        montantPaye: nouveauMontantPaye,
        statut: nouveauMontantPaye >= penalite.montantDu ? 'PAYE' : 'EN_COURS',
        dateDernierPaiement: datePaiement,
      });
      allocations.push({ penaliteId: penalite.id, montantVerse: montantAffecte });
      montantRestant -= montantAffecte;
    });

    const paiement: PaiementPenalite = {
      id: paymentRef.id,
      membreId,
      montantVerse,
      modePaiement,
      datePaiement,
      penalites: allocations,
    };
    transaction.set(paymentRef, paiement);
    return paiement;
  });
};

export const assurerPenalites = async (
  membreId: string,
  moisImpayes: readonly string[],
  moisRetardAvantPenalite: number,
  montantPenalite: number
): Promise<void> => {
  if (!membreId.trim()) throw new Error('Un membre doit être précisé pour enregistrer une pénalité.');
  if (!Number.isInteger(moisRetardAvantPenalite) || moisRetardAvantPenalite < 1) {
    throw new Error('Le seuil de pénalité doit être un nombre entier positif.');
  }
  if (!Number.isFinite(montantPenalite) || montantPenalite <= 0) {
    throw new Error('Le montant de pénalité doit être supérieur à zéro.');
  }

  for (let index = moisRetardAvantPenalite - 1; index < moisImpayes.length; index += moisRetardAvantPenalite) {
    const moisDeclenchementKey = moisImpayes[index];
    const penaliteRef = doc(db, 'penalites', `${membreId}_${moisDeclenchementKey}`);

    await runTransaction(db, async (transaction) => {
      const penaliteExistante = await transaction.get(penaliteRef);
      if (!penaliteExistante.exists()) {
        transaction.set(penaliteRef, {
          membreId,
          moisDeclenchement: index + 1,
          moisDeclenchementKey,
          montantDu: montantPenalite,
          montantPaye: 0,
          statut: 'A_PAYER',
          dateCreation: new Date().toISOString(),
        });
      }
    });
  }
};

export const synchroniserMontantPenalites = async (montantPenalite: number): Promise<void> => {
  if (!Number.isFinite(montantPenalite) || montantPenalite < 0) {
    throw new Error('Le montant de pénalité doit être un nombre positif ou nul.');
  }

  const snapshot = await getDocs(collection(db, 'penalites'));
  const updates = snapshot.docs.flatMap((penaliteDoc) => {
    const data = penaliteDoc.data();
    const montantDu = Number(data.montantDu) || 0;
    const montantPaye = Number(data.montantPaye) || 0;
    if (soldePenalite({ montantDu, montantPaye }) === 0) return [];

    const nouveauMontantDu = Math.max(montantPaye, montantPenalite);
    return nouveauMontantDu === montantDu
      ? []
      : [{ ref: penaliteDoc.ref, montantDu: nouveauMontantDu }];
  });

  for (let index = 0; index < updates.length; index += 450) {
    const batch = writeBatch(db);
    updates.slice(index, index + 450).forEach(({ ref, montantDu }) => {
      batch.update(ref, { montantDu });
    });
    await batch.commit();
  }
};
