'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
// import LogoutModal from '@/components/modals/LogoutModal';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const menuItems = [
    { label: 'Vue d’ensemble', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Membres', icon: Users, href: '/dashboard/membres' },
    { label: 'Contributions', icon: Wallet, href: '/dashboard/contributions' },
    { label: 'Emprunts & Crédits', icon: HandCoins, href: '/dashboard/emprunts' },
    { label: 'Dépenses', icon: Receipt, href: '/dashboard/depenses' },
    { label: 'Retards & Relances', icon: AlertTriangle, href: '/dashboard/retards' },
    { label: 'Règles & Paramètres', icon: Settings, href: '/dashboard/regles' },
  ];

  const handleConfirmLogout = () => {
    setIsLogoutOpen(false);
    router.push('/login');
  };

  return (
    <>
      {/* Overlay sur Mobile quand la sidebar est ouverte */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Conteneur de la Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between p-4 border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* En-tête / Logo + Bouton Fermer sur Mobile */}
          <div className="flex items-center justify-between px-2 py-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="font-bold text-white text-base leading-tight">Caisse Dev9</h1>
                <p className="text-xs text-slate-400">Administration</p>
              </div>
            </div>

            {/* Bouton X uniquement sur mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Menu de Navigation */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose} // Ferme la sidebar sur mobile après clic
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Déconnexion */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={() => setIsLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}