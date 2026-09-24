import React, { useState, useMemo } from 'react';
import {
  Download,
  Building2,
  CalendarRange,
  Users,
  AlertOctagon,
  TriangleAlert,
  ShieldAlert,
  TrendingUp,
  Flame,
  Search,
  Award,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  EODRecord,
  Branch,
  Staff,
  IssueTypeConfig,
} from '../types';
import { formatPHP, formatDate, formatMonthYear } from '../utils/formatters';
import { normalizeIssueType } from '../utils/analytics';

const MONTH_NAMES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const AVAILABLE_YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

interface MonthlyBreakdownProps {
  records: EODRecord[];
  branches: Branch[];
  staffList: Staff[];
  issueTypes: IssueTypeConfig[];
}

export const MonthlyBreakdown: React.FC<MonthlyBreakdownProps> = ({
  records,
  branches,
  staffList,
  issueTypes = [],
}) => {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonthPart, setSelectedMonthPart] = useState(() => {
    if (records.length > 0 && records[0].date && records[0].date.length >= 7) {
      return records[0].date.substring(5, 7);
    }
    return '08';
  });

  const selectedMonth = `${selectedYear}-${selectedMonthPart}`;
  const [branchFilter, setBranchFilter] = useState('All');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Month-filtered records
  const monthRecords = useMemo(() => {
    return records.filter(r => {
      if (!r.date.startsWith(selectedMonth)) return false;
      if (branchFilter !== 'All' && r.branch !== branchFilter) return false;
      return true;
    });
  }, [records, selectedMonth, branchFilter]);

  const monthTotalExposure = useMemo(
    () => monthRecords.reduce((sum, r) => sum + (Number(r.totalFinancialImpact) || 0), 0),
    [monthRecords]
  );

  const monthTotalIssues = monthRecords.length;

  // Issue types summary for this month
  const issueTypesSummary = useMemo(() => {
    const summary: Record<string, { count: number; exposure: number }> = {};
    issueTypes.forEach(it => {
      if (it.active !== false && it.name) {
        summary[it.name] = { count: 0, exposure: 0 };
      }
    });

    monthRecords.forEach(r => {
      const type = r.issueType || 'Others';
      if (!summary[type]) {
        summary[type] = { count: 0, exposure: 0 };
      }
      summary[type].count++;
      summary[type].exposure += Number(r.totalFinancialImpact || 0);
    });

    return Object.entries(summary).sort((a, b) => {
      if (a[1].count === 0 && b[1].count === 0) return a[0].localeCompare(b[0]);
      if (a[1].count === 0) return 1;
      if (b[1].count === 0) return -1;
      return b[1].exposure - a[1].exposure;
    });
  }, [monthRecords, issueTypes]);

  // Branch summaries
  const branchSummaries = useMemo(() => {
    const summary: Record<string, { issues: number; exposure: number; critical: number }> = {};
    monthRecords.forEach(r => {
      if (!summary[r.branch]) {
        summary[r.branch] = { issues: 0, exposure: 0, critical: 0 };
      }
      summary[r.branch].issues++;
      summary[r.branch].exposure += Number(r.totalFinancialImpact || 0);
      if (r.varianceStatus === 'R' || (r.totalFinancialImpact || 0) >= 3000) {
        summary[r.branch].critical++;
      }
    });

    return Object.entries(summary).sort((a, b) => b[1].exposure - a[1].exposure);
  }, [monthRecords]);

  // Staff summaries
  const staffSummaries = useMemo(() => {
    const summary: Record<string, { branch: string; issues: number; exposure: number }> = {};
    monthRecords.forEach(r => {
      const name = r.staffName || 'Unassigned';
      if (!summary[name]) {
        summary[name] = { branch: r.branch, issues: 0, exposure: 0 };
      }
      summary[name].issues++;
      summary[name].exposure += Number(r.totalFinancialImpact || 0);
    });

    return Object.entries(summary).sort((a, b) => b[1].exposure - a[1].exposure);
  }, [monthRecords]);

  // Daily issue breakdown
  const [selectedIssueType, setSelectedIssueType] = useState('All Issues');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [drilldownDay, setDrilldownDay] = useState<string | null>(null);

  const dailyIssueData = useMemo(() => {
    const parts = selectedMonth.split('-');
    const yy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const daysInMonth = new Date(yy, mm, 0).getDate();

    const filteredRecs =
      selectedIssueType === 'All Issues'
        ? monthRecords
        : monthRecords.filter(r => r.issueType === selectedIssueType);

    const byDate: Record<string, { amount: number; count: number }> = {};
    filteredRecs.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { amount: 0, count: 0 };
      byDate[r.date].amount += Number(r.totalFinancialImpact || 0);
      byDate[r.date].count += 1;
    });

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const entry = byDate[dateStr];
      days.push({
        date: dateStr,
        day: d,
        amount: entry ? entry.amount : 0,
        count: entry ? entry.count : 0,
      });
    }
    return days;
  }, [monthRecords, selectedMonth, selectedIssueType]);

  const dailySummary = useMemo(() => {
    const totalImpact = dailyIssueData.reduce((s, d) => s + d.amount, 0);
    const totalOcc = dailyIssueData.reduce((s, d) => s + d.count, 0);
    const highest = dailyIssueData.reduce(
      (max, d) => (d.amount > max.amount ? d : max),
      { amount: -1, day: 0, date: '' }
    );
    return { totalImpact, totalOcc, highest };
  }, [dailyIssueData]);

  const drilldownRecords = useMemo(() => {
    if (!drilldownDay) return [];
    return monthRecords.filter(
      r => r.date === drilldownDay && (selectedIssueType === 'All Issues' || r.issueType === selectedIssueType)
    );
  }, [monthRecords, drilldownDay, selectedIssueType]);

  // Export Monthly Audit PDF Report
  const handleExportPDF = () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        unit: 'pt',
        format: 'letter',
        orientation: 'portrait',
      });

      // Header Banner
      doc.setFillColor(18, 17, 16);
      doc.rect(0, 0, 612, 60, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(197, 160, 89);
      doc.setFontSize(16);
      doc.text('EOD MONITORING MATRIX — MONTHLY AUDIT REPORT', 40, 36);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`Month Period: ${selectedMonth} | Exported: ${new Date().toLocaleDateString()}`, 40, 50);

      // Section 1: Executive Summary
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text('1. Executive Month Summary', 40, 90);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Monthly Variance Exposure: ${formatPHP(monthTotalExposure)}`, 50, 110);
      doc.text(`Total Logged Issue Records: ${monthTotalIssues}`, 50, 125);
      doc.text(`Active Branches Reviewed: ${branchSummaries.length}`, 50, 140);
      doc.text(`Staff Personnel Involved: ${staffSummaries.length}`, 50, 155);

      // Section 2: Branch Performance Breakdown
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. Branch Performance & Exposure Breakdown', 40, 185);

      let yPos = 205;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Branch Name', 50, yPos);
      doc.text('Issues Logged', 220, yPos);
      doc.text('Financial Impact', 320, yPos);
      doc.text('Critical Incidents', 460, yPos);

      yPos += 15;
      doc.setFont('helvetica', 'normal');
      branchSummaries.slice(0, 12).forEach(([bName, bData]) => {
        doc.text(bName, 50, yPos);
        doc.text(String(bData.issues), 220, yPos);
        doc.text(formatPHP(bData.exposure), 320, yPos);
        doc.text(String(bData.critical), 460, yPos);
        yPos += 15;
      });

      // Section 3: Monthly Issue Frequency & Loss
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('3. Monthly Issue Type Frequency & Loss', 40, yPos);

      yPos += 18;
      doc.setFontSize(9);
      doc.text('Issue Category', 50, yPos);
      doc.text('Incident Count', 240, yPos);
      doc.text('Monetary Impact', 380, yPos);

      yPos += 14;
      doc.setFont('helvetica', 'normal');
      issueTypesSummary.forEach(([itName, itData]) => {
        doc.text(itName, 50, yPos);
        doc.text(String(itData.count), 240, yPos);
        doc.text(formatPHP(itData.exposure), 380, yPos);
        yPos += 14;
      });

      // Page 2: Error Pattern Rankings
      doc.addPage();
      doc.setFillColor(18, 17, 16);
      doc.rect(0, 0, 612, 50, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(197, 160, 89);
      doc.setFontSize(14);
      doc.text('4. ERROR PATTERN RANKINGS (BRANCHES & STAFF)', 40, 32);

      let p2Y = 75;
      const categories = [
        { key: 'WRONG_EOD', label: 'Wrong EOD Discrepancies' },
        { key: 'WRONG_ENTRY', label: 'Wrong Entry / Typo Discrepancies' },
        { key: 'UNPUNCH', label: 'Unpunch Item Discrepancies' },
        { key: 'OVERPUNCH', label: 'Overpunch Discrepancies' },
      ];

      categories.forEach(cat => {
        const matching = monthRecords.filter(r => normalizeIssueType(r.issueType) === cat.key);
        const branchMap: Record<string, { count: number; exposure: number }> = {};
        const staffMap: Record<string, { branch: string; count: number; exposure: number }> = {};

        matching.forEach(r => {
          const br = r.branch || 'Unknown';
          const st = r.staffName || 'Unassigned';
          const amt = Number(r.totalFinancialImpact || 0);

          branchMap[br] = branchMap[br] || { count: 0, exposure: 0 };
          branchMap[br].count++;
          branchMap[br].exposure += amt;

          staffMap[st] = staffMap[st] || { branch: br, count: 0, exposure: 0 };
          staffMap[st].count++;
          staffMap[st].exposure += amt;
        });

        const topBranches = Object.entries(branchMap)
          .sort((a, b) => b[1].count - a[1].count || b[1].exposure - a[1].exposure)
          .slice(0, 3);
        const topStaff = Object.entries(staffMap)
          .sort((a, b) => b[1].count - a[1].count || b[1].exposure - a[1].exposure)
          .slice(0, 3);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(180, 50, 50);
        doc.text(`▶ ${cat.label} (Total: ${matching.length} incidents)`, 40, p2Y);

        p2Y += 15;
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Branches with this error:', 50, p2Y);
        doc.text('Top Staff with this error:', 320, p2Y);

        p2Y += 14;
        doc.setFont('helvetica', 'normal');
        const maxRows = Math.max(topBranches.length, topStaff.length, 1);
        for (let idx = 0; idx < maxRows; idx++) {
          const bEntry = topBranches[idx];
          const sEntry = topStaff[idx];
          const bTxt = bEntry
            ? `#${idx + 1} ${bEntry[0]} (${bEntry[1].count}x - ${formatPHP(bEntry[1].exposure)})`
            : idx === 0
            ? 'No incidents recorded'
            : '';
          const sTxt = sEntry
            ? `#${idx + 1} ${sEntry[0]} [${sEntry[1].branch}] (${sEntry[1].count}x - ${formatPHP(sEntry[1].exposure)})`
            : idx === 0
            ? 'No incidents recorded'
            : '';
          doc.text(bTxt, 55, p2Y);
          doc.text(sTxt, 325, p2Y);
          p2Y += 13;
        }
        p2Y += 14;
      });

      doc.save(`EOD-Monthly-Audit-Report-${selectedMonth}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF report.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div id="monthly-breakdown-container" className="space-y-6 animate-fade-in text-[#2C2A29]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE3D5] pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 tracking-tight italic">
            Monthly Historical Breakdown
          </h1>
          <p className="text-sm text-[#6C655B] mt-1">
            Month-over-month audit logs, branch financial rankings, staff incident tallies, error category rankings, and official PDF audit exports.
          </p>
        </div>
        <button
          id="btn-export-monthly-pdf"
          onClick={handleExportPDF}
          disabled={isExportingPdf}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C5A059] hover:bg-[#d4b068] text-black font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExportingPdf ? 'Generating PDF...' : 'Export Monthly PDF'}</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-[#EAE3D5] p-5 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1.5">
          <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
            Select Year
          </label>
          <select
            id="select-year-dropdown"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
          >
            {AVAILABLE_YEARS.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
            Select Month
          </label>
          <select
            id="select-month-dropdown"
            value={selectedMonthPart}
            onChange={e => setSelectedMonthPart(e.target.value)}
            className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
          >
            {MONTH_NAMES.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10.5px] font-bold text-[#6C655B] uppercase tracking-wider block">
            Filter Branch Location
          </label>
          <select
            id="select-branch-filter-dropdown"
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="w-full px-3 py-2 border border-[#EAE3D5] rounded-xl bg-white text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
          >
            <option value="All">All Branches ({branches.length})</option>
            {branches.map(b => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#FAF7F2] border border-[#EAE3D5] p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#6C655B] uppercase block">Month Total Records</span>
            <span className="font-serif text-xl font-extrabold text-gray-900">
              {monthRecords.length} records
            </span>
          </div>
          <CalendarRange className="w-5 h-5 text-[#C5A059]" />
        </div>
      </div>

      {/* KPI Cards for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-t-4 border-t-red-600 border-x border-b border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-[#6C655B] uppercase block">Monthly Financial Impact</span>
          <span className="font-serif text-2xl font-extrabold text-red-600 mt-1 block">
            {formatPHP(monthTotalExposure)}
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-2 block">
            Across {monthRecords.length} transaction entries
          </span>
        </div>

        <div className="bg-white border-t-4 border-t-[#C5A059] border-x border-b border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-[#6C655B] uppercase block">Total Issue Count</span>
          <span className="font-serif text-2xl font-extrabold text-gray-900 mt-1 block">
            {monthTotalIssues} incidents
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-2 block">
            {branchSummaries.length} branches affected
          </span>
        </div>

        <div className="bg-white border-t-4 border-t-[#121110] border-x border-b border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-[#6C655B] uppercase block">Top Problematic Branch</span>
          <span className="font-serif text-xl font-bold text-gray-900 mt-1 block truncate">
            {branchSummaries[0] ? branchSummaries[0][0] : 'None'}
          </span>
          <span className="text-[10px] text-red-600 font-mono font-bold mt-2 block">
            {branchSummaries[0] ? formatPHP(branchSummaries[0][1].exposure) : '₱0.00'}
          </span>
        </div>

        <div className="bg-white border-t-4 border-t-[#4F8130] border-x border-b border-[#EAE3D5] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-[#6C655B] uppercase block">Staff Involved</span>
          <span className="font-serif text-2xl font-extrabold text-gray-900 mt-1 block">
            {staffSummaries.length} personnel
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-2 block">
            Audited in {formatMonthYear(selectedMonth)}
          </span>
        </div>
      </div>

      {/* Error Pattern & Personnel / Branch Ranking Hub */}
      <MonthlyErrorRankingHub
        records={monthRecords}
        issueTypes={issueTypes}
      />

      {/* Charts & Summaries Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Impact Interactive Chart */}
        <section className="lg:col-span-7 bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 border-b border-[#FAF7F2] pb-3">
            <h3 className="font-serif font-bold text-base text-gray-900 italic flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C5A059]" />
              Daily Issue Financial Impact ({formatMonthYear(selectedMonth)})
            </h3>

            <select
              value={selectedIssueType}
              onChange={e => setSelectedIssueType(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border-2 border-[#EAE3D5] rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#C5A059] cursor-pointer"
            >
              <option value="All Issues">All Issues</option>
              {issueTypes.filter(it => it && it.name).map(it => (
                <option key={it.id} value={it.name}>
                  {it.name}
                </option>
              ))}
            </select>

            <div className="text-[11px] font-mono text-[#6C655B] flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <span className="font-bold text-gray-700">Highest Impact Day: </span>
                {dailySummary.highest.amount > 0 ? `Day ${dailySummary.highest.day} • ${formatPHP(dailySummary.highest.amount)}` : '—'}
              </span>
              <span>
                <span className="font-bold text-gray-700">Total Impact: </span>
                {formatPHP(dailySummary.totalImpact)}
              </span>
              <span>
                <span className="font-bold text-gray-700">Occurrences: </span>
                {dailySummary.totalOcc}
              </span>
            </div>
          </div>

          {/* Bar Chart Canvas */}
          {(() => {
            const rawMax = Math.max(...dailyIssueData.map(x => x.amount), 0);
            const niceMax = (() => {
              if (rawMax <= 0) return 100;
              const exp = Math.floor(Math.log10(rawMax));
              const base = Math.pow(10, exp);
              const frac = rawMax / base;
              const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
              return niceFrac * base;
            })();
            const CHART_H = 140;
            const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

            return (
              <div className="flex gap-2">
                <div className="flex flex-col justify-between text-right shrink-0" style={{ height: `${CHART_H}px`, width: '52px' }}>
                  {[...ticks].reverse().map(t => (
                    <span key={t} className="text-[9px] font-mono text-[#6C655B] leading-none">
                      ₱{Math.round(t).toLocaleString()}
                    </span>
                  ))}
                </div>

                <div className="relative flex-1 overflow-x-auto pb-2">
                  <div className="absolute left-0 right-0 top-0 pointer-events-none" style={{ height: `${CHART_H}px` }}>
                    {ticks.map(t => (
                      <div
                        key={t}
                        className="absolute left-0 right-0 border-t border-[#EAE3D5]"
                        style={{ bottom: `${(t / niceMax) * CHART_H}px` }}
                      />
                    ))}
                  </div>

                  <div className="flex items-end gap-1.5 relative" style={{ height: `${CHART_H}px` }}>
                    {dailyIssueData.map(dd => {
                      const barHeightPx = dd.amount <= 0 ? 0 : Math.max(1, Math.round((dd.amount / niceMax) * CHART_H));
                      return (
                        <div
                          key={dd.date}
                          className="relative flex flex-col items-center shrink-0 cursor-pointer group"
                          style={{ width: '24px' }}
                          onMouseEnter={() => setHoveredDay(dd.date)}
                          onMouseLeave={() => setHoveredDay(null)}
                          onClick={() => dd.count > 0 && setDrilldownDay(dd.date)}
                        >
                          {hoveredDay === dd.date && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1B1918] text-white rounded-lg shadow-lg p-3 z-50 whitespace-nowrap text-left">
                              <div className="text-[10px] font-bold text-gray-300 border-b border-gray-700 pb-1 mb-1.5">
                                {formatDate(dd.date)}
                              </div>
                              <div className="text-[9.5px] text-gray-400 uppercase tracking-wide">Financial Impact</div>
                              <div className="text-base font-mono font-extrabold text-blue-400 mb-1">
                                {formatPHP(dd.amount)}
                              </div>
                              <div className="text-[10.5px] text-gray-300">
                                Occurrences: <span className="font-bold text-white">{dd.count}</span>
                              </div>
                              <div className="text-[10.5px] text-gray-300">
                                Issue Type: <span className="font-bold text-white">{selectedIssueType}</span>
                              </div>
                            </div>
                          )}

                          <div className="w-full flex items-end justify-center" style={{ height: `${CHART_H}px` }}>
                            <div
                              className="w-full max-w-[16px] rounded-t transition-all duration-200"
                              style={{
                                height: `${barHeightPx}px`,
                                background: dd.count > 0 ? 'linear-gradient(180deg, #60A5FA 0%, #1D4ED8 100%)' : 'transparent',
                              }}
                            />
                          </div>
                          <span className="text-[8px] font-bold text-[#6C655B] mt-1">{dd.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
          <p className="text-[10px] text-[#6C655B] text-center italic">
            Hover a bar for details • Click a bar to view that day's records
          </p>

          {/* Drilldown Day Modal */}
          {drilldownDay && (
            <div
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setDrilldownDay(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-[#EAE3D5] sticky top-0 bg-white">
                  <h4 className="font-serif font-bold text-base text-gray-900">
                    Records — {formatDate(drilldownDay)}
                  </h4>
                  <button
                    onClick={() => setDrilldownDay(null)}
                    className="text-gray-400 hover:text-gray-900 text-xl font-bold cursor-pointer leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {drilldownRecords.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-6">
                      No records found for this day.
                    </p>
                  ) : (
                    drilldownRecords.map(rec => (
                      <div key={rec.id} className="border border-[#EAE3D5] rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{rec.branch} • {rec.staffName}</span>
                          <span className="font-mono font-extrabold text-red-600">{formatPHP(rec.totalFinancialImpact)}</span>
                        </div>
                        <div className="text-[#6C655B]">
                          <span className="font-semibold">Issue: </span>{rec.issueType}
                        </div>
                        {rec.items && rec.items.length > 0 && (
                          <div className="text-[#6C655B]">
                            <span className="font-semibold">Items: </span>
                            {rec.items.map(it => `${it.quantity}x ${it.itemName}`).join(', ')}
                          </div>
                        )}
                        {rec.rootCause && (
                          <div className="text-[#6C655B]">
                            <span className="font-semibold">Reason: </span>{rec.rootCause}
                          </div>
                        )}
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.varianceStatus === 'G'
                                ? 'bg-green-100 text-green-800'
                                : rec.varianceStatus === 'R'
                                ? 'bg-red-100 text-red-800'
                                : rec.varianceStatus === 'C'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {rec.varianceStatus === 'G' ? 'Green' : rec.varianceStatus === 'R' ? 'Red' : rec.varianceStatus === 'C' ? 'Closed' : 'Yellow'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Issue Types & Top Staff Summaries */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-sm text-gray-900 italic border-b border-[#FAF7F2] pb-2">
              Monthly Issue Types Breakdown
            </h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {issueTypesSummary.length === 0 ? (
                <p className="p-3 text-center text-gray-400 italic text-[11px]">
                  No issue types configured yet.
                </p>
              ) : (
                issueTypesSummary.map(([typeName, data]) => (
                  <div
                    key={typeName}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                      data.count === 0
                        ? 'bg-white border-dashed border-[#EAE3D5] opacity-70'
                        : 'bg-[#FAF7F2] border-[#EAE3D5]'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-gray-900 block">{typeName}</span>
                      <span className="text-[10px] text-[#6C655B]">
                        {data.count === 0 ? 'No incidents this month' : `${data.count} incident(s)`}
                      </span>
                    </div>
                    <span className={`font-mono font-extrabold ${data.count === 0 ? 'text-gray-300' : 'text-red-600'}`}>
                      {formatPHP(data.exposure)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-sm text-gray-900 italic border-b border-[#FAF7F2] pb-2">
              Top Staff Personnel Involved
            </h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {staffSummaries.slice(0, 5).map(([staffName, data]) => (
                <div
                  key={staffName}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#FAF7F2] border border-[#EAE3D5] text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-900 block">{staffName}</span>
                    <span className="text-[10px] text-[#6C655B]">
                      {data.branch} • {data.issues} issue(s)
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-red-600">{formatPHP(data.exposure)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

interface MonthlyErrorRankingHubProps {
  records: EODRecord[];
  issueTypes: IssueTypeConfig[];
}

const MonthlyErrorRankingHub: React.FC<MonthlyErrorRankingHubProps> = ({ records, issueTypes }) => {
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'both' | 'branches' | 'staff'>('both');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'frequency' | 'exposure'>('frequency');
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'FG' | 'RM'>('ALL');

  const filteredRecords = useMemo(
    () => (deptFilter === 'ALL' ? records : records.filter(r => r.department === deptFilter)),
    [records, deptFilter]
  );

  const categoryThemes = [
    {
      selCard: 'border-red-600 bg-red-50/40 shadow-sm',
      unselCard: 'border-[#EAE3D5] bg-white hover:border-red-300',
      label: 'text-red-700',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
      bigNum: 'text-red-600',
      borderT: 'border-red-100/80',
      icon: AlertOctagon,
      selBtn: 'bg-red-600 text-white shadow-xs',
      unselBtn: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
      btnBadgeBg: 'bg-red-100',
      btnBadgeText: 'text-red-900',
    },
    {
      selCard: 'border-amber-600 bg-amber-50/40 shadow-sm',
      unselCard: 'border-[#EAE3D5] bg-white hover:border-amber-300',
      label: 'text-amber-800',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-900',
      bigNum: 'text-amber-700',
      borderT: 'border-amber-100/80',
      icon: TriangleAlert,
      selBtn: 'bg-amber-600 text-white shadow-xs',
      unselBtn: 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50',
      btnBadgeBg: 'bg-amber-100',
      btnBadgeText: 'text-amber-900',
    },
    {
      selCard: 'border-purple-600 bg-purple-50/40 shadow-sm',
      unselCard: 'border-[#EAE3D5] bg-white hover:border-purple-300',
      label: 'text-purple-700',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      bigNum: 'text-purple-700',
      borderT: 'border-purple-100/80',
      icon: ShieldAlert,
      selBtn: 'bg-purple-600 text-white shadow-xs',
      unselBtn: 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50',
      btnBadgeBg: 'bg-purple-100',
      btnBadgeText: 'text-purple-900',
    },
    {
      selCard: 'border-blue-600 bg-blue-50/40 shadow-sm',
      unselCard: 'border-[#EAE3D5] bg-white hover:border-blue-300',
      label: 'text-blue-700',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      bigNum: 'text-blue-600',
      borderT: 'border-blue-100/80',
      icon: TrendingUp,
      selBtn: 'bg-blue-600 text-white shadow-xs',
      unselBtn: 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50',
      btnBadgeBg: 'bg-blue-100',
      btnBadgeText: 'text-blue-900',
    },
  ];

  const categoryNameOf = (type: string) => {
    if (!type) return 'OTHER';
    const norm = type.trim().toLowerCase();
    const match = issueTypes.find(it => it && (it.name || '').trim().toLowerCase() === norm);
    return match ? match.name : 'OTHER';
  };

  const categoryStats = useMemo(() => {
    const cats = issueTypes.filter(it => it && it.name);
    const tallies: Record<
      string,
      { count: number; exposure: number; branchMap: Record<string, { count: number; exposure: number }>; staffMap: Record<string, { branch: string; count: number; exposure: number }> }
    > = {
      ALL: { count: 0, exposure: 0, branchMap: {}, staffMap: {} },
      OTHER: { count: 0, exposure: 0, branchMap: {}, staffMap: {} },
    };

    cats.forEach(c => {
      tallies[c.name] = { count: 0, exposure: 0, branchMap: {}, staffMap: {} };
    });

    filteredRecords.forEach(r => {
      const cat = categoryNameOf(r.issueType);
      const impact = Number(r.totalFinancialImpact || 0);
      const br = r.branch || 'Unknown Branch';
      const st = r.staffName || 'Unassigned';

      tallies.ALL.count++;
      tallies.ALL.exposure += impact;
      tallies.ALL.branchMap[br] = tallies.ALL.branchMap[br] || { count: 0, exposure: 0 };
      tallies.ALL.branchMap[br].count++;
      tallies.ALL.branchMap[br].exposure += impact;

      tallies.ALL.staffMap[st] = tallies.ALL.staffMap[st] || { branch: br, count: 0, exposure: 0 };
      tallies.ALL.staffMap[st].count++;
      tallies.ALL.staffMap[st].exposure += impact;

      if (tallies[cat]) {
        tallies[cat].count++;
        tallies[cat].exposure += impact;
        tallies[cat].branchMap[br] = tallies[cat].branchMap[br] || { count: 0, exposure: 0 };
        tallies[cat].branchMap[br].count++;
        tallies[cat].branchMap[br].exposure += impact;

        tallies[cat].staffMap[st] = tallies[cat].staffMap[st] || { branch: br, count: 0, exposure: 0 };
        tallies[cat].staffMap[st].count++;
        tallies[cat].staffMap[st].exposure += impact;
      }
    });

    const getTopBranch = (map: Record<string, { count: number; exposure: number }>) => {
      const entries = Object.entries(map).sort((a, b) => b[1].count - a[1].count || b[1].exposure - a[1].exposure);
      return entries[0] ? { name: entries[0][0], count: entries[0][1].count, exposure: entries[0][1].exposure } : null;
    };

    const getTopStaff = (map: Record<string, { branch: string; count: number; exposure: number }>) => {
      const entries = Object.entries(map).sort((a, b) => b[1].count - a[1].count || b[1].exposure - a[1].exposure);
      return entries[0] ? { name: entries[0][0], branch: entries[0][1].branch, count: entries[0][1].count, exposure: entries[0][1].exposure } : null;
    };

    const output: Record<string, any> = {
      ALL: {
        key: 'ALL',
        label: 'All Error Categories',
        shortLabel: 'All Combined',
        description: 'Overall aggregate error occurrences across all branches and personnel',
        totalCount: tallies.ALL.count,
        totalExposure: tallies.ALL.exposure,
        topBranch: getTopBranch(tallies.ALL.branchMap),
        topStaff: getTopStaff(tallies.ALL.staffMap),
      },
    };

    cats.forEach((c, idx) => {
      const th = categoryThemes[idx % categoryThemes.length];
      output[c.name] = {
        key: c.name,
        label: c.name,
        shortLabel: c.name,
        description: c.description?.trim() || 'Standard operational error code',
        totalCount: tallies[c.name].count,
        totalExposure: tallies[c.name].exposure,
        topBranch: getTopBranch(tallies[c.name].branchMap),
        topStaff: getTopStaff(tallies[c.name].staffMap),
        theme: th,
      };
    });

    output.OTHER = {
      key: 'OTHER',
      label: 'Uncategorized / Other',
      shortLabel: 'Other',
      description: 'Records whose issue type is not listed under standard Master Classifications',
      totalCount: tallies.OTHER.count,
      totalExposure: tallies.OTHER.exposure,
      topBranch: getTopBranch(tallies.OTHER.branchMap),
      topStaff: getTopStaff(tallies.OTHER.staffMap),
      theme: {
        selCard: 'border-[#121110] bg-neutral-50 shadow-sm',
        unselCard: 'border-[#EAE3D5] bg-white hover:border-neutral-300',
        label: 'text-gray-700',
        badgeBg: 'bg-neutral-100',
        badgeText: 'text-gray-800',
        bigNum: 'text-gray-700',
        borderT: 'border-gray-200',
        icon: Search,
        selBtn: 'bg-[#121110] text-[#C5A059] shadow-xs',
        unselBtn: 'bg-white text-gray-700 border border-[#EAE3D5] hover:bg-neutral-50',
        btnBadgeBg: 'bg-neutral-100',
        btnBadgeText: 'text-gray-800',
      },
    };

    return output;
  }, [filteredRecords, issueTypes]);

  // Branch Rankings in Hub
  const branchHubRankings = useMemo(() => {
    const map = new Map<string, any>();
    filteredRecords.forEach(r => {
      const br = r.branch || 'Unknown Branch';
      if (!map.has(br)) {
        map.set(br, {
          branchName: br,
          categoryCounts: {},
          selectedCategoryCount: 0,
          totalCount: 0,
          totalExposure: 0,
          categoryExposure: 0,
          fgCount: 0,
          rmCount: 0,
        });
      }
      const item = map.get(br);
      const cat = categoryNameOf(r.issueType);
      const impact = Number(r.totalFinancialImpact || 0);

      item.totalCount++;
      item.totalExposure += impact;
      if (r.department === 'RM') item.rmCount++;
      else item.fgCount++;

      item.categoryCounts[cat] = (item.categoryCounts[cat] || 0) + 1;

      if (selectedCat === 'ALL' || cat === selectedCat) {
        item.selectedCategoryCount++;
        item.categoryExposure += impact;
      }
    });

    let list = Array.from(map.values()).filter(x => x.selectedCategoryCount > 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(x => x.branchName.toLowerCase().includes(q));
    }

    return sortField === 'frequency'
      ? list.sort((a, b) => b.selectedCategoryCount - a.selectedCategoryCount || b.categoryExposure - a.categoryExposure)
      : list.sort((a, b) => b.categoryExposure - a.categoryExposure || b.selectedCategoryCount - a.selectedCategoryCount);
  }, [filteredRecords, selectedCat, searchQuery, sortField, issueTypes]);

  // Staff Rankings in Hub
  const staffHubRankings = useMemo(() => {
    const map = new Map<string, any>();
    filteredRecords.forEach(r => {
      const st = r.staffName || 'Unassigned';
      if (!map.has(st)) {
        map.set(st, {
          staffName: st,
          branch: r.branch || 'Unknown',
          categoryCounts: {},
          selectedCategoryCount: 0,
          totalCount: 0,
          totalExposure: 0,
          categoryExposure: 0,
          fgCount: 0,
          rmCount: 0,
        });
      }
      const item = map.get(st);
      const cat = categoryNameOf(r.issueType);
      const impact = Number(r.totalFinancialImpact || 0);

      item.totalCount++;
      item.totalExposure += impact;
      if (r.department === 'RM') item.rmCount++;
      else item.fgCount++;

      item.categoryCounts[cat] = (item.categoryCounts[cat] || 0) + 1;

      if (selectedCat === 'ALL' || cat === selectedCat) {
        item.selectedCategoryCount++;
        item.categoryExposure += impact;
      }
    });

    let list = Array.from(map.values()).filter(x => x.selectedCategoryCount > 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(x => x.staffName.toLowerCase().includes(q) || x.branch.toLowerCase().includes(q));
    }

    return sortField === 'frequency'
      ? list.sort((a, b) => b.selectedCategoryCount - a.selectedCategoryCount || b.categoryExposure - a.categoryExposure)
      : list.sort((a, b) => b.categoryExposure - a.categoryExposure || b.selectedCategoryCount - a.selectedCategoryCount);
  }, [filteredRecords, selectedCat, searchQuery, sortField, issueTypes]);

  const renderRankBadge = (rankIdx: number) => {
    if (rankIdx === 0) {
      return (
        <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-[11px] shadow-xs ring-2 ring-amber-200">
          1
        </span>
      );
    }
    if (rankIdx === 1) {
      return (
        <span className="w-6 h-6 rounded-full bg-slate-300 text-gray-900 font-extrabold flex items-center justify-center text-[11px] shadow-xs ring-2 ring-slate-200">
          2
        </span>
      );
    }
    if (rankIdx === 2) {
      return (
        <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold flex items-center justify-center text-[11px] shadow-xs ring-2 ring-amber-600/30">
          3
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-full bg-neutral-100 text-gray-600 font-bold flex items-center justify-center text-[10.5px]">
        {rankIdx + 1}
      </span>
    );
  };

  const renderSeverityBadge = (count: number, exposure: number) => {
    if (count >= 4 || exposure >= 3000) {
      return (
        <span className="px-2 py-0.5 rounded-md font-mono text-[9.5px] font-extrabold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
          <Flame className="w-2.5 h-2.5 text-red-600" />
          Critical Repeat ({count}x)
        </span>
      );
    }
    if (count >= 2 || exposure >= 1000) {
      return (
        <span className="px-2 py-0.5 rounded-md font-mono text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
          <TriangleAlert className="w-2.5 h-2.5 text-amber-700" />
          Repeat ({count}x)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md font-mono text-[9.5px] font-semibold bg-neutral-100 text-gray-700 border border-neutral-200">
        Single ({count}x)
      </span>
    );
  };

  return (
    <section id="monthly-error-ranking-hub" className="bg-white border border-[#EAE3D5] rounded-2xl p-5 shadow-xs space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#FAF7F2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#121110] text-[#C5A059] rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg md:text-xl font-bold text-gray-900 tracking-tight italic">
                Error Pattern & Personnel / Branch Ranking Hub
              </h2>
              <p className="text-xs text-[#6C655B]">
                Identify and rank the branches and staff with the{' '}
                <strong className="text-gray-800">most frequent errors</strong>, based on all issue categories configured in Master Issue Classifications.
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#EAE3D5] self-start md:self-auto text-xs">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'both' ? 'bg-[#121110] text-[#C5A059] shadow-xs' : 'text-[#6C655B] hover:text-black'
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('branches')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'branches' ? 'bg-[#121110] text-[#C5A059] shadow-xs' : 'text-[#6C655B] hover:text-black'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Branches ({branchHubRankings.length})</span>
          </button>
          <button
            onClick={() => setViewMode('staff')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'staff' ? 'bg-[#121110] text-[#C5A059] shadow-xs' : 'text-[#6C655B] hover:text-black'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff ({staffHubRankings.length})</span>
          </button>
        </div>
      </div>

      {/* Production Category Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6C655B]">Category:</span>
        <button
          onClick={() => setDeptFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all cursor-pointer ${
            deptFilter === 'ALL'
              ? 'bg-[#121110] text-white border-[#121110] shadow-sm'
              : 'bg-white text-gray-800 border-[#EAE3D5] hover:border-gray-400'
          }`}
        >
          All (Raw Materials + Finished Goods)
        </button>
        <button
          onClick={() => setDeptFilter('FG')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all cursor-pointer ${
            deptFilter === 'FG'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-emerald-800 border-emerald-200 hover:border-emerald-400'
          }`}
        >
          Finished Goods
        </button>
        <button
          onClick={() => setDeptFilter('RM')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all cursor-pointer ${
            deptFilter === 'RM'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-amber-800 border-amber-200 hover:border-amber-400'
          }`}
        >
          Raw Materials
        </button>
      </div>

      {/* Category Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.keys(categoryStats)
          .filter(k => k !== 'ALL')
          .map(k => {
            const cat = categoryStats[k];
            const th = cat.theme;
            const IconComp = th?.icon || AlertOctagon;
            const isSelected = selectedCat === k;

            return (
              <div
                key={k}
                onClick={() => setSelectedCat(k)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                  isSelected ? th.selCard : th.unselCard
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10.5px] font-bold uppercase tracking-wider ${th.label} flex items-center gap-1`}>
                    <IconComp className="w-3.5 h-3.5" />
                    {cat.shortLabel}
                  </span>
                  <span className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full ${th.badgeBg} ${th.badgeText}`}>
                    {cat.totalCount}x
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`font-serif text-xl font-black ${th.bigNum} block`}>
                    {formatPHP(cat.totalExposure)}
                  </span>
                </div>
                <div className={`mt-3 pt-2.5 border-t ${th.borderT} text-[11px] space-y-1`}>
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="text-gray-500 font-medium">Top Branch:</span>
                    <span className="font-bold text-gray-900 truncate max-w-[120px]">
                      {cat.topBranch ? `${cat.topBranch.name} (${cat.topBranch.count}x)` : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="text-gray-500 font-medium">Top Staff:</span>
                    <span className="font-bold text-gray-900 truncate max-w-[120px]">
                      {cat.topStaff ? `${cat.topStaff.name} (${cat.topStaff.count}x)` : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Category Pills & Search & Sort */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE3D5]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs">
          <button
            onClick={() => setSelectedCat('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCat === 'ALL'
                ? 'bg-[#121110] text-[#C5A059] shadow-xs'
                : 'bg-white text-gray-700 border border-[#EAE3D5] hover:bg-neutral-50'
            }`}
          >
            All Errors ({categoryStats.ALL.totalCount})
          </button>
          {Object.keys(categoryStats)
            .filter(k => k !== 'ALL')
            .map(k => {
              const cat = categoryStats[k];
              const th = cat.theme;
              const isSelected = selectedCat === k;
              return (
                <button
                  key={k}
                  onClick={() => setSelectedCat(k)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected ? th.selBtn : th.unselBtn
                  }`}
                >
                  <span>{cat.shortLabel}</span>
                  <span className={`font-mono text-[10px] ${th.btnBadgeBg} ${th.btnBadgeText} px-1.5 py-0.2 rounded-full font-bold`}>
                    {cat.totalCount}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search branch/staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#EAE3D5] rounded-xl text-gray-900 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>

          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as any)}
            className="px-2.5 py-1.5 bg-white border border-[#EAE3D5] rounded-xl font-bold text-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059] cursor-pointer"
          >
            <option value="frequency">Sort: Frequency (Incident Count)</option>
            <option value="exposure">Sort: Financial Loss (₱)</option>
          </select>
        </div>
      </div>

      {/* Description of active error category */}
      {categoryStats[selectedCat] && (
        <div className="bg-[#FAF7F2] border border-[#EAE3D5] px-4 py-3 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-gray-900">{categoryStats[selectedCat].label}</span>
            <span className="font-mono font-bold text-gray-800 flex-shrink-0">
              {categoryStats[selectedCat].totalCount} logged incidents
            </span>
          </div>
          <p className="text-gray-600 italic leading-relaxed">
            <span className="font-bold not-italic text-gray-500">Description: </span>
            {categoryStats[selectedCat].description}
          </p>
        </div>
      )}

      {/* Rankings Grid (Branches and/or Staff) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {(viewMode === 'both' || viewMode === 'branches') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-6' : 'lg:col-span-12'} bg-white border border-[#EAE3D5] rounded-2xl p-4 shadow-xs space-y-3`}>
            <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-2.5">
              <h3 className="font-serif font-bold text-sm text-gray-900 italic flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#C5A059]" />
                Branch Rankings
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#FAF7F2] text-[#6C655B] px-2 py-0.5 rounded-full border border-[#EAE3D5]">
                {branchHubRankings.length} branches
              </span>
            </div>

            <div className="overflow-x-auto border border-[#EAE3D5] rounded-xl max-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF7F2] sticky top-0 border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5 text-center w-10">Rank</th>
                    <th className="p-2.5">Branch Location</th>
                    <th className="p-2.5 text-center">
                      {selectedCat === 'ALL' ? 'Total Errors' : categoryStats[selectedCat]?.shortLabel || 'Errors'}
                    </th>
                    <th className="p-2.5 text-right">Financial Exposure</th>
                    <th className="p-2.5 text-center">Specific Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {branchHubRankings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400 italic">
                        No branch records found for the selected error filter ({categoryStats[selectedCat]?.shortLabel || 'All'}).
                      </td>
                    </tr>
                  ) : (
                    branchHubRankings.map((b, idx) => (
                      <tr key={b.branchName} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center">{renderRankBadge(idx)}</div>
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-gray-900 block">{b.branchName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {b.fgCount} FG • {b.rmCount} RM
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="font-mono font-black text-sm px-2 py-0.5 rounded-lg bg-red-50 text-red-800 border border-red-200 inline-block">
                            {b.selectedCategoryCount}x
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-red-600">
                          {formatPHP(b.categoryExposure)}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap text-[9.5px] font-mono">
                            {Object.entries(b.categoryCounts)
                              .filter(([, v]) => (v as number) > 0)
                              .sort((x, y) => (y[1] as number) - (x[1] as number))
                              .slice(0, 6)
                              .map(([k, v]) => {
                                const th = categoryStats[k]?.theme;
                                const badgeBg = th ? th.badgeBg : 'bg-neutral-100';
                                const badgeText = th ? th.badgeText : 'text-gray-700';
                                const short = k === 'OTHER' ? 'OTH' : k.slice(0, 3).toUpperCase();
                                return (
                                  <span
                                    key={k}
                                    title={k}
                                    className={`px-1.5 py-0.5 rounded ${badgeBg} ${badgeText} font-bold`}
                                  >
                                    {short}:{(v as number)}
                                  </span>
                                );
                              })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(viewMode === 'both' || viewMode === 'staff') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-6' : 'lg:col-span-12'} bg-white border border-[#EAE3D5] rounded-2xl p-4 shadow-xs space-y-3`}>
            <div className="flex items-center justify-between border-b border-[#FAF7F2] pb-2.5">
              <h3 className="font-serif font-bold text-sm text-gray-900 italic flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C5A059]" />
                Staff Personnel Rankings
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#FAF7F2] text-[#6C655B] px-2 py-0.5 rounded-full border border-[#EAE3D5]">
                {staffHubRankings.length} personnel
              </span>
            </div>

            <div className="overflow-x-auto border border-[#EAE3D5] rounded-xl max-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF7F2] sticky top-0 border-b border-[#EAE3D5] font-bold text-[#6C655B] text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5 text-center w-10">Rank</th>
                    <th className="p-2.5">Staff & Branch</th>
                    <th className="p-2.5 text-center">
                      {selectedCat === 'ALL' ? 'Total Errors' : categoryStats[selectedCat]?.shortLabel || 'Errors'}
                    </th>
                    <th className="p-2.5 text-right">Financial Exposure</th>
                    <th className="p-2.5 text-center">Status / Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {staffHubRankings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400 italic">
                        No staff records found for the selected error filter ({categoryStats[selectedCat]?.shortLabel || 'All'}).
                      </td>
                    </tr>
                  ) : (
                    staffHubRankings.map((s, idx) => (
                      <tr key={s.staffName} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center">{renderRankBadge(idx)}</div>
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-gray-900 block">{s.staffName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {s.branch} • {s.fgCount} FG / {s.rmCount} RM
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="font-mono font-black text-sm px-2 py-0.5 rounded-lg bg-red-50 text-red-800 border border-red-200 inline-block">
                            {s.selectedCategoryCount}x
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-red-600">
                          {formatPHP(s.categoryExposure)}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center">
                            {renderSeverityBadge(s.selectedCategoryCount, s.categoryExposure)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
