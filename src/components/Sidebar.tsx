'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  AlertTriangle,
  Settings,
  LogOut,
  ShieldCheck,
  HandCoins,
  X,
} from 'lucide-react';
import LogoutModal from './modals/LogoutModal';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems = [
  { label: 'Vue d’ensemble', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Membres', icon: Users, href: '/dashboard/membres' },
  { label: 'Contributions', icon: Wallet, href: '/dashboard/contributions' },
  { label: 'Emprunts & crédits', icon: HandCoins, href: '/dashboard/emprunts' },
  { label: 'Dépenses', icon: Receipt, href: '/dashboard/depenses' },
  { label: 'Retards & relances', icon: AlertTriangle, href: '/dashboard/retards' },
  { label: 'Règles & paramètres', icon: Settings, href: '/dashboard/regles' },
];

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [logoCaisse, setLogoCaisse] = useState<string | null>(null);

  // Synchronisation en temps réel du logo depuis Firestore
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

  const handleConfirmLogout = () => {
    setIsLogoutOpen(false);
    localStorage.removeItem('caisse_user');
    router.push('/login');
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={onClose}
          className="fixed inset-0 z-40 cursor-default bg-slate-950/35 backdrop-blur-[2px] md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white p-3 text-slate-700 shadow-xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:shadow-none md:static md:translate-x-0 md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex min-w-0 items-center gap-3">
              {/* Conteneur du Logo corrigé pour un affichage propre */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 text-white shadow-sm dark:bg-slate-700 border border-slate-200/50 dark:border-slate-700">
                {logoCaisse ? (
                  <img 
                    src={logoCaisse} 
                    alt="Logo Caisse Dev9" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <ShieldCheck size={20} />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">Caisse Dev9</h1>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Administration</p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le menu"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Menu principal</p>
            <nav aria-label="Navigation principale" className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                      isActive
                        ? 'border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                    }`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500 dark:bg-slate-300" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Session</div>
          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-[13px] font-medium text-slate-600 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
          >
            <LogOut size={17} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <LogoutModal isOpen={isLogoutOpen} onClose={() => setIsLogoutOpen(false)} onConfirm={handleConfirmLogout} />
    </>
  );
}