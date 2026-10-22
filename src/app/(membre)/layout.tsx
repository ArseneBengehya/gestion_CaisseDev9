"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  User,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
} from "lucide-react";

export default function MembreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    {
      name: "Accueil",
      href: "/espace_Membre",
      icon: LayoutDashboard,
    },
    {
      name: "Mes contributions",
      href: "/espace_Membre/transactions",
      icon: Wallet,
    },
    {
      name: "Profil",
      href: "/espace_Membre/profil",
      icon: User,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 relative">
      {/* 🟢 OVERLAY SOMBRE SUR MOBILE (Affiche un voile quand la sidebar est ouverte) */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* 📱 / 💻 SIDEBAR LATÉRALE RESPONSIVE */}
      <aside
        className={`w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-6 fixed top-0 bottom-0 left-0 z-50 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Header de la Sidebar (Logo + Bouton fermer sur Mobile) */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base leading-tight">
                  Caisse Dev9
                </h2>
                <span className="text-[11px] font-medium text-slate-400">
                  Espace Membre
                </span>
              </div>
            </div>

            {/* Bouton Fermer (Uniquement sur mobile) */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Menu de navigation */}
          <nav className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Général
            </p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)} // Ferme la sidebar au clic sur mobile
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bouton de Déconnexion en bas */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={() => alert("Déconnexion en cours...")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL DE LA PAGE */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full transition-all duration-300">
        {/* Top Header léger avec Bouton Burger pour Mobile */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Bouton Burger Menu (Visible uniquement sur mobile/tablette) */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>

            <div className="text-xs text-slate-400 font-medium hidden sm:block">
              Caisse GroupDev9 / <span className="text-slate-700">Tableau de bord</span>
            </div>
            <div className="text-xs font-bold text-slate-800 sm:hidden">
              Caisse Dev9
            </div>
          </div>

          {/* Profil utilisateur dans le header */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              M
            </div>
            <span className="text-sm font-semibold text-slate-700">
              Michael K.
            </span>
          </div>
        </header>

        {/* Zone dynamique {children} */}
        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}