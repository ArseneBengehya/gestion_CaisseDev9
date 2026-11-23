"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  CheckCircle2,
  Clock,
  Wallet,
  Pencil,
  Save,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react";
import { getMembreByUid } from "../../../../services/dbService";
import type { AllocationCotisation, Contribution, Emprunt, Membre } from "../../../../types";
import Modal from "../../../../components/ui/Modal";
import PageSkeleton from "../../../../components/ui/PageSkeleton";
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { uploadMemberPhoto } from "../../../../lib/member-photo";
import {
  DATE_DEBUT_CAISSE_PAR_DEFAUT,
} from "../../../../lib/contribution-months";
import {
  genererEtatsMoisCotisation,
  normaliserMoisSpecial,
} from "../../../../lib/contribution-payments";
import { Penalite, soldePenalite } from "../../../../lib/penalties";

export default function ProfilPage() {
  const [membre, setMembre] = useState<Membre | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionsSpeciales, setContributionsSpeciales] = useState<Contribution[]>([]);
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [config, setConfig] = useState({
    dateDebutCaisse: DATE_DEBUT_CAISSE_PAR_DEFAUT,
    cotisationMensuelle: 5000,
    cotisationMoisSpecial: 10000,
    moisSpecial: "",
    moisSpecialActifDepuis: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFinancialSummaryLoading, setIsFinancialSummaryLoading] = useState(true);
  const [hasFinancialSummaryError, setHasFinancialSummaryError] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    const unsubscribers: Array<() => void> = [];
    const financialSourcesLoaded = new Set<string>();
    const markFinancialSourceLoaded = (source: string, hasError = false) => {
      financialSourcesLoaded.add(source);
      if (hasError) setHasFinancialSummaryError(true);
      if (financialSourcesLoaded.size === 5) setIsFinancialSummaryLoading(false);
    };

    unsubscribers.push(onSnapshot(doc(db, "settings", "caisse_config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setConfig({
          dateDebutCaisse: data.dateDebutCaisse || DATE_DEBUT_CAISSE_PAR_DEFAUT,
          cotisationMensuelle: Number(data.cotisationMensuelle ?? 5000),
          cotisationMoisSpecial: Number(data.cotisationMoisSpecial ?? 10000),
          moisSpecial: normaliserMoisSpecial(typeof data.moisSpecial === "string" ? data.moisSpecial : ""),
          moisSpecialActifDepuis: data.moisSpecialActif === true && typeof data.moisSpecialActifDepuis === "string"
            ? data.moisSpecialActifDepuis
            : "",
        });
      }
      markFinancialSourceLoaded("config");
    }, (error) => {
      console.error("Erreur lors du chargement des paramètres de cotisation :", error);
      markFinancialSourceLoaded("config", true);
    }));

    const loadProfile = async () => {
      const userStr = localStorage.getItem("caisse_user");
      if (!userStr) {
        setIsLoading(false);
        setIsFinancialSummaryLoading(false);
        return;
      }
      const session = JSON.parse(userStr);
      const dataMembre = await getMembreByUid(session.id);
      if (!active) return;
      if (dataMembre) {
        setMembre(dataMembre);
        unsubscribers.push(onSnapshot(doc(db, "membres", dataMembre.id), (snapshot) => {
          if (snapshot.exists()) setMembre({ id: snapshot.id, ...snapshot.data() } as Membre);
        }));
        unsubscribers.push(onSnapshot(query(collection(db, "contributions"), where("membreId", "==", dataMembre.id)), (snapshot) => {
          setContributions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Contribution)));
          markFinancialSourceLoaded("contributions");
        }, (error) => {
          console.error("Erreur lors du chargement des contributions du profil :", error);
          markFinancialSourceLoaded("contributions", true);
        }));
        unsubscribers.push(onSnapshot(query(collection(db, "contributions_speciales"), where("membreId", "==", dataMembre.id)), (snapshot) => {
          setContributionsSpeciales(snapshot.docs.map((item) => {
            const data = item.data();
            const moisSpecial = typeof data.moisSpecial === "string" ? data.moisSpecial : "";
            const montantVerse = Number(data.montantVerse ?? data.montantTotal ?? 0);
            const repartition: AllocationCotisation[] = moisSpecial
              ? [{ mois: moisSpecial, montantVerse, type: "SPECIALE" }]
              : [];
            return {
              ...data,
              id: item.id,
              membreId: data.membreId || dataMembre.id,
              montantVerse,
              montantTotal: montantVerse,
              nombreMois: 0,
              nombreMoisPayes: 0,
              moisCouverts: moisSpecial ? [moisSpecial] : [],
              moisSpecial,
              typeContribution: "MOIS_SPECIAL",
              repartition,
            } as Contribution;
          }));
          markFinancialSourceLoaded("contributions-speciales");
        }, (error) => {
          console.error("Erreur lors du chargement des contributions spéciales du profil :", error);
          markFinancialSourceLoaded("contributions-speciales", true);
        }));
        unsubscribers.push(onSnapshot(query(collection(db, "penalites"), where("membreId", "==", dataMembre.id)), (snapshot) => {
          setPenalites(snapshot.docs.map((item) => {
            const data = item.data();
            return {
              id: item.id,
              membreId: data.membreId || dataMembre.id,
              moisDeclenchement: Number(data.moisDeclenchement) || 0,
              moisDeclenchementKey: data.moisDeclenchementKey || "",
              montantDu: Number(data.montantDu) || 0,
              montantPaye: Number(data.montantPaye) || 0,
              statut: data.statut || "A_PAYER",
              dateCreation: data.dateCreation || "",
              dateDernierPaiement: data.dateDernierPaiement,
            };
          }));
          markFinancialSourceLoaded("penalites");
        }, (error) => {
          console.error("Erreur lors du chargement des pénalités du profil :", error);
          markFinancialSourceLoaded("penalites", true);
        }));
        unsubscribers.push(onSnapshot(query(collection(db, "emprunts"), where("membreId", "==", dataMembre.id)), (snapshot) => {
          setEmprunts(snapshot.docs.map((item) => {
            const data = item.data();
            const montantTotalARembourser = Number(data.montantTotalARembourser ?? data.montantEmprunte ?? 0);
            const montantPaye = Number(data.montantPaye ?? (data.statut === "Remboursé" ? montantTotalARembourser : 0));
            const montantRestant = data.montantRestant == null
              ? Math.max(0, montantTotalARembourser - montantPaye)
              : Math.max(0, Number(data.montantRestant) || 0);
            return {
              id: item.id,
              membreId: data.membreId || dataMembre.id,
              nomMembre: data.nomMembre || dataMembre.nomComplet || "",
              montantEmprunte: Number(data.montantEmprunte) || 0,
              tauxInteret: Number(data.tauxInteret) || 0,
              montantTotalARembourser,
              montantPaye,
              montantRestant,
              dateEmprunt: data.dateEmprunt || "",
              dateEcheance: data.dateEcheance || "",
              statut: data.statut || (montantRestant > 0 ? "En cours" : "Remboursé"),
            } as Emprunt;
          }));
          markFinancialSourceLoaded("emprunts");
        }, (error) => {
          console.error("Erreur lors du chargement des emprunts du profil :", error);
          markFinancialSourceLoaded("emprunts", true);
        }));
      } else {
        setIsFinancialSummaryLoading(false);
      }
      setIsLoading(false);
    };
    loadProfile().catch((error) => {
      console.error("Erreur lors du chargement du profil membre :", error);
      setIsLoading(false);
      setIsFinancialSummaryLoading(false);
    });

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const toutesContributions = [...contributions, ...contributionsSpeciales];
  const totalCotise = toutesContributions.reduce((total, contribution) => total + Number(contribution.montantVerse ?? contribution.montantTotal ?? 0), 0);
  const maintenant = new Date();
  const moisActuel = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}`;
  const etatsMois = genererEtatsMoisCotisation(
    toutesContributions,
    config.dateDebutCaisse,
    moisActuel,
    config.cotisationMensuelle,
    config.moisSpecial,
    config.cotisationMoisSpecial,
    0,
    config.moisSpecialActifDepuis
  );
  const detteCotisations = etatsMois
    .filter((month) => month.statut !== "PAYE")
    .reduce((total, month) => total + Math.max(0, month.montantRequis - month.montantPaye), 0);
  const dettePenalites = penalites.reduce((total, penalite) => total + soldePenalite(penalite), 0);
  const detteEmprunts = emprunts.reduce((total, emprunt) => total + Number(emprunt.montantRestant || 0), 0);
  const detteActuelle = detteCotisations + dettePenalites + detteEmprunts;

  const openEdit = () => {
    if (!membre) return;
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setNomComplet(membre.nomComplet || `${membre.prenom || ""} ${membre.nom || ""}`.trim());
    setTelephone(membre.telephone || "");
    setEmail(membre.email || "");
    setMotDePasseActuel("");
    setNouveauMotDePasse("");
    setPhotoPreview(membre.photoUrl || membre.avatarUrl || "");
    setPhotoFile(null);
    setSaveError("");
    setIsEditOpen(true);
  };

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSaveError("Format non accepté. Choisissez une image JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSaveError("La photo est trop volumineuse. La taille maximale est de 10 Mo.");
      return;
    }
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setSaveError("");
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!membre || isSaving) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const changeMotDePasse = motDePasseActuel.length > 0 || nouveauMotDePasse.length > 0;
      if (changeMotDePasse) {
        if (!motDePasseActuel || !nouveauMotDePasse) {
          setSaveError("Saisissez votre mot de passe actuel et votre nouveau mot de passe.");
          return;
        }

        const membreSnapshot = await getDoc(doc(db, "membres", membre.id));
        if (!membreSnapshot.exists() || membreSnapshot.data().motDePasse !== motDePasseActuel) {
          setSaveError("Votre mot de passe actuel est incorrect.");
          return;
        }
      }

      const parts = nomComplet.trim().split(/\s+/);
      const prenom = parts.shift() || "";
      const nom = parts.join(" ") || prenom;
      const photoUrl = photoFile ? await uploadMemberPhoto(photoFile, membre.id) : (membre.photoUrl || membre.avatarUrl || "");
      await updateDoc(doc(db, "membres", membre.id), {
        nomComplet: nomComplet.trim(),
        prenom,
        nom,
        telephone: telephone.trim(),
        email: email.trim(),
        photoUrl,
        avatarUrl: photoUrl,
        ...(changeMotDePasse ? { motDePasse: nouveauMotDePasse } : {}),
      });
      const updated = { ...membre, nomComplet: nomComplet.trim(), prenom, nom, telephone: telephone.trim(), email: email.trim(), photoUrl, avatarUrl: photoUrl };
      setMembre(updated);
      localStorage.setItem("caisse_user", JSON.stringify({
        id: membre.id,
        nomComplet: updated.nomComplet,
        telephone: updated.telephone,
        email: updated.email,
        photoUrl,
        role: updated.role || "MEMBRE",
      }));
      setIsEditOpen(false);
    } catch (error) {
      console.error("Erreur lors de la modification du profil :", error);
      setSaveError(error instanceof Error ? error.message : "La modification du profil a échoué.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton layout="profile" />;
  }

  return (
    <div className="max-w-6xl space-y-8 pb-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mon Profil</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gérez vos informations personnelles
          </p>
        </div>

      </div>

      {/* Disposition principale en deux colonnes (Style inspiré du modèle) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Colonne de gauche : Carte Avatar & Identité Principale */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative mb-5">
            <div className="h-40 w-40 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-500 p-1 shadow-xl">
              <div className="h-full w-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-black text-4xl text-blue-600 dark:text-blue-400 overflow-hidden">
                {membre?.photoUrl || membre?.avatarUrl ? (
                  <img src={membre.photoUrl || membre.avatarUrl} alt={membre.nomComplet} className="h-full w-full object-cover" />
                ) : (
                  membre?.nomComplet ? membre.nomComplet.charAt(0).toUpperCase() : "M"
                )}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`}
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Caisse Dev9 Member</p>

          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300">
              <Shield size={13} /> {membre?.role || "MEMBRE"}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 size={13} /> {membre?.statut || "ACTIF"}
            </span>
          </div>
            <div className="items-end justify-end mt-4">
              <button onClick={openEdit} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <Pencil size={16} />
                Modifier mon profil
              </button>
            </div>
        </div>

        {/* Colonne de droite : Détails approfondis & Finances */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Détails de contact et informations */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Informations personnelles</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <User size={14} />
                  <span>Nom complet</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Phone size={14} />
                  <span>Numéro de téléphone</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {membre?.telephone || "Non renseigné"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Mail size={14} />
                  <span>Adresse Email</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {membre?.email || "Non renseignée"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Calendar size={14} />
                  <span>Date d'adhésion complète</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {membre?.createdAt
                    ? new Date(membre.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Date non spécifiée"}
                </p>
              </div>
            </div>
          </div>

          {/* Récapitulatif Financier Personnel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Statut de vos cotisations & finances</h3>
            {hasFinancialSummaryError && (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                Certaines données financières n’ont pas pu être chargées ; les montants peuvent être incomplets.
              </p>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <Wallet size={14} /> Total Cotisé
                </p>
                <p className="font-black  text-lg">
                  {isFinancialSummaryLoading || hasFinancialSummaryError ? "—" : `${totalCotise.toLocaleString()} FC`}
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Statut financier
                </p>
                <p className={`font-bold text-base ${detteActuelle > 0 ? "" : ""}`}>
                  {isFinancialSummaryLoading ? "Chargement…" : hasFinancialSummaryError ? "Indisponible" : detteActuelle > 0 ? "Pas à jour" : "À jour"}
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <Clock size={14} /> Dette cotisations
                </p>
                <p className="font-black text-slate-900 dark:text-white text-lg">
                  {isFinancialSummaryLoading || hasFinancialSummaryError ? "—" : `${detteCotisations.toLocaleString()} FC`}
                </p>
              </div>

              {/* <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <Clock size={14} /> Pénalités restantes
                </p>
                <p className="font-black text-slate-900 dark:text-white text-lg">
                  {isFinancialSummaryLoading || hasFinancialSummaryError ? "—" : `${dettePenalites.toLocaleString()} FC`}
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <Clock size={14} /> Emprunts restants
                </p>
                <p className="font-black text-slate-900 dark:text-white text-lg">
                  {isFinancialSummaryLoading || hasFinancialSummaryError ? "—" : `${detteEmprunts.toLocaleString()} FC`}
                </p>
              </div> */}
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Modification */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier mon profil" maxWidth="md">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              {photoPreview ? <img src={photoPreview} alt="Photo de profil" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><User size={24} /></div>}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
              <Upload size={14} /> Changer la photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nom complet</label>
            <input value={nomComplet} onChange={(event) => setNomComplet(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Téléphone</label>
              <input value={telephone} onChange={(event) => setTelephone(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Adresse e-mail</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Mot de passe actuel</label>
              <div className="relative">
                <input type={showCurrentPassword ? "text" : "password"} autoComplete="current-password" value={motDePasseActuel} onChange={(event) => setMotDePasseActuel(event.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-3.5 pr-10 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Entrez votre mot de passe actuel"/>
                <button type="button" onClick={() => setShowCurrentPassword((visible) => !visible)} aria-label={showCurrentPassword ? "Masquer le mot de passe actuel" : "Afficher le mot de passe actuel"} title={showCurrentPassword ? "Masquer" : "Afficher"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200">
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nouveau mot de passe</label>
              <div className="relative">
                <input type={showNewPassword ? "text" : "password"} autoComplete="new-password" value={nouveauMotDePasse} onChange={(event) => setNouveauMotDePasse(event.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-3.5 pr-10 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Entrez votre nouveau mot de passe"/>
                <button type="button" onClick={() => setShowNewPassword((visible) => !visible)} aria-label={showNewPassword ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"} title={showNewPassword ? "Masquer" : "Afficher"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200">
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-blue-600">
            <Save size={16} /> {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
          {saveError && <p role="alert" className="text-center text-xs font-semibold text-rose-600 dark:text-rose-400">{saveError}</p>}
        </form>
      </Modal>
    </div>
  );
}