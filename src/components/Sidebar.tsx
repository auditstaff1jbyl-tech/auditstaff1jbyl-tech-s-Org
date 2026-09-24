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
  X,
} from 'lucide-react';
import { AlertItem, ActionItem } from '../types';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  alerts?: AlertItem[];
  actionItems?: ActionItem[];
  onExportBackup?: () => void;
  onImportClick?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  alerts = [],
  actionItems = [],
  onExportBackup,
  onImportClick,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const criticalAlertsCount = alerts.filter(a => a && a.severity === 'Critical').length;
  const pendingActionsCount = actionItems.filter(
    a => a && (a.status === 'Open' || a.status === 'In Progress')
  ).length;

  const navItems = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      badge: criticalAlertsCount > 0 ? `${criticalAlertsCount}` : undefined,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
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
      badge: pendingActionsCount > 0 ? `${pendingActionsCount}` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
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

  const handleSelect = (tabId: string) => {
    onSelectTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-5 text-[#A69C8E] font-sans">
      <div>
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0 font-serif font-black text-lg text-[#121110] border border-[#C5A059]/40">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-white text-sm tracking-wide italic leading-tight">
                EOD Matrix
              </span>
              <span className="text-[10px] text-[#C5A059] tracking-wider uppercase font-semibold">
                Audit & Risk Portal
              </span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 px-2 mb-2">
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
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#1F1D1B] text-[#C5A059] font-semibold border-l-2 border-[#C5A059]'
                    : 'text-[#A69C8E] hover:bg-[#1A1817] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 pt-4 border-t border-[#22201D] space-y-2 text-xs">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 px-1">
          Master Data Controls
        </div>

        {onExportBackup && (
          <button
            id="btn-export-backup"
            onClick={onExportBackup}
            className="w-full flex items-center gap-2 py-1.5 px-2.5 bg-[#1B1918] hover:bg-[#22201D] text-[#A69C8E] hover:text-[#C5A059] border border-[#22201D] rounded-lg text-xs font-medium transition-colors cursor-pointer"
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
            className="w-full flex items-center gap-2 py-1.5 px-2.5 bg-[#1B1918] hover:bg-[#22201D] text-[#A69C8E] hover:text-[#C5A059] border border-[#22201D] rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Restore database from a JSON backup"
          >
            <Upload className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Import Backup</span>
          </button>
        )}

        <div className="pt-2 text-[10px] text-stone-600 text-center font-mono">
          EOD Matrix v3.0 • Executive Suite
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        id="main-sidebar"
        className="hidden md:flex md:w-60 bg-[#121110] md:h-screen md:sticky md:top-0 md:shrink-0 border-r border-[#22201D] select-none overflow-y-auto z-40"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] bg-[#121110] h-full shadow-2xl z-10 overflow-y-auto">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
