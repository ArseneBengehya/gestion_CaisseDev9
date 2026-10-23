'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Phone, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanInput = identifiant.trim();
    if (!cleanInput || !motDePasse) {
      setErrorMessage('Veuillez remplir l\'identifiant et le mot de passe.');
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

      // Vérification du Mot de Passe
      if (membreData.motDePasse && membreData.motDePasse !== motDePasse) {
        setErrorMessage("Mot de passe incorrect.");
        setIsLoading(false);
        return;
      }

      if (membreData.statut === 'INACTIF') {
        setErrorMessage("Votre compte est inactif. Contactez l'administration.");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600/10 text-blue-500 rounded-2xl border border-blue-500/20 mb-2">
            <Shield size={36} />
          </div>
          <h1 className="text-2xl font-bold text-white">Caisse Dev9</h1>
          <p className="text-xs text-slate-400">Espace de connexion sécurisé</p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Téléphone ou E-mail
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                placeholder="Ex. +243..."
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500"
              />
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500"
              />
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}