import React from 'react';
import {
  LayoutDashboard,
  Table2,
  CalendarRange,
  ListTodo,
  Users,
  FileSpreadsheet,
  Settings,
  Download,
  Upload,
} from 'lucide-react';
import { AlertItem, ActionItem } from '../types';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  alerts?: AlertItem[];
  actionItems?: ActionItem[];
  onExportBackup?: () => void;
  onImportClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  alerts = [],
  actionItems = [],
  onExportBackup,
  onImportClick,
}) => {
  const criticalAlertsCount = alerts.filter(a => a && a.severity === 'Critical').length;
  const pendingActionsCount = actionItems.filter(
    a => a && (a.status === 'Open' || a.status === 'In Progress')
  ).length;

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: criticalAlertsCount > 0 ? `${criticalAlertsCount} Critical` : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'daily',
      label: 'Daily EOD Matrix',
      icon: Table2,
      badge: undefined,
    },
    {
      id: 'monthly',
      label: 'Monthly Breakdown',
      icon: CalendarRange,
      badge: undefined,
    },
    {
      id: 'tracker',
      label: 'Action Tracker',
      icon: ListTodo,
      badge: pendingActionsCount > 0 ? `${pendingActionsCount} Pending` : undefined,
      badgeColor: 'bg-amber-500 text-black',
    },
    {
      id: 'staff',
      label: 'Staff Monitoring',
      icon: Users,
      badge: undefined,
    },
    {
      id: 'records',
      label: 'EOD Records',
      icon: FileSpreadsheet,
      badge: undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: undefined,
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className="w-full md:w-64 bg-[#121110] text-[#A69C8E] p-5 md:h-screen md:sticky md:top-0 md:shrink-0 flex flex-col justify-between border-r border-[#22201D] select-none overflow-y-auto z-40 font-sans"
    >
      <div>
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md p-1 shrink-0 font-serif font-black text-xl text-[#121110] border border-[#C5A059]/50">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-white text-base tracking-wide italic leading-tight">
              EOD Matrix
            </span>
            <span className="text-[10px] text-[#C5A059] tracking-widest uppercase font-bold">
              Operations & Risk Portal
            </span>
          </div>
        </div>

        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6C655B] px-2 mb-2">
          Management & Audit
        </div>

        <nav className="space-y-1" id="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 border-l-2 ${
                  isActive
                    ? 'bg-[#1B1918] text-[#C5A059] border-[#C5A059] shadow-sm font-bold'
                    : 'text-[#A69C8E] border-transparent hover:bg-[#161514] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'opacity-75'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 pt-4 border-t border-[#22201D] space-y-2 text-xs">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6C655B] px-1">
          Master Data Controls
        </div>

        {onExportBackup && (
          <button
            id="btn-export-backup"
            onClick={onExportBackup}
            className="w-full flex items-center gap-2 py-2 px-3 bg-[#1B1918] hover:bg-[#22201D] text-[#A69C8E] hover:text-[#C5A059] border border-[#22201D] rounded-lg font-medium transition-colors cursor-pointer"
            title="Download full JSON backup of the system database"
          >
            <Download className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Export Backup (.JSON)</span>
          </button>
        )}

        {onImportClick && (
          <button
            id="btn-import-backup"
            onClick={onImportClick}
            className="w-full flex items-center gap-2 py-2 px-3 bg-[#1B1918] hover:bg-[#22201D] text-[#A69C8E] hover:text-[#C5A059] border border-[#22201D] rounded-lg font-medium transition-colors cursor-pointer"
            title="Restore database from a JSON backup"
          >
            <Upload className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Import Backup</span>
          </button>
        )}

        <div className="pt-2 text-[10px] text-[#6C655B] text-center font-mono">
          EOD Matrix v3.0 • Executive Suite
        </div>
      </div>
    </aside>
  );
};
