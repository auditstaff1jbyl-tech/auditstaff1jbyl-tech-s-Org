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
  TrendResult,
  AlertItem,
  RecommendationItem,
  BranchMetric,
  StaffMetric,
  ItemMetric,
  IssueTypeMetric,
  Department,
  RiskTier,
  DisciplinaryAction,
  DisciplinaryCountdown,
} from '../types';
import { formatPHP } from './formatters';

/**
 * Filter records matching current global filter state.
 */
export function filterRecords(records: EODRecord[], filters: GlobalFilterState): EODRecord[] {
  if (!records || !Array.isArray(records)) return [];
  return records.filter(rec => {
    if (filters.dateFrom && rec.date < filters.dateFrom) return false;
    if (filters.dateTo && rec.date > filters.dateTo) return false;
    if (filters.branch && filters.branch !== 'All' && rec.branch.toLowerCase().trim() !== filters.branch.toLowerCase().trim()) return false;
    if (filters.staff && filters.staff !== 'All') {
      const matchName = rec.staffName.toLowerCase().trim() === filters.staff.toLowerCase().trim();
      const matchId = rec.staffId === filters.staff;
      if (!matchName && !matchId) return false;
    }
    if (filters.issueType && filters.issueType !== 'All' && rec.issueType.toLowerCase().trim() !== filters.issueType.toLowerCase().trim()) return false;
    if (filters.varianceStatus && filters.varianceStatus !== 'All' && rec.varianceStatus !== filters.varianceStatus) return false;
    if (filters.department && filters.department !== 'All' && rec.department !== filters.department) return false;
    return true;
  });
}

/**
 * FIX 1: Calculates percentage change and direction between two numbers.
 * Root cause of original bug: Copy-paste duplicate `i > 0 ? { percent: 0, direction: "Stable" } :`
 * prevented the increasing branch from ever being reached.
 */
export function calculatePercentageChange(current: number, previous: number): TrendResult {
  const curr = isNaN(current) ? 0 : current;
  const prev = isNaN(previous) ? 0 : previous;

  if (prev === 0) {
    return curr === 0
      ? { percent: 0, direction: 'Stable' }
      : { percent: 100, direction: 'New/No Previous Data' };
  }

  const change = ((curr - prev) / prev) * 100;
  if (Math.abs(change) < 0.1) {
    return { percent: 0, direction: 'Stable' };
  }
  if (change > 0) {
    return { percent: change, direction: 'Increasing' };
  }
  return { percent: Math.abs(change), direction: 'Decreasing' };
}

/**
 * FIX 5: Calculate immediate prior equivalent comparative date range.
 */
export function calculateComparisonDateRange(
  dateFrom: string,
  dateTo: string
): { prevFrom: string; prevTo: string; isComparable: boolean } {
  if (!dateFrom || !dateTo) {
    return { prevFrom: '', prevTo: '', isComparable: false };
  }
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return { prevFrom: '', prevTo: '', isComparable: false };
  }

  const diffMs = Math.abs(to.getTime() - from.getTime());
  const dayCount = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

  const prevToDate = new Date(from);
  prevToDate.setDate(from.getDate() - 1);

  const prevFromDate = new Date(prevToDate);
  prevFromDate.setDate(prevToDate.getDate() - (dayCount - 1));

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    prevFrom: toYMD(prevFromDate),
    prevTo: toYMD(prevToDate),
    isComparable: true,
  };
}

/**
 * Calculates number of repeat incidents within a rolling day window.
 */
export function calculateRepeatIncidents(records: EODRecord[], windowDays = 7): number {
  if (!records || records.length < 2) return 0;
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let count = 0;

  for (let i = 0; i < sorted.length; i++) {
    const tI = new Date(`${sorted[i].date}T00:00:00`).getTime();
    let clusterCount = 0;
    for (let j = 0; j < sorted.length; j++) {
      if (i === j) continue;
      const tJ = new Date(`${sorted[j].date}T00:00:00`).getTime();
      const diffDays = Math.abs((tI - tJ) / (1000 * 60 * 60 * 24));
      if (diffDays <= windowDays) {
        clusterCount++;
      }
    }
    if (clusterCount >= 2) {
      count++;
    }
  }
  return count;
}

/**
 * Determine risk tier according to score and thresholds.
 */
