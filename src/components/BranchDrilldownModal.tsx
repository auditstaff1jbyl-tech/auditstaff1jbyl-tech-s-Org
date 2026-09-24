import React, { useEffect } from 'react';
import { Building2, X, Users, TriangleAlert, Package, Calendar, ArrowRight } from 'lucide-react';
import { BranchMetric, EODRecord } from '../types';
import { formatPHP, formatDate } from '../utils/formatters';
import { StatusIndicator } from './StatusIndicator';

interface BranchDrilldownModalProps {
  branchMetric: BranchMetric | null;
  records: EODRecord[];
  onClose: () => void;
  onJumpToMatrix: (branchName: string, date?: string) => void;
  onJumpToTracker: (branchName: string, staffName?: string, recordId?: string) => void;
}

export const BranchDrilldownModal: React.FC<BranchDrilldownModalProps> = ({
  branchMetric,
  records,
  onClose,
  onJumpToMatrix,
  onJumpToTracker,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!branchMetric) return null;

  const branchRecords = records.filter(
    r => r.branch.toLowerCase().trim() === branchMetric.branch.name.toLowerCase().trim()
  );

  const staffImpact: Record<string, { count: number; exposure: number; issues: Set<string> }> = {};
  const itemImpact: Record<string, { count: number; quantity: number; exposure: number }> = {};
  const issueBreakdown: Record<string, { count: number; exposure: number }> = {};

  branchRecords.forEach(r => {
    const staff = r.staffName || 'Unassigned';
    if (!staffImpact[staff]) {
      staffImpact[staff] = { count: 0, exposure: 0, issues: new Set() };
    }
    staffImpact[staff].count++;
    staffImpact[staff].exposure += Number(r.totalFinancialImpact || 0);
    if (r.issueType) staffImpact[staff].issues.add(r.issueType);

    const issue = r.issueType || 'Others';
    if (!issueBreakdown[issue]) {
      issueBreakdown[issue] = { count: 0, exposure: 0 };
    }
    issueBreakdown[issue].count++;
    issueBreakdown[issue].exposure += Number(r.totalFinancialImpact || 0);

    r.items?.forEach(it => {
      if (it.itemName) {
        if (!itemImpact[it.itemName]) {
          itemImpact[it.itemName] = { count: 0, quantity: 0, exposure: 0 };
        }
        itemImpact[it.itemName].count++;
        itemImpact[it.itemName].quantity += Number(it.quantity || 0);
        itemImpact[it.itemName].exposure += Number(it.totalPrice || 0);
      }
    });
  });

  const sortedStaff = Object.entries(staffImpact).sort((a, b) => b[1].exposure - a[1].exposure);
  const sortedItems = Object.entries(itemImpact).sort((a, b) => b[1].exposure - a[1].exposure);
  const sortedIssues = Object.entries(issueBreakdown).sort((a, b) => b[1].count - a[1].count);

  return (
    <div
      id="branch-drilldown-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="branch-drilldown-modal-card"
        className="bg-white border border-[#EAE3D5] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#121110] text-white p-6 border-b border-[#22201D] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#C5A059] flex items-center justify-center text-black font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A059]">
                  Branch Risk Audit Drilldown
                </span>
                <span aria-hidden="true" className="text-stone-600">·</span>
                <StatusIndicator type="risk" value={branchMetric.riskLevel} />
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
                {branchMetric.branch.name}
              </h2>
            </div>
          </div>
          <button
            id="btn-close-drilldown"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close drilldown modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3.5 rounded-xl">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                Total Financial Exposure
              </span>
              <span className="font-mono tabular-nums text-lg font-bold text-red-700 block mt-1">
                {formatPHP(branchMetric.financialExposure)}
              </span>
            </div>
            <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3.5 rounded-xl">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                Logged Issues
              </span>
              <span className="font-mono tabular-nums text-lg font-bold text-stone-900 block mt-1">
                {branchMetric.issues} incidents
              </span>
            </div>
            <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3.5 rounded-xl">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                Average Risk Score
              </span>
              <span className="font-mono tabular-nums text-lg font-bold text-stone-900 block mt-1">
                {branchMetric.averageRiskScore} / 100
              </span>
            </div>
            <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3.5 rounded-xl">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                Main Issue Category
              </span>
              <span className="font-medium text-stone-900 block mt-1 text-xs truncate">
                {branchMetric.mostCommonIssueType}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#EAE3D5] rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-2">
                <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#C5A059]" />
                  Staff Members Involved ({sortedStaff.length})
                </span>
              </div>
              {sortedStaff.length === 0 ? (
                <p className="text-stone-400 py-2">No staff records logged.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sortedStaff.map(([staff, data]) => (
                    <div
                      key={staff}
                      className="flex items-center justify-between bg-[#FAF7F2] p-2.5 rounded-lg border border-[#EAE3D5]"
                    >
                      <div>
                        <span className="font-medium text-stone-900 block">{staff}</span>
                        <span className="text-[11px] text-stone-500">
                          {data.count} issue(s) · {Array.from(data.issues).join(', ')}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-red-700 text-xs">
                        {formatPHP(data.exposure)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#EAE3D5] rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-2">
                <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <TriangleAlert className="w-4 h-4 text-[#C5A059]" />
                  Issue Type Breakdown
                </span>
              </div>
              {sortedIssues.length === 0 ? (
                <p className="text-stone-400 py-2">No issue categories logged.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sortedIssues.map(([issue, data]) => (
                    <div
                      key={issue}
                      className="flex items-center justify-between bg-[#FAF7F2] p-2.5 rounded-lg border border-[#EAE3D5]"
                    >
                      <div>
                        <span className="font-medium text-stone-900 block">{issue}</span>
                        <span className="text-[11px] text-stone-500">{data.count} incident(s)</span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-stone-900 text-xs">
                        {formatPHP(data.exposure)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#EAE3D5] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-2">
              <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#C5A059]" />
                Products & Inventory Items Involved ({sortedItems.length})
              </span>
            </div>
            {sortedItems.length === 0 ? (
              <p className="text-stone-400 py-2">No item-level variances recorded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {sortedItems.map(([item, data]) => (
                  <div
                    key={item}
                    className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#EAE3D5] flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-medium text-stone-900 block truncate" title={item}>
                        {item}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Qty: {Number(data.quantity.toFixed(2))} · {data.count} records
                      </span>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-red-700 mt-2 text-xs">
                      {formatPHP(data.exposure)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#EAE3D5] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-2">
              <span className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#C5A059]" />
                Recent Daily Transactions ({branchRecords.length})
              </span>
            </div>
            {branchRecords.length === 0 ? (
              <p className="text-stone-400 py-2">No transaction records found for this branch.</p>
            ) : (
              <div className="overflow-x-auto border border-[#EAE3D5] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#EAE3D5] font-semibold text-stone-500 text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Staff</th>
                      <th className="p-2.5">Issue Type</th>
                      <th className="p-2.5">Items</th>
                      <th className="p-2.5 text-right">Financial Impact</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                    {branchRecords.map(rec => (
                      <tr key={rec.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="p-2.5 font-mono tabular-nums">{formatDate(rec.date)}</td>
                        <td className="p-2.5 font-medium text-stone-800">{rec.staffName || '—'}</td>
                        <td className="p-2.5">
                          <StatusIndicator type="variance" value={rec.varianceStatus} />
                        </td>
                        <td className="p-2.5 max-w-xs truncate text-stone-600">
                          {rec.items?.map(it => `${it.quantity}x ${it.itemName}`).join(', ') || '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums font-bold text-red-700">
                          {formatPHP(rec.totalFinancialImpact)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => {
                              onClose();
                              onJumpToTracker(rec.branch, rec.staffName, rec.id);
                            }}
                            className="text-[#C5A059] hover:underline font-medium text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            Open <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#FAF7F2] p-4 border-t border-[#EAE3D5] flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onJumpToTracker(branchMetric.branch.name);
            }}
            className="px-4 py-2 bg-white border border-[#EAE3D5] text-stone-800 rounded-lg font-medium hover:bg-stone-50 transition-colors cursor-pointer text-xs"
          >
            View in Action Tracker
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#121110] text-white rounded-lg font-medium hover:bg-black transition-colors cursor-pointer text-xs"
          >
            Close Drilldown
          </button>
        </div>
      </div>
    </div>
  );
};
