'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Settings, FileText, Calendar, Save, Plus, Image as ImageIcon, Upload, X, Eye, Pencil, ShieldAlert } from 'lucide-react';
import AddRegleModal from '@/src/components/modals/AddRegleModal';
import AddPalierModal from '@/src/components/modals/AddPalierModal';
import ViewPaliersModal from '@/src/components/modals/ViewPaliersModal';
import Modal from '@/src/components/ui/Modal';
import Toast from '@/src/components/ui/Toast';
import ExportCsvButton from '@/src/components/ui/ExportCsvButton';
import PageSkeleton from '@/src/components/ui/PageSkeleton';

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { synchroniserMontantPenalites } from '@/src/lib/penalties';
import type { CsvColumn } from '@/src/lib/export-csv';

interface PalierPret {
  id: string | number;
  min: number;
  max: number | string;
  delai: string;
  taux: number;
}

interface RegleItem {
  id: string;
  titre: string;
  contenu: string[];
}

interface RuleExportRow {
  rubrique: string;
  nom: string;
  valeur: string;
}

interface ConfigDraft {
  cotisationMensuelle: number;
  cotisationMoisSpecial: number;
  moisSpecial: string;
  moisSpecialActif: boolean;
  moisSpecialActifDepuis: string;
  dateDebutCaisse: string;
  penaliteRetardActive: boolean;
  moisRetardAvantPenalite: number;
  montantPenalite: number;
  caisseLogo: string;
}

const MAX_LOGO_SIZE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SETTINGS_CONFIG_REF = doc(db, 'settings', 'caisse_config');

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || 'Non définie'
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const normaliserMoisConfig = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const month = value.match(/^(?:\d{4}-)?(\d{1,2})$/)?.[1];
  return month && Number(month) >= 1 && Number(month) <= 12
    ? String(Number(month)).padStart(2, '0')
    : '';
};

const dateActivationLocaleKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

const compressLogo = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(1, 512 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas indisponible'));
        return;
      }

      try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let compressed = canvas.toDataURL('image/webp', 0.85);
        if (compressed.length > 700_000) {
          context.globalCompositeOperation = 'destination-over';
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          compressed = canvas.toDataURL('image/jpeg', 0.7);
        }
        resolve(compressed);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image illisible'));
    };
    image.src = objectUrl;
  });

