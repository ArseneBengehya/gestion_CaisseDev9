'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  PiggyBank, 
  Receipt, 
  Settings, 
  LogOut 
} from 'lucide-react';

const menuItems = [
  { name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Membres', href: '/dashboard/membres', icon: Users },
  { name: 'Contributions', href: '/dashboard/contributions', icon: PiggyBank },
  { name: 'Dépenses', href: '/dashboard/depenses', icon: Receipt },
  { name: 'Règles & Paramètres', href: '/dashboard/regles', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col justify-between p-4">
      <div>
        {/* Logo / Titre */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg font-bold text-xl">C</div>
          <span className="font-bold text-lg tracking-wide">Caisse MASI</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Profil / Déconnexion rapide */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between px-2">
        <div className="text-sm">
          <p className="font-semibold text-white">Admin Caisse</p>
          <p className="text-xs text-slate-400">admin@masi.com</p>
        </div>
        <button 
          title="Déconnexion" 
          className="text-slate-400 hover:text-red-400 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}