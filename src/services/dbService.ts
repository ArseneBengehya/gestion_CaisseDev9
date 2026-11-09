import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Membre, Contribution, Emprunt } from "../types";

export async function addNotification(data: {
  membreId: string;
  titre: string;
  message: string;
  type: "succes" | "info" | "alerte";
  lu?: boolean;
}) {
  await addDoc(collection(db, "notifications"), {
    ...data,
    lu: data.lu ?? false,
    date: new Date().toISOString(),
  });
}

/**
 * Récupère un membre par son ID Firestore ou son UID Firebase Auth
 */
export async function getMembreByUid(uid: string): Promise<Membre | null> {
  try {
    // On essaie d'abord de récupérer directement par l'ID du document
    const docRef = doc(db, "membres", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Membre;
    }

    // Sinon, on cherche si un champ 'uid' ou 'authId' correspond
    const q = query(collection(db, "membres"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const d = querySnapshot.docs[0];
      return { id: d.id, ...d.data() } as Membre;
    }

    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération du membre par UID:", error);
    return null;
  }
}

export async function getContributionsByMembreId(membreId: string): Promise<Contribution[]> {
  try {
    const q = query(collection(db, "contributions"), where("membreId", "==", membreId));
    const querySnapshot = await getDocs(q);
    const contributions: Contribution[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const nombreMois = Number(data.nombreMois ?? data.nombreMoisPayes ?? 0);
      const montant = Number(data.montantVerse ?? data.montantTotal ?? 0);
      contributions.push({
        id: docSnap.id,
        ...data,
        nombreMois,
        nombreMoisPayes: nombreMois,
        montantVerse: montant,
        montantTotal: montant,
        moisCouverts: Array.isArray(data.moisCouverts)
          ? data.moisCouverts
          : nombreMois > 0
            ? Array.from({ length: nombreMois }, (_, index) => `Mois ${index + 1}`)
            : [],
        datePaiement: data.datePaiement || new Date().toISOString().split("T")[0],
      } as Contribution);
    });

    return contributions;
  } catch (error) {
    console.error("Erreur lors de la récupération des contributions:", error);
    return [];
  }
}

export async function creerDemandeEmprunt(empruntData: Omit<Emprunt, "id">): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, "emprunts"), {
      ...empruntData,
      dateEmprunt: new Date().toISOString(),
      statut: "En cours"
    });
    await addNotification({
      membreId: "TOUS",
      titre: "Nouvelle demande d'emprunt",
      message: `${empruntData.nomMembre} a demandé un emprunt de ${Number(empruntData.montantEmprunte).toLocaleString()} FC.`,
      type: "info",
      lu: false,
    });
    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de la création de la demande d'emprunt:", error);
    return null;
  }
}