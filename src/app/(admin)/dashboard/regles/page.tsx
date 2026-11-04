'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Settings, FileText, Calendar, Save, Plus, Image as ImageIcon, Upload, X, Eye } from 'lucide-react';
import AddRegleModal from '@/src/components/modals/AddRegleModal';
import AddPalierModal from '@/src/components/modals/AddPalierModal';
import ViewPaliersModal from '@/src/components/modals/ViewPaliersModal';
import Toast from '@/src/components/ui/Toast';

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

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

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ReglesEtParametresPage() {
  const [activeTab, setActiveTab] = useState<'regles' | 'parametres'>('regles');

  const [cotisationMensuelle, setCotisationMensuelle] = useState(5000);
  const [cotisationMoisSpecial, setCotisationMoisSpecial] = useState(10000);
  const [dateDebutCaisse, setDateDebutCaisse] = useState('2025-01-01');
  const [caisseLogo, setCaisseLogo] = useState<string>('');
  const [logoError, setLogoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paliersPrets, setPaliersPrets] = useState<PalierPret[]>([]);
  const [regles, setRegles] = useState<RegleItem[]>([]);

  const [isRegleModalOpen, setIsRegleModalOpen] = useState(false);
  const [isPalierModalOpen, setIsPalierModalOpen] = useState(false);
  const [isViewPaliersModalOpen, setIsViewPaliersModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.cotisationMensuelle) setCotisationMensuelle(data.cotisationMensuelle);
        if (data.cotisationMoisSpecial) setCotisationMoisSpecial(data.cotisationMoisSpecial);
        if (data.dateDebutCaisse) setDateDebutCaisse(data.dateDebutCaisse);
        if (data.caisseLogo) setCaisseLogo(data.caisseLogo);
        
        if (Array.isArray(data.paliersPrets)) {
          setPaliersPrets(data.paliersPrets);
        } else {
          setPaliersPrets([]);
        }

        if (Array.isArray(data.reglesGroupe)) setRegles(data.reglesGroupe);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Format non accepté (JPG, PNG ou WEBP).');
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoError('Fichier trop volumineux (Max 2 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCaisseLogo(reader.result as string);
      setLogoError('');
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setCaisseLogo('');
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
      showToast('error', 'Erreur lors de l’enregistrement dans Firestore.');
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
  };

  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logoError) return;

    try {
      await setDoc(
        doc(db, 'settings', 'caisse_config'),
        {
          cotisationMensuelle,
          cotisationMoisSpecial,
          dateDebutCaisse,
          caisseLogo: caisseLogo || '',
          paliersPrets,
          reglesGroupe: regles,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      showToast('success', 'Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur sauvegarde :', error);
      showToast('error', 'Erreur lors de la sauvegarde.');
    }
  };

  const handleAddRegle = async (titre: string, contenu: string[]) => {
    const nouvelleRegle: RegleItem = { id: Date.now().toString(), titre, contenu };
    const updatedRegles = [...regles, nouvelleRegle];

    try {
      await setDoc(
        doc(db, 'settings', 'caisse_config'),
        {
          cotisationMensuelle,
          cotisationMoisSpecial,
          dateDebutCaisse,
          caisseLogo: caisseLogo || '',
          paliersPrets,
          reglesGroupe: updatedRegles,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setRegles(updatedRegles);
      showToast('success', 'Nouvelle règle enregistrée dans Firestore !');
    } catch (error) {
      console.error('Erreur sauvegarde règle :', error);
      showToast('error', 'Erreur lors de l’enregistrement.');
    }
  };

  return (
    <div className="relative space-y-6 pb-8">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Règles & Paramètres</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configurez les paramètres globaux, les pourcentages d'emprunt et consultez les règles.
          </p>
        </div>

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

      {activeTab === 'regles' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200 shadow-sm">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Charte Officielle - Caisse Dev9</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Consultez ou ajoutez les règles régissant le groupe.</p>
              </div>
            </div>
            <button
              onClick={() => setIsRegleModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors shrink-0 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Plus size={16} /> Ajouter une règle
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement des règles...</div>
          ) : regles.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Aucune règle enregistrée. Cliquez sur "Ajouter une règle" pour en créer une.
            </div>
          ) : (
            regles.map((regle) => (
              <div key={regle.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">{regle.titre}</h4>
                <div className="flex flex-col gap-3">
                  {regle.contenu.map((ligne, idx) => (
                    <p key={idx} className="text-sm text-slate-700 dark:text-slate-300">{idx + 1}. {ligne}</p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AddRegleModal isOpen={isRegleModalOpen} onClose={() => setIsRegleModalOpen(false)} onAdd={handleAddRegle} />

      {activeTab === 'parametres' && (
        <form onSubmit={handleSaveParameters} className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Configuration de la Caisse</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modifiez le logo, la date de début, les cotisations et les pourcentages d'emprunt.</p>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Chargement des paramètres...</div>
            ) : (
              <>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon size={15} /> Logo de la Caisse
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      {caisseLogo ? <img src={caisseLogo} alt="Logo" className="h-full w-full object-cover" /> : <ImageIcon size={28} />}
                    </div>
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} className="sr-only" />
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3.5 py-2 text-xs font-semibold rounded-xl border bg-white hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700">
                          <Upload size={14} className="inline mr-1" /> {caisseLogo ? 'Changer' : 'Sélectionner'}
                        </button>
                        {caisseLogo && (
                          <button type="button" onClick={removeLogo} className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl">
                            <X size={14} className="inline mr-1" /> Supprimer
                          </button>
                        )}
                      </div>
                      {logoError && <p className="mt-1 text-xs text-rose-600">{logoError}</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
                    <label className="block text-xs font-bold uppercase mb-1 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Calendar size={14} /> Date de Début
                    </label>
                    <input type="date" required value={dateDebutCaisse} onChange={(e) => setDateDebutCaisse(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1 text-slate-700 dark:text-slate-300">Cotisation Standard (FC)</label>
                    <input type="number" value={cotisationMensuelle} onChange={(e) => setCotisationMensuelle(parseFloat(e.target.value) || 0)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 dark:border-slate-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1 text-slate-700 dark:text-slate-300">Cotisation Mois Spécial (FC)</label>
                    <input type="number" value={cotisationMoisSpecial} onChange={(e) => setCotisationMoisSpecial(parseFloat(e.target.value) || 0)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 dark:border-slate-700" />
                  </div>
                </div>

                {/* Section Épurée : Boutons d'accès aux pourcentages */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-xl mx-auto">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Pourcentages de remboursement & Taux d'intérêt
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Gérez les tranches de montant et le pourcentage d'intérêt appliqué lors d'un emprunt ({paliersPrets.length} palier(s) configuré(s)).
                    </p>
                  </div>

                  {/* Boutons centrés au milieu */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsViewPaliersModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Eye size={16} /> Regarder les pourcentages fixés ({paliersPrets.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPalierModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      <Plus size={16} /> Configurer les pourcentages
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                    <Save size={16} /> Enregistrer tous les paramètres
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      )}

      {/* Modales */}
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