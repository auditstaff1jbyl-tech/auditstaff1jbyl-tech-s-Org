import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Users,
  Package,
  Sliders,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  SquarePen,
  Save,
} from 'lucide-react';
import {
  Branch,
  Staff,
  ProductItem,
  IssueTypeConfig,
  RiskSettings,
} from '../types';
import { formatPHP } from '../utils/formatters';
import { SupabaseSecurityView } from './SupabaseSecurityView';

interface SettingsTabProps {
  branches: Branch[];
  staffList: Staff[];
  items: ProductItem[];
  issueTypes: IssueTypeConfig[];
  riskSettings: RiskSettings;
  onUpdateBranches: (branches: Branch[]) => void;
  onUpdateStaff: (staff: Staff[]) => void;
  onUpdateItems: (items: ProductItem[]) => void;
  onUpdateIssueTypes: (issueTypes: IssueTypeConfig[]) => void;
  onUpdateRiskSettings: (settings: RiskSettings) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onResetDatabase: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  branches,
  staffList,
  items,
  issueTypes,
  riskSettings,
  onUpdateBranches,
  onUpdateStaff,
  onUpdateItems,
  onUpdateIssueTypes,
  onUpdateRiskSettings,
  onExportBackup,
  onImportBackup,
  onResetDatabase,
}) => {
  const [activeSection, setActiveSection] = useState<'branches' | 'items' | 'issues' | 'risk' | 'data' | 'supabase'>('branches');

  // Branch Form
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchRegion, setBranchRegion] = useState('Central');

  // Product Form
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemCategory, setItemCategory] = useState<'FG' | 'RM'>('FG');
  const [itemPrice, setItemPrice] = useState('50.00');

  // Issue Type Form
  const [issueName, setIssueName] = useState('');
  const [issueDesc, setIssueDesc] = useState('');

  // Risk Settings Local Form
  const [critThreshold, setCritThreshold] = useState(String(riskSettings.financialThresholds.critical));
  const [highThreshold, setHighThreshold] = useState(String(riskSettings.financialThresholds.high));
  const [repeatThreshold, setRepeatThreshold] = useState(String(riskSettings.repeatIncidentThreshold));

  // Branch handlers
  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    const newB: Branch = {
      id: `br-${Date.now()}`,
      name: branchName.trim(),
      code: branchCode.trim() || branchName.substring(0, 3).toUpperCase(),
      region: branchRegion,
      active: true,
    };
    onUpdateBranches([...branches, newB]);
    setBranchName('');
    setBranchCode('');
  };

  const handleDeleteBranch = (id: string) => {
    if (confirm('Delete this branch from master records?')) {
      onUpdateBranches(branches.filter(b => b.id !== id));
    }
  };

  // Product Item handlers
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    const price = parseFloat(itemPrice) || 0;
    const newIt: ProductItem = {
      id: `it-${Date.now()}`,
      name: itemName.trim(),
      code: itemCode.trim() || itemName.substring(0, 3).toUpperCase(),
      category: itemCategory,
      defaultPrice: price,
      active: true,
    };
    onUpdateItems([...items, newIt]);
    setItemName('');
    setItemCode('');
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Delete this product item from master records?')) {
      onUpdateItems(items.filter(i => i.id !== id));
    }
  };

  // Issue Type handlers
  const handleAddIssueType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueName.trim()) return;
    const newIt: IssueTypeConfig = {
      id: `issue-${Date.now()}`,
      name: issueName.trim(),
      description: issueDesc.trim(),
      active: true,
    };
    onUpdateIssueTypes([...issueTypes, newIt]);
    setIssueName('');
    setIssueDesc('');
  };

  const handleDeleteIssueType = (id: string) => {
    if (confirm('Delete this issue classification from master records?')) {
      onUpdateIssueTypes(issueTypes.filter(i => i.id !== id));
    }
  };

  // Risk Thresholds save
  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RiskSettings = {
      ...riskSettings,
      financialThresholds: {
        ...riskSettings.financialThresholds,
        critical: parseFloat(critThreshold) || 3000,
        high: parseFloat(highThreshold) || 1000,
      },
      repeatIncidentThreshold: parseInt(repeatThreshold, 10) || 2,
    };
    onUpdateRiskSettings(updated);
    alert('Risk matrix thresholds successfully saved!');
  };

  return (
    <div id="settings-tab-container" className="space-y-6 animate-fade-in text-[#2C2A29]">
      <div className="border-b border-[#EAE3D5] pb-5">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 tracking-tight italic">
          Master Settings & System Controls
        </h1>
        <p className="text-sm text-[#6C655B] mt-1">
          Configure branches, products, classification taxonomies, risk scoring parameters, and full database backups.
        </p>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#EAE3D5] text-xs">
        <button
          onClick={() => setActiveSection('branches')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'branches'
              ? 'bg-[#121110] text-[#C5A059] shadow-xs'
              : 'bg-white text-gray-700 border border-[#EAE3D5] hover:bg-[#FAF7F2]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('items')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'items'
              ? 'bg-[#121110] text-[#C5A059] shadow-xs'
              : 'bg-white text-gray-700 border border-[#EAE3D5] hover:bg-[#FAF7F2]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Product Items ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('issues')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'issues'
              ? 'bg-[#121110] text-[#C5A059] shadow-xs'
              : 'bg-white text-gray-700 border border-[#EAE3D5] hover:bg-[#FAF7F2]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Issue Classifications ({issueTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('risk')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'risk'
              ? 'bg-[#121110] text-[#C5A059] shadow-xs'
              : 'bg-white text-gray-700 border border-[#EAE3D5] hover:bg-[#FAF7F2]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Risk Matrix Thresholds</span>
        </button>

        <button
          onClick={() => setActiveSection('data')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'data'
              ? 'bg-[#121110] text-[#C5A059] shadow-xs'
              : 'bg-white text-gray-700 border border-[#EAE3D5] hover:bg-[#FAF7F2]'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Backup & Database</span>
        </button>
      </div>

      {/* BRANCHES SECTION */}
      {activeSection === 'branches' && (
        <div className="space-y-6">
          <form onSubmit={handleAddBranch} className="bg-white border border-[#EAE3D5] p-5 rounded-2xl shadow-xs space-y-3 text-xs">
            <h3 className="font-serif font-bold text-sm text-gray-900 italic">Add New Master Branch</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CAB (Cabanatuan Main)"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Branch Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. CAB-01"
                  value={branchCode}
                  onChange={e => setBranchCode(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Region
                </label>
                <input
                  type="text"
                  placeholder="e.g. North Luzon"
                  value={branchRegion}
                  onChange={e => setBranchRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Branch</span>
              </button>
            </div>
          </form>

          <div className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs overflow-hidden">
            <h3 className="font-serif font-bold text-sm text-gray-900 italic mb-3">Registered Branches ({branches.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF7F2] border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Branch Name</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Region</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {branches.map(b => (
                    <tr key={b.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="p-2.5 font-bold text-gray-900">{b.name}</td>
                      <td className="p-2.5 font-mono text-gray-700">{b.code || '—'}</td>
                      <td className="p-2.5 text-gray-600">{b.region || '—'}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleDeleteBranch(b.id)}
                          className="p-1 text-red-500 hover:text-red-700 rounded transition-colors cursor-pointer"
                          title="Delete branch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ITEMS SECTION */}
      {activeSection === 'items' && (
        <div className="space-y-6">
          <form onSubmit={handleAddItem} className="bg-white border border-[#EAE3D5] p-5 rounded-2xl shadow-xs space-y-3 text-xs">
            <h3 className="font-serif font-bold text-sm text-gray-900 italic">Add New Master Product Item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spanish Bread"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Item Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SB-01"
                  value={itemCode}
                  onChange={e => setItemCode(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={itemCategory}
                  onChange={e => setItemCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
                >
                  <option value="FG">Finished Goods (FG)</option>
                  <option value="RM">Raw Materials (RM)</option>
                </select>
              </div>
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Default Unit Price (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={itemPrice}
                  onChange={e => setItemPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product Item</span>
              </button>
            </div>
          </form>

          <div className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs overflow-hidden">
            <h3 className="font-serif font-bold text-sm text-gray-900 italic mb-3">Product Catalog ({items.length})</h3>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF7F2] sticky top-0 border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5 text-center">Category</th>
                    <th className="p-2.5 text-right">Default Unit Price</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {items.map(it => (
                    <tr key={it.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="p-2.5 font-bold text-gray-900">{it.name}</td>
                      <td className="p-2.5 font-mono text-gray-600">{it.code || '—'}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                            it.category === 'FG' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {it.category}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                        {formatPHP(it.defaultPrice)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleDeleteItem(it.id)}
                          className="p-1 text-red-500 hover:text-red-700 rounded transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ISSUES SECTION */}
      {activeSection === 'issues' && (
        <div className="space-y-6">
          <form onSubmit={handleAddIssueType} className="bg-white border border-[#EAE3D5] p-5 rounded-2xl shadow-xs space-y-3 text-xs">
            <h3 className="font-serif font-bold text-sm text-gray-900 italic">Add New Issue Classification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Issue Type Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Void Transaction Error"
                  value={issueName}
                  onChange={e => setIssueName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                  Description / Operational Guidelines
                </label>
                <input
                  type="text"
                  placeholder="Explain under what conditions this issue should be logged..."
                  value={issueDesc}
                  onChange={e => setIssueDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Issue Type</span>
              </button>
            </div>
          </form>

          <div className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs overflow-hidden">
            <h3 className="font-serif font-bold text-sm text-gray-900 italic mb-3">Master Issue Classifications ({issueTypes.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF7F2] border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Classification Name</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {issueTypes.map(it => (
                    <tr key={it.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="p-2.5 font-bold text-gray-900">{it.name}</td>
                      <td className="p-2.5 text-gray-600">{it.description || '—'}</td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleDeleteIssueType(it.id)}
                          className="p-1 text-red-500 hover:text-red-700 rounded transition-colors cursor-pointer"
                          title="Delete issue type"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RISK SECTION */}
      {activeSection === 'risk' && (
        <form onSubmit={handleSaveRisk} className="bg-white border border-[#EAE3D5] p-6 rounded-2xl shadow-xs space-y-4 max-w-xl text-xs">
          <h3 className="font-serif font-bold text-base text-gray-900 italic border-b border-[#FAF7F2] pb-2">
            Executive Risk Matrix Thresholds
          </h3>
          <p className="text-[#6C655B] text-xs">
            These thresholds determine automatic risk tiers, critical alert generation, and personnel accountability indexing.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                Critical Financial Loss Threshold (₱)
              </label>
              <input
                type="number"
                value={critThreshold}
                onChange={e => setCritThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl font-mono text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Discrepancies equal to or above this amount automatically trigger Critical Severity. Default: ₱3,000.
              </span>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                High Financial Loss Threshold (₱)
              </label>
              <input
                type="number"
                value={highThreshold}
                onChange={e => setHighThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl font-mono text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Discrepancies equal to or above this amount trigger High Severity alerts. Default: ₱1,000.
              </span>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block mb-1">
                Repeat Discrepancy Threshold (Incidents)
              </label>
              <input
                type="number"
                value={repeatThreshold}
                onChange={e => setRepeatThreshold(e.target.value)}
                className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl font-mono text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Number of identical issue types by the same personnel that flags repeat incident escalation. Default: 2.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#FAF7F2] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#121110] hover:bg-black text-[#C5A059] font-serif font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#C5A059]" />
              <span>Save Risk Thresholds</span>
            </button>
          </div>
        </form>
      )}

      {/* BACKUP & DATA SECTION */}
      {activeSection === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#EAE3D5] p-5 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between text-xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-1">
                <Download className="w-4 h-4 text-[#C5A059]" />
                <span>Export System Backup</span>
              </div>
              <p className="text-gray-600 text-[11.5px] leading-relaxed">
                Download an auditable, unencrypted JSON snapshot containing all branches, staff records, product items, EOD transactions, and remediation tasks.
              </p>
            </div>
            <button
              onClick={onExportBackup}
              className="w-full py-2.5 bg-[#121110] hover:bg-black text-[#C5A059] font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          <div className="bg-white border border-[#EAE3D5] p-5 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between text-xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-1">
                <Upload className="w-4 h-4 text-[#C5A059]" />
                <span>Restore from Backup</span>
              </div>
              <p className="text-gray-600 text-[11.5px] leading-relaxed">
                Upload a valid EOD Matrix JSON backup file to restore all databases, records, and preferences into local storage.
              </p>
            </div>
            <button
              onClick={onImportBackup}
              className="w-full py-2.5 bg-white border border-[#EAE3D5] hover:bg-[#FAF7F2] text-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Upload Backup File</span>
            </button>
          </div>

          <div className="bg-white border border-red-200 p-5 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between text-xs">
            <div>
              <div className="flex items-center gap-2 font-bold text-red-700 text-sm mb-1">
                <RotateCcw className="w-4 h-4 text-red-600" />
                <span>Reset to Clean Defaults</span>
              </div>
              <p className="text-gray-600 text-[11.5px] leading-relaxed">
                Clear all custom modifications and reseed the database with the authoritative audit seed dataset.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all data to default seed data? All custom entries will be lost.')) {
                  onResetDatabase();
                }
              }}
              className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-600" />
              <span>Reset Database</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