export function determineRiskTier(
  score: number,
  thresholds?: Partial<RiskThresholds> | Partial<RiskSettings>
): RiskTier {
  const val = isNaN(score) ? 0 : score;
  const t = thresholds as any;
  const criticalMin = t?.criticalStaffRiskScore ?? t?.riskScoreThresholds?.criticalMin ?? 80;
  const highMin = t?.highStaffRiskScore ?? t?.riskScoreThresholds?.mediumMax ?? 60;
  const modMin = t?.moderateStaffRiskScore ?? t?.riskScoreThresholds?.lowMax ?? 30;

  if (val >= criticalMin) return 'Critical';
  if (val >= highMin) return 'High';
  if (val >= modMin) return 'Moderate';
  return 'Low';
}

/**
 * FIX 7: Intelligent & Accurate Item Category Inference (Finished Goods vs Raw Materials).
 * Disallows false positive matches where finished bread like "Cheese Bread" matches "cheese" keyword.
 */
export function inferItemCategory(
  item: { id?: string; itemId?: string; name?: string; itemName?: string; code?: string; category?: string },
  catalogItems: ProductItem[] = []
): Department {
  const name = (item.itemName || item.name || '').toLowerCase().trim();
  const rawCat = (item.category || '').toLowerCase().trim();
  const code = (item.code || item.itemId || item.id || '').toLowerCase().trim();

  // 1. Direct explicit category
  if (rawCat === 'rm' || rawCat.includes('raw')) return 'RM';
  if (rawCat === 'fg' || rawCat.includes('finish')) return 'FG';

  // 2. Exact match in catalog
  if (catalogItems && catalogItems.length > 0) {
    const foundById = catalogItems.find(c => c.id.toLowerCase().trim() === code);
    if (foundById) return foundById.category;

    const foundByName = catalogItems.find(c => c.name.toLowerCase().trim() === name);
    if (foundByName) return foundByName.category;
  }

  // 3. Code prefix
  if (code.startsWith('rm') || code.startsWith('raw')) return 'RM';
  if (code.startsWith('fg') || code.startsWith('fin')) return 'FG';

  // 4. Finished Goods baked product keywords (evaluated first!)
  const fgKeywords = [
    'bread', 'pandesal', 'ensaymada', 'loaf', 'bun', 'roll', 'pastry', 'cake',
    'spanish', 'monay', 'croissant', 'pie', 'cookie', 'toast', 'pandecoco', 'muffin'
  ];
  if (fgKeywords.some(k => name.includes(k))) return 'FG';

  // 5. Raw Materials keywords
  const rmKeywords = [
    'flour', 'sugar', 'yeast', 'margarine', 'butter', 'egg', 'milk',
    'lard', 'oil', 'shortening', 'powder', 'flavor', 'filling', 'choco chip',
    'cocoa', 'salt', 'ingredient', 'raw', 'tub', 'bag', 'case', 'tray', 'kg'
  ];
  if (rmKeywords.some(k => name.includes(k))) return 'RM';

  return 'FG';
}

/**
 * Calculate multi-factor personnel risk metrics across staff directory.
 */
