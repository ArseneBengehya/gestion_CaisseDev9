import Sidebar from "@/src/components/Sidebar";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar fixe à gauche */}
      <Sidebar />

      {/* Zone de contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header Topbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Tableau de Gestion</h1>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
              Caisse Ouverte
            </span>
          </div>
        </header>

        {/* Contenu dynamique des pages */}
        <main className="p-6 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}