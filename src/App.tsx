/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  loadFromStorage,
  saveToStorage,
  exportDatabaseBackup,
  importDatabaseBackup,
  resetToDefaults,
} from './utils/storage';
import {
  EODRecord,
  Branch,
  Staff,
  ProductItem,
  IssueTypeConfig,
  RiskSettings,
  RiskThresholds,
  ActionItem,
} from './types';
import { STORAGE_KEYS, USER_DIRECTORY } from './utils/constants';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DisplaySettingsWidget } from './components/DisplaySettingsWidget';
import { PasscodeGate } from './components/PasscodeGate';
import { Overview } from './components/Overview';
import { DailyMatrix } from './components/DailyMatrix';
import { MonthlyBreakdown } from './components/MonthlyBreakdown';
import { ActionTracker } from './components/ActionTracker';
import { StaffMonitoring } from './components/StaffMonitoring';
import { EODRecordsTable } from './components/EODRecordsTable';
import { SettingsTab } from './components/SettingsTab';
import { generateLiveAlerts } from './utils/analytics';

export default function App() {
  // Authentication & Passcode Gate State
  const [currentUser, setCurrentUser] = useState<{ passcode: string; slug: string; name: string } | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.PASSCODE_SESSION);
      if (stored) {
        const found = USER_DIRECTORY.find(u => u.passcode === stored);
        return found || { passcode: stored, slug: 'authorized', name: 'Audit Staff' };
      }
    } catch {}
    return null;
  });

  // Master Data States
  const [records, setRecords] = useState<EODRecord[]>(() => loadFromStorage(STORAGE_KEYS.EOD_RECORDS));
  const [branches, setBranches] = useState<Branch[]>(() => loadFromStorage(STORAGE_KEYS.BRANCHES));
  const [staffList, setStaffList] = useState<Staff[]>(() => loadFromStorage(STORAGE_KEYS.STAFF));
  const [items, setItems] = useState<ProductItem[]>(() => loadFromStorage(STORAGE_KEYS.ITEMS));
  const [issueTypes, setIssueTypes] = useState<IssueTypeConfig[]>(() => loadFromStorage(STORAGE_KEYS.ISSUE_TYPES));
  const [riskSettings, setRiskSettings] = useState<RiskSettings>(() => loadFromStorage(STORAGE_KEYS.RISK_SETTINGS));
  const [thresholds, setThresholds] = useState<RiskThresholds>(() => loadFromStorage(STORAGE_KEYS.RISK_THRESHOLDS));
  const [actionItems, setActionItems] = useState<ActionItem[]>(() => loadFromStorage(STORAGE_KEYS.ACTION_ITEMS));

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation Parameters for Deep Linking
  const [matrixInitialBranch, setMatrixInitialBranch] = useState<string | undefined>();
  const [matrixInitialDate, setMatrixInitialDate] = useState<string | undefined>();
  const [trackerInitialBranch, setTrackerInitialBranch] = useState<string | undefined>();
  const [trackerInitialStaff, setTrackerInitialStaff] = useState<string | undefined>();
  const [trackerInitialRecordId, setTrackerInitialRecordId] = useState<string | undefined>();

  // Hidden file input for database restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state changes to storage
  const handleSaveRecord = (rec: EODRecord) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === rec.id);
      let next: EODRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = rec;
      } else {
        next = [rec, ...prev];
      }
      saveToStorage(STORAGE_KEYS.EOD_RECORDS, next);
      return next;
    });
  };

  const handleDeleteRecord = (id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id);
      saveToStorage(STORAGE_KEYS.EOD_RECORDS, next);
      return next;
    });
  };

  const handleSaveActionItem = (item: ActionItem) => {
    setActionItems(prev => {
      const idx = prev.findIndex(a => a.id === item.id);
      let next: ActionItem[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = item;
      } else {
        next = [item, ...prev];
      }
      saveToStorage(STORAGE_KEYS.ACTION_ITEMS, next);
      return next;
    });
  };

  const handleDeleteActionItem = (id: string) => {
    setActionItems(prev => {
      const next = prev.filter(a => a.id !== id);
      saveToStorage(STORAGE_KEYS.ACTION_ITEMS, next);
      return next;
    });
  };

  const handleSaveStaff = (newStaff: Staff) => {
    setStaffList(prev => {
      const idx = prev.findIndex(s => s.id === newStaff.id);
      let next: Staff[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = newStaff;
      } else {
        next = [...prev, newStaff];
      }
      saveToStorage(STORAGE_KEYS.STAFF, next);
      return next;
    });
  };

  const handleUpdateBranches = (updated: Branch[]) => {
    setBranches(updated);
    saveToStorage(STORAGE_KEYS.BRANCHES, updated);
  };

  const handleUpdateStaff = (updated: Staff[]) => {
    setStaffList(updated);
    saveToStorage(STORAGE_KEYS.STAFF, updated);
  };

  const handleUpdateItems = (updated: ProductItem[]) => {
    setItems(updated);
    saveToStorage(STORAGE_KEYS.ITEMS, updated);
  };

  const handleUpdateIssueTypes = (updated: IssueTypeConfig[]) => {
    setIssueTypes(updated);
    saveToStorage(STORAGE_KEYS.ISSUE_TYPES, updated);
  };

  const handleUpdateRiskSettings = (updated: RiskSettings) => {
    setRiskSettings(updated);
    saveToStorage(STORAGE_KEYS.RISK_SETTINGS, updated);
  };

  // Cross-view navigation handlers
  const handleNavigateToMatrix = (branchName?: string, date?: string) => {
    setMatrixInitialBranch(branchName);
    setMatrixInitialDate(date);
    setActiveTab('daily');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToTracker = (branchName?: string, staffName?: string, recordId?: string) => {
    setTrackerInitialBranch(branchName);
    setTrackerInitialStaff(staffName);
    setTrackerInitialRecordId(recordId);
    setActiveTab('tracker');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Backup & Restore
  const handleExportBackup = () => {
    exportDatabaseBackup();
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        const success = importDatabaseBackup(text);
        if (success) {
          alert('Database backup restored successfully!');
          // Reload state from storage
          setRecords(loadFromStorage(STORAGE_KEYS.EOD_RECORDS));
          setBranches(loadFromStorage(STORAGE_KEYS.BRANCHES));
          setStaffList(loadFromStorage(STORAGE_KEYS.STAFF));
          setItems(loadFromStorage(STORAGE_KEYS.ITEMS));
          setIssueTypes(loadFromStorage(STORAGE_KEYS.ISSUE_TYPES));
          setRiskSettings(loadFromStorage(STORAGE_KEYS.RISK_SETTINGS));
          setThresholds(loadFromStorage(STORAGE_KEYS.RISK_THRESHOLDS));
          setActionItems(loadFromStorage(STORAGE_KEYS.ACTION_ITEMS));
        } else {
          alert('Failed to parse the backup JSON file. Make sure it was exported from this system.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDatabase = () => {
    resetToDefaults();
    setRecords(loadFromStorage(STORAGE_KEYS.EOD_RECORDS));
    setBranches(loadFromStorage(STORAGE_KEYS.BRANCHES));
    setStaffList(loadFromStorage(STORAGE_KEYS.STAFF));
    setItems(loadFromStorage(STORAGE_KEYS.ITEMS));
    setIssueTypes(loadFromStorage(STORAGE_KEYS.ISSUE_TYPES));
    setRiskSettings(loadFromStorage(STORAGE_KEYS.RISK_SETTINGS));
    setThresholds(loadFromStorage(STORAGE_KEYS.RISK_THRESHOLDS));
    setActionItems(loadFromStorage(STORAGE_KEYS.ACTION_ITEMS));
    alert('System reset to default seed data.');
  };

  const handleSignOut = () => {
    sessionStorage.removeItem(STORAGE_KEYS.PASSCODE_SESSION);
    setCurrentUser(null);
  };

  // Computed metrics for Header and Sidebar
  const totalExposure = useMemo(
    () => records.reduce((sum, r) => sum + (Number(r.totalFinancialImpact) || 0), 0),
    [records]
  );

  const activeTabTitle = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return 'Executive Audit Overview';
      case 'daily':
        return 'Daily EOD Matrix Entry';
      case 'monthly':
        return 'Monthly Historical Breakdown';
      case 'tracker':
        return 'Remediation Action Tracker';
      case 'staff':
        return 'Staff Monitoring & Performance';
      case 'records':
        return 'EOD Transaction Records Ledger';
      case 'settings':
        return 'System Settings & Master Data';
      default:
        return 'EOD Monitoring Matrix';
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2A29] flex flex-col md:flex-row antialiased font-sans">
      {/* Passcode Security Gate */}
      {!currentUser && <PasscodeGate onUnlock={user => setCurrentUser(user)} />}

      {/* Hidden File Input for Backup Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={tabId => {
          setActiveTab(tabId);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        actionItems={actionItems}
        onExportBackup={handleExportBackup}
        onImportClick={handleTriggerImport}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* App Top Header */}
        <Header
          activeTabTitle={activeTabTitle}
          totalRecordsCount={records.length}
          totalExposure={totalExposure}
          currentUser={currentUser}
          onNavigateToMatrix={() => handleNavigateToMatrix()}
          onSignOut={handleSignOut}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <Overview
              records={records}
              branches={branches}
              staffList={staffList}
              items={items}
              issueTypes={issueTypes}
              riskSettings={riskSettings}
              thresholds={thresholds}
              actionItems={actionItems}
              onNavigateToMatrix={handleNavigateToMatrix}
              onNavigateToTracker={handleNavigateToTracker}
            />
          )}

          {activeTab === 'daily' && (
            <DailyMatrix
              records={records}
              branches={branches}
              staffList={staffList}
              items={items}
              issueTypes={issueTypes}
              onSaveRecord={handleSaveRecord}
              onDeleteRecord={handleDeleteRecord}
              initialBranch={matrixInitialBranch}
              initialDate={matrixInitialDate}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyBreakdown
              records={records}
              branches={branches}
              staffList={staffList}
              issueTypes={issueTypes}
            />
          )}

          {activeTab === 'tracker' && (
            <ActionTracker
              actionItems={actionItems}
              branches={branches}
              staffList={staffList}
              onSaveActionItem={handleSaveActionItem}
              onDeleteActionItem={handleDeleteActionItem}
              filterBranch={trackerInitialBranch}
              filterStaff={trackerInitialStaff}
              filterRecordId={trackerInitialRecordId}
            />
          )}

          {activeTab === 'staff' && (
            <StaffMonitoring
              staffList={staffList}
              branches={branches}
              records={records}
              actionItems={actionItems}
              riskSettings={riskSettings}
              onSaveStaff={handleSaveStaff}
              onNavigateToTracker={handleNavigateToTracker}
            />
          )}

          {activeTab === 'records' && (
            <EODRecordsTable
              records={records}
              branches={branches}
              onEditRecord={rec => {
                handleNavigateToMatrix(rec.branch, rec.date);
              }}
              onDeleteRecord={handleDeleteRecord}
              onNavigateToTracker={handleNavigateToTracker}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              branches={branches}
              staffList={staffList}
              items={items}
              issueTypes={issueTypes}
              riskSettings={riskSettings}
              onUpdateBranches={handleUpdateBranches}
              onUpdateStaff={handleUpdateStaff}
              onUpdateItems={handleUpdateItems}
              onUpdateIssueTypes={handleUpdateIssueTypes}
              onUpdateRiskSettings={handleUpdateRiskSettings}
              onExportBackup={handleExportBackup}
              onImportBackup={handleTriggerImport}
              onResetDatabase={handleResetDatabase}
            />
          )}
        </main>
      </div>

      {/* Floating Display & Eye-Comfort Settings */}
      <DisplaySettingsWidget />
    </div>
  );
}
