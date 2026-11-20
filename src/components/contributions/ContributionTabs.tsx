import { CalendarDays, ShieldAlert, Wallet } from 'lucide-react';

export type ContributionTab = 'cotisations' | 'mois-special' | 'penalites';

interface ContributionTabsProps {
  activeTab: ContributionTab;
  onChange: (tab: ContributionTab) => void;
}

export default function ContributionTabs({ activeTab, onChange }: ContributionTabsProps) {
  const tabs = [
    { id: 'cotisations', label: 'Contributions', icon: Wallet },
    { id: 'mois-special', label: 'Mois spécial', icon: CalendarDays },
    { id: 'penalites', label: 'Pénalités', icon: ShieldAlert },
  ] as const;

  return (
    <div className="flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === id
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <Icon size={15} /> {label}
        </button>
      ))}
    </div>
  );
}
