import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Trash2,
  SquarePen,
  Camera,
  ListTodo,
} from 'lucide-react';
import { EODRecord, Branch } from '../types';
import { formatPHP, formatDate } from '../utils/formatters';
import { ImageZoomModal } from './ImageZoomModal';
import { StatusIndicator } from './StatusIndicator';

interface EODRecordsTableProps {
  records: EODRecord[];
  branches: Branch[];
  onEditRecord: (record: EODRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNavigateToTracker: (branch?: string, staffName?: string, recordId?: string) => void;
}

export const EODRecordsTable: React.FC<EODRecordsTableProps> = ({
  records,
  branches,
  onEditRecord,
  onDeleteRecord,
  onNavigateToTracker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const PAGE_SIZE = 15;

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      if (branchFilter !== 'All' && rec.branch !== branchFilter) return false;
      if (statusFilter !== 'All' && rec.varianceStatus !== statusFilter) return false;
      if (dateFrom && rec.date < dateFrom) return false;
      if (dateTo && rec.date > dateTo) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBranch = rec.branch.toLowerCase().includes(q);
        const matchStaff = rec.staffName.toLowerCase().includes(q);
        const matchIssue = rec.issueType.toLowerCase().includes(q);
        const matchRemarks = (rec.remarks || '').toLowerCase().includes(q);
        const matchItems = rec.items.some(it => it.itemName.toLowerCase().includes(q));

        if (!matchBranch && !matchStaff && !matchIssue && !matchRemarks && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [records, branchFilter, statusFilter, dateFrom, dateTo, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  const totalFilteredExposure = useMemo(
    () => filteredRecords.reduce((s, r) => s + (Number(r.totalFinancialImpact) || 0), 0),
    [filteredRecords]
  );

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'Record ID',
      'Date',
      'Branch',
      'Staff Name',
      'Issue Type',
      'Variance Status',
      'Department',
      'Total Financial Impact',
      'Items Detail',
      'Root Cause',
      'Remarks',
      'Created At',
    ];

    const rows = filteredRecords.map(r => [
      `"${r.id}"`,
      `"${r.date}"`,
      `"${r.branch.replace(/"/g, '""')}"`,
      `"${r.staffName.replace(/"/g, '""')}"`,
      `"${r.issueType.replace(/"/g, '""')}"`,
      `"${r.varianceStatus}"`,
      `"${r.department || 'FG'}"`,
      r.totalFinancialImpact,
      `"${r.items.map(it => `${it.quantity}x ${it.itemName} @ ${it.unitPrice}`).join('; ').replace(/"/g, '""')}"`,
      `"${(r.rootCause || '').replace(/"/g, '""')}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
      `"${r.createdAt}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EOD_Records_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="eod-records-table-container" className="space-y-6 animate-fade-in text-[#2C2A29]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE3D5] pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 tracking-tight italic">
            EOD Transaction Records Ledger
          </h1>
          <p className="text-sm text-[#6C655B] mt-1">
            Auditable archive of all logged EOD submissions. Filter, search, drill down, and export to CSV.
          </p>
        </div>
        <button
          id="btn-export-records-csv"
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <Download className="w-4 h-4 text-[#C5A059]" />
          <span>Export to CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#EAE3D5] p-4 rounded-2xl shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search branch, staff, item name, remarks..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-[#EAE3D5] rounded-xl bg-[#FAF7F2]/50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>

          <div>
            <select
              value={branchFilter}
              onChange={e => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All Branches ({branches.length})</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All Statuses (G, Y, R, C)</option>
              <option value="G">Green (Zero Variance)</option>
              <option value="Y">Yellow (Logged Variance)</option>
              <option value="R">Red (Critical Variance)</option>
              <option value="C">Closed (Non-operational)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-1/2 px-2.5 py-2 border border-[#EAE3D5] rounded-xl bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              title="Date From"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-1/2 px-2.5 py-2 border border-[#EAE3D5] rounded-xl bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              title="Date To"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#6C655B] pt-1 border-t border-[#FAF7F2]">
          <span className="font-mono">
            Showing <strong>{filteredRecords.length}</strong> matching record(s)
          </span>
          <span className="font-mono">
            Filtered Financial Exposure: <strong className="text-red-600 font-extrabold">{formatPHP(totalFilteredExposure)}</strong>
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF7F2] border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
              <tr>
                <th className="p-3">Audit Date</th>
                <th className="p-3">Branch</th>
                <th className="p-3">Personnel</th>
                <th className="p-3">Issue Type</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Logged Items</th>
                <th className="p-3 text-right">Financial Exposure</th>
                <th className="p-3 text-center">Photo</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-400 italic font-mono">
                    No EOD records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="p-3 font-mono tabular-nums font-semibold text-stone-800">{formatDate(rec.date)}</td>
                    <td className="p-3 font-semibold text-stone-900">{rec.branch}</td>
                    <td className="p-3 text-stone-800 font-medium">{rec.staffName}</td>
                    <td className="p-3 font-medium text-stone-900">{rec.issueType}</td>
                    <td className="p-3 text-center">
                      <StatusIndicator type="variance" value={rec.varianceStatus} />
                    </td>
                    <td className="p-3 max-w-xs truncate text-stone-600">
                      {rec.items?.map(it => `${it.quantity}x ${it.itemName}`).join(', ') || '—'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-red-700 text-sm">
                      {formatPHP(rec.totalFinancialImpact)}
                    </td>
                    <td className="p-3 text-center">
                      {rec.evidencePhoto ? (
                        <button
                          type="button"
                          onClick={() => setZoomedImage(rec.evidencePhoto || null)}
                          className="p-1 text-[#C5A059] hover:text-black rounded transition-colors cursor-pointer"
                          title="View verification photo"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-gray-300 font-mono">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditRecord(rec)}
                          className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit transaction record"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateToTracker(rec.branch, rec.staffName, rec.id)}
                          className="p-1.5 text-[#C5A059] hover:text-[#8F7234] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
                          title="Create remediation action item"
                        >
                          <ListTodo className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Permanently delete EOD record for ${rec.branch} on ${rec.date}?`)) {
                              onDeleteRecord(rec.id);
                            }
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete transaction record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#FAF7F2] text-xs">
            <span className="text-[#6C655B]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 border border-[#EAE3D5] rounded-lg disabled:opacity-40 hover:bg-[#FAF7F2] cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 border border-[#EAE3D5] rounded-lg disabled:opacity-40 hover:bg-[#FAF7F2] cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ImageZoomModal src={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
};
