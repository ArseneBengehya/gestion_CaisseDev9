'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Menu, Loader2, UserCheck } from 'lucide-react';
import Sidebar from '@/src/components/Sidebar';
import ThemeToggle from '@/src/components/ui/ThemeToggle';
import Link from 'next/link';

// Import de Firestore
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const [userName, setUserName] = useState('Administrateur');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      const userStr = localStorage.getItem('caisse_user');

      if (!userStr) {
        router.push('/login');
        return;
      }

      try {
        const localUser = JSON.parse(userStr);

        if (localUser.role !== 'ADMIN') {
          router.push('/espace_Membre');
          return;
        }

        if (localUser.id) {
          const docRef = doc(db, 'membres', localUser.id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Sécurité supplémentaire : Si le compte a été supprimé ou mis inactif entre-temps
            if (data.statut === 'INACTIF' || data.statut === 'SUPPRIME') {
              localStorage.removeItem('caisse_user');
              router.push('/login');
              return;
            }

            const nomComplet = data.nomComplet || `${data.prenom || ''} ${data.nom || ''}`.trim();
            const photo = data.photoUrl || data.avatarUrl || null;

            setUserName(nomComplet || 'Administrateur');
            setUserPhoto(photo);
          } else {
            setUserName(localUser.nomComplet || 'Administrateur');
            setUserPhoto(localUser.photoUrl || localUser.avatarUrl || null);
          }
        } else {
          setUserName(localUser.nomComplet || 'Administrateur');
          setUserPhoto(localUser.photoUrl || localUser.avatarUrl || null);
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Erreur lors du chargement des données admin :', error);
        router.push('/login');
      }
    };

    fetchAdminData();
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="animate-spin text-slate-500 dark:text-slate-300" />
          <span className="text-sm font-medium">Chargement du profil administrateur...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
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

          {/* Actions de droite : Bouton Switch vers Vue Membre + Thème + Profil */}
          <div className="flex items-center gap-3">
            {/* Bouton pour basculer vers l'Espace Membre */}
            <Link
              href="/espace_Membre"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-sm"
              title="Voir mon compte en tant que membre"
            >
              <UserCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Vue Membre</span>
            </Link>

            <ThemeToggle />

            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <User size={16} />
                </div>
              )}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">
                {userName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}