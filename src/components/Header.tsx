import React from 'react';
import { Database, PlusCircle, Menu, Lock } from 'lucide-react';
import { formatPHP } from '../utils/formatters';

interface HeaderProps {
  activeTabTitle: string;
  totalRecordsCount: number;
  totalExposure: number;
  currentUser?: { name: string; slug: string } | null;
  onNavigateToMatrix?: () => void;
  onSignOut?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  totalRecordsCount,
  totalExposure,
  currentUser,
  onNavigateToMatrix,
  onSignOut,
  onToggleMobileMenu,
}) => {
  return (
    <header
      id="main-app-header"
      className="bg-white border-b border-[#EAE3D5] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 select-none sticky top-0 z-30 shadow-2xs"
    >
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-stone-700 hover:bg-stone-100 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="font-serif text-base sm:text-lg font-bold text-stone-900 tracking-tight">
            {activeTabTitle}
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-500">
            <span>Executive Audit Active</span>
            <span aria-hidden="true">·</span>
            <span>Real-time Variance Flow</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-xs flex-wrap justify-end">
        <div className="hidden sm:flex items-center gap-2 text-stone-600 text-xs">
          <span className="flex items-center gap-1.5 font-mono tabular-nums text-stone-700">
            <Database className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{totalRecordsCount} records</span>
          </span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="font-mono tabular-nums font-bold text-red-700">
            {formatPHP(totalExposure)}
          </span>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 py-1 px-2.5 rounded-lg border border-[#EAE3D5] bg-[#FAF7F2] text-xs text-stone-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-stone-900">{currentUser.name}</span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-stone-400 hover:text-stone-700 ml-1 p-0.5 rounded cursor-pointer"
                title="Lock session"
              >
                <Lock className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {onNavigateToMatrix && (
          <button
            onClick={onNavigateToMatrix}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#B38D45] text-stone-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Daily Entry</span>
            <span className="sm:hidden">Log</span>
          </button>
        )}
      </div>
    </header>
  );
};
