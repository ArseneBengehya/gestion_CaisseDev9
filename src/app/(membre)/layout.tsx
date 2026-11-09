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
  Loader2,
} from "lucide-react";

// Importations Firebase et Firestore
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import ThemeToggle from "@/components/ui/ThemeToggle";

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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userName, setUserName] = useState("Espace Membre");
  const [userPhoto, setUserPhoto] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [caisseLogo, setCaisseLogo] = useState("");
  const [unreadIds, setUnreadIds] = useState<string[]>([]);

  useEffect(() => {
    return onSnapshot(doc(db, "settings", "caisse_config"), (snapshot) => {
      if (snapshot.exists()) setCaisseLogo(snapshot.data().caisseLogo || "");
    });
  }, []);

  // Écoute de l'authentification et des notifications en temps réel
  useEffect(() => {
    const userStr = localStorage.getItem("caisse_user");
    if (!userStr) {
      router.push("/login");
      return;
    }

    let user: { id?: string; role?: string; photoUrl?: string };
    try {
      user = JSON.parse(userStr);
    } catch {
      localStorage.removeItem("caisse_user");
      router.push("/login");
      return;
    }
    if (!user.id) {
      localStorage.removeItem("caisse_user");
      router.push("/login");
      return;
    }

    setCurrentUserId(user.id);

    const unsubscribeMember = onSnapshot(
      doc(db, "membres", user.id),
      (snapshot) => {
        if (!snapshot.exists()) {
          localStorage.removeItem("caisse_user");
          router.push("/login");
          return;
        }
        const membre = snapshot.data();
        if (membre.statut === "INACTIF" || membre.statut === "SUPPRIME") {
          localStorage.removeItem("caisse_user");
          router.push("/login");
          return;
        }
        const role = membre.role || user.role || "MEMBRE";
        setIsAdmin(role === "ADMIN");
        setUserName(membre.nomComplet || `${membre.prenom || ""} ${membre.nom || ""}`.trim() || "Espace Membre");
        setUserPhoto(membre.photoUrl || membre.avatarUrl || user.photoUrl || "");
        setIsAuthorized(true);
      },
      (error) => {
        console.error("Erreur lors du chargement de la session membre :", error);
        localStorage.removeItem("caisse_user");
        router.push("/login");
      }
    );

    const notifsRef = collection(db, "notifications");
    const qNotifs = query(notifsRef, where("membreId", "in", [user.id, "TOUS"]));
    const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
      const notifsList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      notifsList.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setNotifications(notifsList);
    });

    return () => {
      unsubscribeMember();
      unsubscribeNotifs();
    };
  }, [router]);

  const handleLogout = async () => {
    localStorage.removeItem("caisse_user");
    router.push("/login");
  };

  const unreadCount = notifications.filter((notification) => notification.lu !== true).length;

  const openNotifications = async () => {
    setIsNotifOpen(true);
    const ids = notifications.filter((notification) => notification.lu !== true).map((notification) => notification.id);
    setUnreadIds(ids);
    await Promise.all(ids.map((id) => updateDoc(doc(db, "notifications", id), { lu: true })));
  };

  const closeNotifications = () => {
    setIsNotifOpen(false);
    setUnreadIds([]);
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

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="animate-spin text-slate-500 dark:text-slate-300" />
          <span className="text-sm font-medium">Chargement de votre espace membre...</span>
        </div>
      </div>
    );
  }

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
                {caisseLogo ? <img src={caisseLogo} alt="Logo Caisse Dev9" className="h-full w-full rounded-xl object-cover" /> : <Building2 size={20} />}
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
              const isActive = pathname === item.href || (item.href !== "/espace_Membre" && pathname.startsWith(`${item.href}/`));
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
            {isAdmin && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ShieldCheck size={15} />
                <span className="hidden sm:inline">Vue Admin</span>
              </Link>
            )}
            {/* 🔔 Bouton de Notification dans la Navbar */}
            <button
              onClick={openNotifications}
              className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Voir les notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            <ThemeToggle />

            {/* Avatar / Profil rapide */}
            <Link href="/espace_Membre/profil" className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4 transition hover:opacity-80">
              {userPhoto ? (
                <img src={userPhoto} alt={userName} className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline-block">
                {userName}
              </span>
            </Link>
          </div>
        </header>

        {/* Zone dynamique {children} */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 w-full">{children}</main>
      </div>

      {/* 🪟 MODAL DES NOTIFICATIONS EN DIRECT */}
      <Modal
        isOpen={isNotifOpen}
        onClose={closeNotifications}
        title="Centre de Notifications"
        maxWidth="md"
      >
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {notifications.length > 0 ? (
            notifications.map((notif: any) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800 ${
                  unreadIds.includes(notif.id)
                    ? "bg-blue-50 font-bold dark:bg-blue-950/30"
                    : "bg-slate-50 dark:bg-slate-800/40"
                }`}
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