export default function ReglesEtParametresPage() {
  const [activeTab, setActiveTab] = useState<'regles' | 'parametres'>('regles');

  const [cotisationMensuelle, setCotisationMensuelle] = useState(5000);
  const [cotisationMoisSpecial, setCotisationMoisSpecial] = useState(10000);
  const [moisSpecial, setMoisSpecial] = useState('');
  const [moisSpecialActif, setMoisSpecialActif] = useState(false);
  const [moisSpecialActifDepuis, setMoisSpecialActifDepuis] = useState('');
  const [dateDebutCaisse, setDateDebutCaisse] = useState('2025-01-01');
  const [penaliteRetardActive, setPenaliteRetardActive] = useState(true);
  const [moisRetardAvantPenalite, setMoisRetardAvantPenalite] = useState(2);
  const [montantPenalite, setMontantPenalite] = useState(1000);
  const [caisseLogo, setCaisseLogo] = useState<string>('');
  const [logoError, setLogoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paliersPrets, setPaliersPrets] = useState<PalierPret[]>([]);
  const [regles, setRegles] = useState<RegleItem[]>([]);

  const [isRegleModalOpen, setIsRegleModalOpen] = useState(false);
  const [isPalierModalOpen, setIsPalierModalOpen] = useState(false);
  const [isViewPaliersModalOpen, setIsViewPaliersModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [draftConfig, setDraftConfig] = useState<ConfigDraft>({
    cotisationMensuelle: 5000,
    cotisationMoisSpecial: 10000,
    moisSpecial: '',
    moisSpecialActif: false,
    moisSpecialActifDepuis: '',
    dateDebutCaisse: '2025-01-01',
    penaliteRetardActive: true,
    moisRetardAvantPenalite: 2,
    montantPenalite: 1000,
    caisseLogo: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  const [draft, setDraft] = useState<Config>(DEFAULT_CONFIG);
  const [newPalier, setNewPalier] = useState(EMPTY_PALIER);
  const [error, setError] = useState({ logo: '', palier: '', form: '' });
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRegleOpen, setIsRegleOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cotisationStandard = Number(data.cotisationMensuelle ?? 5000);
        const cotisationSpeciale = Number(data.cotisationMoisSpecial ?? 10000);
        const seuilPenalite = Number(data.moisRetardAvantPenalite ?? 2);
        const montantPenaliteConfig = Number(data.montantPenalite ?? 1000);
        setCotisationMensuelle(Number.isFinite(cotisationStandard) ? cotisationStandard : 5000);
        setCotisationMoisSpecial(Number.isFinite(cotisationSpeciale) ? cotisationSpeciale : 10000);
        setMoisSpecial(normaliserMoisConfig(data.moisSpecial));
        setMoisSpecialActif(data.moisSpecialActif === true);
        setMoisSpecialActifDepuis(typeof data.moisSpecialActifDepuis === 'string' ? data.moisSpecialActifDepuis : '');
        setDateDebutCaisse(data.dateDebutCaisse || '2025-01-01');
        setCaisseLogo(data.caisseLogo || '');
        setPenaliteRetardActive(data.penaliteRetardActive ?? true);
        setMoisRetardAvantPenalite(
          Number.isFinite(seuilPenalite) && seuilPenalite >= 1 ? Math.floor(seuilPenalite) : 2
        );
        setMontantPenalite(Number.isFinite(montantPenaliteConfig) ? montantPenaliteConfig : 1000);
        
        if (Array.isArray(data.paliersPrets)) {
          setPaliersPrets(data.paliersPrets);
        } else {
          setPaliersPrets([]);
        }

        if (Array.isArray(data.reglesGroupe)) setRegles(data.reglesGroupe);
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Erreur de chargement des paramètres de la caisse :', error);
      setIsLoading(false);
      showToast('error', 'Impossible de charger les paramètres de la caisse.');
    });
    return () => unsub();
  }, []);

  const exportRows: RuleExportRow[] = activeTab === 'regles'
    ? regles.flatMap((regle) =>
        regle.contenu.length > 0
          ? regle.contenu.map((ligne, index) => ({
              rubrique: 'Règle du groupe',
              nom: `${regle.titre} — règle ${index + 1}`,
              valeur: ligne,
            }))
          : [{ rubrique: 'Règle du groupe', nom: regle.titre, valeur: 'Aucun contenu' }]
      )
    : [
        { rubrique: 'Caisse', nom: 'Date de début', valeur: dateDebutCaisse },
        { rubrique: 'Cotisations', nom: 'Cotisation standard', valeur: `${cotisationMensuelle.toLocaleString('fr-FR')} FC` },
        { rubrique: 'Cotisations', nom: 'Cotisation mois spécial', valeur: `${cotisationMoisSpecial.toLocaleString('fr-FR')} FC` },
        { rubrique: 'Cotisations', nom: 'Mois spécial configuré', valeur: moisSpecial ? new Date(2000, Number(moisSpecial) - 1, 1).toLocaleDateString('fr-FR', { month: 'long' }) : 'Non défini' },
        { rubrique: 'Cotisations', nom: 'Mois spécial', valeur: moisSpecialActif ? 'Activé' : 'Désactivé' },
        { rubrique: 'Pénalités', nom: 'État', valeur: penaliteRetardActive ? 'Activées' : 'Désactivées' },
        { rubrique: 'Pénalités', nom: 'Seuil de retard', valeur: `${moisRetardAvantPenalite} mois impayés` },
        { rubrique: 'Pénalités', nom: 'Montant', valeur: `${montantPenalite.toLocaleString('fr-FR')} FC` },
        ...paliersPrets.map((palier, index) => ({
          rubrique: 'Règles d’emprunt',
          nom: `Palier ${index + 1}`,
          valeur: `${palier.min.toLocaleString('fr-FR')}–${typeof palier.max === 'number' ? palier.max.toLocaleString('fr-FR') : palier.max} FC · ${palier.taux}% · ${palier.delai}`,
        })),
      ];
  const exportColumns: CsvColumn<RuleExportRow>[] = [
    { header: 'Rubrique', value: (row) => row.rubrique },
    { header: activeTab === 'regles' ? 'Nom' : 'Paramètre', value: (row) => row.nom },
    { header: 'Valeur', value: (row) => row.valeur },
  ];

  const openSettingsModal = () => {
    setDraftConfig({
      cotisationMensuelle,
      cotisationMoisSpecial,
      moisSpecial,
      moisSpecialActif,
      moisSpecialActifDepuis,
      dateDebutCaisse,
      penaliteRetardActive,
      moisRetardAvantPenalite,
      montantPenalite,
      caisseLogo,
    });
    setLogoError('');
    setIsSettingsModalOpen(true);
  };

  const updateDraft = <K extends keyof ConfigDraft>(key: K, value: ConfigDraft[K]) => {
    setDraftConfig((current) => ({ ...current, [key]: value }));
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Format non accepté (JPG, PNG ou WEBP).');
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoError('Fichier trop volumineux (Max 15 Mo).');
      return;
    }

    setIsProcessingLogo(true);
    try {
      updateDraft('caisseLogo', await compressLogo(file));
      setLogoError('');
    } catch (error) {
      console.error('Erreur lors du traitement du logo :', error);
      setLogoError('Impossible de traiter cette image.');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const removeLogo = () => {
    updateDraft('caisseLogo', '');
    setLogoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddPalier = async (min: number, max: number | string, delai: string, taux: number) => {
    const nouveauPalier: PalierPret = {
      id: Date.now(),
      min,
      max,
      delai,
      taux,
    };

    const updatedPaliers = [...paliersPrets, nouveauPalier];

    try {
      await setDoc(
        doc(db, 'settings', 'caisse_config'),
        {
          cotisationMensuelle,
          cotisationMoisSpecial,
          dateDebutCaisse,
          penaliteRetardActive,
          moisRetardAvantPenalite,
          montantPenalite,
          caisseLogo: caisseLogo || '',
          paliersPrets: updatedPaliers,
          reglesGroupe: regles,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setPaliersPrets(updatedPaliers);
      showToast('success', 'Nouveau pourcentage de remboursement configuré et enregistré !');
    } catch (error) {
      console.error('Erreur lors de l’enregistrement du palier :', error);
      showToast('error', 'Erreur lors de l’enregistrement de la regle');
    }
  };

  const handleRemovePalier = async (id: string | number) => {
    const updatedPaliers = paliersPrets.filter((p) => p.id !== id);

    try {
      await setDoc(
        doc(db, 'settings', 'caisse_config'),
        {
          cotisationMensuelle,
          cotisationMoisSpecial,
          dateDebutCaisse,
          penaliteRetardActive,
          moisRetardAvantPenalite,
          montantPenalite,
          caisseLogo: caisseLogo || '',
          paliersPrets: updatedPaliers,
          reglesGroupe: regles,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setPaliersPrets(updatedPaliers);
      showToast('success', 'Palier supprimé avec succès.');
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
      showToast('error', 'Erreur lors de la suppression.');
    }
    const maxRaw = newPalier.max.trim();
    const max = maxRaw === '' ? 'Illimité' : isNaN(Number(maxRaw)) ? maxRaw : Number(maxRaw);
    upd('paliersPrets', [...draft.paliersPrets, { id: Date.now(), min, max, delai: newPalier.delai.trim(), taux }]);
    setNewPalier(EMPTY_PALIER);
    setError((s) => ({ ...s, palier: '' }));
  };

  const handleSaveParameters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (logoError) return;

    if (
      !draftConfig.dateDebutCaisse ||
      (draftConfig.moisSpecialActif && !/^(0[1-9]|1[0-2])$/.test(draftConfig.moisSpecial)) ||
      !Number.isFinite(draftConfig.cotisationMensuelle) || draftConfig.cotisationMensuelle < 0 ||
      !Number.isFinite(draftConfig.cotisationMoisSpecial) || draftConfig.cotisationMoisSpecial < 0 ||
      !Number.isInteger(draftConfig.moisRetardAvantPenalite) || draftConfig.moisRetardAvantPenalite < 1 ||
      !Number.isFinite(draftConfig.montantPenalite) || draftConfig.montantPenalite < 0
    ) {
      showToast('error', 'Vérifiez la date, les montants et le seuil de pénalité.');
      return;
    }

    const configASauvegarder = {
      ...draftConfig,
      moisSpecialActifDepuis: draftConfig.moisSpecialActif
        ? draftConfig.moisSpecialActifDepuis || dateActivationLocaleKey(new Date())
        : '',
    };

    setIsSavingSettings(true);
    try {
      await setDoc(SETTINGS_CONFIG_REF, { ...configASauvegarder, updatedAt: new Date().toISOString() }, { merge: true });
      setCotisationMensuelle(configASauvegarder.cotisationMensuelle);
      setCotisationMoisSpecial(configASauvegarder.cotisationMoisSpecial);
      setMoisSpecial(configASauvegarder.moisSpecial);
      setMoisSpecialActif(configASauvegarder.moisSpecialActif);
      setMoisSpecialActifDepuis(configASauvegarder.moisSpecialActifDepuis);
      setDateDebutCaisse(configASauvegarder.dateDebutCaisse);
      setPenaliteRetardActive(configASauvegarder.penaliteRetardActive);
      setMoisRetardAvantPenalite(configASauvegarder.moisRetardAvantPenalite);
      setMontantPenalite(configASauvegarder.montantPenalite);
      setCaisseLogo(configASauvegarder.caisseLogo);
      setIsSettingsModalOpen(false);
      showToast('success', 'Paramètres sauvegardés avec succès !');

      if (draftConfig.penaliteRetardActive) {
        try {
          await synchroniserMontantPenalites(draftConfig.montantPenalite);
        } catch (syncError) {
          console.error('Erreur de mise à jour des pénalités existantes :', syncError);
          showToast('error', 'Paramètres sauvegardés, mais les pénalités encore dues n’ont pas pu être mises à jour.');
        }
      }
    } catch (error) {
      console.error('Erreur sauvegarde :', error);
      showToast('error', 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddRegle = async (titre: string, contenu: string[]) => {
    const updated = [...regles, { id: Date.now().toString(), titre, contenu }];
    try {
      await setDoc(
        doc(db, 'settings', 'caisse_config'),
        {
          cotisationMensuelle,
          cotisationMoisSpecial,
          dateDebutCaisse,
          penaliteRetardActive,
          moisRetardAvantPenalite,
          montantPenalite,
          caisseLogo: caisseLogo || '',
          paliersPrets,
          reglesGroupe: updatedRegles,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setRegles(updatedRegles);
      showToast('success', 'Nouvelle règle enregistrée !');
    } catch (error) {
      console.error('Erreur sauvegarde règle :', error);
      showToast('error', 'Erreur lors de l’enregistrement.');
    }
  };

  const tabClass = (tab: string) =>
    `flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
      activeTab === tab ? 'bg-white shadow-sm dark:bg-slate-900 text-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
    }`;

  const { paliersPrets } = config;

  return (
    <div className="relative space-y-6 pb-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* En-tête + onglets */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Règles & Paramètres</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
          Configurez les paramètres globaux, les pénalités de retard et les pourcentages d'emprunt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setActiveTab('regles')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'regles' ? 'bg-white shadow-sm dark:bg-slate-900 text-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <BookOpen size={15} /> Règles
            </button>
            <button
              onClick={() => setActiveTab('parametres')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === 'parametres' ? 'bg-white shadow-sm dark:bg-slate-900 text-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Settings size={15} /> Paramètres
            </button>
          </div>
        </div>
      </div>

      {/* ───────── RÈGLES ───────── */}
      {activeTab === 'regles' && (
        <div className="animate-fadeIn space-y-6">
          <div className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200"><FileText size={20} /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Charte Officielle - Caisse Dev9</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Consultez ou ajoutez les règles régissant le groupe.</p>
              </div>
            </div>
            <div className='flex gap-2'>
            <button
              onClick={() => setIsRegleModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors shrink-0 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Plus size={16} /> Ajouter une règle
            </button>
            <ExportCsvButton
              filename={activeTab === 'regles' ? 'regles-du-groupe' : 'parametres-de-la-caisse'}
              columns={exportColumns}
              rows={exportRows}
              label={activeTab === 'regles' ? 'Exporter les règles' : 'Exporter les paramètres'}
              disabled={isLoading}
          />
            </div>
          </div>

          {isLoading ? (
            <PageSkeleton layout="activity-list" rows={3} />
          ) : regles.length === 0 ? (
            <div className={`${card} p-12 text-center text-slate-400`}>Aucune règle enregistrée. Cliquez sur "Ajouter une règle" pour en créer une.</div>
          ) : (
            regles.map((r) => (
              <div key={r.id} className={`${card} p-6`}>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">{r.titre}</h4>
                <div className="flex flex-col gap-3">
                  {r.contenu.map((ligne, i) => (
                    <p key={i} className="text-sm text-slate-700 dark:text-slate-300">{i + 1}. {ligne}</p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AddRegleModal isOpen={isRegleOpen} onClose={() => setIsRegleOpen(false)} onAdd={handleAddRegle} />

      {/* ───────── PARAMÈTRES (affichage) ───────── */}
      {activeTab === 'parametres' && (
        <div className="animate-fadeIn overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Configuration de la Caisse</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Logo, date de début, cotisations, pénalités et taux d'emprunt.</p>
            </div>
            <button
              type="button"
              onClick={openSettingsModal}
              disabled={isLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Pencil size={15} /> Modifier les paramètres
            </button>
          </div>

          {isLoading ? (
            <div className="p-6">
              <PageSkeleton layout="cards-table" cards={3} columns={3} rows={4} showSearch={false} />
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              <section className="flex flex-col items-center px-6 py-6">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  {caisseLogo ? <img src={caisseLogo} alt="Logo de la caisse" className="h-full w-full object-cover" /> : <ImageIcon size={28} />}
                </div>
                <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Logo de la Caisse</h4>
                {!caisseLogo && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Aucun logo défini.</p>}
              </section>

              <section className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-3 md:gap-8">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Calendar size={16} className="text-slate-500" /> Date de début
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Date à partir de laquelle la caisse commence à fonctionner.</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatDate(dateDebutCaisse)}
                </p>
              </section>

              <section className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-3 md:gap-8">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Cotisations</h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Montants demandés à chaque membre.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cotisation standard</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{cotisationMensuelle.toLocaleString('fr-FR')} FC</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cotisation mois spécial</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{cotisationMoisSpecial.toLocaleString('fr-FR')} FC</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mois spécial configuré</p>
                    <p className="mt-1 text-lg font-bold capitalize text-slate-900 dark:text-white">
                      {moisSpecial
                        ? new Date(2000, Number(moisSpecial) - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })
                        : 'Non défini'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {moisSpecialActif ? 'Règle activée' : 'Règle désactivée'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-3 md:gap-8">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <ShieldAlert size={16} className="text-slate-500" /> Pénalités de retard
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Pénalité déclenchée selon le nombre de mois impayés.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40 md:col-span-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {penaliteRetardActive
                      ? `${montantPenalite.toLocaleString('fr-FR')} FC tous les ${moisRetardAvantPenalite} mois impayés`
                      : 'Pénalités désactivées'}
                  </p>
                  {penaliteRetardActive && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Une pénalité est créée à chaque tranche complète de {moisRetardAvantPenalite} mois impayés.
                    </p>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-3 md:gap-8">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Remboursement & taux d'intérêt</h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Tranches et pourcentages appliqués lors d'un emprunt.</p>
                </div>
                <div className="space-y-3 md:col-span-2">
                  {paliersPrets.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                      Aucun palier configuré.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Tranche (FC)</th>
                            <th className="px-4 py-3 font-semibold">Délai</th>
                            <th className="px-4 py-3 font-semibold">Taux</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {paliersPrets.slice(0, 3).map((palier) => (
                            <tr key={palier.id} className="text-slate-700 dark:text-slate-300">
                              <td className="px-4 py-3">{palier.min.toLocaleString('fr-FR')} – {typeof palier.max === 'number' ? palier.max.toLocaleString('fr-FR') : palier.max}</td>
                              <td className="px-4 py-3">{palier.delai}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{palier.taux} %</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsViewPaliersModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Eye size={15} /> Voir tous les paliers ({paliersPrets.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPalierModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      <Plus size={15} /> Configurer les pourcentages
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => !isSavingSettings && setIsSettingsModalOpen(false)}
        title="Modifier les paramètres de la caisse"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveParameters} className="space-y-5">
          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                {draftConfig.caisseLogo ? <img src={draftConfig.caisseLogo} alt="Logo de la caisse" className="h-full w-full object-cover" /> : <ImageIcon size={28} />}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Logo de la caisse</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choisissez une image JPG, PNG ou WEBP (15 Mo maximum).</p>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} className="sr-only" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    <Upload size={14} /> {draftConfig.caisseLogo ? 'Changer le logo' : 'Sélectionner un logo'}
                  </button>
                  {draftConfig.caisseLogo && (
                    <button type="button" onClick={removeLogo} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                      <X size={14} /> Supprimer
                    </button>
                  )}
                </div>
                {logoError && <p className="mt-2 text-xs text-rose-600">{logoError}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
            <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Démarrage et cotisations</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Date de début</label>
                <input type="date" required value={draftConfig.dateDebutCaisse} onChange={(event) => updateDraft('dateDebutCaisse', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Cotisation standard (FC)</label>
                <input type="number" min="0" required value={draftConfig.cotisationMensuelle} onChange={(event) => updateDraft('cotisationMensuelle', Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Cotisation mois spécial (FC)</label>
                <input type="number" min="0" required value={draftConfig.cotisationMoisSpecial} onChange={(event) => updateDraft('cotisationMoisSpecial', Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Mois spécial concerné</label>
                <select required={draftConfig.moisSpecialActif} value={draftConfig.moisSpecial} onChange={(event) => updateDraft('moisSpecial', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700">
                  <option value="">Choisir un mois</option>
                  {Array.from({ length: 12 }, (_, index) => {
                    const value = String(index + 1).padStart(2, '0');
                    return <option key={value} value={value}>{new Date(2000, index, 1).toLocaleDateString('fr-FR', { month: 'long' })}</option>;
                  })}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {draftConfig.moisSpecialActif
                    ? 'La règle s’applique à partir de son activation et se répète chaque année.'
                    : 'Activez la règle pour appliquer ce mois spécial.'}
                </p>
              </div>
              <div className="flex items-center pt-5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={draftConfig.moisSpecialActif}
                    onChange={(event) => {
                      const active = event.target.checked;
                      setDraftConfig((current) => ({
                        ...current,
                        moisSpecialActif: active,
                        moisSpecialActifDepuis: active
                          ? current.moisSpecialActif ? current.moisSpecialActifDepuis : dateActivationLocaleKey(new Date())
                          : '',
                      }));
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:border-slate-600"
                  />
                  Activer le mois spécial
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><ShieldAlert size={16} /> Pénalités de retard</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Une pénalité est appliquée à chaque seuil de mois impayés atteint.</p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={draftConfig.penaliteRetardActive} onChange={(event) => updateDraft('penaliteRetardActive', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:border-slate-600" />
                Activer les pénalités
              </label>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Seuil avant pénalité (mois impayés)</label>
                <input type="number" min="1" step="1" required value={draftConfig.moisRetardAvantPenalite} onChange={(event) => updateDraft('moisRetardAvantPenalite', Number(event.target.value))} disabled={!draftConfig.penaliteRetardActive} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Montant de chaque pénalité (FC)</label>
                <input type="number" min="0" required value={draftConfig.montantPenalite} onChange={(event) => updateDraft('montantPenalite', Number(event.target.value))} disabled={!draftConfig.penaliteRetardActive} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700" />
              </div>
              <div className="flex items-center rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60 sm:col-span-2">
                <p className="text-slate-600 dark:text-slate-300">
                  Une pénalité de <strong className="text-slate-900 dark:text-white">{(draftConfig.penaliteRetardActive ? draftConfig.montantPenalite : 0).toLocaleString('fr-FR')} FC</strong> sera créée à {draftConfig.moisRetardAvantPenalite} mois impayés, puis à chaque tranche complète de {draftConfig.moisRetardAvantPenalite} mois.
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setIsSettingsModalOpen(false)} disabled={isSavingSettings} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
              Annuler
            </button>
            <button type="submit" disabled={isSavingSettings || isProcessingLogo || !!logoError} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
              <Save size={16} /> {isSavingSettings ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <AddPalierModal
        isOpen={isPalierModalOpen}
        onClose={() => setIsPalierModalOpen(false)}
        onAdd={handleAddPalier}
      />

      <ViewPaliersModal
        isOpen={isViewPaliersModalOpen}
        onClose={() => setIsViewPaliersModalOpen(false)}
        paliers={paliersPrets}
        onRemovePalier={handleRemovePalier}
      />
    </div>
  );
}