import { collection, doc, runTransaction } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface PalierPret {
  id: string | number;
  min: number;
  max: number | string;
  delai: string;
  taux: number;
}

export const PALIERS_PRETS_PAR_DEFAUT: PalierPret[] = [
  { id: 1, min: 20000, max: 50000, delai: '1 mois', taux: 20 },
  { id: 2, min: 60000, max: 70000, delai: '2 mois', taux: 15 },
  { id: 3, min: 80000, max: 100000, delai: '3 mois', taux: 10 },
  { id: 4, min: 100000, max: 'Et plus', delai: '4 mois', taux: 5 },
];

export const trouverPalierPret = (montant: number, paliers: readonly PalierPret[]): PalierPret | undefined =>
  paliers.find((palier) => montant >= palier.min && montant <= (typeof palier.max === 'number' ? palier.max : Infinity));

export const dateEcheanceSelonDelai = (delai: string, dateDebut = new Date()): string | null => {
  const match = delai.match(/(\d+)\s*(jour|jours|mois|an|ans|année|années)/i);
  if (!match) return null;

  const date = new Date(dateDebut);
  const duree = Number(match[1]);
  const unite = match[2].toLocaleLowerCase('fr-FR');
  if (unite.startsWith('jour')) date.setDate(date.getDate() + duree);
  else {
    const jour = date.getDate();
    const moisCible = date.getMonth() + (unite.startsWith('mois') ? duree : 0);
    const anneeCible = date.getFullYear() + (unite.startsWith('mois') ? 0 : duree);
    date.setDate(1);
    date.setFullYear(anneeCible, moisCible, 1);
    date.setDate(Math.min(jour, new Date(anneeCible, moisCible + 1, 0).getDate()));
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const enregistrerPaiementEmprunt = async (
  empruntId: string,
  montantVerse: number,
  modePaiement: string
): Promise<{ nomMembre: string; montantRestant: number; statut: 'Paiement en attente' | 'En cours' | 'À jour'; datePaiement: string }> => {
  if (!empruntId.trim()) throw new Error('Un emprunt doit être sélectionné.');
  if (!Number.isSafeInteger(montantVerse) || montantVerse <= 0) {
    throw new Error('Le montant doit être un nombre entier supérieur à zéro.');
  }
  if (!modePaiement.trim()) throw new Error('Le mode de paiement doit être précisé.');

  const empruntRef = doc(db, 'emprunts', empruntId);
  const paiementRef = doc(collection(db, 'paiements_emprunts'));
  const datePaiement = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const empruntSnapshot = await transaction.get(empruntRef);
    if (!empruntSnapshot.exists()) throw new Error('Cet emprunt n’existe plus.');

    const data = empruntSnapshot.data();
    const total = Number(data.montantTotalARembourser) || 0;
    const montantPaye = Number(data.montantPaye) || 0;
    const montantRestantActuel = Math.max(0, total - montantPaye);
    if (montantVerse > montantRestantActuel) {
      throw new Error(`Le montant dépasse le solde restant (${montantRestantActuel.toLocaleString('fr-FR')} FC).`);
    }

    const nouveauMontantPaye = montantPaye + montantVerse;
    const montantRestant = Math.max(0, total - nouveauMontantPaye);
    const statut = montantRestant === 0
      ? 'À jour'
      : nouveauMontantPaye > 0
        ? 'En cours'
        : 'Paiement en attente';

    transaction.update(empruntRef, {
      montantPaye: nouveauMontantPaye,
      montantRestant,
      statut,
      dateDernierPaiement: datePaiement,
    });
    transaction.set(paiementRef, {
      empruntId,
      membreId: data.membreId || '',
      nomMembre: data.nomMembre || 'Membre',
      montantVerse,
      modePaiement,
      datePaiement,
    });

    return {
      nomMembre: data.nomMembre || 'Membre',
      montantRestant,
      statut,
      datePaiement,
    };
  });
};
