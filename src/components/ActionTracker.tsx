import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  Trash2,
  SquarePen,
  Search,
  Filter,
} from 'lucide-react';
import { ActionItem, Branch, Staff, PriorityLevel, ActionStatus } from '../types';
import { formatDate } from '../utils/formatters';
import { StatusIndicator } from './StatusIndicator';

interface ActionTrackerProps {
  actionItems: ActionItem[];
  branches: Branch[];
  staffList: Staff[];
  onSaveActionItem: (item: ActionItem) => void;
  onDeleteActionItem: (id: string) => void;
  filterBranch?: string;
  filterStaff?: string;
  filterRecordId?: string;
}

export const ActionTracker: React.FC<ActionTrackerProps> = ({
  actionItems,
  branches,
  staffList,
  onSaveActionItem,
  onDeleteActionItem,
  filterBranch,
  filterStaff,
  filterRecordId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [branchSelect, setBranchSelect] = useState<string>(filterBranch || 'All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetBranch, setFormTargetBranch] = useState(filterBranch || '');
  const [formTargetStaff, setFormTargetStaff] = useState(filterStaff || '');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('High');
  const [formDueDate, setFormDueDate] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('Audit Staff');
  const [formStatus, setFormStatus] = useState<ActionStatus>('Open');
  const [formResolutionNotes, setFormResolutionNotes] = useState('');

  const openNewModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormDescription('');
    setFormTargetBranch(filterBranch || (branches[0] ? branches[0].name : ''));
    setFormTargetStaff(filterStaff || '');
    setFormPriority('High');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFormDueDate(d.toISOString().split('T')[0]);
    setFormAssignedTo('Audit Staff');
    setFormStatus('Open');
    setFormResolutionNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ActionItem) => {
    setEditingItem(item);
    setFormTitle(item.title || item.actionRequired || '');
    setFormDescription(item.description || item.notes || '');
    setFormTargetBranch(item.targetBranch || item.branch || '');
    setFormTargetStaff(item.targetStaff || item.staffName || '');
    setFormPriority(item.priority);
    setFormDueDate(item.dueDate || '');
    setFormAssignedTo(item.assignedTo || 'Audit Staff');
    setFormStatus(item.status);
    setFormResolutionNotes(item.resolutionNotes || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Action item title is required.');
      return;
    }

    const newItem: ActionItem = {
      id: editingItem ? editingItem.id : `act-${Date.now()}`,
      eodRecordId: editingItem?.eodRecordId || filterRecordId,
      branch: formTargetBranch,
      targetBranch: formTargetBranch,
      staffName: formTargetStaff,
      targetStaff: formTargetStaff,
      title: formTitle.trim(),
      actionRequired: formTitle.trim(),
      description: formDescription.trim(),
      priority: formPriority,
      status: formStatus,
      assignedTo: formAssignedTo.trim(),
      dueDate: formDueDate,
      resolutionNotes: formResolutionNotes.trim() || undefined,
      resolvedAt: formStatus === 'Resolved' ? editingItem?.resolvedAt || new Date().toISOString() : undefined,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveActionItem(newItem);
    setIsModalOpen(false);
  };

  // Filtered action items
  const filteredItems = useMemo(() => {
    return actionItems.filter(item => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;
      const bName = item.targetBranch || item.branch;
      if (branchSelect !== 'All' && bName !== branchSelect) return false;
      if (filterRecordId && item.eodRecordId !== filterRecordId && item.recordId !== filterRecordId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || item.actionRequired || '').toLowerCase().includes(q);
        const matchDesc = (item.description || item.notes || '').toLowerCase().includes(q);
        const matchBranch = (item.targetBranch || item.branch || '').toLowerCase().includes(q);
        const matchStaff = (item.targetStaff || item.staffName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchBranch && !matchStaff) return false;
      }
      return true;
    });
  }, [actionItems, statusFilter, priorityFilter, branchSelect, filterRecordId, searchQuery]);

  const stats = useMemo(() => {
    const total = actionItems.length;
    const open = actionItems.filter(i => i.status === 'Open').length;
    const inProgress = actionItems.filter(i => i.status === 'In Progress').length;
    const resolved = actionItems.filter(i => i.status === 'Resolved').length;
    return { total, open, inProgress, resolved };
  }, [actionItems]);

  return (
    <div id="action-tracker-container" className="space-y-6 animate-fade-in text-[#2C2A29]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE3D5] pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 tracking-tight italic">
            Remediation Action Tracker
          </h1>
          <p className="text-sm text-[#6C655B] mt-1">
            Track operational follow-ups, discrepancy investigation tasks, branch audits, and staff retraining directives.
          </p>
        </div>
        <button
          id="btn-create-action-item"
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#C5A059]" />
          <span>New Action Item</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6C655B] font-semibold mb-1">
            <span>Total Tasks</span>
            <ListTodo className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="font-serif text-2xl font-extrabold text-gray-900">{stats.total}</div>
        </div>

        <div className="bg-white border-l-4 border-l-red-500 border-y border-r border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-red-700 font-semibold mb-1">
            <span>Open Tasks</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="font-serif text-2xl font-extrabold text-red-600">{stats.open}</div>
        </div>

        <div className="bg-white border-l-4 border-l-amber-500 border-y border-r border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold mb-1">
            <span>In Progress</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif text-2xl font-extrabold text-amber-600">{stats.inProgress}</div>
        </div>

        <div className="bg-white border-l-4 border-l-emerald-500 border-y border-r border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-extrabold text-emerald-600">{stats.resolved}</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-[#EAE3D5] p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search action items, branch, staff, directives..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#EAE3D5] rounded-xl bg-[#FAF7F2]/50 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#6C655B]" />
            <span className="text-[10.5px] font-bold uppercase text-[#6C655B]">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#EAE3D5] rounded-xl bg-white font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase text-[#6C655B]">Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#EAE3D5] rounded-xl bg-white font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase text-[#6C655B]">Branch:</span>
            <select
              value={branchSelect}
              onChange={e => setBranchSelect(e.target.value)}
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
        </div>
      </div>

      {/* Action Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-[#EAE3D5] rounded-2xl p-12 text-center text-gray-400 font-mono text-xs">
            No action items match the current filters.
          </div>
        ) : (
          filteredItems.map(item => {
            return (
              <div
                key={item.id}
                className="bg-white border border-[#EAE3D5] rounded-xl p-4 shadow-2xs hover:border-[#C5A059] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusIndicator type="priority" value={item.priority} />
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <StatusIndicator type="action" value={item.status} />
                    {(item.targetBranch || item.branch) && (
                      <>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700">
                          <Building2 className="w-3 h-3 text-[#C5A059]" />
                          {item.targetBranch || item.branch}
                        </span>
                      </>
                    )}
                    {(item.targetStaff || item.staffName) && (
                      <>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span className="text-[11px] text-stone-600">
                          Target: <strong className="font-medium text-stone-900">{item.targetStaff || item.staffName}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="font-semibold text-stone-900 text-sm">{item.title || item.actionRequired || 'Action Directive'}</h3>

                  {(item.description || item.notes) && (
                    <p className="text-[#4A4641] leading-relaxed text-[11.5px]">{item.description || item.notes}</p>
                  )}

                  {item.resolutionNotes && (
                    <div className="bg-emerald-50/60 border border-emerald-200 p-2 rounded-xl text-[11px] text-emerald-900">
                      <span className="font-bold">Resolution Notes: </span>
                      {item.resolutionNotes}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[10.5px] text-[#6C655B] font-mono pt-1">
                    {item.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {formatDate(item.dueDate)}
                      </span>
                    )}
                    <span>Assigned to: {item.assignedTo || 'Unassigned'}</span>
                    <span>Created: {formatDate(item.createdAt.split('T')[0])}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 border border-[#EAE3D5] hover:bg-[#FAF7F2] rounded-xl text-gray-700 hover:text-black transition-colors cursor-pointer"
                    title="Edit action item"
                  >
                    <SquarePen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete action item "${item.title || item.actionRequired || 'Action Task'}"?`)) {
                        onDeleteActionItem(item.id);
                      }
                    }}
                    className="p-2 border border-red-200 hover:bg-red-50 rounded-xl text-red-600 transition-colors cursor-pointer"
                    title="Delete action item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="font-serif font-bold text-base text-gray-900 italic">
                {editingItem ? 'Edit Action Item' : 'New Remediation Action Item'}
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
                  Title / Directive *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct re-training on POS cash entry..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                    Target Branch
                  </label>
                  <select
                    value={formTargetBranch}
                    onChange={e => setFormTargetBranch(e.target.value)}
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
                    Target Staff
                  </label>
                  <input
                    type="text"
                    placeholder="Staff name (optional)"
                    value={formTargetStaff}
                    onChange={e => setFormTargetStaff(e.target.value)}
                    className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Action Plan & Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail the steps needed, investigation notes, or audit review protocol..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>

              {formStatus === 'Resolved' && (
                <div>
                  <label className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                    Resolution Notes & Outcome
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Document how this issue was resolved and preventive measures taken..."
                    value={formResolutionNotes}
                    onChange={e => setFormResolutionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl bg-emerald-50/30 text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}
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
                Save Action Item
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
