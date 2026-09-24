import React from 'react';
import { Building2, X, Users, TriangleAlert, Package, Calendar, ArrowRight } from 'lucide-react';
import { BranchMetric, EODRecord } from '../types';
import { formatPHP, formatDate } from '../utils/formatters';

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
            <div className="w-12 h-12 rounded-xl bg-[#C5A059] flex items-center justify-center text-black font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C5A059]">
                  Branch Risk Drilldown
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    branchMetric.riskLevel === 'Critical'
                      ? 'bg-red-600 text-white'
                      : branchMetric.riskLevel === 'High'
                      ? 'bg-amber-600 text-white'
                      : branchMetric.riskLevel === 'Moderate'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-green-600 text-white'
                  }`}
                >
                  {branchMetric.riskLevel} Risk
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold italic text-white tracking-tight">
                {branchMetric.branch.name}
              </h2>
            </div>
          </div>
          <button
            id="btn-close-drilldown"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3.5 rounded-xl">
              <span className="text-[10px] font-bold text-[#6C655B] uppercase tracking-wider block">
                Total Financial Exposure
              </span>
              <span className="font-serif text-xl font-extrabold text-red-600 block mt-1">
                {formatPHP(branchMetric.financialExposure)}
              </span>
            </div>
            <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3.5 rounded-xl">
              <span className="text-[10px] font-bold text-[#6C655B] uppercase tracking-wider block">
                Total Issues Recorded
              </span>
              <span className="font-serif text-xl font-bold text-gray-900 block mt-1">
                {branchMetric.issues} issues
              </span>
            </div>
            <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3.5 rounded-xl">
              <span className="text-[10px] font-bold text-[#6C655B] uppercase tracking-wider block">
                Average Risk Score
              </span>
              <span className="font-mono text-xl font-bold text-gray-900 block mt-1">
                {branchMetric.averageRiskScore} / 100
              </span>
            </div>
            <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3.5 rounded-xl">
              <span className="text-[10px] font-bold text-[#6C655B] uppercase tracking-wider block">
                Main Issue Type
              </span>
              <span className="font-bold text-[#C5A059] block mt-1 text-sm">
                {branchMetric.mostCommonIssueType}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#EAE3D5] rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-2">
                <span className="font-serif font-bold text-sm text-gray-900 italic flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#C5A059]" />
                  Staff Members Involved ({sortedStaff.length})
                </span>
              </div>
              {sortedStaff.length === 0 ? (
                <p className="text-gray-400 italic py-2">No staff records logged.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sortedStaff.map(([staff, data]) => (
                    <div
                      key={staff}
                      className="flex items-center justify-between bg-[#FAF7F2] p-2.5 rounded-lg border border-[#EAE3D5]"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block">{staff}</span>
                        <span className="text-[10px] text-[#6C655B]">
                          {data.count} issue(s) • Types: {Array.from(data.issues).join(', ')}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-red-600 text-xs">
                        {formatPHP(data.exposure)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#EAE3D5] rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-2">
                <span className="font-serif font-bold text-sm text-gray-900 italic flex items-center gap-1.5">
                  <TriangleAlert className="w-4 h-4 text-[#C5A059]" />
                  Issue Type Breakdown
                </span>
              </div>
              {sortedIssues.length === 0 ? (
                <p className="text-gray-400 italic py-2">No issue categories logged.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sortedIssues.map(([issue, data]) => (
                    <div
                      key={issue}
                      className="flex items-center justify-between bg-[#FAF7F2] p-2.5 rounded-lg border border-[#EAE3D5]"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block">{issue}</span>
                        <span className="text-[10px] text-[#6C655B]">{data.count} incident(s)</span>
                      </div>
                      <span className="font-mono font-bold text-gray-900 text-xs">
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
              <span className="font-serif font-bold text-sm text-gray-900 italic flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#C5A059]" />
                Products & Inventory Items Involved ({sortedItems.length})
              </span>
            </div>
            {sortedItems.length === 0 ? (
              <p className="text-gray-400 italic py-2">No item-level variances recorded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {sortedItems.map(([item, data]) => (
                  <div
                    key={item}
                    className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#EAE3D5] flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-bold text-gray-900 block truncate" title={item}>
                        {item}
                      </span>
                      <span className="text-[10px] text-[#6C655B]">
                        Qty: {Number(data.quantity.toFixed(2))} units ({data.count} records)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-red-600 mt-2 text-xs">
                      {formatPHP(data.exposure)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#EAE3D5] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-2">
              <span className="font-serif font-bold text-sm text-gray-900 italic flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#C5A059]" />
                Recent Daily Transactions ({branchRecords.length})
              </span>
            </div>
            {branchRecords.length === 0 ? (
              <p className="text-gray-400 italic py-2">No transaction records found for this branch.</p>
            ) : (
              <div className="overflow-x-auto border border-[#EAE3D5] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
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
                        <td className="p-2.5 font-mono">{formatDate(rec.date)}</td>
                        <td className="p-2.5 font-semibold text-gray-800">{rec.staffName || '—'}</td>
                        <td className="p-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.varianceStatus === 'R'
                                ? 'bg-red-100 text-red-700'
                                : rec.varianceStatus === 'Y'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {rec.issueType}
                          </span>
                        </td>
                        <td className="p-2.5 max-w-xs truncate text-gray-600">
                          {rec.items?.map(it => `${it.quantity}x ${it.itemName}`).join(', ') || '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-red-600">
                          {formatPHP(rec.totalFinancialImpact)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => {
                              onClose();
                              onJumpToTracker(rec.branch, rec.staffName, rec.id);
                            }}
                            className="text-[#C5A059] hover:underline font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
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
            className="px-4 py-2 bg-white border border-[#EAE3D5] text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all cursor-pointer text-xs"
          >
            View in Action Tracker
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#121110] text-white rounded-xl font-bold hover:bg-black transition-all cursor-pointer text-xs"
          >
            Close Drilldown
          </button>
        </div>
      </div>
    </div>
  );
};
