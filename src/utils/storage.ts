import {
  STORAGE_KEYS,
  INITIAL_BRANCHES,
  INITIAL_STAFF,
  INITIAL_ITEMS,
  INITIAL_ISSUE_TYPES,
  DEFAULT_RISK_SETTINGS,
  DEFAULT_RISK_THRESHOLDS,
  INITIAL_EOD_RECORDS,
  INITIAL_ACTION_ITEMS,
} from './constants';
import {
  Branch,
  Staff,
  ProductItem,
  IssueTypeConfig,
  EODRecord,
  ActionItem,
  DisciplinaryAction,
  RiskSettings,
  RiskThresholds,
} from '../types';

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch (err) {
    console.warn(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

// Branches
export function getStoredBranches(): Branch[] {
  const list = readStorage<Branch[]>(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  return !list || list.length === 0 ? INITIAL_BRANCHES : list;
}
export function saveStoredBranches(branches: Branch[]): void {
  writeStorage(STORAGE_KEYS.BRANCHES, branches);
}

// Staff
export function getStoredStaff(): Staff[] {
  const list = readStorage<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  return !list || list.length === 0 ? INITIAL_STAFF : list;
}
export function saveStoredStaff(staff: Staff[]): void {
  writeStorage(STORAGE_KEYS.STAFF, staff);
}

// Items
export function getStoredItems(): ProductItem[] {
  const list = readStorage<ProductItem[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
  return !list || list.length === 0 ? INITIAL_ITEMS : list;
}
export function saveStoredItems(items: ProductItem[]): void {
  writeStorage(STORAGE_KEYS.ITEMS, items);
}

// Issue Types
export function getStoredIssueTypes(): IssueTypeConfig[] {
  const list = readStorage<IssueTypeConfig[]>(STORAGE_KEYS.ISSUE_TYPES, INITIAL_ISSUE_TYPES);
  return !list || list.length === 0 ? INITIAL_ISSUE_TYPES : list;
}
export function saveStoredIssueTypes(types: IssueTypeConfig[]): void {
  writeStorage(STORAGE_KEYS.ISSUE_TYPES, types);
}

// Risk Thresholds
export function getStoredRiskThresholds(): RiskThresholds {
  const saved = readStorage<RiskThresholds>(STORAGE_KEYS.RISK_THRESHOLDS, DEFAULT_RISK_THRESHOLDS);
  return !saved || typeof saved !== 'object'
    ? DEFAULT_RISK_THRESHOLDS
    : { ...DEFAULT_RISK_THRESHOLDS, ...saved };
}
export function saveStoredRiskThresholds(thresholds: RiskThresholds): void {
  writeStorage(STORAGE_KEYS.RISK_THRESHOLDS, thresholds);
}

// Risk Settings
export function getStoredRiskSettings(): RiskSettings {
  const saved = readStorage<RiskSettings>(STORAGE_KEYS.RISK_SETTINGS, DEFAULT_RISK_SETTINGS);
  return !saved || !saved.weights ? DEFAULT_RISK_SETTINGS : saved;
}
export function saveStoredRiskSettings(settings: RiskSettings): void {
  writeStorage(STORAGE_KEYS.RISK_SETTINGS, settings);
}

// EOD Records
export function getStoredEODRecords(): EODRecord[] {
  const list = readStorage<EODRecord[]>(STORAGE_KEYS.EOD_RECORDS, INITIAL_EOD_RECORDS);
  return !list || !Array.isArray(list) ? INITIAL_EOD_RECORDS : list;
}
export function saveStoredEODRecords(records: EODRecord[]): void {
  writeStorage(STORAGE_KEYS.EOD_RECORDS, records);
}

// Action Items
export function getStoredActionItems(): ActionItem[] {
  const list = readStorage<ActionItem[]>(STORAGE_KEYS.ACTION_ITEMS, INITIAL_ACTION_ITEMS);
  return !list || !Array.isArray(list) ? INITIAL_ACTION_ITEMS : list;
}
export function saveStoredActionItems(items: ActionItem[]): void {
  writeStorage(STORAGE_KEYS.ACTION_ITEMS, items);
}

// Disciplinary Actions
export function getStoredDisciplinaryActions(): DisciplinaryAction[] {
  const list = readStorage<DisciplinaryAction[]>(STORAGE_KEYS.DISCIPLINARY_ACTIONS, []);
  return !list || !Array.isArray(list) ? [] : list;
}
export function saveStoredDisciplinaryActions(actions: DisciplinaryAction[]): void {
  writeStorage(STORAGE_KEYS.DISCIPLINARY_ACTIONS, actions);
}

// Daily Draft
export interface DailyDraftData {
  editingRecordId: string | null;
  date: string;
  branch: string;
  staffId: string;
  issueType: string;
  varianceStatus: 'G' | 'Y' | 'R' | 'C';
  department: 'FG' | 'RM';
  rootCause: string;
  rootCauseOther: string;
  remarks: string;
  evidencePhoto: string;
  itemRows: any[];
}
export function getDailyDraft(): DailyDraftData | null {
  return readStorage<DailyDraftData | null>(STORAGE_KEYS.DAILY_ENTRY_DRAFT, null);
}
export function saveDailyDraft(draft: DailyDraftData): void {
  writeStorage(STORAGE_KEYS.DAILY_ENTRY_DRAFT, draft);
}
export function clearDailyDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DAILY_ENTRY_DRAFT);
  } catch (e) {
    console.error('Error clearing daily draft:', e);
  }
}

// Non-destructive array merge helper
function mergeArrayById<T extends { id?: string | number }>(current: T[], incoming: T[]): T[] {
  if (!Array.isArray(incoming)) return current || [];
  const list = Array.isArray(current) ? [...current] : [];
  const existingIds = new Set(list.map(x => x && x.id).filter(id => id != null));
  const toAdd = incoming.filter(x => x && x.id != null && !existingIds.has(x.id));
  return list.concat(toAdd);
}

// Export backup to local JSON file
export function exportLocalBackupFile(): void {
  const data = {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    branches: getStoredBranches(),
    staff: getStoredStaff(),
    items: getStoredItems(),
    issueTypes: getStoredIssueTypes(),
    riskSettings: getStoredRiskSettings(),
    riskThresholds: getStoredRiskThresholds(),
    eodRecords: getStoredEODRecords(),
    actionItems: getStoredActionItems(),
    disciplinaryActions: getStoredDisciplinaryActions(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `EOD-Matrix-Full-Backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import & restore backup JSON
export function importBackupJsonString(jsonContent: string): { success: boolean; message?: string; error?: string } {
  try {
    const data = JSON.parse(jsonContent);
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid backup file format.' };
    }

    if (Array.isArray(data.branches)) {
      saveStoredBranches(mergeArrayById(getStoredBranches(), data.branches));
    }
    if (Array.isArray(data.staff)) {
      saveStoredStaff(mergeArrayById(getStoredStaff(), data.staff));
    }
    if (Array.isArray(data.items)) {
      saveStoredItems(mergeArrayById(getStoredItems(), data.items));
    }
    if (Array.isArray(data.issueTypes)) {
      saveStoredIssueTypes(mergeArrayById(getStoredIssueTypes(), data.issueTypes));
    }

    let recordsAdded = 0;
    if (Array.isArray(data.eodRecords)) {
      const beforeIds = new Set(getStoredEODRecords().map(x => x && x.id));
      recordsAdded = data.eodRecords.filter((x: any) => x && x.id != null && !beforeIds.has(x.id)).length;
      saveStoredEODRecords(mergeArrayById(getStoredEODRecords(), data.eodRecords));
    }
    if (Array.isArray(data.actionItems)) {
      saveStoredActionItems(mergeArrayById(getStoredActionItems(), data.actionItems));
    }
    if (Array.isArray(data.disciplinaryActions)) {
      saveStoredDisciplinaryActions(mergeArrayById(getStoredDisciplinaryActions(), data.disciplinaryActions));
    }

    return {
      success: true,
      message: `Backup merged successfully. ${recordsAdded} new record(s) added. Existing data was safely preserved.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to parse backup JSON file.',
    };
  }
}

// Reset database to initial seed data
export function resetToSeedData(): void {
  saveStoredBranches(INITIAL_BRANCHES);
  saveStoredStaff(INITIAL_STAFF);
  saveStoredItems(INITIAL_ITEMS);
  saveStoredIssueTypes(INITIAL_ISSUE_TYPES);
  saveStoredRiskSettings(DEFAULT_RISK_SETTINGS);
  saveStoredRiskThresholds(DEFAULT_RISK_THRESHOLDS);
  saveStoredEODRecords(INITIAL_EOD_RECORDS);
  saveStoredActionItems(INITIAL_ACTION_ITEMS);
  saveStoredDisciplinaryActions([]);
  clearDailyDraft();
}

// Aliases for unified storage access
export const loadFromStorage = (key: string): any => {
  switch (key) {
    case STORAGE_KEYS.BRANCHES:
      return getStoredBranches();
    case STORAGE_KEYS.STAFF:
      return getStoredStaff();
    case STORAGE_KEYS.ITEMS:
      return getStoredItems();
    case STORAGE_KEYS.ISSUE_TYPES:
      return getStoredIssueTypes();
    case STORAGE_KEYS.RISK_SETTINGS:
      return getStoredRiskSettings();
    case STORAGE_KEYS.RISK_THRESHOLDS:
      return getStoredRiskThresholds();
    case STORAGE_KEYS.THRESHOLDS:
      return getStoredRiskThresholds();
    case STORAGE_KEYS.RECORDS:
    case STORAGE_KEYS.EOD_RECORDS:
      return getStoredEODRecords();
    case STORAGE_KEYS.ACTION_ITEMS:
      return getStoredActionItems();
    default:
      return readStorage(key, null);
  }
};

export const saveToStorage = (key: string, value: any): void => {
  switch (key) {
    case STORAGE_KEYS.BRANCHES:
      saveStoredBranches(value);
      break;
    case STORAGE_KEYS.STAFF:
      saveStoredStaff(value);
      break;
    case STORAGE_KEYS.ITEMS:
      saveStoredItems(value);
      break;
    case STORAGE_KEYS.ISSUE_TYPES:
      saveStoredIssueTypes(value);
      break;
    case STORAGE_KEYS.RISK_SETTINGS:
      saveStoredRiskSettings(value);
      break;
    case STORAGE_KEYS.RISK_THRESHOLDS:
    case STORAGE_KEYS.THRESHOLDS:
      saveStoredRiskThresholds(value);
      break;
    case STORAGE_KEYS.RECORDS:
    case STORAGE_KEYS.EOD_RECORDS:
      saveStoredEODRecords(value);
      break;
    case STORAGE_KEYS.ACTION_ITEMS:
      saveStoredActionItems(value);
      break;
    default:
      writeStorage(key, value);
      break;
  }
};

export const exportDatabaseBackup = exportLocalBackupFile;
export const importDatabaseBackup = (jsonContent: string): boolean => {
  const res = importBackupJsonString(jsonContent);
  return res.success;
};
export const resetToDefaults = resetToSeedData;
