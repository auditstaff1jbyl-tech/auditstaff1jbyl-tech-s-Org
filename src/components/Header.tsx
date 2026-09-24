import React from 'react';
import { ShieldCheck, Database, Clock, PlusCircle, User } from 'lucide-react';
import { formatPHP } from '../utils/formatters';

interface HeaderProps {
  activeTabTitle: string;
  totalRecordsCount: number;
  totalExposure: number;
  currentUser?: { name: string; slug: string } | null;
  onNavigateToMatrix?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  totalRecordsCount,
  totalExposure,
  currentUser,
  onNavigateToMatrix,
  onSignOut,
}) => {
  return (
    <header
      id="main-app-header"
      className="bg-white border-b border-[#EAE3D5] px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none sticky top-0 z-30 shadow-2xs"
    >
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-lg font-bold text-gray-900 italic tracking-tight">
          {activeTabTitle}
        </h1>
        <span className="hidden sm:inline-flex items-center gap-1 bg-[#FAF2E5] text-[#A67C30] border border-[#EBDCBF] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono">
          <ShieldCheck className="w-3 h-3 text-[#A67C30]" />
          Executive Audit Active
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EAE3D5] px-3 py-1.5 rounded-xl font-mono text-[11px]">
          <Database className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="text-[#6C655B]">Total Records:</span>
          <span className="font-bold text-gray-900">{totalRecordsCount}</span>
        </div>

        <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EAE3D5] px-3 py-1.5 rounded-xl font-mono text-[11px]">
          <span className="text-[#6C655B]">Gross Exposure:</span>
          <span className="font-extrabold text-red-600">{formatPHP(totalExposure)}</span>
        </div>

        {currentUser && (
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] border border-[#EAE3D5] px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-gray-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{currentUser.name}</span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-[10px] text-gray-400 hover:text-red-600 ml-1 underline cursor-pointer"
                title="Lock session"
              >
                Lock
              </button>
            )}
          </div>
        )}

        {onNavigateToMatrix && (
          <button
            onClick={onNavigateToMatrix}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#b08d4b] text-black font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Daily Entry</span>
          </button>
        )}

        <div className="hidden lg:flex items-center gap-2 text-gray-500 font-mono text-[11px]">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>Real-time Flow</span>
        </div>
      </div>
    </header>
  );
};
