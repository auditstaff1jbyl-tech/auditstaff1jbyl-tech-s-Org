import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Building2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  SquarePen,
  ListTodo,
} from 'lucide-react';
import { Staff, Branch, EODRecord, ActionItem, RiskSettings } from '../types';
import { calculateStaffRiskMetrics } from '../utils/analytics';
import { formatPHP } from '../utils/formatters';

interface StaffMonitoringProps {
  staffList: Staff[];
  branches: Branch[];
  records: EODRecord[];
  actionItems: ActionItem[];
  riskSettings: RiskSettings;
  onSaveStaff: (staff: Staff) => void;
  onNavigateToTracker: (branch?: string, staffName?: string) => void;
}

export const StaffMonitoring: React.FC<StaffMonitoringProps> = ({
  staffList,
  branches,
  records,
  actionItems,
  riskSettings,
  onSaveStaff,
  onNavigateToTracker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'riskScore' | 'exposure' | 'issues'>('riskScore');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formName, setFormName] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formPosition, setFormPosition] = useState('Cashier');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  const openNewModal = () => {
    setEditingStaff(null);
    setFormName('');
    setFormBranch(branches[0] ? branches[0].name : '');
    setFormPosition('Cashier');
    setFormStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Staff) => {
    setEditingStaff(s);
    setFormName(s.name);
    setFormBranch(s.branch);
    setFormPosition(s.position);
    setFormStatus(s.status);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Staff name is required.');
      return;
    }
    if (!formBranch.trim()) {
      alert('Branch assignment is required.');
      return;
    }

    const newStaff: Staff = {
      id: editingStaff ? editingStaff.id : `staff-${Date.now()}`,
      name: formName.trim(),
      branch: formBranch.trim(),
      position: formPosition.trim(),
      status: formStatus,
    };

    onSaveStaff(newStaff);
    setIsModalOpen(false);
  };

  // Calculate Metrics
  const staffMetrics = useMemo(
    () => calculateStaffRiskMetrics(staffList, records, records, actionItems, riskSettings),
    [staffList, records, actionItems, riskSettings]
  );

  // Filter & Sort
  const filteredMetrics = useMemo(() => {
    let list = staffMetrics.filter(sm => {
      if (branchFilter !== 'All' && sm.branch !== branchFilter) return false;
      if (statusFilter !== 'All') {
        const found = staffList.find(s => s.id === sm.staffId);
        if (found && found.status !== statusFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = sm.staffName.toLowerCase().includes(q);
        const matchBranch = sm.branch.toLowerCase().includes(q);
        const matchPos = sm.position.toLowerCase().includes(q);
        if (!matchName && !matchBranch && !matchPos) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'riskScore') return b.riskScore - a.riskScore;
      if (sortBy === 'exposure') return b.financialExposure - a.financialExposure;
      return b.issueCount - a.issueCount;
    });
  }, [staffMetrics, branchFilter, statusFilter, searchQuery, sortBy, staffList]);

  const kpis = useMemo(() => {
    const totalStaff = staffList.length;
    const activeStaff = staffList.filter(s => s.status === 'Active').length;
    const highOrCritical = staffMetrics.filter(sm => sm.riskLevel === 'Critical' || sm.riskLevel === 'High').length;
    const cleanRecords = staffMetrics.filter(sm => sm.issueCount === 0).length;
    return { totalStaff, activeStaff, highOrCritical, cleanRecords };
  }, [staffList, staffMetrics]);

  return (
    <div id="staff-monitoring-container" className="space-y-6 animate-fade-in text-[#2C2A29]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE3D5] pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 tracking-tight italic">
            Staff Monitoring & Accountability
          </h1>
          <p className="text-sm text-[#6C655B] mt-1">
            Personnel risk profiles, repeat discrepancy tracking, weighted risk scoring, and audit retraining directives.
          </p>
        </div>
        <button
          id="btn-add-new-staff"
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#C5A059]" />
          <span>Add Personnel</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6C655B] font-semibold mb-1">
            <span>Total Personnel</span>
            <Users className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="font-serif text-2xl font-extrabold text-gray-900">{kpis.totalStaff}</div>
          <div className="text-[10.5px] text-gray-500 font-mono mt-1">{kpis.activeStaff} Active status</div>
        </div>

        <div className="bg-white border-l-4 border-l-red-500 border-y border-r border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-red-700 font-semibold mb-1">
            <span>High / Critical Risk</span>
            <Flame className="w-4 h-4 text-red-600" />
          </div>
          <div className="font-serif text-2xl font-extrabold text-red-600">{kpis.highOrCritical}</div>
          <div className="text-[10.5px] text-red-600 font-mono mt-1">Require corrective review</div>
        </div>

        <div className="bg-white border-l-4 border-l-emerald-500 border-y border-r border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
            <span>Zero Discrepancies</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-extrabold text-emerald-600">{kpis.cleanRecords}</div>
          <div className="text-[10.5px] text-emerald-700 font-mono mt-1">Flawless EOD records</div>
        </div>

        <div className="bg-white border border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6C655B] font-semibold mb-1">
            <span>Active Branches</span>
            <Building2 className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="font-serif text-2xl font-extrabold text-gray-900">{branches.length}</div>
          <div className="text-[10.5px] text-gray-500 font-mono mt-1">Operational branch network</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-[#EAE3D5] p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search personnel name, position, branch..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[#EAE3D5] rounded-xl bg-[#FAF7F2]/50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase text-[#6C655B]">Branch:</span>
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#EAE3D5] rounded-xl bg-white font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase text-[#6C655B]">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#EAE3D5] rounded-xl bg-white font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase text-[#6C655B]">Sort By:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 border border-[#EAE3D5] rounded-xl bg-white font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="riskScore">Risk Score (Weighted)</option>
              <option value="exposure">Financial Loss (₱)</option>
              <option value="issues">Issue Frequency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF7F2] border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
              <tr>
                <th className="p-3">Personnel Name & Position</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Incidents</th>
                <th className="p-3 text-center">Repeats</th>
                <th className="p-3 text-right">Financial Exposure</th>
                <th className="p-3 text-center">Primary Error</th>
                <th className="p-3 text-center">Risk Score</th>
                <th className="p-3 text-center">Risk Tier</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {filteredMetrics.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400 italic">
                    No personnel match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMetrics.map(sm => {
                  const staffObj = staffList.find(s => s.id === sm.staffId);
                  const isInactive = staffObj?.status === 'Inactive';

                  const tierClass =
                    sm.riskLevel === 'Critical'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : sm.riskLevel === 'High'
                      ? 'bg-orange-100 text-orange-800 border-orange-200'
                      : sm.riskLevel === 'Moderate'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

                  return (
                    <tr key={sm.staffId} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-gray-900 text-sm">{sm.staffName}</div>
                        <div className="text-[10.5px] text-[#6C655B]">{sm.position}</div>
                      </td>
                      <td className="p-3 font-semibold text-gray-800">{sm.branch}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                            isInactive ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isInactive ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-gray-800">
                        {sm.issueCount}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {sm.repeatIncidentCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold text-[10px] border border-red-200">
                            {sm.repeatIncidentCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px]">0</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-red-600">
                        {formatPHP(sm.financialExposure)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] text-[10px] text-gray-800 font-medium">
                          {sm.primaryIssueType}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-extrabold text-sm text-gray-900">
                        {sm.riskScore}
                        <span className="text-[10px] text-gray-400 font-normal">/100</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierClass}`}>
                          {sm.riskLevel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {staffObj && (
                            <button
                              type="button"
                              onClick={() => openEditModal(staffObj)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-black transition-colors cursor-pointer"
                              title="Edit staff record"
                            >
                              <SquarePen className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onNavigateToTracker(sm.branch, sm.staffName)}
                            className="p-1.5 hover:bg-[#FAF7F2] rounded-lg text-[#C5A059] hover:text-[#9A7A38] transition-colors cursor-pointer"
                            title="Open remediation action task for this staff member"
                          >
                            <ListTodo className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="font-serif font-bold text-base text-gray-900 italic">
                {editingStaff ? 'Edit Personnel Record' : 'Register New Personnel'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Branch Assignment *
                </label>
                <select
                  required
                  value={formBranch}
                  onChange={e => setFormBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                >
                  <option value="">Select Branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Position / Role
                </label>
                <input
                  type="text"
                  value={formPosition}
                  onChange={e => setFormPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Employment Status
                </label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE3D5]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm"
              >
                Save Personnel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