export function calculateStaffRiskMetrics(
  staffList: Staff[],
  records: EODRecord[],
  allRecords: EODRecord[],
  actionItems: ActionItem[],
  settings?: RiskSettings | RiskThresholds
): StaffMetric[] {
  const cfg = settings as any;
  const weightFin = (cfg?.staffWeightFinancialLoss ?? cfg?.weights?.financialExposure ?? 40) / 100;
  const weightFreq = (cfg?.staffWeightIncidentFrequency ?? cfg?.weights?.issueFrequency ?? 30) / 100;
  const weightRepeat = (cfg?.staffWeightRepeatBehavior ?? cfg?.weights?.repeatIncidents ?? 20) / 100;
  const weightUnres = (cfg?.staffWeightUnresolvedActions ?? cfg?.weights?.unresolvedIssues ?? 10) / 100;

  const staffMap = new Map<
    string,
    {
      staff: Staff;
      records: EODRecord[];
      exposure: number;
      issueTypeCounts: Record<string, number>;
      itemCounts: Record<string, number>;
    }
  >();

  staffList.forEach(st => {
    staffMap.set(st.name.toLowerCase().trim(), {
      staff: st,
      records: [],
      exposure: 0,
      issueTypeCounts: {},
      itemCounts: {},
    });
  });

  records.forEach(rec => {
    const key = (rec.staffName || '').toLowerCase().trim();
    if (!key) return;

    let entry = staffMap.get(key);
    if (!entry) {
      entry = {
        staff: {
          id: rec.staffId || `temp-${key}`,
          name: rec.staffName,
          branch: rec.branch,
          position: 'Cashier',
          status: 'Active',
        },
        records: [],
        exposure: 0,
        issueTypeCounts: {},
        itemCounts: {},
      };
      staffMap.set(key, entry);
    }

    entry.records.push(rec);
    entry.exposure += Number(rec.totalFinancialImpact || 0);

    if (rec.issueType) {
      entry.issueTypeCounts[rec.issueType] = (entry.issueTypeCounts[rec.issueType] || 0) + 1;
    }

    rec.items?.forEach(line => {
      if (line.itemName) {
        entry.itemCounts[line.itemName] = (entry.itemCounts[line.itemName] || 0) + (line.quantity || 0);
      }
    });
  });

  const staffData = Array.from(staffMap.values());
  let maxExp = 0;
  let maxCount = 0;
  let maxRepeat = 0;
  let maxUnresolved = 0;

  const preCalculated = staffData.map(d => {
    const issueCount = d.records.length;
    const exposure = d.exposure;
    const repeatCount = calculateRepeatIncidents(d.records, 7);
    const unresolvedCount = actionItems.filter(act => {
      const matchStaff = act.staffName?.toLowerCase().trim() === d.staff.name.toLowerCase().trim();
      const matchBranch = act.branch?.toLowerCase().trim() === d.staff.branch.toLowerCase().trim();
      return (matchStaff || matchBranch) && (act.status === 'Open' || act.status === 'In Progress');
    }).length;

    if (exposure > maxExp) maxExp = exposure;
    if (issueCount > maxCount) maxCount = issueCount;
    if (repeatCount > maxRepeat) maxRepeat = repeatCount;
    if (unresolvedCount > maxUnresolved) maxUnresolved = unresolvedCount;

    return {
      d,
      issueCount,
      exposure,
      repeatCount,
      unresolvedCount,
    };
  });

  const metrics: StaffMetric[] = preCalculated.map(item => {
    const normExp = maxExp > 0 ? (item.exposure / maxExp) * 100 : 0;
    const normCount = maxCount > 0 ? (item.issueCount / maxCount) * 100 : 0;
    const normRepeat = maxRepeat > 0 ? (item.repeatCount / maxRepeat) * 100 : 0;
    const normUnres = maxUnresolved > 0 ? (item.unresolvedCount / maxUnresolved) * 100 : 0;

    const rawScore = normExp * weightFin + normCount * weightFreq + normRepeat * weightRepeat + normUnres * weightUnres;
    const riskScore = Number(rawScore.toFixed(1));
    const riskLevel = determineRiskTier(riskScore, settings);

    const sortedIssues = Object.entries(item.d.issueTypeCounts).sort((a, b) => b[1] - a[1]);
    const primaryIssueType = sortedIssues.length > 0 ? sortedIssues[0][0] : 'None';

    const sortedItems = Object.entries(item.d.itemCounts).sort((a, b) => b[1] - a[1]);
    const topItemInvolved = sortedItems.length > 0 ? sortedItems[0][0] : undefined;

    let recommendationReason = 'Standard operational monitoring.';
    if (item.exposure > 0 && item.repeatCount > 0) {
      recommendationReason = `High financial exposure (${formatPHP(item.exposure)}) and ${item.repeatCount} repeated ${primaryIssueType} incidents.`;
    } else if (item.exposure > 0) {
      recommendationReason = `Elevated monetary impact of ${formatPHP(item.exposure)} across ${item.issueCount} incident(s).`;
    } else if (item.repeatCount > 0) {
      recommendationReason = `${item.repeatCount} recurring incidents within active review window.`;
    } else if (item.issueCount > 0) {
      recommendationReason = `${item.issueCount} recorded ${primaryIssueType} transaction(s).`;
    }

    const repeatRate = item.issueCount > 0 ? Math.round((item.repeatCount / item.issueCount) * 100) : 0;

    return {
      staffId: item.d.staff.id,
      staffName: item.d.staff.name,
      branch: item.d.staff.branch,
      position: item.d.staff.position,
      status: item.d.staff.status,
      totalIssues: item.issueCount,
      totalLoss: item.exposure,
      repeatRate,
      repeatIncidentCount: item.repeatCount,
      unresolvedActions: item.unresolvedCount,
      riskScore,
      riskLevel,
      primaryIssueType,
      topItemInvolved,
      recommendationReason,
      staff: item.d.staff,
      issueCount: item.issueCount,
      financialExposure: item.exposure,
      unresolvedCount: item.unresolvedCount,
    };
  });

  return metrics.sort((a, b) => b.riskScore - a.riskScore || b.totalLoss - a.totalLoss);
}

