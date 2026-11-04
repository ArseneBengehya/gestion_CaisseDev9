'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoCaisse, setLogoCaisse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.caisseLogo) {
          setLogoCaisse(data.caisseLogo);
        } else {
          setLogoCaisse(null);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanInput = identifiant.trim();
    if (!cleanInput || !motDePasse) {
      setErrorMessage("Veuillez remplir l'identifiant et le mot de passe.");
      return;
    }

    setIsLoading(true);

    try {
      const membresRef = collection(db, 'membres');
      
      let q = query(membresRef, where('telephone', '==', cleanInput));
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        q = query(membresRef, where('email', '==', cleanInput));
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        setErrorMessage("Identifiant incorrect.");
        setIsLoading(false);
        return;
      }

      const membreDoc = querySnapshot.docs[0];
      const membreData = membreDoc.data();

      // Vérification stricte du statut du membre (bloque si inactif ou supprimé logiquement)
      if (membreData.statut === 'INACTIF' || membreData.statut === 'SUPPRIME') {
        setErrorMessage("Votre compte est inactif ou a été supprimé. Contactez l'administration.");
        setIsLoading(false);
        return;
      }

      // Vérification du Mot de Passe
      if (membreData.motDePasse && membreData.motDePasse !== motDePasse) {
        setErrorMessage("Mot de passe incorrect.");
        setIsLoading(false);
        return;
      }

      const userSession = {
        id: membreDoc.id,
        nomComplet: membreData.nomComplet || `${membreData.prenom || ''} ${membreData.nom || ''}`.trim(),
        telephone: membreData.telephone || '',
        photoUrl: membreData.photoUrl || '',
        role: membreData.role || 'MEMBRE',
      };

      localStorage.setItem('caisse_user', JSON.stringify(userSession));

      if (userSession.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/espace_Membre');
      }

    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      setErrorMessage('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">
        
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-slate-600 mb-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-sm">
            {logoCaisse ? (
              <img src={logoCaisse} alt="Logo Caisse Dev9" className="h-full w-full object-cover" />
            ) : (
              <Shield size={32} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Caisse Dev9</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Espace de connexion</p>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Téléphone ou E-mail
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                placeholder="Ex. +243..."
                required
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
              />
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••"
                required
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
              />
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}