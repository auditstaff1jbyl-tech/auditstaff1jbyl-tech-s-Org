import React, { useState } from 'react';
import { PASSCODE_HASHES, USER_DIRECTORY, STORAGE_KEYS } from '../utils/constants';
import { computeSha256 } from '../utils/formatters';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface PasscodeGateProps {
  onUnlock: (user: { passcode: string; slug: string; name: string }) => void;
}

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const attemptUnlock = async (codeToTry: string) => {
    const trimmed = codeToTry.trim();
    if (!trimmed) {
      setError('Please enter a passcode.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const hash = await computeSha256(trimmed);
      if (PASSCODE_HASHES.includes(hash)) {
        sessionStorage.setItem(STORAGE_KEYS.PASSCODE_SESSION, trimmed);
        const user = USER_DIRECTORY.find(u => u.passcode === trimmed) || {
          passcode: trimmed,
          slug: 'authorized',
          name: 'Audit Staff',
        };
        onUnlock(user);
      } else {
        setError('Incorrect passcode. Please try again.');
        setPasscode('');
      }
    } catch {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptUnlock(passcode);
  };

  const handleQuickSelect = (code: string) => {
    setPasscode(code);
    attemptUnlock(code);
  };

  return (
    <div
      id="passcode-gate-overlay"
      className="fixed inset-0 bg-[#141210] flex items-center justify-center p-4 z-50 font-sans"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-[#FAF7F2] p-8 sm:p-10 rounded-2xl w-full max-w-sm shadow-2xl text-center border border-[#EAE3D5] animate-fade-in"
      >
        <div className="w-12 h-12 rounded-xl bg-[#141210] text-[#C5A059] flex items-center justify-center font-serif font-black text-xl mx-auto mb-4 border border-[#C5A059]/40 shadow-xs">
          M
        </div>
        <div className="font-bold text-sm tracking-wider text-stone-900 uppercase">
          EOD Monitoring Matrix
        </div>
        <div className="text-xs text-stone-500 mt-1 mb-6">
          Executive Decision & Audit System
        </div>

        <div className="space-y-3">
          <input
            type="password"
            autoFocus
            autoComplete="off"
            placeholder="Enter security passcode"
            value={passcode}
            onChange={e => {
              setPasscode(e.target.value);
              if (error) setError('');
            }}
            className="w-full px-4 py-2.5 border border-[#EAE3D5] rounded-xl bg-white text-stone-900 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#C5A059] shadow-xs"
          />

          {error && <div className="text-red-700 text-xs font-semibold">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#141210] hover:bg-stone-900 text-[#C5A059] font-semibold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-95"
          >
            {loading ? 'Verifying...' : 'Unlock Dashboard'}
          </button>
        </div>

        {/* Quick select for authorized personnel */}
        <div className="mt-5 pt-4 border-t border-[#EAE3D5]">
          <div className="text-[11px] font-semibold text-stone-600 mb-2 flex items-center justify-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Authorized Audit Personnel</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {USER_DIRECTORY.map(u => (
              <button
                key={u.slug}
                type="button"
                onClick={() => handleQuickSelect(u.passcode)}
                className="w-full py-1.5 px-3 rounded-lg border border-[#EAE3D5] bg-white hover:bg-stone-50 text-stone-800 text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="font-medium">{u.name}</span>
                <span className="font-mono text-[10px] text-stone-400">One-click login</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-[10.5px] text-stone-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Audit-compliant session encryption</span>
        </div>
      </form>
    </div>
  );
};