/**
 * Calculate branch metrics with accurate trend calculation and high-risk identification.
 */
export function calculateBranchMetrics(
  branches: Branch[],
  records: EODRecord[],
  previousRecords: EODRecord[],
  staffMetrics: StaffMetric[],
  actionItems: ActionItem[],
  settings?: RiskSettings | RiskThresholds
): BranchMetric[] {
  const cfg = settings as any;
  const critLoss = cfg?.criticalLoss ?? cfg?.financialThresholds?.critical ?? 3000;

  return branches.map(br => {
    const currentRecs = records.filter(r => r.branch.toLowerCase().trim() === br.name.toLowerCase().trim());
    const prevRecs = previousRecords.filter(r => r.branch.toLowerCase().trim() === br.name.toLowerCase().trim());

    const issues = currentRecs.length;
    const financialExposure = currentRecs.reduce((acc, r) => acc + Number(r.totalFinancialImpact || 0), 0);
    const prevExposure = prevRecs.reduce((acc, r) => acc + Number(r.totalFinancialImpact || 0), 0);

    const trend = calculatePercentageChange(financialExposure, prevExposure);

    // Active staff in this branch
    const branchStaff = staffMetrics.filter(
      st => (st.branch || st.staff?.branch || '').toLowerCase().trim() === br.name.toLowerCase().trim()
    );

    const activeBranchStaffWithIssues = branchStaff.filter(s => s.issueCount > 0);
    const averageRiskScore =
      activeBranchStaffWithIssues.length > 0
        ? Number(
            (
              activeBranchStaffWithIssues.reduce((acc, s) => acc + s.riskScore, 0) /
              activeBranchStaffWithIssues.length
            ).toFixed(1)
          )
        : branchStaff.length > 0
        ? Number((branchStaff.reduce((acc, s) => acc + s.riskScore, 0) / branchStaff.length).toFixed(1))
        : 0;

    const highestRiskStaff =
      branchStaff.length > 0 && branchStaff[0].totalLoss > 0
        ? branchStaff[0].staffName
        : undefined;

    const issueCounts: Record<string, number> = {};
    currentRecs.forEach(r => {
      if (r.issueType) {
        issueCounts[r.issueType] = (issueCounts[r.issueType] || 0) + 1;
      }
    });
    const sortedIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
    const mostCommonIssueType = sortedIssues.length > 0 ? sortedIssues[0][0] : 'None';

    const criticalCases = currentRecs.filter(
      r => Number(r.totalFinancialImpact || 0) >= critLoss || r.varianceStatus === 'R'
    ).length;

    const unresolvedActions = actionItems.filter(
      a =>
        ((a.branch || a.targetBranch || '')).toLowerCase().trim() === br.name.toLowerCase().trim() &&
        (a.status === 'Open' || a.status === 'In Progress')
    ).length;

    const riskLevel = determineRiskTier(averageRiskScore, settings);

    return {
      branch: br,
      issues,
      financialExposure,
      averageRiskScore,
      highestRiskStaff,
      mostCommonIssueType,
      trendDirection: trend.direction,
      trendPercentage: trend.percent,
      riskLevel,
      criticalCases,
      unresolvedActions,
    };
  }).sort((a, b) => b.financialExposure - a.financialExposure || b.issues - a.issues);
}

/**
 * Calculate item metrics and categorizations.
 */
