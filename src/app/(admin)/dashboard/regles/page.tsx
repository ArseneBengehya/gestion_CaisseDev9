'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Settings, FileText, Calendar, Save, Plus, Image as ImageIcon, Upload, X, Pencil, Eye, ShieldAlert } from 'lucide-react';
import AddRegleModal from '@/src/components/modals/AddRegleModal';
import Modal from '@/src/components/ui/Modal';
import Toast from '@/src/components/ui/Toast';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { synchroniserMontantPenalites } from '@/src/lib/penalties';

interface PalierPret { id: string | number; min: number; max: number | string; delai: string; taux: number }
interface RegleItem { id: string; titre: string; contenu: string[] }
interface Config {
  cotisationMensuelle: number;
  cotisationMoisSpecial: number;
  dateDebutCaisse: string;
  caisseLogo: string;
  paliersPrets: PalierPret[];
  penaliteRetardActive: boolean;
  moisRetardAvantPenalite: number;
  montantPenalite: number;
}

const DEFAULT_PALIERS: PalierPret[] = [
  { id: 1, min: 20000, max: 50000, delai: '1 mois', taux: 20 },
  { id: 2, min: 60000, max: 70000, delai: '2 mois', taux: 15 },
  { id: 3, min: 80000, max: 100000, delai: '3 mois', taux: 10 },
  { id: 4, min: 100000, max: 'Et plus', delai: '4 mois', taux: 5 },
];

const DEFAULT_CONFIG: Config = {
  cotisationMensuelle: 5000,
  cotisationMoisSpecial: 10000,
  dateDebutCaisse: '2025-01-01',
  caisseLogo: '',
  paliersPrets: DEFAULT_PALIERS,
  penaliteRetardActive: true,
  moisRetardAvantPenalite: 2,
  montantPenalite: 1000,
};
const CONFIG_REF = doc(db, 'settings', 'caisse_config');
const NB_APERCU = 3;
const EMPTY_PALIER = { min: '', max: '', delai: '', taux: '' };

/* ───────── Styles réutilisables ───────── */
const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700';
const btnDark = 'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100';
const btnLight = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const label = 'mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300';

/* ───────── Utilitaires ───────── */
const fmt = (n: number | string) => (typeof n === 'number' ? n.toLocaleString('fr-FR') : n);

const formatDate = (v: string) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Accepte les anciennes variantes de structure des paliers enregistrés.
const toPaliers = (raw: unknown): PalierPret[] => {
  const entries = Array.isArray(raw)
    ? raw
    : isRecord(raw)
      ? ('min' in raw || 'montantMin' in raw || 'minimum' in raw)
        ? [raw]
        : Object.values(raw)
      : [];

  return entries.flatMap((entry, index) => {
    if (!isRecord(entry)) return [];
    const min = Number(entry.min ?? entry.montantMin ?? entry.minimum ?? 0);
    const taux = Number(entry.taux ?? entry.tauxInteret ?? entry.pourcentage ?? 0);
    const max = entry.max ?? entry.montantMax ?? entry.maximum ?? 'Illimité';
    return [{
      id: typeof entry.id === 'string' || typeof entry.id === 'number' ? entry.id : index,
      min,
      max: typeof max === 'number' ? max : String(max),
      delai: String(entry.delai ?? entry.delaiRemboursement ?? entry.duree ?? '-'),
      taux,
    }];
  });
};

// Réduit la photo à 512 px max et la compresse (WebP, puis JPEG si trop lourde pour Firestore)
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, 512 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas indisponible'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let out = canvas.toDataURL('image/webp', 0.85);
      if (out.length > 700_000) {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        out = canvas.toDataURL('image/jpeg', 0.7);
      }
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });

/* ───────── Petits composants ───────── */
const Section = ({ title, desc, children }: { title: React.ReactNode; desc?: string; children: React.ReactNode }) => (
  <section className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-3 md:gap-8">
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      {desc && <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>}
    </div>
    <div className="md:col-span-2">{children}</div>
  </section>
);

