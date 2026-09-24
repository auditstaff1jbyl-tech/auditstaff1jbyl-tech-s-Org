import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { STORAGE_KEYS } from '../utils/constants';

interface ThemePrefs {
  brightness: number;
  mode: 'default' | 'warm' | 'contrast';
}

export const DisplaySettingsWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prefs, setPrefs] = useState<ThemePrefs>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.THEME_PREFS);
      return raw ? JSON.parse(raw) : { brightness: 100, mode: 'default' };
    } catch {
      return { brightness: 100, mode: 'default' };
    }
  });

  const applyFilter = (p: ThemePrefs) => {
    if (p.brightness === 100 && p.mode === 'default') {
      document.documentElement.style.filter = '';
      return;
    }
    let filter = `brightness(${p.brightness / 100})`;
    if (p.mode === 'warm') filter += ' sepia(15%) saturate(92%)';
    if (p.mode === 'contrast') filter += ' contrast(115%) saturate(112%)';
    document.documentElement.style.filter = filter;
  };

  useEffect(() => {
    applyFilter(prefs);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME_PREFS, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  return (
    <>
      <button
        id="displaySettingsBtn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-11 h-11 rounded-full bg-[#1B1918] text-white hover:text-[#C5A059] flex items-center justify-center shadow-lg border border-[#22201D] z-40 cursor-pointer transition-transform hover:scale-105"
        title="Display & Eye-Comfort Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          id="displaySettingsPanel"
          className="fixed bottom-16 right-4 w-64 bg-[#FAF7F2] border border-[#EAE3D5] rounded-2xl p-4 shadow-2xl z-40 text-xs text-[#2C2A29] space-y-3 animate-fade-in font-sans"
        >
          <div className="font-bold text-sm text-gray-900 border-b border-[#EAE3D5] pb-2 flex items-center justify-between">
            <span>Display Settings</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-black text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-gray-600 font-semibold text-[11px]">
              <span>Brightness</span>
              <span className="font-mono text-[#C5A059] font-bold">{prefs.brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={prefs.brightness}
              onChange={e => setPrefs(prev => ({ ...prev, brightness: parseInt(e.target.value, 10) }))}
              className="w-full accent-[#C5A059] cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 pt-1 border-t border-[#EAE3D5]">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">Color Modes</span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setPrefs(prev => ({ ...prev, mode: 'default' }))}
                className={`w-full py-1.5 px-2.5 rounded-lg border text-left font-semibold transition-all cursor-pointer ${
                  prefs.mode === 'default'
                    ? 'bg-white border-[#C5A059] text-black shadow-xs font-bold'
                    : 'bg-white/60 border-[#EAE3D5] text-gray-700 hover:bg-white'
                }`}
              >
                Standard Default
              </button>
              <button
                onClick={() => setPrefs(prev => ({ ...prev, mode: 'warm' }))}
                className={`w-full py-1.5 px-2.5 rounded-lg border text-left font-semibold transition-all cursor-pointer ${
                  prefs.mode === 'warm'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs font-bold'
                    : 'bg-white/60 border-[#EAE3D5] text-gray-700 hover:bg-white'
                }`}
              >
                Warm / Eye Comfort
              </button>
              <button
                onClick={() => setPrefs(prev => ({ ...prev, mode: 'contrast' }))}
                className={`w-full py-1.5 px-2.5 rounded-lg border text-left font-semibold transition-all cursor-pointer ${
                  prefs.mode === 'contrast'
                    ? 'bg-gray-100 border-gray-400 text-gray-900 shadow-xs font-bold'
                    : 'bg-white/60 border-[#EAE3D5] text-gray-700 hover:bg-white'
                }`}
              >
                High Contrast
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