export function calculateItemMetrics(items: ProductItem[], records: EODRecord[]): ItemMetric[] {
  const map = new Map<
    string,
    {
      item: ProductItem;
      recordCount: number;
      totalQuantity: number;
      totalFinancialImpact: number;
      issueTypeCounts: Record<string, number>;
      branches: Set<string>;
      staff: Set<string>;
    }
  >();

  // Index catalog items
  items.forEach(itm => {
    map.set(itm.id, {
      item: itm,
      recordCount: 0,
      totalQuantity: 0,
      totalFinancialImpact: 0,
      issueTypeCounts: {},
      branches: new Set(),
      staff: new Set(),
    });
  });

  records.forEach(rec => {
    rec.items?.forEach(line => {
      const lineName = (line.itemName || '').trim();
      const lineId = (line.itemId || '').trim();
      if (!lineName && !lineId) return;

      // Match item
      let matchedItem: ProductItem | undefined;
      if (lineId && map.has(lineId)) {
        matchedItem = map.get(lineId)!.item;
      } else if (lineName) {
        matchedItem = items.find(
          c => c.name.toLowerCase().trim() === lineName.toLowerCase()
        );
      }

      const inferredCat = inferItemCategory(
        {
          id: matchedItem?.id || lineId,
          name: lineName,
          category: matchedItem?.category,
          code: matchedItem?.code,
        },
        items
      );

      const targetKey = matchedItem?.id || (lineId ? `item-${lineId}` : `custom-${lineName.toLowerCase()}`);
      let entry = map.get(targetKey);

      if (!entry) {
        entry = {
          item: matchedItem || {
            id: targetKey,
            name: lineName || 'General Item',
            code: lineId || '',
            category: inferredCat,
            defaultPrice: line.unitPrice || 0,
            active: true,
          },
          recordCount: 0,
          totalQuantity: 0,
          totalFinancialImpact: 0,
          issueTypeCounts: {},
          branches: new Set(),
          staff: new Set(),
        };
        map.set(targetKey, entry);
      } else {
        entry.item.category = inferredCat;
      }

      entry.recordCount++;
      entry.totalQuantity += Number(line.quantity || 0);
      entry.totalFinancialImpact += Number(line.totalPrice || 0);

      if (rec.issueType) {
        entry.issueTypeCounts[rec.issueType] = (entry.issueTypeCounts[rec.issueType] || 0) + 1;
      }
      if (rec.branch) entry.branches.add(rec.branch);
      if (rec.staffName) entry.staff.add(rec.staffName);
    });
  });

  return Array.from(map.values())
    .filter(e => e.recordCount > 0)
    .map(e => {
      const sortedIssues = Object.entries(e.issueTypeCounts).sort((a, b) => b[1] - a[1]);
      const mostCommon = sortedIssues.length > 0 ? sortedIssues[0][0] : 'None';
      const cat = inferItemCategory(e.item, items);

      return {
        item: { ...e.item, category: cat },
        category: cat,
        recordCount: e.recordCount,
        totalQuantity: e.totalQuantity,
        totalFinancialImpact: e.totalFinancialImpact,
        mostCommonIssueType: mostCommon,
        branchesInvolved: Array.from(e.branches),
        staffInvolved: Array.from(e.staff),
      };
    })
    .sort((a, b) => b.totalFinancialImpact - a.totalFinancialImpact || b.recordCount - a.recordCount);
}

/**
 * Calculate issue type metrics and trends.
 */
export function calculateIssueTypeMetrics(
  issueTypes: IssueTypeConfig[],
  records: EODRecord[],
  previousRecords: EODRecord[]
): IssueTypeMetric[] {
  const allNames = Array.from(
    new Set(['Wrong EOD', 'Wrong Entry', 'Unpunch Item', 'Overpunch', 'Others', ...issueTypes.map(i => i.name)])
  );

  return allNames.map(typeName => {
    const currentMatches = records.filter(
      r => (r.issueType || '').toLowerCase().trim() === typeName.toLowerCase().trim()
    );
    const prevMatches = previousRecords.filter(
      r => (r.issueType || '').toLowerCase().trim() === typeName.toLowerCase().trim()
    );

    const count = currentMatches.length;
    const financialExposure = currentMatches.reduce((acc, r) => acc + Number(r.totalFinancialImpact || 0), 0);
    const prevExposure = prevMatches.reduce((acc, r) => acc + Number(r.totalFinancialImpact || 0), 0);

    const staffSet = new Set<string>();
    const branchSet = new Set<string>();
    currentMatches.forEach(r => {
      if (r.staffName) staffSet.add(r.staffName);
      if (r.branch) branchSet.add(r.branch);
    });

    const trend = calculatePercentageChange(financialExposure, prevExposure);
    const riskScore = Math.min(100, Math.round(count * 10 + financialExposure / 100));

    return {
      issueType: typeName,
      totalIncidents: count,
      financialExposure,
      staffInvolvedCount: staffSet.size,
      branchesInvolvedCount: branchSet.size,
      trendPercentage: trend.percent,
      trendDirection: trend.direction,
      riskScore,
    };
  });
}

