export type Department = 'FG' | 'RM';
export type VarianceStatus = 'G' | 'Y' | 'R' | 'C';
export type IssueCategory = 'Wrong EOD' | 'Wrong Entry' | 'Unpunch Item' | 'Overpunch' | 'Others' | string;
export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type RiskTier = 'Critical' | 'High' | 'Moderate' | 'Low';
export type ActionStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type DisciplinaryStage = 'Warning' | 'NTE' | 'Suspension' | 'Termination';
export type DisciplinaryStatus = 'Active' | 'Completed' | 'Dismissed';

export interface Branch {
  id: string;
  name: string;
  code?: string;
  region?: string;
  location?: string;
  active?: boolean;
  status?: string;
  createdAt?: string;
}

export interface Staff {
  id: string;
  name: string;
  branch: string;
  position: string;
  phone?: string;
  email?: string;
  status: 'Active' | 'Inactive';
  contact?: string;
  joinedDate?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  code: string;
  category: Department;
  defaultPrice: number;
  uom?: string;
  active: boolean;
}

export interface IssueTypeConfig {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  defaultCategory?: string;
  defaultSeverity?: PriorityLevel;
}

export interface EODItemLine {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  rawQty?: string;
  unitPrice: number;
  rawPrice?: string;
  totalPrice: number;
}

export interface EODRecord {
  id: string;
  date: string; // YYYY-MM-DD
  branch: string;
  staffId: string;
  staffName: string;
  issueType: string;
  varianceStatus: VarianceStatus;
  department: Department;
  items: EODItemLine[];
  totalFinancialImpact: number;
  rootCause?: string;
  rootCauseOther?: string;
  remarks?: string;
  evidencePhoto?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActionItem {
  id: string;
  recordId?: string;
  eodRecordId?: string;
  branch?: string;
  targetBranch?: string;
  staffName?: string;
  targetStaff?: string;
  date?: string;
  issueType?: string;
  title?: string;
  description?: string;
  priority: PriorityLevel;
  assignedTo: string;
  actionRequired?: string;
  status: ActionStatus;
  dueDate: string;
  completionDate?: string;
  resolvedAt?: string;
  notes?: string;
  resolutionNotes?: string;
  proofImage1?: string;
  proofImage2?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DisciplinaryAction {
  id: string;
  staffId: string;
  staffName: string;
  branch: string;
  stage: DisciplinaryStage;
  reason: string;
  issuedDate: string;
  durationDays?: number;
  endDate?: string;
  status: DisciplinaryStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DisciplinaryCountdown {
  daysTotal: number | null;
  daysElapsed: number | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  isEndingToday: boolean;
  label: string;
  urgency: 'overdue' | 'critical' | 'warning' | 'normal' | 'terminal' | 'closed';
}

export interface RiskThresholds {
  criticalLoss: number;
  highLoss: number;
  moderateLoss: number;
  consecutiveErrorCount: number;
  criticalStaffRiskScore: number;
  highStaffRiskScore: number;
  moderateStaffRiskScore: number;
  staffWeightFinancialLoss: number;
  staffWeightIncidentFrequency: number;
  staffWeightRepeatBehavior: number;
  staffWeightUnresolvedActions: number;
}

export interface RiskSettings {
  financialThresholds: {
    medium: number;
    high: number;
    critical: number;
  };
  repeatIncidentThreshold: number;
  repeatIncidentWindowDays: number;
  trendAlertThresholdPercent: number;
  riskScoreThresholds: {
    lowMax: number;
    mediumMax: number;
    highMax: number;
    criticalMin: number;
  };
  weights: {
    financialExposure: number;
    issueFrequency: number;
    repeatIncidents: number;
    unresolvedIssues: number;
  };
}

export interface GlobalFilterState {
  dateFrom: string;
  dateTo: string;
  branch: string;
  staff: string;
  issueType: string;
  varianceStatus: string;
  department: string;
}

export interface TrendResult {
  percent: number;
  direction: 'Increasing' | 'Decreasing' | 'Stable' | 'New/No Previous Data';
}

export interface AlertItem {
  id: string;
  severity: 'Critical' | 'High' | 'Watch';
  entityType: 'Staff' | 'Branch' | 'Item' | 'Trend';
  entityName: string;
  reason: string;
  relevantAmountOrCount: string;
  dateOrPeriod: string;
}

export interface RecommendationItem {
  id: string;
  priority: string;
  priorityLabel: string;
  targetType: 'Branch' | 'Staff' | 'Item';
  targetName: string;
  actionText: string;
  reason: string;
}

export interface BranchMetric {
  branch: Branch;
  issues: number;
  financialExposure: number;
  averageRiskScore: number;
  highestRiskStaff?: string;
  mostCommonIssueType: string;
  trendDirection: 'Increasing' | 'Decreasing' | 'Stable' | 'New/No Previous Data';
  trendPercentage: number;
  riskLevel: RiskTier;
  criticalCases: number;
  unresolvedActions: number;
}

export interface StaffMetric {
  staffId: string;
  staffName: string;
  branch: string;
  position: string;
  status: string;
  totalIssues: number;
  totalLoss: number;
  repeatRate: number;
  repeatIncidentCount: number;
  unresolvedActions: number;
  riskScore: number;
  riskLevel: RiskTier;
  primaryIssueType: string;
  topItemInvolved?: string;
  recommendationReason: string;
  staff: Staff;
  issueCount: number;
  financialExposure: number;
  unresolvedCount: number;
}

export interface ItemMetric {
  item: ProductItem;
  category: Department;
  recordCount: number;
  totalQuantity: number;
  totalFinancialImpact: number;
  mostCommonIssueType: string;
  branchesInvolved: string[];
  staffInvolved: string[];
}

export interface IssueTypeMetric {
  issueType: string;
  totalIncidents: number;
  financialExposure: number;
  staffInvolvedCount: number;
  branchesInvolvedCount: number;
  trendPercentage: number;
  trendDirection: 'Increasing' | 'Decreasing' | 'Stable' | 'New/No Previous Data';
  riskScore: number;
}
