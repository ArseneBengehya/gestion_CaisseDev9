'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Settings, FileText, CheckCircle, Percent, Calendar, Save } from 'lucide-react';

// Import Firestore
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface PalierPret {
  id: number;
  min: number;
  max: number | string;
  delai: string;
  taux: number;
}

export default function ReglesEtParametresPage() {
  const [activeTab, setActiveTab] = useState<'regles' | 'parametres'>('regles');

  // États des paramètres synchronisés avec Firestore
  const [cotisationMensuelle, setCotisationMensuelle] = useState(5000);
  const [cotisationMoisSpecial, setCotisationMoisSpecial] = useState(10000);
  const [dateDebutCaisse, setDateDebutCaisse] = useState('2025-01-01'); // Date de début configurable
  const [paliersPrets, setPaliersPrets] = useState<PalierPret[]>([
    { id: 1, min: 20000, max: 50000, delai: '1 mois', taux: 20 },
    { id: 2, min: 60000, max: 70000, delai: '2 mois', taux: 15 },
    { id: 3, min: 80000, max: 100000, delai: '3 mois', taux: 10 },
    { id: 4, min: 100000, max: 'Et plus', delai: '4 mois', taux: 5 },
  ]);

  const [isLoading, setIsLoading] = useState(true);

  // 1. CHARGER LES PARAMÈTRES DEPUIS FIRESTORE EN TEMPS RÉEL
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.cotisationMensuelle) setCotisationMensuelle(data.cotisationMensuelle);
        if (data.cotisationMoisSpecial) setCotisationMoisSpecial(data.cotisationMoisSpecial);
        if (data.dateDebutCaisse) setDateDebutCaisse(data.dateDebutCaisse);
        if (data.paliersPrets) setPaliersPrets(data.paliersPrets);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. ENREGISTRER DANS FIRESTORE
  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'caisse_config'), {
        cotisationMensuelle,
        cotisationMoisSpecial,
        dateDebutCaisse,
        paliersPrets,
        updatedAt: new Date().toISOString(),
      });
      alert('Paramètres de la Caisse Dev9 enregistrés avec succès ! Toute l\'application a été mise à jour.');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde :', error);
      alert('Erreur lors de la sauvegarde des paramètres.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Règles & Paramètres</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Consultez le règlement officiel ou configurez les paramètres de la Caisse Dev9.
          </p>
        </div>

        {/* Boutons de bascule */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setActiveTab('regles')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'regles'
                ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BookOpen size={15} />
            Règles du Groupe
          </button>
          <button
            onClick={() => setActiveTab('parametres')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'parametres'
                ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Settings size={15} />
            Paramètres de la Caisse
          </button>
        </div>
      </div>

      {/* VUE RÈGLES */}
      {activeTab === 'regles' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/20">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Charte Officielle - Co-fondateurs Caisse Dev9
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  L'intégralité des règles régissant la hiérarchie, la caisse, les événements et les pénalités.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">1. Hiérarchie (CEO, CTO, ...)</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300">Le CEO est élu par vote ouvert. Toute décision est prise collectivement (majorité par vote).</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">2. Gestion / Caisse & Emprunts</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300">Emprunts possibles selon les taux et délais configurés dans les paramètres.</p>
          </div>
        </div>
      )}

      {/* VUE PARAMÈTRES */}
      {activeTab === 'parametres' && (
        <form onSubmit={handleSaveParameters} className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Configuration Caisse Dev9 (Firestore)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modifiez la date de lancement, les cotisations et les taux d'intérêt.</p>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Chargement des paramètres...</div>
            ) : (
              <>
                {/* Champ Date de Début de la Caisse */}
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20">
                  <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-1 flex items-center gap-1.5">
                    <Calendar size={14} /> Date de Début de la Caisse (Lancement Officiel)
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Toutes les cotisations, échéanciers et calculs de retards démarreront strictement à partir de cette date.
                  </p>
                  <input
                    type="date"
                    required
                    value={dateDebutCaisse}
                    onChange={(e) => setDateDebutCaisse(e.target.value)}
                    className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Cotisations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Cotisation Mensuelle Standard (FC)
                    </label>
                    <input
                      type="number"
                      value={cotisationMensuelle}
                      onChange={(e) => setCotisationMensuelle(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Cotisation Mois Spécial / Croissance (FC)
                    </label>
                    <input
                      type="number"
                      value={cotisationMoisSpecial}
                      onChange={(e) => setCotisationMoisSpecial(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Paliers Prêts */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase text-slate-500">Paliers d'Emprunts & Taux d'Intérêt</h4>
                  {paliersPrets.map((palier, index) => (
                    <div key={palier.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 items-center">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase">Palier {index + 1}</label>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {palier.min.toLocaleString()} FC - {typeof palier.max === 'number' ? `${palier.max.toLocaleString()} FC` : palier.max}
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Délai</label>
                        <input
                          type="text"
                          value={palier.delai}
                          onChange={(e) => {
                            const newPaliers = [...paliersPrets];
                            newPaliers[index].delai = e.target.value;
                            setPaliersPrets(newPaliers);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Taux (%)</label>
                        <input
                          type="number"
                          value={palier.taux}
                          onChange={(e) => {
                            const newPaliers = [...paliersPrets];
                            newPaliers[index].taux = parseFloat(e.target.value) || 0;
                            setPaliersPrets(newPaliers);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center justify-end">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <CheckCircle size={12} /> Actif
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Save size={16} />
                    Enregistrer les paramètres
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      )}
    </div>
  );
}