/**
 * Generate Executive Management Takeaways.
 */
export function generateManagementTakeaways(
  records: EODRecord[],
  staffMetrics: StaffMetric[],
  branchMetrics: BranchMetric[],
  itemMetrics: ItemMetric[],
  issueMetrics: IssueTypeMetric[]
): string[] {
  const takeaways: string[] = [];
  if (records.length === 0) {
    return ['No EOD records found matching the active filter criteria.'];
  }

  const totalExposure = records.reduce((acc, r) => acc + Number(r.totalFinancialImpact || 0), 0);
  const totalCount = records.length;

  if (branchMetrics.length > 0 && branchMetrics[0].financialExposure > 0 && totalExposure > 0) {
    const topBranch = branchMetrics[0];
    const pct = ((topBranch.financialExposure / totalExposure) * 100).toFixed(1);
    takeaways.push(
      `Branch ${topBranch.branch.name} represents ${pct}% (${formatPHP(
        topBranch.financialExposure
      )}) of total financial variance across ${topBranch.issues} issues.`
    );
  }

  const surgingIssue = issueMetrics.find(i => i.trendDirection === 'Increasing' && i.trendPercentage >= 15);
  if (surgingIssue) {
    takeaways.push(
      `${surgingIssue.issueType} has surged by +${surgingIssue.trendPercentage.toFixed(1)}% (${formatPHP(
        surgingIssue.financialExposure
      )} involved) vs comparative period.`
    );
  } else {
    const topIssue = [...issueMetrics].sort((a, b) => b.totalIncidents - a.totalIncidents)[0];
    if (topIssue && topIssue.totalIncidents > 0) {
      const pct = ((topIssue.totalIncidents / totalCount) * 100).toFixed(1);
      takeaways.push(
        `${topIssue.issueType} is the highest frequency issue, accounting for ${pct}% (${topIssue.totalIncidents} incidents) of all recorded errors.`
      );
    }
  }

  const criticalStaff = staffMetrics.find(s => s.riskLevel === 'Critical' || s.repeatIncidentCount >= 2);
  if (criticalStaff && criticalStaff.totalLoss > 0) {
    takeaways.push(
      `Staff member ${criticalStaff.staffName} (${criticalStaff.branch}) has ${criticalStaff.repeatIncidentCount} repeat incidents totaling ${formatPHP(
        criticalStaff.totalLoss
      )} exposure.`
    );
  }

  if (itemMetrics.length > 0 && itemMetrics[0].totalFinancialImpact > 0) {
    const topItem = itemMetrics[0];
    takeaways.push(
      `Product "${topItem.item.name}" has the highest item-related discrepancy impact at ${formatPHP(
        topItem.totalFinancialImpact
      )} across ${topItem.recordCount} incident(s).`
    );
  }

  if (takeaways.length < 2) {
    takeaways.push(`Logged ${totalCount} transactions with aggregate monetary variance of ${formatPHP(totalExposure)}.`);
  }

  return takeaways;
}

/**
 * Generate Live Issue Warnings and Alerts.
 */
