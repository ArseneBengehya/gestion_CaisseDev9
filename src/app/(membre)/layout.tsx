"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Wallet,
  User,
  BookOpen,
  LogOut,
  Building2,
  Menu,
  X,
  Bell,
  ShieldCheck,
} from "lucide-react";

// Importations Firebase et Firestore
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal"; // Ton composant modal existant

export default function MembreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // États pour les notifications et le modal
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Écoute de l'authentification et des notifications en temps réel
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        
        // Écouter les notifications Firestore pour ce membre ou globales ("TOUS")
        const notifsRef = collection(db, "notifications");
        const qNotifs = query(notifsRef, where("membreId", "in", [user.uid, "TOUS"]));
        
        const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
          const notifsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          // Trier par date décroissante
          notifsList.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setNotifications(notifsList);
        });

        return () => unsubscribeNotifs();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };

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
    {
      name: "Règles de la caisse",
      href: "/espace_Membre/regles",
      icon: BookOpen,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 relative">
      {/* 🟢 OVERLAY SOMBRE SUR MOBILE */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* 📱 / 💻 SIDEBAR LATÉRALE */}
      <aside
        className={`w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between p-6 fixed top-0 bottom-0 left-0 z-50 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Header de la Sidebar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                  Caisse Dev9
                </h2>
                <span className="text-[11px] font-medium text-slate-400">
                  Espace Membre
                </span>
              </div>
            </div>

            {/* Bouton Fermer sur Mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-slate-900 text-white dark:bg-blue-600 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bouton de Déconnexion */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL DE LA PAGE */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full transition-all duration-300">
        {/* Top Header avec Bouton Burger et Icône de Notification */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>

            <div className="text-xs text-slate-400 font-medium hidden sm:block">
              Caisse Dev9 / <span className="text-slate-700 dark:text-slate-300">Tableau de bord</span>
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-white sm:hidden">
              Caisse Dev9
            </div>
          </div>

          {/* Section Droite : Notification & Profil utilisateur */}
          <div className="flex items-center gap-4">
            {/* 🔔 Bouton de Notification dans la Navbar */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Voir les notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Avatar / Profil rapide */}
            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                M
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline-block">
                Espace Membre
              </span>
            </div>
          </div>
        </header>

        {/* Zone dynamique {children} */}
        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* 🪟 MODAL DES NOTIFICATIONS EN DIRECT */}
      <Modal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        title="Centre de Notifications"
        maxWidth="md"
      >
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {notifications.length > 0 ? (
            notifications.map((notif: any) => (
              <div
                key={notif.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 transition-all hover:bg-slate-100/80"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    {notif.titre || "Mise à jour"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {notif.date
                      ? new Date(notif.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Récemment"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-10 space-y-2">
              <Bell size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs text-slate-500 font-medium">Aucune nouvelle notification pour l'instant.</p>
              <p className="text-[11px] text-slate-400">Les modifications de l'admin apparaîtront ici instantanément.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}