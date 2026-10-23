'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Menu, Loader2 } from 'lucide-react';
import Sidebar from '@/src/components/Sidebar';
import ThemeToggle from '@/src/components/ui/ThemeToggle';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userName, setUserName] = useState('Arsène Bengehya');

  useEffect(() => {
    // 1. Récupération de la session utilisateur dans le localStorage
    const userStr = localStorage.getItem('caisse_user');

    if (!userStr) {
      // Si aucune session n'existe, redirection vers la page de connexion
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);

      // 2. Vérification stricte du rôle Administrateur
      if (user.role !== 'ADMIN') {
        // Si ce n'est pas un admin, redirection automatique vers l'espace membre
        router.push('/espace-membre');
      } else {
        if (user.nomComplet) {
          setUserName(user.nomComplet);
        }
        setIsAuthorized(true);
      }
    } catch (error) {
      console.error('Erreur de lecture de session :', error);
      router.push('/login');
    }
  }, [router]);

  // Écran de chargement pendant la vérification des droits
  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <span className="text-sm font-medium">Vérification des accès administrateur...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar Responsive */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Zone Contenu */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Navbar Supérieure */}
        <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            {/* Bouton Hamburger sur Mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden"
              title="Ouvrir le menu"
            >
              <Menu size={22} />
            </button>

            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 truncate">
              Espace Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full">
                <User size={18} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">
                {userName}
              </span>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}