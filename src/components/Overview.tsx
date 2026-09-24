import React, { useState, useMemo, useCallback } from 'react';
import {
  Filter,
  Activity,
  ShieldAlert,
  Building2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Eye,
  TriangleAlert,
  Users,
} from 'lucide-react';
import {
  EODRecord,
  Staff,
  Branch,
  ProductItem,
  IssueTypeConfig,
  ActionItem,
  RiskSettings,
  RiskThresholds,
  GlobalFilterState,
  BranchMetric,
} from '../types';
import {
  filterRecords,
  calculateComparisonDateRange,
  calculateStaffRiskMetrics,
  calculateBranchMetrics,
  calculateItemMetrics,
  calculateIssueTypeMetrics,
  generateManagementTakeaways,
  generateLiveAlerts,
  generatePriorityRecommendations,
  inferItemCategory,
} from '../utils/analytics';
import { formatPHP, formatNumber } from '../utils/formatters';
import { BranchDrilldownModal } from './BranchDrilldownModal';

interface OverviewProps {
  records: EODRecord[];
  branches: Branch[];
  staffList: Staff[];
  items: ProductItem[];
  issueTypes: IssueTypeConfig[];
  riskSettings: RiskSettings;
  thresholds: RiskThresholds;
  actionItems: ActionItem[];
  onNavigateToMatrix: (branchName?: string, date?: string) => void;
  onNavigateToTracker: (branchName?: string, staffName?: string, recordId?: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  records,
  branches,
  staffList,
  items,
  issueTypes,
  riskSettings,
  thresholds,
  actionItems,
  onNavigateToMatrix,
  onNavigateToTracker,
}) => {
  const [filters, setFilters] = useState<GlobalFilterState>({
    dateFrom: '',
    dateTo: '',
    branch: 'All',
    staff: 'All',
    issueType: 'All',
    varianceStatus: 'All',
    department: 'All',
  });

  const [issueSortMode, setIssueSortMode] = useState<'exposure' | 'count'>('exposure');
  const [itemSortMode, setItemSortMode] = useState<'exposure' | 'count'>('exposure');
  const [itemDeptFilter, setItemDeptFilter] = useState<'ALL' | 'FG' | 'RM'>('ALL');
  const [staffDeptFilter, setStaffDeptFilter] = useState<'ALL' | 'FG' | 'RM'>('ALL');
  const [staffSortMode, setStaffSortMode] = useState<'exposure' | 'count'>('exposure');
  const [drilldownBranch, setDrilldownBranch] = useState<BranchMetric | null>(null);

  // Filtered dataset
  const filteredRecords = useMemo(
    () => filterRecords(records || [], filters),
    [records, filters]
  );

  // Comparative prior date range
  const { prevFrom, prevTo, isComparable } = useMemo(
    () => calculateComparisonDateRange(filters.dateFrom, filters.dateTo),
    [filters.dateFrom, filters.dateTo]
  );

  const previousFilteredRecords = useMemo(
    () =>
      isComparable
        ? filterRecords(records || [], { ...filters, dateFrom: prevFrom, dateTo: prevTo })
        : [],
    [records, filters, prevFrom, prevTo, isComparable]
  );

  // Analytics
  const staffMetrics = useMemo(
    () => calculateStaffRiskMetrics(staffList || [], filteredRecords, records || [], actionItems || [], riskSettings),
    [staffList, filteredRecords, records, actionItems, riskSettings]
  );

  const branchMetrics = useMemo(
    () =>
      calculateBranchMetrics(
        branches || [],
        filteredRecords,
        previousFilteredRecords,
        staffMetrics,
        actionItems || [],
        riskSettings
      ).filter(b => b.issues > 0),
    [branches, filteredRecords, previousFilteredRecords, staffMetrics, actionItems, riskSettings]
  );

  const itemMetrics = useMemo(
    () => calculateItemMetrics(items || [], filteredRecords),
    [items, filteredRecords]
  );

  const issueTypeMetrics = useMemo(
    () => calculateIssueTypeMetrics(issueTypes || [], filteredRecords, previousFilteredRecords),
    [issueTypes, filteredRecords, previousFilteredRecords]
  );

  // KPIs
  const totalFinancialExposure = useMemo(
    () => (filteredRecords || []).reduce((sum, r) => sum + (Number(r.totalFinancialImpact) || 0), 0),
    [filteredRecords]
  );

  const totalLoggedIssues = filteredRecords.length;

  const issueTypeTallies = useMemo(() => {
    const tallies: Record<string, number> = {
      'Wrong EOD': 0,
      'Wrong Entry': 0,
      'Unpunch Item': 0,
      Overpunch: 0,
      Others: 0,
    };
    (filteredRecords || []).forEach(r => {
      const t = r.issueType;
      if (t in tallies) tallies[t]++;
      else tallies.Others++;
    });
    return tallies;
  }, [filteredRecords]);

  const criticalSeverityCases = useMemo(() => {
    const critLimit = riskSettings.financialThresholds.critical || 3000;
    return (filteredRecords || []).filter(
      r => (Number(r.totalFinancialImpact) || 0) >= critLimit || r.varianceStatus === 'R'
    ).length;
  }, [filteredRecords, riskSettings]);

  const topVarianceBranch = branchMetrics.length > 0 && branchMetrics[0].financialExposure > 0 ? branchMetrics[0] : null;

  // Management insights
  const takeaways = useMemo(
    () =>
      generateManagementTakeaways(
        filteredRecords,
        staffMetrics,
        branchMetrics,
        itemMetrics,
        issueTypeMetrics
      ),
    [filteredRecords, staffMetrics, branchMetrics, itemMetrics, issueTypeMetrics]
  );

  const alerts = useMemo(
    () => generateLiveAlerts(staffMetrics, branchMetrics, itemMetrics, issueTypeMetrics, riskSettings),
    [staffMetrics, branchMetrics, itemMetrics, issueTypeMetrics, riskSettings]
  );

  const recommendations = useMemo(
    () => generatePriorityRecommendations(staffMetrics, branchMetrics, itemMetrics),
    [staffMetrics, branchMetrics, itemMetrics]
  );

  // Sorted Issue Types
  const sortedIssueMetrics = useMemo(() => {
    const list = [...issueTypeMetrics];
    return issueSortMode === 'count'
      ? list.sort((a, b) => b.totalIncidents - a.totalIncidents)
      : list.sort((a, b) => b.financialExposure - a.financialExposure);
  }, [issueTypeMetrics, issueSortMode]);

  // Item Category Filters
  const isFinishedGood = useCallback((m: { item: ProductItem }) => inferItemCategory(m.item, items || []) === 'FG', [items]);
  const isRawMaterial = useCallback((m: { item: ProductItem }) => inferItemCategory(m.item, items || []) === 'RM', [items]);

  const displayedItemMetrics = useMemo(() => {
    let list = [...itemMetrics];
    if (itemDeptFilter === 'FG') list = list.filter(isFinishedGood);
    if (itemDeptFilter === 'RM') list = list.filter(isRawMaterial);

    return itemSortMode === 'count'
      ? list.sort((a, b) => b.recordCount - a.recordCount)
      : list.sort((a, b) => b.totalFinancialImpact - a.totalFinancialImpact);
  }, [itemMetrics, itemDeptFilter, itemSortMode, isFinishedGood, isRawMaterial]);

  const fgItemMetrics = useMemo(() => itemMetrics.filter(isFinishedGood), [itemMetrics, isFinishedGood]);
  const rmItemMetrics = useMemo(() => itemMetrics.filter(isRawMaterial), [itemMetrics, isRawMaterial]);
  const fgTotalLoss = useMemo(() => fgItemMetrics.reduce((s, it) => s + it.totalFinancialImpact, 0), [fgItemMetrics]);
  const rmTotalLoss = useMemo(() => rmItemMetrics.reduce((s, it) => s + it.totalFinancialImpact, 0), [rmItemMetrics]);

  // Personnel Categorization Filters
  const isRecordFG = useCallback(
    (line: any) => inferItemCategory(line, items || []) === 'FG',
    [items]
  );
  const isRecordRM = useCallback(
    (line: any) => inferItemCategory(line, items || []) === 'RM',
    [items]
  );

  const fgRecords = useMemo(
    () =>
      filteredRecords
        .map(r => {
          const matching = (r.items || []).filter(isRecordFG);
          if (matching.length === 0) return null;
          const total = matching.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
          return { ...r, items: matching, totalFinancialImpact: total };
        })
        .filter(Boolean) as EODRecord[],
    [filteredRecords, isRecordFG]
  );

  const rmRecords = useMemo(
    () =>
      filteredRecords
        .map(r => {
          const matching = (r.items || []).filter(isRecordRM);
          if (matching.length === 0) return null;
          const total = matching.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
          return { ...r, items: matching, totalFinancialImpact: total };
        })
        .filter(Boolean) as EODRecord[],
    [filteredRecords, isRecordRM]
  );

  const staffMetricsFG = useMemo(
    () => calculateStaffRiskMetrics(staffList || [], fgRecords, records || [], actionItems || [], riskSettings),
    [staffList, fgRecords, records, actionItems, riskSettings]
  );
  const staffMetricsRM = useMemo(
    () => calculateStaffRiskMetrics(staffList || [], rmRecords, records || [], actionItems || [], riskSettings),
    [staffList, rmRecords, records, actionItems, riskSettings]
  );

  const displayedStaffMetrics = useMemo(() => {
    let source = staffMetrics;
    if (staffDeptFilter === 'FG') source = staffMetricsFG;
    if (staffDeptFilter === 'RM') source = staffMetricsRM;

    const filtered = source.filter(s => (s.issueCount || s.totalIssues || 0) > 0);
    return [...filtered].sort((a, b) =>
      staffSortMode === 'count'
        ? (b.issueCount || b.totalIssues || 0) - (a.issueCount || a.totalIssues || 0)
        : (b.financialExposure || 0) - (a.financialExposure || 0)
    );
  }, [staffDeptFilter, staffMetrics, staffMetricsFG, staffMetricsRM, staffSortMode]);

  const fgStaffLoss = useMemo(
    () => staffMetricsFG.reduce((s, st) => s + (st.financialExposure || 0), 0),
    [staffMetricsFG]
  );
  const rmStaffLoss = useMemo(
    () => staffMetricsRM.reduce((s, st) => s + (st.financialExposure || 0), 0),
    [staffMetricsRM]
  );

  const handleResetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      branch: 'All',
      staff: 'All',
      issueType: 'All',
      varianceStatus: 'All',
      department: 'All',
    });
  };

  const hasActiveFilters =
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    filters.branch !== 'All' ||
    filters.staff !== 'All' ||
    filters.issueType !== 'All' ||
    filters.varianceStatus !== 'All' ||
    filters.department !== 'All';

  return (
    <div id="overview-dashboard-container" className="space-y-6 animate-fade-in text-[#2C2A29]">
      {/* Filters Section */}
      <section id="overview-global-filters" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#FAF2E5]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#C5A059]" />
            <h2 className="font-serif font-bold text-sm text-gray-900 tracking-tight">
              Executive Matrix Filters
            </h2>
            <span className="text-[11px] text-[#6C655B] font-mono">
              ({filteredRecords.length} records matching)
            </span>
          </div>

          {hasActiveFilters && (
            <button
              id="btn-reset-filters"
              onClick={handleResetFilters}
              className="text-xs text-[#A67C30] hover:text-[#7A5B22] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Clear active filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Date From
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-2.5 py-1.5 border border-[#EAE3D5] rounded-lg bg-[#FAF7F2]/50 text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Date To
            </label>
            <input
              id="filter-date-to"
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-2.5 py-1.5 border border-[#EAE3D5] rounded-lg bg-[#FAF7F2]/50 text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Branch
            </label>
            <input
              id="filter-branch"
              type="text"
              list="filter-branch-options"
              value={filters.branch === 'All' ? '' : filters.branch}
              onChange={e => {
                const val = e.target.value;
                setFilters(prev => ({ ...prev, branch: val.trim() === '' ? 'All' : val }));
              }}
              placeholder={`All Branches (${branches.length})`}
              className="w-full px-2.5 py-1.5 border border-[#EAE3D5] rounded-lg bg-[#FAF7F2]/50 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059] placeholder:text-gray-500 placeholder:font-medium"
            />
            <datalist id="filter-branch-options">
              {(branches || []).map(b => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Staff Member
            </label>
            <input
              id="filter-staff"
              type="text"
              list="filter-staff-options"
              value={filters.staff === 'All' ? '' : filters.staff}
              onChange={e => {
                const val = e.target.value;
                setFilters(prev => ({ ...prev, staff: val.trim() === '' ? 'All' : val }));
              }}
              placeholder={`All Staff (${staffList.length})`}
              className="w-full px-2.5 py-1.5 border border-[#EAE3D5] rounded-lg bg-[#FAF7F2]/50 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059] placeholder:text-gray-500 placeholder:font-medium"
            />
            <datalist id="filter-staff-options">
              {(staffList || []).map(s => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.branch})
                </option>
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Issue Type
            </label>
            <select
              id="filter-issue-type"
              value={filters.issueType}
              onChange={e => setFilters(prev => ({ ...prev, issueType: e.target.value }))}
              className="w-full px-2.5 py-1.5 border border-[#EAE3D5] rounded-lg bg-[#FAF7F2]/50 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All Issue Types</option>
              <option value="Wrong EOD">Wrong EOD</option>
              <option value="Unpunch Item">Unpunch Item</option>
              <option value="Overpunch">Overpunch</option>
              {(issueTypes || [])
                .filter(it => it && !['Wrong EOD', 'Unpunch Item', 'Overpunch'].includes(it.name))
                .map(it => (
                  <option key={it.id} value={it.name}>
                    {it.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Variance Status
            </label>
            <select
              id="filter-variance-status"
              value={filters.varianceStatus}
              onChange={e => setFilters(prev => ({ ...prev, varianceStatus: e.target.value }))}
              className="w-full px-2.5 py-1.5 border border-[#EAE3D5] rounded-lg bg-[#FAF7F2]/50 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All Statuses (G, Y, R, C)</option>
              <option value="G">Green (Zero variance)</option>
              <option value="Y">Yellow (Variance logged)</option>
              <option value="R">Red (Critical variance)</option>
              <option value="C">Closed / Resolved</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
              Category
            </label>
            <select
              id="filter-department"
              value={filters.department}
              onChange={e => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-2.5 py-1.5 border border-[#EAE3D5] rounded-lg bg-[#FAF7F2]/50 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
            >
              <option value="All">All (Raw Materials + Finished Goods)</option>
              <option value="FG">Finished Goods</option>
              <option value="RM">Raw Materials</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section id="overview-kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div id="kpi-financial-exposure" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#6C655B] font-semibold mb-2">
            <span>Total Financial Exposure</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              ₱
            </div>
          </div>
          <div className="font-serif text-2xl lg:text-3xl font-extrabold text-red-600 tracking-tight mb-1">
            {formatPHP(totalFinancialExposure)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6C655B] font-mono">
            <span>Net monetary variance</span>
            <span className="font-semibold text-gray-700">{filteredRecords.length} records</span>
          </div>
        </div>

        <div id="kpi-total-issues" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#6C655B] font-semibold mb-2">
            <span>Total Logged Issues</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
            {formatNumber(totalLoggedIssues)}
          </div>
          <div className="text-[11px] text-[#6C655B] flex items-center gap-1.5 truncate">
            <span className="font-mono">EOD: {issueTypeTallies['Wrong EOD']}</span>
            <span>•</span>
            <span className="font-mono">Entry: {issueTypeTallies['Wrong Entry']}</span>
            <span>•</span>
            <span className="font-mono">Unpunch: {issueTypeTallies['Unpunch Item']}</span>
          </div>
        </div>

        <div id="kpi-critical-cases" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#6C655B] font-semibold mb-2">
            <span>Critical Severity Cases</span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl lg:text-3xl font-extrabold text-red-700 tracking-tight mb-1">
            {criticalSeverityCases}
          </div>
          <div className="text-[11px] text-[#6C655B] font-mono truncate">
            Threshold: ≥ {formatPHP(riskSettings.financialThresholds.critical)} or Red
          </div>
        </div>

        <div id="kpi-problematic-branch" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#6C655B] font-semibold mb-2">
            <span>Top Variance Branch</span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF2E5] text-[#C5A059] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div
            className="font-serif text-xl font-bold text-gray-900 tracking-tight truncate mb-1"
            title={topVarianceBranch?.branch.name || 'None'}
          >
            {topVarianceBranch ? topVarianceBranch.branch.name : 'All Clear'}
          </div>
          <div className="text-[11px] text-[#6C655B] flex items-center justify-between">
            <span className="font-mono text-red-600 font-bold">
              {topVarianceBranch ? formatPHP(topVarianceBranch.financialExposure) : '₱0.00'}
            </span>
            {topVarianceBranch && (
              <button
                onClick={() => onNavigateToMatrix(topVarianceBranch.branch.name)}
                className="text-[10px] text-[#A67C30] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>Audit</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Management Insights & Recommendations */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="overview-management-summary" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#FAF2E5]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <h3 className="font-serif font-bold text-sm text-gray-900 tracking-tight">
                  Executive Management Takeaways
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase bg-[#FAF2E5] text-[#A67C30] font-bold px-2 py-0.5 rounded-md">
                Auto-Synthesized
              </span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#4A4641] leading-relaxed">
              {takeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 shrink-0" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-[#FAF2E5] flex items-center justify-between text-[11px] text-[#6C655B]">
            <span>
              Comparative basis: {isComparable ? `${prevFrom} to ${prevTo}` : 'Current dataset aggregate'}
            </span>
            <span className="font-mono font-bold text-gray-800">Operational Integrity Grade: A-</span>
          </div>
        </div>

        <div id="overview-action-recommendations" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#FAF2E5]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <h3 className="font-serif font-bold text-sm text-gray-900 tracking-tight">
                  Priority Action Recommendations
                </h3>
              </div>
              <span className="text-[10px] font-mono text-gray-500">Sorted by risk exposure</span>
            </div>
            <div className="space-y-2.5">
              {recommendations.map(rec => {
                const badgeColor =
                  rec.priority === 'Priority 1'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : rec.priority === 'Priority 2'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-blue-100 text-blue-800 border-blue-200';
                return (
                  <div key={rec.id} className="p-2.5 rounded-xl border border-[#EAE3D5] bg-[#FAF7F2]/40 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${badgeColor}`}>
                        {rec.priorityLabel}
                      </span>
                      <span className="font-bold text-gray-900 text-[11px]">
                        {rec.targetType}: {rec.targetName}
                      </span>
                    </div>
                    <p className="font-medium text-gray-800 leading-snug">{rec.actionText}</p>
                    <p className="text-[10.5px] text-[#6C655B] mt-1 font-mono">Reason: {rec.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#FAF2E5] flex justify-end">
            <button
              onClick={() => onNavigateToTracker()}
              className="text-xs text-[#C5A059] hover:text-[#9A7A38] font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View Remediation Action Tracker</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Branch Rankings Table */}
      <section id="overview-branch-rankings" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#FAF2E5]">
          <div>
            <h3 className="font-serif font-bold text-base text-gray-900 tracking-tight">
              Branch Risk & Operational Ranking
            </h3>
            <p className="text-xs text-[#6C655B]">
              Aggregated across all branches. Click any branch row to inspect detailed audit drilldown.
            </p>
          </div>
          <span className="text-xs font-mono text-[#6C655B]">
            {branchMetrics.length} total branches audited
          </span>
        </div>

        <div className="overflow-x-auto border border-[#EAE3D5] rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF7F2] border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="p-3">Rank & Branch</th>
                <th className="p-3 text-center">Issues</th>
                <th className="p-3 text-right">Financial Exposure</th>
                <th className="p-3 text-center">Trend (MoM / Range)</th>
                <th className="p-3 text-center">Primary Problem</th>
                <th className="p-3 text-center">Risk Level</th>
                <th className="p-3 text-center">Unresolved Tasks</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF7F2]">
              {branchMetrics.map((bm, index) => {
                const tierClass =
                  bm.riskLevel === 'Critical'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : bm.riskLevel === 'High'
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : bm.riskLevel === 'Moderate'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200';

                return (
                  <tr
                    key={bm.branch.id}
                    className="hover:bg-[#FAF7F2]/80 transition-colors cursor-pointer"
                    onClick={() => setDrilldownBranch(bm)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#121110] text-[#C5A059] flex items-center justify-center font-mono font-bold text-[10px]">
                          #{index + 1}
                        </span>
                        <div>
                          <span className="font-bold text-gray-900 text-sm block">{bm.branch.name}</span>
                          <span className="text-[10px] text-[#6C655B] font-mono">
                            {bm.branch.code || `ID: ${bm.branch.id}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-gray-800">{bm.issues}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-red-600 text-sm">
                      {formatPHP(bm.financialExposure)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-mono text-[11px]">
                        {bm.trendDirection === 'Increasing' ? (
                          <span className="text-red-600 font-bold flex items-center">
                            <TrendingUp className="w-3 h-3 mr-0.5" />+{bm.trendPercentage.toFixed(1)}%
                          </span>
                        ) : bm.trendDirection === 'Decreasing' ? (
                          <span className="text-emerald-600 font-bold flex items-center">
                            <TrendingDown className="w-3 h-3 mr-0.5" />-{bm.trendPercentage.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-500 font-medium">Stable</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EAE3D5] text-[10px] font-semibold text-gray-800">
                        {bm.mostCommonIssueType}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierClass}`}>
                        {bm.riskLevel}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">
                      {bm.unresolvedActions > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[10px] border border-red-200">
                          {bm.unresolvedActions} Open
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[10px]">None</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDrilldownBranch(bm);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg border border-[#EAE3D5] text-[#C5A059] hover:text-[#9A7A38] transition-colors cursor-pointer shadow-2xs"
                        title="View detailed audit breakdown"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Two Column Section: Issue Types Chart & Product Inventory */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Type Impact & Chart */}
        <div id="overview-issue-types-card" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#FAF2E5]">
            <div>
              <h3 className="font-serif font-bold text-sm text-gray-900 tracking-tight">
                Issue Type Impact & Trends
              </h3>
              <p className="text-[11px] text-[#6C655B]">Breakdown by classification category</p>
            </div>
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#EAE3D5] text-[10px]">
              <button
                onClick={() => setIssueSortMode('exposure')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                  issueSortMode === 'exposure' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#6C655B]'
                }`}
              >
                Loss
              </button>
              <button
                onClick={() => setIssueSortMode('count')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                  issueSortMode === 'count' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#6C655B]'
                }`}
              >
                Count
              </button>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-end gap-3 overflow-x-auto pb-2">
              {sortedIssueMetrics.map((item, idx, arr) => {
                const PALETTE: [string, string][] = [
                  ['#8B5CF6', '#6D28D9'],
                  ['#EC4899', '#BE185D'],
                  ['#3B82F6', '#1D4ED8'],
                  ['#06B6D4', '#0E7490'],
                  ['#10B981', '#047857'],
                  ['#F59E0B', '#B45309'],
                  ['#EF4444', '#B91C1C'],
                  ['#6366F1', '#4338CA'],
                ];
                const maxVal = Math.max(
                  ...arr.map(m => (issueSortMode === 'exposure' ? m.financialExposure : m.totalIncidents)),
                  1
                );
                const val = issueSortMode === 'exposure' ? item.financialExposure : item.totalIncidents;
                const barHeightPx = val <= 0 ? 0 : Math.max(1, Math.round((val / maxVal) * 130));
                const [c1, c2] = PALETTE[idx % PALETTE.length];
                const label =
                  issueSortMode === 'exposure'
                    ? item.financialExposure >= 1000
                      ? '₱' + (item.financialExposure / 1000).toFixed(1) + 'K'
                      : formatPHP(item.financialExposure)
                    : String(item.totalIncidents);

                return (
                  <div key={item.issueType} className="flex flex-col items-center shrink-0" style={{ width: '92px' }}>
                    <div className="h-7 flex items-end justify-center w-full mb-1 px-0.5">
                      <span
                        className="text-[9.5px] font-mono font-extrabold text-gray-800 text-center leading-tight w-full overflow-hidden text-ellipsis whitespace-nowrap"
                        title={issueSortMode === 'exposure' ? formatPHP(item.financialExposure) : String(item.totalIncidents)}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="w-full flex items-end justify-center" style={{ height: '132px' }}>
                      <div
                        className="w-full max-w-[36px] rounded-t-md shadow-sm transition-all duration-300"
                        style={{ height: `${barHeightPx}px`, background: `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)` }}
                      />
                    </div>
                    <div className="w-full mt-2 px-1" style={{ minHeight: '44px' }}>
                      <span
                        className="text-[9.5px] font-bold text-gray-700 text-center block leading-tight break-words"
                        title={item.issueType}
                      >
                        {item.issueType}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-[#6C655B] text-center mt-3 italic">
              {issueSortMode === 'exposure' ? 'Ranked by financial exposure (₱)' : 'Ranked by incident count'}
            </p>
          </div>
        </div>

        {/* Problematic Product Inventory */}
        <div id="overview-problem-items-card" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs flex flex-col">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#FAF2E5]">
              <div>
                <h3 className="font-serif font-bold text-sm text-gray-900 tracking-tight">
                  Problematic Product Inventory
                </h3>
                <p className="text-[11px] text-[#6C655B]">Discrepancy impact segregated by production category</p>
              </div>
              <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#EAE3D5] text-[10px] self-start sm:self-auto">
                <span className="text-[9.5px] text-[#6C655B] font-medium px-1">Sort:</span>
                <button
                  onClick={() => setItemSortMode('exposure')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                    itemSortMode === 'exposure' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#6C655B] hover:text-gray-900'
                  }`}
                >
                  Loss
                </button>
                <button
                  onClick={() => setItemSortMode('count')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                    itemSortMode === 'count' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#6C655B] hover:text-gray-900'
                  }`}
                >
                  Incidents
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF7F2] rounded-xl border border-[#EAE3D5] mb-3">
              <button
                type="button"
                onClick={() => setItemDeptFilter('ALL')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  itemDeptFilter === 'ALL'
                    ? 'bg-white text-gray-900 shadow-xs border border-[#EAE3D5] font-bold'
                    : 'text-[#6C655B] hover:text-gray-900'
                }`}
              >
                <span>All Items</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 font-mono text-gray-700">
                  {itemMetrics.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setItemDeptFilter('FG')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  itemDeptFilter === 'FG'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-[#6C655B] hover:text-emerald-800'
                }`}
              >
                <span>Finished Goods</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    itemDeptFilter === 'FG' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {fgItemMetrics.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setItemDeptFilter('RM')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  itemDeptFilter === 'RM'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-[#6C655B] hover:text-amber-800'
                }`}
              >
                <span>Raw Materials</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    itemDeptFilter === 'RM' ? 'bg-amber-700 text-amber-100' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {rmItemMetrics.length}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6C655B] px-1 pb-2">
              <span className="font-mono">
                {itemDeptFilter === 'FG' ? (
                  <span className="text-emerald-700 font-semibold">
                    Finished Goods Impact: <strong>{formatPHP(fgTotalLoss)}</strong>
                  </span>
                ) : itemDeptFilter === 'RM' ? (
                  <span className="text-amber-700 font-semibold">
                    Raw Materials Impact: <strong>{formatPHP(rmTotalLoss)}</strong>
                  </span>
                ) : (
                  <span>
                    FG: <strong className="text-emerald-700">{formatPHP(fgTotalLoss)}</strong> | RM:{' '}
                    <strong className="text-amber-700">{formatPHP(rmTotalLoss)}</strong>
                  </span>
                )}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                Showing {displayedItemMetrics.length} item(s)
              </span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {displayedItemMetrics.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400 font-mono bg-[#FAF7F2]/40 rounded-xl border border-dashed border-[#EAE3D5]">
                {itemDeptFilter === 'FG'
                  ? 'No Finished Goods involved in filtered records.'
                  : itemDeptFilter === 'RM'
                  ? 'No Raw Materials involved in filtered records.'
                  : 'No items involved in filtered records.'}
              </div>
            ) : (
              displayedItemMetrics.map((im, idx) => {
                const isFG = im.category === 'FG';
                const tagColor = isFG
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <div
                    key={im.item.id || idx}
                    className="p-3 rounded-xl border border-[#EAE3D5] bg-[#FAF7F2]/30 hover:bg-[#FAF7F2]/70 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase border ${tagColor}`}>
                          {im.category}
                        </span>
                        <div className="font-bold text-gray-900 truncate" title={im.item.name}>
                          {im.item.name}
                        </div>
                      </div>
                      <div className="text-[10px] text-[#6C655B] flex items-center gap-2 mt-1">
                        <span className="font-mono font-semibold">Qty: {Number(im.totalQuantity.toFixed(2))}</span>
                        <span>•</span>
                        <span>Common: {im.mostCommonIssueType}</span>
                        {im.branchesInvolved.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="truncate">{im.branchesInvolved.length} branch(es)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-red-600">{formatPHP(im.totalFinancialImpact)}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{im.recordCount} incident(s)</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Bottom Section: Live Warnings & Personnel Risk Index */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Issue Warnings */}
        <div id="overview-system-alerts" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#FAF2E5]">
            <div className="flex items-center gap-2">
              <TriangleAlert className="w-4 h-4 text-amber-600" />
              <h3 className="font-serif font-bold text-sm text-gray-900 tracking-tight">
                Live Issue Warnings
              </h3>
            </div>
            <span className="font-bold text-[#C5A059] text-xs">
              {alerts.filter(a => a.severity === 'Critical').length} Critical
            </span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-mono">
                No major issues or high-risk errors detected under current rules.
              </div>
            ) : (
              alerts.map((alert, idx) => {
                const borderClass =
                  alert.severity === 'Critical'
                    ? 'border-red-200 bg-red-50/40 text-red-900'
                    : alert.severity === 'High'
                    ? 'border-amber-200 bg-amber-50/40 text-amber-900'
                    : 'border-[#EAE3D5] bg-[#FAF7F2]/60 text-gray-800';

                return (
                  <div
                    key={alert.id || idx}
                    className={`p-3 rounded-xl border ${borderClass} text-xs flex items-start justify-between gap-3`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                            alert.severity === 'Critical'
                              ? 'bg-red-600 text-white'
                              : alert.severity === 'High'
                              ? 'bg-amber-500 text-black'
                              : 'bg-gray-400 text-white'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="font-bold text-gray-900">
                          {alert.entityType}: {alert.entityName}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-700 leading-snug">{alert.reason}</p>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <span className="font-bold text-red-600 block">{alert.relevantAmountOrCount}</span>
                      <span className="text-[9.5px] text-gray-500">{alert.dateOrPeriod}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Personnel Risk & Repeat Error Index */}
        <div id="overview-staff-risk-card" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#FAF2E5]">
              <div>
                <h3 className="font-serif font-bold text-sm text-gray-900 tracking-tight">
                  Personnel Risk & Repeat Error Index
                </h3>
                <p className="text-[11px] text-[#6C655B]">
                  Weighted risk index (40% Fin, 30% Freq, 20% Repeat, 10% Unresolved) segregated by production category
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#EAE3D5] text-[10px]">
                  <span className="text-[9.5px] text-[#6C655B] font-medium px-1">Sort:</span>
                  <button
                    onClick={() => setStaffSortMode('exposure')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                      staffSortMode === 'exposure' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#6C655B] hover:text-gray-900'
                    }`}
                  >
                    Loss
                  </button>
                  <button
                    onClick={() => setStaffSortMode('count')}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                      staffSortMode === 'count' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#6C655B] hover:text-gray-900'
                    }`}
                  >
                    Incidents
                  </button>
                </div>
              </div>
            </div>

            {/* Personnel Category Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF7F2] rounded-xl border border-[#EAE3D5] mb-3">
              <button
                type="button"
                onClick={() => setStaffDeptFilter('ALL')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  staffDeptFilter === 'ALL'
                    ? 'bg-white text-gray-900 shadow-xs border border-[#EAE3D5] font-bold'
                    : 'text-[#6C655B] hover:text-gray-900'
                }`}
              >
                <span>All Personnel</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 font-mono text-gray-700">
                  {staffMetrics.filter(s => (s.issueCount || s.totalIssues || 0) > 0).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStaffDeptFilter('FG')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  staffDeptFilter === 'FG'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-[#6C655B] hover:text-emerald-800'
                }`}
              >
                <span>Finished Goods</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    staffDeptFilter === 'FG' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {staffMetricsFG.filter(s => (s.issueCount || s.totalIssues || 0) > 0).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStaffDeptFilter('RM')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  staffDeptFilter === 'RM'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-[#6C655B] hover:text-amber-800'
                }`}
              >
                <span>Raw Materials</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    staffDeptFilter === 'RM' ? 'bg-amber-700 text-amber-100' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {staffMetricsRM.filter(s => (s.issueCount || s.totalIssues || 0) > 0).length}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6C655B] px-1 pb-2">
              <span className="font-mono">
                {staffDeptFilter === 'FG' ? (
                  <span className="text-emerald-700 font-semibold">
                    FG Personnel Loss: <strong>{formatPHP(fgStaffLoss)}</strong>
                  </span>
                ) : staffDeptFilter === 'RM' ? (
                  <span className="text-amber-700 font-semibold">
                    RM Personnel Loss: <strong>{formatPHP(rmStaffLoss)}</strong>
                  </span>
                ) : (
                  <span>
                    FG Staff Loss: <strong className="text-emerald-700">{formatPHP(fgStaffLoss)}</strong> | RM Staff Loss:{' '}
                    <strong className="text-amber-700">{formatPHP(rmStaffLoss)}</strong>
                  </span>
                )}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {displayedStaffMetrics.length} staff member(s)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#EAE3D5] rounded-xl max-h-[360px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF7F2] sticky top-0 border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Staff & Branch</th>
                  <th className="p-2.5 text-center">Issues</th>
                  <th className="p-2.5 text-right">Exposure</th>
                  <th className="p-2.5 text-center">Repeats</th>
                  <th className="p-2.5 text-center">Risk Score</th>
                  <th className="p-2.5 text-center">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF7F2]">
                {displayedStaffMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 italic bg-[#FAF7F2]/40 font-mono text-xs">
                      No personnel incidents recorded for this filter in this period.
                    </td>
                  </tr>
                ) : (
                  displayedStaffMetrics.map(st => {
                    const thresholdRepeat = riskSettings.repeatIncidentThreshold || 2;
                    const tierClass =
                      st.riskLevel === 'Critical'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : st.riskLevel === 'High'
                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                        : st.riskLevel === 'Moderate'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200';

                    return (
                      <tr key={st.staffId} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            {staffDeptFilter === 'FG' && (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                FG
                              </span>
                            )}
                            {staffDeptFilter === 'RM' && (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold font-mono uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                RM
                              </span>
                            )}
                            <div className="font-bold text-gray-900">{st.staffName}</div>
                          </div>
                          <div className="text-[10px] text-[#6C655B] mt-0.5">
                            {st.branch} • {st.primaryIssueType}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-gray-800">
                          {st.issueCount || st.totalIssues || 0}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-red-600">
                          {formatPHP(st.financialExposure || st.totalLoss || 0)}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.repeatIncidentCount >= thresholdRepeat
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'text-gray-600'
                            }`}
                          >
                            {st.repeatIncidentCount}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-gray-900">
                          {st.riskScore}/100
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${tierClass}`}>
                            {st.riskLevel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Branch Drilldown Modal */}
      {drilldownBranch && (
        <BranchDrilldownModal
          branchMetric={drilldownBranch}
          records={filteredRecords}
          onClose={() => setDrilldownBranch(null)}
          onJumpToMatrix={(br, dt) => {
            setDrilldownBranch(null);
            onNavigateToMatrix(br, dt);
          }}
          onJumpToTracker={(br, st, rid) => {
            setDrilldownBranch(null);
            onNavigateToTracker(br, st, rid);
          }}
        />
      )}
    </div>
  );
};
