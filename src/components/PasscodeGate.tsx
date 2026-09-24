import React, { useState } from 'react';
import { PASSCODE_HASHES, USER_DIRECTORY, STORAGE_KEYS } from '../utils/constants';
import { computeSha256 } from '../utils/formatters';

interface PasscodeGateProps {
  onUnlock: (user: { passcode: string; slug: string; name: string }) => void;
}

export const PasscodeGate: React.FC<PasscodeGateProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter a passcode.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const hash = await computeSha256(passcode.trim());
      if (PASSCODE_HASHES.includes(hash)) {
        sessionStorage.setItem(STORAGE_KEYS.PASSCODE_SESSION, passcode.trim());
        const user = USER_DIRECTORY.find(u => u.passcode === passcode.trim()) || {
          passcode: passcode.trim(),
          slug: 'authorized',
          name: 'Audit Staff',
        };
        onUnlock(user);
      } else {
        setError('Incorrect passcode. Please try again.');
        setPasscode('');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="passcode-gate-overlay"
      className="fixed inset-0 bg-[#1B1918] flex items-center justify-center p-4 z-50 font-sans"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-[#FAF7F2] p-8 sm:p-10 rounded-3xl w-full max-w-sm shadow-2xl text-center border border-[#EAE3D5] animate-fade-in"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#121110] text-[#C5A059] flex items-center justify-center font-serif font-black text-xl mx-auto mb-4 border border-[#C5A059]/40 shadow-sm">
          M
        </div>
        <div className="font-extrabold text-base tracking-widest text-gray-900 uppercase">
          EOD Monitoring Matrix
        </div>
        <div className="text-xs text-[#6C655B] mt-1 mb-6">
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
            className="w-full px-4 py-3 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#C5A059] shadow-xs"
          />

          {error && <div className="text-[#B53D43] text-xs font-bold">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1B1918] hover:bg-black text-[#C5A059] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
          >
            {loading ? 'Verifying...' : 'Unlock Dashboard'}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-[#EAE3D5] text-[10.5px] text-[#6C655B]">
          Authorized audit staff only. All access logged.
        </div>
      </form>
    </div>
  );
};