export function generateLiveAlerts(
  staffMetrics: StaffMetric[],
  branchMetrics: BranchMetric[],
  itemMetrics: ItemMetric[],
  issueMetrics: IssueTypeMetric[],
  settings?: RiskSettings | RiskThresholds
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const cfg = settings as any;
  const highLoss = cfg?.highLoss ?? cfg?.financialThresholds?.high ?? 1500;
  const critLoss = cfg?.criticalLoss ?? cfg?.financialThresholds?.critical ?? 3000;
  const modLoss = cfg?.moderateLoss ?? cfg?.financialThresholds?.medium ?? 500;

  staffMetrics.forEach(st => {
    if (st.riskLevel === 'Critical' && st.totalLoss > 0) {
      alerts.push({
        id: `alert-staff-${st.staffId}`,
        severity: 'Critical',
        entityType: 'Staff',
        entityName: st.staffName,
        reason: `Exceeded Critical Risk Score threshold (Score: ${st.riskScore}/100) with ${st.repeatIncidentCount} repeat incidents.`,
        relevantAmountOrCount: formatPHP(st.totalLoss),
        dateOrPeriod: `${st.totalIssues} incidents recorded`,
      });
    }
  });

  branchMetrics.forEach(br => {
    if (br.financialExposure >= highLoss) {
      alerts.push({
        id: `alert-branch-${br.branch.id}`,
        severity: br.financialExposure >= critLoss ? 'Critical' : 'High',
        entityType: 'Branch',
        entityName: br.branch.name,
        reason: `Branch financial exposure exceeds alert threshold (${formatPHP(highLoss)}). Top problem: ${br.mostCommonIssueType}.`,
        relevantAmountOrCount: formatPHP(br.financialExposure),
        dateOrPeriod: `${br.issues} recorded issues`,
      });
    }
  });

  itemMetrics.forEach(itm => {
    if (itm.recordCount >= 3 || itm.totalFinancialImpact >= modLoss) {
      alerts.push({
        id: `alert-item-${itm.item.id}`,
        severity: itm.totalFinancialImpact >= highLoss ? 'High' : 'Watch',
        entityType: 'Item',
        entityName: itm.item.name,
        reason: `Product appears frequently in error records (${itm.recordCount} times across ${itm.branchesInvolved.length} branch(es)).`,
        relevantAmountOrCount: formatPHP(itm.totalFinancialImpact),
        dateOrPeriod: `Qty: ${itm.totalQuantity} units`,
      });
    }
  });

  issueMetrics.forEach(iss => {
    if (iss.trendDirection === 'Increasing' && iss.trendPercentage >= 20) {
      alerts.push({
        id: `alert-trend-${iss.issueType}`,
        severity: 'High',
        entityType: 'Trend',
        entityName: iss.issueType,
        reason: `Incident count surging by +${iss.trendPercentage.toFixed(0)}% compared to immediately preceding period.`,
        relevantAmountOrCount: `${iss.totalIncidents} incidents`,
        dateOrPeriod: 'Surge Warning',
      });
    }
  });

  const severityOrder: Record<string, number> = { Critical: 0, High: 1, Watch: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Generate Action Recommendations.
 */
export function generatePriorityRecommendations(
  staffMetrics: StaffMetric[],
  branchMetrics: BranchMetric[],
  itemMetrics: ItemMetric[]
): RecommendationItem[] {
  const recs: RecommendationItem[] = [];

  if (branchMetrics.length > 0 && branchMetrics[0].financialExposure > 0) {
    const topBranch = branchMetrics[0];
    recs.push({
      id: 'rec-1',
      priority: 'Priority 1',
      priorityLabel: 'Immediate Action',
      targetType: 'Branch',
      targetName: topBranch.branch.name,
      actionText: `Perform immediate on-site EOD inventory audit and cash register reconciliation at ${topBranch.branch.name}.`,
      reason: `Branch has the highest financial exposure of ${formatPHP(topBranch.financialExposure)} and ${topBranch.issues} logged issues.`,
    });
  }

  const highRiskStaff = staffMetrics.find(s => s.riskScore >= 50 && s.totalIssues > 0);
  if (highRiskStaff) {
    recs.push({
      id: 'rec-2',
      priority: 'Priority 2',
      priorityLabel: 'High Attention',
      targetType: 'Staff',
      targetName: highRiskStaff.staffName,
      actionText: `Schedule mandatory refresher training on POS transaction accuracy and dual-signoff protocol for ${highRiskStaff.staffName}.`,
      reason: `Recorded ${highRiskStaff.repeatIncidentCount} repeat incidents in ${highRiskStaff.primaryIssueType} with Risk Score ${highRiskStaff.riskScore}/100.`,
    });
  }

  if (itemMetrics.length > 0 && itemMetrics[0].recordCount >= 2) {
    const topItem = itemMetrics[0];
    recs.push({
      id: 'rec-3',
      priority: 'Priority 3',
      priorityLabel: 'Monitoring',
      targetType: 'Item',
      targetName: topItem.item.name,
      actionText: `Audit PLU pricing, barcode scanning clarity, and packaging labels for "${topItem.item.name}".`,
      reason: `Frequently involved in item-related variance logs (${topItem.recordCount} times, totaling ${formatPHP(topItem.totalFinancialImpact)}).`,
    });
  }

  return recs;
}

/**
 * FIX 10: Calculate disciplinary action countdown status and remaining days.
 */
export function calculateDisciplinaryCountdown(action: DisciplinaryAction): DisciplinaryCountdown {
  if (action.stage === 'Termination') {
    return {
      daysTotal: null,
      daysElapsed: null,
      daysRemaining: null,
      isOverdue: false,
      isEndingToday: false,
      label: 'Terminated',
      urgency: 'terminal',
    };
  }

  if (action.status !== 'Active') {
    return {
      daysTotal: action.durationDays ?? null,
      daysElapsed: null,
      daysRemaining: null,
      isOverdue: false,
      isEndingToday: false,
      label: action.status,
      urgency: 'closed',
    };
  }

  if (!action.durationDays || !action.endDate) {
    return {
      daysTotal: null,
      daysElapsed: null,
      daysRemaining: null,
      isOverdue: false,
      isEndingToday: false,
      label: 'No countdown set',
      urgency: 'normal',
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(`${action.endDate}T00:00:00`);
  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      daysTotal: action.durationDays,
      daysElapsed: action.durationDays + Math.abs(diffDays),
      daysRemaining: diffDays,
      isOverdue: true,
      isEndingToday: false,
      label: `Overdue by ${Math.abs(diffDays)}d`,
      urgency: 'overdue',
    };
  }

  if (diffDays === 0) {
    return {
      daysTotal: action.durationDays,
      daysElapsed: action.durationDays,
      daysRemaining: 0,
      isOverdue: false,
      isEndingToday: true,
      label: 'Ends today',
      urgency: 'critical',
    };
  }

  const urgency = diffDays <= 2 ? 'critical' : diffDays <= 5 ? 'warning' : 'normal';
  return {
    daysTotal: action.durationDays,
    daysElapsed: action.durationDays - diffDays,
    daysRemaining: diffDays,
    isOverdue: false,
    isEndingToday: false,
    label: `${diffDays}d left`,
    urgency,
  };
}

/**
 * Get map of latest active disciplinary action per staff ID.
 */
export function getLatestStaffDisciplinaryMap(
  actions: DisciplinaryAction[]
): Record<string, DisciplinaryAction> {
  const result: Record<string, DisciplinaryAction> = {};
  if (!actions || actions.length === 0) return result;

  const grouped: Record<string, DisciplinaryAction[]> = {};
  for (const act of actions) {
    if (!grouped[act.staffId]) grouped[act.staffId] = [];
    grouped[act.staffId].push(act);
  }

  for (const staffId of Object.keys(grouped)) {
    const list = grouped[staffId].slice().sort((a, b) => (b.issuedDate || '').localeCompare(a.issuedDate || ''));
    const term = list.find(a => a.stage === 'Termination');
    if (term) {
      result[staffId] = term;
      continue;
    }
    const active = list.filter(a => a.status === 'Active');
    if (active.length > 0) {
      result[staffId] = active[0];
      continue;
    }
    result[staffId] = list[0];
  }

  return result;
}

/**
 * Calculate future end date given start date and duration days.
 */
export function calculateFutureDate(startDate: string, durationDays: number): string | undefined {
  if (!startDate || !durationDays || durationDays <= 0) return undefined;
  const d = new Date(`${startDate}T00:00:00`);
  d.setDate(d.getDate() + durationDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Normalizes issue types for classification.
 */
export function normalizeIssueType(type: string): string {
  if (!type) return 'OTHER';
  const clean = type.toLowerCase().replace(/[\s\-_]/g, '');
  if (clean.includes('wrongeod') || clean === 'eod') return 'WRONG_EOD';
  if (clean.includes('wrongentry') || clean.includes('typo') || clean.includes('encoding')) return 'WRONG_ENTRY';
  if (clean.includes('unpunch')) return 'UNPUNCH';
  if (clean.includes('overpunch')) return 'OVERPUNCH';
  return 'OTHER';
}
