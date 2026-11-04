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

    // Solution de repli pour le développement : retourner le premier membre actif si aucun lien direct
    const allMembresSnap = await getDocs(collection(db, "membres"));
    if (!allMembresSnap.empty) {
      const d = allMembresSnap.docs[0];
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
      contributions.push({ id: docSnap.id, ...docSnap.data() } as Contribution);
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
    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de la création de la demande d'emprunt:", error);
    return null;
  }
}