const Logo = ({ src, className }: { src: string; className: string }) => (
  <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 ${className}`}>
    {src ? <img src={src} alt="Logo" className="h-full w-full object-cover" /> : <ImageIcon size={28} />}
  </div>
);

const PaliersTable = ({ paliers }: { paliers: PalierPret[] }) => (
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
        {paliers.map((p) => (
          <tr key={p.id} className="text-slate-700 dark:text-slate-300">
            <td className="px-4 py-3">{fmt(p.min)} – {fmt(p.max)}</td>
            <td className="px-4 py-3">{p.delai}</td>
            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{p.taux} %</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ───────── Page ───────── */
export default function ReglesEtParametresPage() {
  const [activeTab, setActiveTab] = useState<'regles' | 'parametres'>('regles');
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [regles, setRegles] = useState<RegleItem[]>([]);
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
    const unsub = onSnapshot(CONFIG_REF, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const montantPenalite = Number(d.montantPenalite ?? DEFAULT_CONFIG.montantPenalite);
        const paliersData = d.paliersPrets ?? d.paliersPret ?? d.paliers;
        setConfig({
          cotisationMensuelle: Number(d.cotisationMensuelle ?? DEFAULT_CONFIG.cotisationMensuelle),
          cotisationMoisSpecial: Number(d.cotisationMoisSpecial ?? DEFAULT_CONFIG.cotisationMoisSpecial),
          dateDebutCaisse: d.dateDebutCaisse || DEFAULT_CONFIG.dateDebutCaisse,
          caisseLogo: d.caisseLogo || '',
          paliersPrets: paliersData == null ? DEFAULT_PALIERS : toPaliers(paliersData),
          penaliteRetardActive: d.penaliteRetardActive ?? DEFAULT_CONFIG.penaliteRetardActive,
          moisRetardAvantPenalite: Math.max(1, Number(d.moisRetardAvantPenalite) || DEFAULT_CONFIG.moisRetardAvantPenalite),
          montantPenalite: Number.isFinite(montantPenalite) ? montantPenalite : DEFAULT_CONFIG.montantPenalite,
        });
        if (Array.isArray(d.reglesGroupe)) setRegles(d.reglesGroupe);
      }
      setIsLoading(false);
    }, (loadError) => {
      console.error('Erreur de chargement des paramètres :', loadError);
      setIsLoading(false);
      showToast('error', 'Impossible de charger les paramètres de la caisse.');
    });
    return () => unsub();
  }, []);

  const upd = <K extends keyof Config>(key: K, value: Config[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const openEdit = () => {
    setDraft(config);
    setNewPalier(EMPTY_PALIER);
    setError({ logo: '', palier: '', form: '' });
    setIsEditOpen(true);
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return setError((s) => ({ ...s, logo: 'Format non accepté (JPG, PNG ou WEBP).' }));
    }
    if (file.size > 15 * 1024 * 1024) {
      return setError((s) => ({ ...s, logo: 'Fichier trop volumineux (Max 15 Mo).' }));
    }
    try {
      upd('caisseLogo', await compressImage(file));
      setError((s) => ({ ...s, logo: '' }));
    } catch {
      setError((s) => ({ ...s, logo: 'Impossible de traiter cette image.' }));
    }
  };

  const addPalier = () => {
    const min = Number(newPalier.min);
    const taux = Number(newPalier.taux);
    if (newPalier.min === '' || newPalier.taux === '' || isNaN(min) || isNaN(taux) || !newPalier.delai.trim()) {
      return setError((s) => ({ ...s, palier: 'Renseignez le minimum, le délai et le taux.' }));
    }
    const maxRaw = newPalier.max.trim();
    const max = maxRaw === '' ? 'Illimité' : isNaN(Number(maxRaw)) ? maxRaw : Number(maxRaw);
    upd('paliersPrets', [...draft.paliersPrets, { id: Date.now(), min, max, delai: newPalier.delai.trim(), taux }]);
    setNewPalier(EMPTY_PALIER);
    setError((s) => ({ ...s, palier: '' }));
  };

  const handleSave = async () => {
    setError((s) => ({ ...s, form: '' }));
    if (error.logo) return;
    if (!draft.dateDebutCaisse) return setError((s) => ({ ...s, form: 'La date de début est obligatoire.' }));
    if (
      !Number.isFinite(draft.cotisationMensuelle) || draft.cotisationMensuelle < 0 ||
      !Number.isFinite(draft.cotisationMoisSpecial) || draft.cotisationMoisSpecial < 0 ||
      !Number.isInteger(draft.moisRetardAvantPenalite) || draft.moisRetardAvantPenalite < 1 ||
      !Number.isFinite(draft.montantPenalite) || draft.montantPenalite < 0
    ) {
      return setError((s) => ({ ...s, form: 'Les montants doivent être positifs ou nuls, et le seuil doit être un nombre entier supérieur à zéro.' }));
    }

    setIsSaving(true);
    try {
      await setDoc(CONFIG_REF, { ...draft, updatedAt: new Date().toISOString() }, { merge: true });
      setConfig(draft);
      setIsEditOpen(false);
      showToast('success', 'Paramètres sauvegardés avec succès !');

      if (draft.penaliteRetardActive) {
        try {
          await synchroniserMontantPenalites(draft.montantPenalite);
        } catch (syncError) {
          console.error('Erreur de mise à jour des pénalités existantes :', syncError);
          showToast('error', 'Paramètres sauvegardés, mais les pénalités encore dues n’ont pas pu être mises à jour.');
        }
      }
    } catch (err) {
      console.error('Erreur sauvegarde :', err);
      showToast('error', 'Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRegle = async (titre: string, contenu: string[]) => {
    const updated = [...regles, { id: Date.now().toString(), titre, contenu }];
    try {
      await setDoc(CONFIG_REF, { reglesGroupe: updated, updatedAt: new Date().toISOString() }, { merge: true });
      setRegles(updated);
      showToast('success', 'Nouvelle règle enregistrée !');
    } catch (err) {
      console.error('Erreur sauvegarde règle :', err);
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
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button onClick={() => setActiveTab('regles')} className={tabClass('regles')}><BookOpen size={15} /> Règles</button>
          <button onClick={() => setActiveTab('parametres')} className={tabClass('parametres')}><Settings size={15} /> Paramètres</button>
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
            <button onClick={() => setIsRegleOpen(true)} className={`${btnDark} shrink-0`}><Plus size={16} /> Ajouter une règle</button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement des règles...</div>
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
        <div className={`${card} animate-fadeIn overflow-hidden`}>
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Configuration de la Caisse</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Logo, date de début, cotisations, pénalités et taux d'emprunt.</p>
            </div>
            <button onClick={openEdit} disabled={isLoading} className={`${btnDark} shrink-0`}><Pencil size={15} /> Modifier les paramètres</button>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-sm text-slate-500">Chargement des paramètres...</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              <section className="flex flex-col items-center px-6 py-6">
                <Logo src={config.caisseLogo} className="h-24 w-24 rounded-2xl shadow-sm" />
                <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Logo de la Caisse</h4>
                {!config.caisseLogo && <p className="mt-0.5 text-xs text-slate-500">Aucun logo défini.</p>}
              </section>

              <Section title={<><Calendar size={16} className="text-slate-500" /> Date de début</>} desc="Date à partir de laquelle la caisse commence à fonctionner.">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(config.dateDebutCaisse)}</p>
              </Section>

              <Section title="Cotisations" desc="Montants demandés à chaque membre.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[['Cotisation standard', config.cotisationMensuelle], ['Cotisation mois spécial', config.cotisationMoisSpecial]].map(([name, value]) => (
                    <div key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{name}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{fmt(value as number)} FC</p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title={<><ShieldAlert size={16} className="text-slate-500" /> Pénalités de retard</>} desc="Une pénalité est créée à chaque seuil de mois impayés atteint.">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {config.penaliteRetardActive
                      ? `${fmt(config.montantPenalite)} FC tous les ${config.moisRetardAvantPenalite} mois impayés`
                      : 'Pénalités désactivées'}
                  </p>
                  {config.penaliteRetardActive && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Prochaine pénalité à {config.moisRetardAvantPenalite} mois de retard.
                    </p>
                  )}
                </div>
              </Section>

              <Section title="Remboursement & taux d'intérêt" desc="Tranches de montant et pourcentage d'intérêt appliqué lors d'un emprunt.">
                {paliersPrets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">Aucun palier configuré.</div>
                ) : (
                  <div className="space-y-3">
                    <PaliersTable paliers={paliersPrets.slice(0, NB_APERCU)} />
                    <button onClick={() => setIsViewOpen(true)} className={btnLight}>
                      <Eye size={15} /> {paliersPrets.length > NB_APERCU ? `Voir tous les paliers (${paliersPrets.length})` : 'Voir en détail'}
                    </button>
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      )}

      {/* ───────── MODAL : VOIR LES PALIERS ───────── */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Remboursement & taux d'intérêt" maxWidth="lg">
        <PaliersTable paliers={paliersPrets} />
      </Modal>

      {/* ───────── MODAL : MODIFICATION ───────── */}
      <Modal isOpen={isEditOpen} onClose={() => !isSaving && setIsEditOpen(false)} title="Modifier les paramètres de la caisse" maxWidth="2xl">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Logo src={draft.caisseLogo} className="h-20 w-20 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Logo de la caisse</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choisissez une image JPG, PNG ou WEBP.</p>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogo} className="sr-only" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className={btnLight}>
                    <Upload size={14} /> {draft.caisseLogo ? 'Changer le logo' : 'Sélectionner un logo'}
                  </button>
                  {draft.caisseLogo && (
                    <button type="button" onClick={() => { upd('caisseLogo', ''); setError((s) => ({ ...s, logo: '' })); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                      <X size={14} /> Supprimer
                    </button>
                  )}
                </div>
                {error.logo && <p className="mt-2 text-xs text-rose-600">{error.logo}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
            <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Démarrage et cotisations</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={label}>Date de début</label>
                <input type="date" value={draft.dateDebutCaisse} onChange={(e) => upd('dateDebutCaisse', e.target.value)} className={input} />
              </div>
              {([['cotisationMensuelle', 'Cotisation standard (FC)'], ['cotisationMoisSpecial', 'Cotisation mois spécial (FC)']] as const).map(([key, text]) => (
                <div key={key}>
                  <label className={label}>{text}</label>
                  <input type="number" min="0" value={draft[key]} onChange={(e) => upd(key, Number(e.target.value))} className={input} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><ShieldAlert size={16} /> Pénalités de retard</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Une pénalité est appliquée à chaque seuil de mois impayés atteint.</p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={draft.penaliteRetardActive}
                  onChange={(e) => upd('penaliteRetardActive', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:border-slate-600"
                />
                Activer les pénalités
              </label>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Seuil avant pénalité (mois impayés)</label>
                <input
                  type="number"
                  value={draft.moisRetardAvantPenalite}
                  onChange={(e) => upd('moisRetardAvantPenalite', Number(e.target.value))}
                  disabled={!draft.penaliteRetardActive}
                  className={`${input} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>
              <div>
                <label className={label}>Montant de chaque pénalité (FC)</label>
                <input
                  type="number"
                  value={draft.montantPenalite}
                  onChange={(e) => upd('montantPenalite', Number(e.target.value))}
                  disabled={!draft.penaliteRetardActive}
                  className={`${input} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>
              <div className="flex items-center rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60 sm:col-span-2">
                <p className="text-slate-600 dark:text-slate-300">
                  Une pénalité de{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {fmt(draft.penaliteRetardActive ? draft.montantPenalite : 0)} FC
                  </strong>{' '}
                  sera créée à {draft.moisRetardAvantPenalite} mois impayés, puis à chaque tranche complète de {draft.moisRetardAvantPenalite} mois.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Remboursement et taux d'intérêt</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Définissez les tranches utilisées lors de la création d'un emprunt.</p>
            </div>
            {draft.paliersPrets.length > 0 && (
              <ul className="mb-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {draft.paliersPrets.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">
                    <span>{fmt(p.min)} – {fmt(p.max)} FC · {p.delai} · <strong className="text-slate-900 dark:text-white">{p.taux} %</strong></span>
                    <button type="button" onClick={() => upd('paliersPrets', draft.paliersPrets.filter((x) => x.id !== p.id))} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label="Supprimer le palier">
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([['min', 'Montant minimum (FC)', 'number'], ['max', 'Montant maximum (FC, vide = illimité)', 'text'], ['delai', 'Délai de remboursement', 'text'], ['taux', 'Taux d’intérêt (%)', 'number']] as const).map(([key, placeholder, type]) => (
                  <input key={key} type={type} placeholder={placeholder} value={newPalier[key]} onChange={(e) => setNewPalier((n) => ({ ...n, [key]: e.target.value }))} className={input} />
                ))}
              </div>
              {error.palier && <p className="mt-2 text-xs text-rose-600">{error.palier}</p>}
              <button type="button" onClick={addPalier} className={`${btnLight} mt-3`}><Plus size={14} /> Ajouter ce palier</button>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-rose-600">{error.form}</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsEditOpen(false)} disabled={isSaving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Annuler</button>
              <button type="button" onClick={handleSave} disabled={isSaving || !!error.logo} className={btnDark}>
                <Save size={16} /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}