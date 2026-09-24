import React from 'react';
import { AlertCircle, Eye, Check, X } from 'lucide-react';
import { EODRecord } from '../types';
import { formatPHP, formatDate } from '../utils/formatters';

interface DuplicateDetectionModalProps {
  existingRecord: EODRecord | null;
  newRecordSummary: {
    date: string;
    branch: string;
    staffName: string;
    issueType: string;
    varianceStatus: string;
    itemCount: number;
    totalAmount: number;
  };
  onReviewExisting: (record: EODRecord) => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
}

export const DuplicateDetectionModal: React.FC<DuplicateDetectionModalProps> = ({
  existingRecord,
  newRecordSummary,
  onReviewExisting,
  onSaveAnyway,
  onCancel,
}) => {
  return (
    <div
      id="duplicate-detection-modal-overlay"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="duplicate-detection-modal-card"
        className="bg-white border border-[#EAE3D5] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in text-xs"
      >
        <div className="bg-amber-500 text-black p-5 flex items-start gap-3.5">
          <div className="p-2 bg-white/30 rounded-xl">
            <AlertCircle className="w-6 h-6 text-black" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg leading-tight">
              Possible Duplicate Entry Detected
            </h3>
            <p className="text-[11.5px] text-black/80 mt-1 leading-relaxed">
              An existing transaction with identical Date, Branch, Staff, and Issue criteria was found in the database.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4 text-gray-800">
          <div className="grid grid-cols-2 gap-3 bg-[#FAF7F2] p-4 rounded-xl border border-[#EAE3D5] font-mono text-[11px]">
            <div>
              <span className="text-gray-400 block text-[9.5px]">DATE</span>
              <span className="font-bold text-gray-900">{formatDate(newRecordSummary.date)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9.5px]">BRANCH</span>
              <span className="font-bold text-gray-900">{newRecordSummary.branch}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9.5px]">STAFF</span>
              <span className="font-bold text-gray-900">{newRecordSummary.staffName}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9.5px]">ISSUE TYPE</span>
              <span className="font-bold text-[#C5A059]">{newRecordSummary.issueType}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9.5px]">ITEMS IN NEW ENTRY</span>
              <span className="font-bold text-gray-900">{newRecordSummary.itemCount} item row(s)</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[9.5px]">NEW FINANCIAL IMPACT</span>
              <span className="font-bold text-red-600">{formatPHP(newRecordSummary.totalAmount)}</span>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed text-[11.5px]">
            Please review the existing record to avoid duplicate calculation skewing the dashboard, or proceed to save if this is a legitimate separate incident.
          </p>
        </div>

        <div className="bg-[#FAF7F2] px-6 py-4 border-t border-[#EAE3D5] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            id="btn-cancel-duplicate"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 bg-white border border-[#EAE3D5] hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {existingRecord && (
              <button
                id="btn-review-existing"
                onClick={() => onReviewExisting(existingRecord)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-[#C5A059] text-[#9c7c34] hover:bg-amber-50 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Review Existing</span>
              </button>
            )}

            <button
              id="btn-save-duplicate-anyway"
              onClick={onSaveAnyway}
              className="flex-1 sm:flex-initial px-5 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Save Anyway</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
