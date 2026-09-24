import React, { useState, useEffect, useMemo } from 'react';
import {
  Table2,
  Layers,
  Plus,
  Trash2,
  Save,
  Camera,
  SquarePen,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  EODRecord,
  Branch,
  Staff,
  ProductItem,
  IssueTypeConfig,
  VarianceStatus,
  Department,
  EODItemLine,
} from '../types';
import { formatPHP, formatDate, getTodayDateString } from '../utils/formatters';
import { getDailyDraft, saveDailyDraft, clearDailyDraft } from '../utils/storage';
import { SearchableSelect, SelectOption } from './SearchableSelect';
import { DuplicateDetectionModal } from './DuplicateDetectionModal';
import { ImageZoomModal } from './ImageZoomModal';

interface DailyMatrixProps {
  records: EODRecord[];
  branches: Branch[];
  staffList: Staff[];
  items: ProductItem[];
  issueTypes: IssueTypeConfig[];
  onSaveRecord: (record: EODRecord) => void;
  onDeleteRecord: (id: string) => void;
  initialBranch?: string;
  initialDate?: string;
}

export const DailyMatrix: React.FC<DailyMatrixProps> = ({
  records,
  branches,
  staffList,
  items,
  issueTypes,
  onSaveRecord,
  onDeleteRecord,
  initialBranch,
  initialDate,
}) => {
  const existingDraft = useMemo(() => {
    if (initialBranch || initialDate) return null;
    return getDailyDraft();
  }, [initialBranch, initialDate]);

  const [editingRecordId, setEditingRecordId] = useState<string | null>(existingDraft?.editingRecordId || null);
  const [date, setDate] = useState<string>(initialDate || existingDraft?.date || getTodayDateString());
  const [branch, setBranch] = useState<string>(initialBranch || existingDraft?.branch || '');
  const [staffId, setStaffId] = useState<string>(existingDraft?.staffId || '');
  const [issueType, setIssueType] = useState<string>(existingDraft?.issueType || 'Wrong EOD');
  const [varianceStatus, setVarianceStatus] = useState<VarianceStatus>(existingDraft?.varianceStatus || 'Y');
  const [department, setDepartment] = useState<Department>(existingDraft?.department || 'FG');
  const [rootCause, setRootCause] = useState<string>(existingDraft?.rootCause || 'Staff Error');
  const [rootCauseOther, setRootCauseOther] = useState<string>(existingDraft?.rootCauseOther || '');
  const [remarks, setRemarks] = useState<string>(existingDraft?.remarks || '');
  const [evidencePhoto, setEvidencePhoto] = useState<string>(existingDraft?.evidencePhoto || '');

  const createEmptyRow = (prefilledItem?: ProductItem): EODItemLine => {
    const defaultPrice = prefilledItem ? prefilledItem.defaultPrice : 0;
    return {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: prefilledItem ? prefilledItem.id : '',
      itemName: prefilledItem ? prefilledItem.name : '',
      quantity: 0,
      rawQty: '',
      unitPrice: defaultPrice,
      rawPrice: defaultPrice > 0 ? String(defaultPrice) : '',
      totalPrice: 0,
    };
  };

  const [itemRows, setItemRows] = useState<EODItemLine[]>(() => {
    if (existingDraft?.itemRows && existingDraft.itemRows.length > 0) {
      return existingDraft.itemRows;
    }
    return [createEmptyRow(), createEmptyRow()];
  });

  // Save draft whenever state changes
  useEffect(() => {
    const hasData =
      Boolean(branch.trim()) ||
      Boolean(staffId.trim()) ||
      Boolean(remarks.trim()) ||
      Boolean(evidencePhoto) ||
      Boolean(rootCauseOther.trim()) ||
      Boolean(editingRecordId) ||
      itemRows.some(r => r.itemId || r.itemName || r.quantity > 0 || (r.rawQty && r.rawQty !== ''));

    if (hasData) {
      saveDailyDraft({
        editingRecordId,
        date,
        branch,
        staffId,
        issueType,
        varianceStatus,
        department,
        rootCause,
        rootCauseOther,
        remarks,
        evidencePhoto,
        itemRows,
      });
    } else {
      clearDailyDraft();
    }
  }, [editingRecordId, date, branch, staffId, issueType, varianceStatus, department, rootCause, rootCauseOther, remarks, evidencePhoto, itemRows]);

  const [errors, setErrors] = useState<string[]>([]);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Duplicate detection modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<EODRecord | null>(null);
  const [existingDuplicateRecord, setExistingDuplicateRecord] = useState<EODRecord | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Active personnel & options
  const activeStaff = useMemo(() => staffList.filter(s => s.status === 'Active'), [staffList]);
  const activeItems = useMemo(() => items.filter(i => i.active), [items]);

  const branchOptions: SelectOption[] = useMemo(
    () =>
      branches.map(b => ({
        value: b.name,
        label: b.name,
        sublabel: b.region ? `Region: ${b.region}` : undefined,
        badge: b.code,
      })),
    [branches]
  );

  const staffOptions: SelectOption[] = useMemo(() => {
    const filtered = branch ? activeStaff.filter(s => s.branch.toLowerCase().trim() === branch.toLowerCase().trim()) : activeStaff;
    return filtered
      .map(s => ({
        value: s.id,
        label: s.name,
        badge: s.position,
        sublabel: `Branch: ${s.branch}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activeStaff, branch]);

  const itemOptions: SelectOption[] = useMemo(
    () =>
      activeItems.map(it => ({
        value: it.id,
        label: it.name,
        badge: it.category,
        sublabel: `Default: ${formatPHP(it.defaultPrice)} • Code: ${it.code}`,
      })),
    [activeItems]
  );

  const handleBranchChange = (newBranch: string) => {
    setBranch(newBranch);
    if (staffId && newBranch) {
      const currentStaff = staffList.find(s => s.id === staffId);
      if (currentStaff && currentStaff.branch.toLowerCase().trim() !== newBranch.toLowerCase().trim()) {
        setStaffId('');
      }
    }
  };

  const handleStaffChange = (newStaffId: string) => {
    setStaffId(newStaffId);
    const foundStaff = staffList.find(s => s.id === newStaffId);
    if (foundStaff && foundStaff.branch && !branch) {
      setBranch(foundStaff.branch);
    }
  };

  // Adjust item rows when variance status toggles
  useEffect(() => {
    if (!editingRecordId) {
      if (varianceStatus === 'G' || varianceStatus === 'C') {
        if (itemRows.length === 0) {
          setItemRows([createEmptyRow()]);
        } else if (itemRows.length > 1) {
          setItemRows([itemRows[0]]);
        }
      } else if ((varianceStatus === 'Y' || varianceStatus === 'R') && itemRows.length < 2) {
        setItemRows([itemRows[0] || createEmptyRow(), createEmptyRow()]);
      }
    }
  }, [varianceStatus, editingRecordId]);

  const handleItemSelect = (rowIndex: number, selectedId: string) => {
    const matched = items.find(it => it.id === selectedId);
    const defaultPrice = matched ? matched.defaultPrice : 0;
    const name = matched ? matched.name : '';

    if (matched?.category) {
      setDepartment(matched.category);
    }

    setItemRows(prev => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        const qty = updated[rowIndex].quantity || 0;
        updated[rowIndex] = {
          ...updated[rowIndex],
          itemId: selectedId,
          itemName: name,
          unitPrice: defaultPrice,
          rawPrice: defaultPrice > 0 ? String(defaultPrice) : '',
          totalPrice: Number((qty * defaultPrice).toFixed(2)),
        };
      }
      return updated;
    });
  };

  const handleQuantityChange = (rowIndex: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? 0 : parseFloat(trimmed) || 0;

    setItemRows(prev => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        const price = updated[rowIndex].unitPrice || 0;
        updated[rowIndex] = {
          ...updated[rowIndex],
          rawQty: raw,
          quantity: Math.max(0, parsed),
          totalPrice: Number((Math.max(0, parsed) * price).toFixed(2)),
        };
      }
      return updated;
    });
  };

  const handlePriceChange = (rowIndex: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? 0 : parseFloat(trimmed) || 0;

    setItemRows(prev => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        const qty = updated[rowIndex].quantity || 0;
        updated[rowIndex] = {
          ...updated[rowIndex],
          rawPrice: raw,
          unitPrice: Math.max(0, parsed),
          totalPrice: Number((qty * Math.max(0, parsed)).toFixed(2)),
        };
      }
      return updated;
    });
  };

  const handleAddRow = () => {
    setItemRows(prev => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (index: number) => {
    if (itemRows.length <= 1) {
      alert('A record must contain at least 1 item line.');
      return;
    }
    setItemRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const grandTotalFinancialImpact = useMemo(() => {
    if (varianceStatus === 'G' || varianceStatus === 'C') return 0;
    return itemRows.reduce((sum, row) => sum + (Number(row.totalPrice) || 0), 0);
  }, [itemRows, varianceStatus]);

  const matchingSavedRecords = useMemo(() => {
    return records.filter(rec => {
      const matchDate = date ? rec.date === date : true;
      const matchBranch = branch.trim() ? rec.branch.toLowerCase().trim() === branch.toLowerCase().trim() : true;
      return matchDate && matchBranch;
    });
  }, [records, date, branch]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setEvidencePhoto(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearForm = () => {
    setEditingRecordId(null);
    setDate(getTodayDateString());
    setBranch('');
    setStaffId('');
    setIssueType('Wrong EOD');
    setVarianceStatus('Y');
    setDepartment('FG');
    setRootCause('Staff Error');
    setRootCauseOther('');
    setRemarks('');
    setEvidencePhoto('');
    setItemRows([createEmptyRow(), createEmptyRow()]);
    setErrors([]);
    clearDailyDraft();
  };

  const handleEditRecord = (rec: EODRecord) => {
    setEditingRecordId(rec.id);
    setDate(rec.date);
    setBranch(rec.branch);
    setStaffId(rec.staffId);
    setIssueType(rec.issueType);
    setVarianceStatus(rec.varianceStatus);
    setDepartment(rec.department || 'FG');
    setRootCause(rec.rootCause || 'Staff Error');
    setRootCauseOther(rec.rootCauseOther || '');
    setRemarks(rec.remarks || '');
    setEvidencePhoto(rec.evidencePhoto || '');
    setItemRows(
      rec.items.length > 0
        ? rec.items.map(it => ({
            ...it,
            rawQty: it.quantity > 0 ? String(it.quantity) : '',
            rawPrice: it.unitPrice > 0 ? String(it.unitPrice) : '',
          }))
        : [createEmptyRow()]
    );
    setErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];

    if (!date) validationErrors.push('Audit Date is required.');
    if (!branch.trim()) validationErrors.push('Branch Location is required (select or enter a valid branch).');
    if (!staffId.trim()) validationErrors.push('Assigned Staff is required (select a personnel from the directory).');
    if (!issueType) validationErrors.push('Issue Type is required.');
    if (!varianceStatus) validationErrors.push('Variance Status is required.');
    if (rootCause === 'Others' && !rootCauseOther.trim()) {
      validationErrors.push('Please specify the explanation when "Others" is selected as Root Cause.');
    }

    const validRows = itemRows.filter(
      r => Boolean(r.itemId?.trim() || r.itemName?.trim()) || (r.quantity > 0 || (r.rawQty && parseFloat(r.rawQty) > 0))
    );

    if ((varianceStatus === 'Y' || varianceStatus === 'R') && validRows.length === 0) {
      validationErrors.push('Please select at least 1 item and enter a quantity for the variance record.');
    }

    (validRows.length > 0 ? validRows : itemRows).forEach((row, i) => {
      if (!row.itemName && row.itemId) {
        const found = items.find(it => it.id === row.itemId);
        if (found) row.itemName = found.name;
      }

      if (varianceStatus === 'Y' || varianceStatus === 'R') {
        if (!row.itemName && !row.itemId) {
          validationErrors.push(`Item name in row #${i + 1} is required.`);
        }
        if (row.quantity <= 0) {
          validationErrors.push(`Quantity for "${row.itemName || `Row #${i + 1}`}" must be greater than 0.`);
        }
      }
      if (row.unitPrice < 0) {
        validationErrors.push(`Unit price in row #${i + 1} cannot be negative.`);
      }
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors([]);

    const staffObj = staffList.find(s => s.id === staffId);
    const resolvedStaffName = staffObj ? staffObj.name : staffId;

    const finalItemLines: EODItemLine[] = (validRows.length > 0 ? validRows : itemRows).map(row => {
      const found = items.find(it => it.id === row.itemId);
      const q = Math.max(0, row.quantity || 0);
      const p = Math.max(0, row.unitPrice || 0);
      return {
        id: row.id || `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        itemId: row.itemId || found?.id || '',
        itemName: row.itemName || found?.name || 'General Item',
        quantity: q,
        unitPrice: p,
        totalPrice: Number((q * p).toFixed(2)),
      };
    });

    const finalImpact =
      varianceStatus === 'G' || varianceStatus === 'C'
        ? 0
        : finalItemLines.reduce((acc, line) => acc + (Number(line.totalPrice) || 0), 0);

    const recordToSave: EODRecord = {
      id: editingRecordId || `eod-${Date.now()}`,
      date,
      branch: branch.trim(),
      staffId: staffId.trim(),
      staffName: resolvedStaffName,
      issueType,
      varianceStatus,
      department,
      items: finalItemLines,
      totalFinancialImpact: finalImpact,
      rootCause,
      rootCauseOther: rootCause === 'Others' ? rootCauseOther.trim() : undefined,
      remarks: remarks.trim() || undefined,
      evidencePhoto: evidencePhoto || undefined,
      createdAt: editingRecordId
        ? records.find(r => r.id === editingRecordId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Duplicate check when creating a new record
    if (!editingRecordId) {
      const existingMatch = records.find(
        r =>
          r.date === date &&
          r.branch.toLowerCase().trim() === branch.toLowerCase().trim() &&
          r.staffName.toLowerCase().trim() === resolvedStaffName.toLowerCase().trim() &&
          r.issueType.toLowerCase().trim() === issueType.toLowerCase().trim()
      );

      if (existingMatch) {
        setExistingDuplicateRecord(existingMatch);
        setPendingRecord(recordToSave);
        setShowDuplicateModal(true);
        return;
      }
    }

    finalizeSave(recordToSave);
  };

  const finalizeSave = (rec: EODRecord) => {
    onSaveRecord(rec);
    setSaveSuccessMessage(
      `Record successfully saved with ${rec.items.length} item line(s) totaling ${formatPHP(rec.totalFinancialImpact)}.`
    );
    setTimeout(() => setSaveSuccessMessage(null), 4000);
    handleClearForm();

    setTimeout(() => {
      const target = document.getElementById('recent-records-section');
      target?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <div id="daily-matrix-tab-container" className="space-y-6 animate-fade-in text-[#2C2A29]">
      <div className="border-b border-[#EAE3D5] pb-5">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 tracking-tight italic">
          Daily EOD Matrix Entry
        </h1>
        <p className="text-sm text-[#6C655B] mt-1">
          Controlled data entry system. Input real daily transaction logs with dynamic item rows, live currency calculation, and duplicate prevention.
        </p>
      </div>

      {saveSuccessMessage && (
        <div className="bg-green-50 border border-green-200 text-[#4F8130] p-4 rounded-xl flex items-center gap-3 text-xs font-bold shadow-xs animate-shake">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-[#B53D43] p-4 rounded-xl space-y-1 text-xs">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Please correct the following before saving:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11.5px]">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Entry Form */}
      <form
        id="eod-matrix-entry-form"
        onSubmit={handleSubmit}
        className="bg-white border border-[#EAE3D5] rounded-2xl p-6 shadow-xs space-y-6"
      >
        <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#FAF7F2] rounded-xl text-[#C5A059] border border-[#EAE3D5]">
              <Table2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-base text-gray-900 italic">
                  {editingRecordId ? 'Edit EOD Transaction Record' : 'Log New Daily EOD Record'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Auto-saving Draft
                </span>
              </div>
              <p className="text-xs text-[#6C655B]">
                {editingRecordId
                  ? 'Modifying existing saved transaction snapshot'
                  : 'Fill in the fields below. Changes are auto-saved in your browser even if you exit or close the tab.'}
              </p>
            </div>
          </div>

          {editingRecordId && (
            <button
              type="button"
              onClick={handleClearForm}
              className="text-xs font-bold text-gray-500 hover:text-black bg-gray-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Form Fields Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              1. Audit Date *
            </label>
            <input
              id="input-date"
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            />
          </div>

          <div>
            <SearchableSelect
              id="input-branch"
              label="2. Branch Location"
              required
              placeholder="Type branch name (e.g. CAB...)"
              options={branchOptions}
              value={branch}
              onChange={handleBranchChange}
              noOptionsText="No matching branches"
            />
          </div>

          <div>
            <SearchableSelect
              id="input-staff"
              label="3. Assigned Staff"
              required
              placeholder={branch ? `Type staff in ${branch}...` : 'Type staff name or position...'}
              options={staffOptions}
              value={staffId}
              onChange={handleStaffChange}
              noOptionsText={branch ? `No personnel registered under ${branch}` : 'No matching personnel'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              4. Issue Type *
            </label>
            <select
              id="input-issue-type"
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="Wrong EOD">Wrong EOD</option>
              <option value="Unpunch Item">Unpunch Item</option>
              <option value="Overpunch">Overpunch</option>
              {issueTypes
                .filter(it => !['Wrong EOD', 'Unpunch Item', 'Overpunch'].includes(it.name))
                .map(it => (
                  <option key={it.id} value={it.name}>
                    {it.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Variance Status & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF7F2]/50 p-4 rounded-xl border border-[#EAE3D5] text-xs">
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              5. Variance Status Indicator *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['G', 'Y', 'R', 'C'] as VarianceStatus[]).map(status => {
                const isSelected = varianceStatus === status;
                let activeStyle = 'bg-white text-gray-600 border-[#EAE3D5] hover:bg-[#FAF7F2]';
                if (isSelected) {
                  if (status === 'G') activeStyle = 'bg-[#EBF5E6] text-[#4F8130] border-[#C3DFB2] ring-2 ring-[#4F8130]';
                  else if (status === 'Y') activeStyle = 'bg-[#FAF2E5] text-[#A67C30] border-[#EBDCBF] ring-2 ring-[#A67C30]';
                  else if (status === 'R') activeStyle = 'bg-[#FCECEE] text-[#B53D43] border-[#F2C2C6] ring-2 ring-[#B53D43]';
                  else activeStyle = 'bg-[#FAF7F2] text-gray-800 border-[#EAE3D5] ring-2 ring-gray-600';
                }

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setVarianceStatus(status)}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${activeStyle}`}
                  >
                    <span className="font-mono text-sm">{status}</span>
                    <span className="text-[9.5px] font-medium opacity-80">
                      {status === 'G' ? 'Green' : status === 'Y' ? 'Yellow' : status === 'R' ? 'Red' : 'Closed'}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10.5px] text-[#6C655B] italic mt-1">
              {varianceStatus === 'G' && 'Green: Zero variance. 1 item row required.'}
              {varianceStatus === 'Y' && 'Yellow: Variance logged. Automatically provides 2 item rows.'}
              {varianceStatus === 'R' && 'Red: Critical / No EOD entry. Automatically provides 2 item rows.'}
              {varianceStatus === 'C' && 'Closed: Branch non-operational.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Department Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDepartment('FG')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  department === 'FG'
                    ? 'bg-[#245D94] text-white border-[#245D94] shadow-sm'
                    : 'bg-white text-gray-700 border-[#EAE3D5] hover:bg-[#FAF7F2]'
                }`}
              >
                Finished Goods (FG)
              </button>
              <button
                type="button"
                onClick={() => setDepartment('RM')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  department === 'RM'
                    ? 'bg-[#4F8130] text-white border-[#4F8130] shadow-sm'
                    : 'bg-white text-gray-700 border-[#EAE3D5] hover:bg-[#FAF7F2]'
                }`}
              >
                Raw Materials (RM)
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Item Rows Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-2">
            <div>
              <h3 className="font-serif font-bold text-sm text-gray-900 italic flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C5A059]" />
                Item & Product Line Entries ({itemRows.length})
              </h3>
              <p className="text-[11px] text-[#6C655B]">
                Unit price is snapshotted upon selection; changing price in Settings later will never alter this record.
              </p>
            </div>
            <button
              type="button"
              id="btn-add-item-row"
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#EAE3D5] text-gray-900 border border-[#EAE3D5] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Add Another Item Row</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {itemRows.map((row, index) => (
              <div
                key={row.id || index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#FAF7F2]/40 border border-[#EAE3D5] p-3 rounded-xl items-end text-xs"
              >
                <div className="sm:col-span-5 space-y-1">
                  <SearchableSelect
                    id={`item-row-${index}`}
                    label={`Item Row #${index + 1} Name`}
                    required
                    placeholder="Type product name (e.g. Pan, Gar, Ens...)"
                    options={itemOptions}
                    value={row.itemId}
                    onChange={selId => handleItemSelect(index, selId)}
                    noOptionsText="No matching products"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
                    Quantity *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.rawQty !== undefined ? row.rawQty : row.quantity === 0 ? '' : String(row.quantity)}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        handleQuantityChange(index, val);
                      }
                    }}
                    className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 focus:border-[#C5A059] shadow-sm transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
                    Unit Price (₱) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.rawPrice !== undefined ? row.rawPrice : row.unitPrice === 0 ? '' : String(row.unitPrice)}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        handlePriceChange(index, val);
                      }
                    }}
                    className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 focus:border-[#C5A059] shadow-sm transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <span className="text-[10px] font-bold text-[#6C655B] uppercase block">Total Price</span>
                  <div className="px-3 py-2 bg-white border border-[#EAE3D5] rounded-lg font-mono font-extrabold text-red-600">
                    {formatPHP(row.totalPrice)}
                  </div>
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove this item row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total Bar */}
          <div className="flex items-center justify-between bg-[#121110] text-white p-4 rounded-xl border border-[#22201D] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-bold text-[#C5A059] uppercase tracking-wider">
                Record Grand Total Financial Impact:
              </span>
              <span className="text-[11px] text-gray-400 font-mono">({itemRows.length} item lines)</span>
            </div>
            <div className="font-mono text-2xl font-black text-red-400">
              {formatPHP(grandTotalFinancialImpact)}
            </div>
          </div>
        </div>

        {/* Root Cause & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="space-y-2">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Root Cause Classification (Optional)
            </label>
            <select
              value={rootCause}
              onChange={e => setRootCause(e.target.value)}
              className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="Staff Error">Staff Error</option>
              <option value="Training Needed">Training Needed</option>
              <option value="System Issue">System Issue</option>
              <option value="Item Setup Problem">Item Setup Problem</option>
              <option value="Unknown">Unknown</option>
              <option value="Others">Others</option>
            </select>
            {rootCause === 'Others' && (
              <input
                type="text"
                required
                placeholder="Explain 'Others' root cause..."
                value={rootCauseOther}
                onChange={e => setRootCauseOther(e.target.value)}
                className="w-full px-3 py-2 border border-red-200 rounded-xl bg-red-50/20 text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 mt-2"
              />
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Shift Remarks & Audit Observations
            </label>
            <textarea
              rows={3}
              placeholder="Provide specific notes regarding why the variance occurred or shift conditions..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>
        </div>

        {/* Verification Photo Upload */}
        <div className="space-y-2 pt-2 border-t border-[#FAF7F2] text-xs">
          <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
            Verification Photo / Receipt Image (Optional)
          </label>
          {evidencePhoto ? (
            <div className="relative inline-block border border-[#EAE3D5] rounded-xl p-2 bg-[#FAF7F2]">
              <img
                src={evidencePhoto}
                alt="Audit Evidence"
                className="max-h-32 object-contain rounded-lg cursor-zoom-in"
                onClick={() => setZoomedImage(evidencePhoto)}
              />
              <button
                type="button"
                onClick={() => setEvidencePhoto('')}
                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                title="Remove photo"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 p-3 border border-dashed border-[#EAE3D5] hover:border-[#C5A059] rounded-xl bg-[#FAF7F2]/40 text-gray-600 hover:text-black cursor-pointer transition-colors max-w-sm">
              <Camera className="w-4 h-4 text-[#C5A059]" />
              <span className="font-semibold text-xs">Upload Verification Photo / Slip</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EAE3D5]">
          <button
            type="button"
            onClick={handleClearForm}
            className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Clear Form
          </button>
          <button
            type="submit"
            id="btn-save-eod-record"
            className="px-6 py-2.5 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:shadow-md active:scale-95"
          >
            <Save className="w-4 h-4 text-[#C5A059]" />
            <span>{editingRecordId ? 'Update Record' : 'Save Daily Record'}</span>
          </button>
        </div>
      </form>

      {/* Saved Records for Selected Day */}
      <section id="recent-records-section" className="bg-white border border-[#EAE3D5] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FAF7F2] pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif font-bold text-base text-gray-900 italic">
                Live Saved Daily EOD Records ({matchingSavedRecords.length})
              </h3>
              {date && (
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Date: {formatDate(date)}
                </span>
              )}
              {branch.trim() && (
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#C5A059]/15 text-[#8C6D23] border border-[#C5A059]/30">
                  Branch: {branch}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6C655B] mt-0.5">
              Showing records matching the selected Audit Date ({formatDate(date)}){branch.trim() ? ` and ${branch} location.` : '.'}
            </p>
          </div>

          {(branch.trim() || date) && matchingSavedRecords.length !== records.length && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] text-gray-500 font-mono">({records.length} total in system)</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-[#EAE3D5] rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF7F2] border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Branch</th>
                <th className="p-3">Staff</th>
                <th className="p-3">Issue Type</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Items Logged</th>
                <th className="p-3 text-right">Financial Exposure</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {matchingSavedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                    No EOD records found for {formatDate(date)} {branch.trim() ? `at ${branch}` : ''}. Fill out the form above to log a record for this day.
                  </td>
                </tr>
              ) : (
                matchingSavedRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="p-3 font-mono font-semibold text-gray-800">{formatDate(rec.date)}</td>
                    <td className="p-3 font-bold text-gray-900">{rec.branch}</td>
                    <td className="p-3 text-gray-800">{rec.staffName}</td>
                    <td className="p-3 font-semibold text-gray-900">{rec.issueType}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-mono text-[9.5px] font-extrabold ${
                          rec.varianceStatus === 'G'
                            ? 'bg-green-100 text-green-800'
                            : rec.varianceStatus === 'Y'
                            ? 'bg-amber-100 text-amber-800'
                            : rec.varianceStatus === 'R'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {rec.varianceStatus}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-gray-600">
                      {rec.items?.map(it => `${it.quantity}x ${it.itemName}`).join(', ') || '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-red-600">
                      {formatPHP(rec.totalFinancialImpact)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditRecord(rec)}
                          className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit this record"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete EOD record for ${rec.branch} on ${rec.date}?`)) {
                              onDeleteRecord(rec.id);
                            }
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete this record"
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
      </section>

      {/* Duplicate Warning Modal */}
      {showDuplicateModal && pendingRecord && (
        <DuplicateDetectionModal
          existingRecord={existingDuplicateRecord}
          newRecordSummary={{
            date: pendingRecord.date,
            branch: pendingRecord.branch,
            staffName: pendingRecord.staffName,
            issueType: pendingRecord.issueType,
            varianceStatus: pendingRecord.varianceStatus,
            itemCount: pendingRecord.items.length,
            totalAmount: pendingRecord.totalFinancialImpact,
          }}
          onReviewExisting={rec => {
            setShowDuplicateModal(false);
            handleEditRecord(rec);
          }}
          onSaveAnyway={() => {
            setShowDuplicateModal(false);
            finalizeSave(pendingRecord);
          }}
          onCancel={() => {
            setShowDuplicateModal(false);
            setPendingRecord(null);
          }}
        />
      )}

      {/* Image Zoom Modal */}
      <ImageZoomModal src={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
};
