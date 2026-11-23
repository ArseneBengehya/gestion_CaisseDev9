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
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { formaterDateNotification } from "@/src/lib/expense-notifications";

export default function MembreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // États pour les notifications et le modal
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    date?: string;
    titre?: string;
    message?: string;
    lu?: boolean;
    read?: boolean;
  }>>([]);
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
      const notifsList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          date: typeof data.date === 'string' ? data.date : '',
          titre: typeof data.titre === 'string' ? data.titre : '',
          message: typeof data.message === 'string' ? data.message : '',
          lu: data.lu === true,
          read: data.read === true,
        };
      });
      notifsList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
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
      <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
        <PageSkeleton layout="member-dashboard" />
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
                      ? "border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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

      {isNotifOpen && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-page-title"
          className="fixed inset-0 z-60 flex flex-col bg-[#F8FAFC] text-slate-800 dark:bg-slate-950 dark:text-slate-100"
        >
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Bell size={18} />
              </div>
              <div>
                <h1 id="notification-page-title" className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  Centre de notifications
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {notifications.length} notification{notifications.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeNotifications}
              aria-label="Fermer les notifications"
              title="Fermer"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-3xl space-y-3">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <article
                    key={notif.id}
                    className={`rounded-xl border p-4 transition-colors sm:p-5 ${
                      unreadIds.includes(notif.id)
                        ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
                        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${unreadIds.includes(notif.id) ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                        {notif.titre || "Mise à jour"}
                      </h2>
                      <time className="shrink-0 text-xs text-slate-400">
                        {formaterDateNotification(notif.date || "")}
                      </time>
                    </div>
                    <p className="mt-2 pl-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {notif.message}
                    </p>
                  </article>
                ))
              ) : (
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                    <Bell size={26} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Aucune notification</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Les nouvelles informations apparaîtront ici.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}