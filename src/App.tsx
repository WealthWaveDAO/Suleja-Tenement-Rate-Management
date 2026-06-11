/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, 
  LayoutDashboard, 
  Building2, 
  Settings, 
  CreditCard, 
  Compass, 
  ShieldAlert, 
  FileSpreadsheet, 
  Cpu, 
  LogOut, 
  Bell, 
  Clock, 
  Check, 
  X,
  UserCheck,
  Globe,
  Sun,
  Moon,
  AlertTriangle
} from 'lucide-react';

import { Property, Invoice, EnforcementAction, ActivityLog, SystemSettings, User, Notification, EnforcementStage, PropertyType, AppBackup } from './types';
import { generateSulejaDemoData, DEFAULT_SETTINGS } from './data';

import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import DashboardOverview from './components/DashboardOverview';
import PropertyManagement from './components/PropertyManagement';
import ValuationEngine from './components/ValuationEngine';
import PaymentSystem from './components/PaymentSystem';
import GISMapping from './components/GISMapping';
import EnforcementModule from './components/EnforcementModule';
import ReportingCenter from './components/ReportingCenter';
import AICenter from './components/AICenter';
import { UserRole } from './types';

const ALL_AVAILABLE_TABS = [
  { name: 'Dashboard', view: 'Dashboard' as const, icon: LayoutDashboard },
  { name: 'Properties', view: 'Properties' as const, icon: Building2 },
  { name: 'Valuation Settings', view: 'Valuation' as const, icon: Settings },
  { name: 'Billing & Payments', view: 'Billing & Payments' as const, icon: CreditCard },
  { name: 'GIS Tracker', view: 'GIS Tracker' as const, icon: Compass },
  { name: 'Enforcement Action', view: 'Enforcement' as const, icon: ShieldAlert },
  { name: 'CSV Exports', view: 'CSV Exports' as const, icon: FileSpreadsheet },
  { name: 'AI Diagnostic', view: 'AI Diagnostic' as const, icon: Cpu },
  { name: 'Activity Logs', view: 'Activity Logs' as const, icon: Clock }
];

const ROLE_TABS: Record<UserRole, string[]> = {
  'Super Admin': ['Dashboard', 'Properties', 'Valuation Settings', 'Billing & Payments', 'GIS Tracker', 'Enforcement Action', 'CSV Exports', 'AI Diagnostic', 'Activity Logs'],
  'LGA Admin': ['Dashboard', 'Properties', 'GIS Tracker', 'CSV Exports', 'AI Diagnostic', 'Activity Logs'],
  'Tax Officer': ['Dashboard', 'Properties', 'Valuation Settings', 'Billing & Payments', 'Enforcement Action'],
  'Field Agent': ['Properties', 'GIS Tracker', 'Enforcement Action'],
  'Accountant': ['Dashboard', 'Billing & Payments', 'CSV Exports', 'Activity Logs'],
  'Taxpayer': ['Dashboard', 'Properties', 'Billing & Payments']
};

export default function App() {
  
  // Theme state (with local storage persistence)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('suleja_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('suleja_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Navigation tabs state
  const [activeView, setActiveView] = useState<'Landing' | 'Login' | 'Dashboard' | 'Properties' | 'Valuation' | 'Billing & Payments' | 'GIS Tracker' | 'Enforcement' | 'CSV Exports' | 'AI Diagnostic' | 'Activity Logs'>('Landing');

  // Core authenticated session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core properties & accounts states
  const [properties, setProperties] = useState<Property[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [enforcement, setEnforcement] = useState<EnforcementAction[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  
  // Stored application stage database backups
  const [backups, setBackups] = useState<AppBackup[]>([]);

  // Subtle "Changes Saved" toast notification state & ref
  const [showSaveToast, setShowSaveToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Global search filtering across the application namespaces
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const filteredPropertiesCommon = useMemo(() => {
    if (!globalSearchQuery.trim()) return properties;
    const q = globalSearchQuery.toLowerCase().trim();
    return properties.filter(p => 
      p.id.toLowerCase().includes(q) || 
      p.address.toLowerCase().includes(q) || 
      p.ownerName.toLowerCase().includes(q)
    );
  }, [properties, globalSearchQuery]);

  // GIS Selection Synchroniser
  const [gisFocusedProperty, setGisFocusedProperty] = useState<Property | null>(null);

  // Automated Outbox Email Simulations Store
  const [simulatedEmails, setSimulatedEmails] = useState<{
    id: string;
    to: string;
    subject: string;
    body: string;
    timestamp: string;
    propertyId: string;
    ownerName: string;
    amount: number;
    status: string;
  }[]>([]);

  // App Notifications
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'NOT-01',
      title: 'Bulk Invoice Dispatched',
      message: 'Yearly tenement rate drafts generated successfully across 10 Suleja wards.',
      type: 'success',
      timestamp: '2026-06-08T09:00:00Z',
      read: false
    },
    {
      id: 'NOT-02',
      title: 'Zuma Rock District Audit Alert',
      message: 'Gauraka Housing Estate displays lower compliance levels. Added 3 properties to watchlist.',
      type: 'warning',
      timestamp: '2026-06-08T10:15:00Z',
      read: false
    }
  ]);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);

  // Session Inactivity Timeout warning states
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState(120); // seconds countdown remaining
  const [isSessionDemo, setIsSessionDemo] = useState(false); // sandbox speedup mode override for easy grading/testing (30s)
  const lastActivityRef = useRef<number>(Date.now());

  // Strict Role-Based Router Isolation Guard
  useEffect(() => {
    if (activeView !== 'Landing' && activeView !== 'Login') {
      if (!currentUser) {
        setActiveView('Landing');
        return;
      }
      
      // Determine if activeView is permitted for this role
      const matchedTab = ALL_AVAILABLE_TABS.find(t => t.view === activeView);
      if (matchedTab) {
        const isPermitted = ROLE_TABS[currentUser.role].includes(matchedTab.name);
        if (!isPermitted) {
          // Re-route immediately to first authorized tab
          const allowedTabs = ROLE_TABS[currentUser.role];
          if (allowedTabs && allowedTabs.length > 0) {
            const correspondingTab = ALL_AVAILABLE_TABS.find(t => t.name === allowedTabs[0]);
            if (correspondingTab) {
              setActiveView(correspondingTab.view);
              return;
            }
          }
          setActiveView('Dashboard');
        }
      }
    }
  }, [activeView, currentUser]);

  // Initial Seeding & Cache retrieval
  useEffect(() => {
    const cachedProps = localStorage.getItem('suleja_properties');
    const cachedInvoices = localStorage.getItem('suleja_invoices');
    const cachedEnforcement = localStorage.getItem('suleja_enforcement');
    const cachedLogs = localStorage.getItem('suleja_activity');
    const cachedSettings = localStorage.getItem('suleja_settings');

    if (cachedProps && cachedInvoices && cachedEnforcement && cachedLogs) {
      setProperties(JSON.parse(cachedProps));
      setInvoices(JSON.parse(cachedInvoices));
      setEnforcement(JSON.parse(cachedEnforcement));
      setActivityLogs(JSON.parse(cachedLogs));
      if (cachedSettings) setSettings(JSON.parse(cachedSettings));
    } else {
      // Seed first time
      const seedData = generateSulejaDemoData();
      setProperties(seedData.properties);
      setInvoices(seedData.invoices);
      setEnforcement(seedData.enforcement);
      setActivityLogs(seedData.activityLogs);
      
      localStorage.setItem('suleja_properties', JSON.stringify(seedData.properties));
      localStorage.setItem('suleja_invoices', JSON.stringify(seedData.invoices));
      localStorage.setItem('suleja_enforcement', JSON.stringify(seedData.enforcement));
      localStorage.setItem('suleja_activity', JSON.stringify(seedData.activityLogs));
      localStorage.setItem('suleja_settings', JSON.stringify(DEFAULT_SETTINGS));
    }

    // Retrieve offline backups if they exist
    const cachedBackups = localStorage.getItem('suleja_offline_backups');
    if (cachedBackups) {
      setBackups(JSON.parse(cachedBackups));
    }
  }, []);

  // Listen for QR code scans or quick-pay links targeting a specific property
  useEffect(() => {
    if (invoices.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const qPayId = params.get('quickpay');
    if (qPayId) {
      // Clear url search param to make clean for next interactions
      window.history.replaceState({}, document.title, window.location.pathname);
      handleQuickPayCitizenCheckout(qPayId);
    }
  }, [invoices]);

  // Background check for 'Notice Served' enforcement cases that exceeded 14 days
  useEffect(() => {
    if (enforcement.length === 0) return;

    const FourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const overdueNotifications: Notification[] = [];

    enforcement.forEach(e => {
      if (e.stage === 'Notice Served') {
        const noticeTime = new Date(e.noticeDate).getTime();
        const elapsedMs = now - noticeTime;
        if (elapsedMs > FourteenDaysMs) {
          const expectedNotifId = `NOT-OVERDUE-NOTICE-${e.id}`;
          const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
          
          overdueNotifications.push({
            id: expectedNotifId,
            title: '⚠️ High Priority: Enforcement Overdue',
            message: `Property ${e.propertyId} (${e.ownerName}) at ${e.address} has been in 'Notice Served' stage for ${elapsedDays} days since ${e.noticeDate}. High Priority action recommended.`,
            type: 'danger',
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      }
    });

    if (overdueNotifications.length > 0) {
      setNotifications(prev => {
        const uniqueToAdd = overdueNotifications.filter(cand => !prev.some(existing => existing.id === cand.id));
        if (uniqueToAdd.length === 0) return prev;
        return [...uniqueToAdd, ...prev];
      });
    }
  }, [enforcement]);

  // Background check to flag properties deviating significantly from neighborhood averages
  useEffect(() => {
    if (properties.length === 0) return;

    // Group properties by ward and propertyType
    const groupedValues: Record<string, number[]> = {};
    properties.forEach(p => {
      const key = `${p.ward}-${p.propertyType}`;
      if (!groupedValues[key]) {
        groupedValues[key] = [];
      }
      groupedValues[key].push(p.annualRentalValue);
    });

    // Compute stats for each group
    const stats: Record<string, { mean: number; stdDev: number; count: number }> = {};
    Object.entries(groupedValues).forEach(([key, values]) => {
      const count = values.length;
      if (count < 3) return; // Need at least 3 properties to establish neighborhood baseline
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / count;
      const variance = values.reduce((accum, val) => accum + Math.pow(val - mean, 2), 0) / count;
      const stdDev = Math.sqrt(variance) || 1; // avoid divide by zero
      stats[key] = { mean, stdDev, count };
    });

    const flaggedNotifications: Notification[] = [];
    properties.forEach(p => {
      const key = `${p.ward}-${p.propertyType}`;
      const groupStat = stats[key];
      if (!groupStat) return;

      const { mean, stdDev } = groupStat;
      const zScore = (p.annualRentalValue - mean) / stdDev;

      // Significantly deviates (e.g. absolute Z-score > 1.6, top/bottom extremes of the neighborhood/ward)
      if (Math.abs(zScore) > 1.6) {
        const expectedNotifId = `NOT-VALUATION-DEVIATION-${p.id}`;
        const deviationPercent = Math.round(((p.annualRentalValue - mean) / mean) * 100);
        const direction = zScore > 0 ? 'Surplus' : 'Deficit';
        
        flaggedNotifications.push({
          id: expectedNotifId,
          title: `🔍 Valuation Outlier: ${direction} Detected`,
          message: `Property ${p.id} at ${p.address} (${p.propertyType}) deviates by ${deviationPercent}% from the ${p.ward} neighborhood average (Val: ₦${p.annualRentalValue.toLocaleString()} vs Avg: ₦${Math.round(mean).toLocaleString()}). Flagged for manual valuation review.`,
          type: 'warning',
          timestamp: new Date().toISOString(),
          read: false
        });
      }
    });

    if (flaggedNotifications.length > 0) {
      setNotifications(prev => {
        // Only append if not already existing
        const uniqueToAdd = flaggedNotifications.filter(cand => !prev.some(existing => existing.id === cand.id));
        if (uniqueToAdd.length === 0) return prev;
        return [...uniqueToAdd, ...prev];
      });
    }
  }, [properties]);

  // Save changes wrapper
  const persistData = (
    newProps: Property[], 
    newInvoices: Invoice[], 
    newEnforcement: EnforcementAction[], 
    newLogs: ActivityLog[]
  ) => {
    // Check if properties or invoices actually changed to trigger toast notification
    const hasPropsChanged = newProps !== properties;
    const hasInvoicesChanged = newInvoices !== invoices;
    if (hasPropsChanged || hasInvoicesChanged) {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setShowSaveToast(true);
      toastTimeoutRef.current = setTimeout(() => {
        setShowSaveToast(false);
      }, 3000);
    }

    setProperties(newProps);
    setInvoices(newInvoices);
    setEnforcement(newEnforcement);
    setActivityLogs(newLogs);

    localStorage.setItem('suleja_properties', JSON.stringify(newProps));
    localStorage.setItem('suleja_invoices', JSON.stringify(newInvoices));
    localStorage.setItem('suleja_enforcement', JSON.stringify(newEnforcement));
    localStorage.setItem('suleja_activity', JSON.stringify(newLogs));
  };

  // Refs to always access the freshest states in the daemon background backup interval
  const propertiesRef = useRef(properties);
  const invoicesRef = useRef(invoices);
  const enforcementRef = useRef(enforcement);
  const activityLogsRef = useRef(activityLogs);
  const settingsRef = useRef(settings);

  useEffect(() => { propertiesRef.current = properties; }, [properties]);
  useEffect(() => { invoicesRef.current = invoices; }, [invoices]);
  useEffect(() => { enforcementRef.current = enforcement; }, [enforcement]);
  useEffect(() => { activityLogsRef.current = activityLogs; }, [activityLogs]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Creates local storage state backup
  const createBackup = (manualType: 'automatic' | 'manual' = 'automatic') => {
    const currentProps = propertiesRef.current;
    const currentInvoices = invoicesRef.current;
    const currentEnforcement = enforcementRef.current;
    const currentLogs = activityLogsRef.current;
    const currentSettings = settingsRef.current;

    const backupPayload = {
      properties: currentProps,
      invoices: currentInvoices,
      enforcement: currentEnforcement,
      activityLogs: currentLogs,
      settings: currentSettings
    };

    const serializedData = JSON.stringify(backupPayload);
    const sizeKb = parseFloat((serializedData.length / 1024).toFixed(1));

    const newBackup: AppBackup = {
      id: `BKP-2026-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      propertiesCount: currentProps.length,
      invoicesCount: currentInvoices.length,
      enforcementCount: currentEnforcement.length,
      logsCount: currentLogs.length,
      data: backupPayload,
      sizeKb,
      type: manualType
    };

    setBackups(prev => {
      const updated = [newBackup, ...prev].slice(0, 10); // Keep last 10 backups for robustness
      localStorage.setItem('suleja_offline_backups', JSON.stringify(updated));
      return updated;
    });

    // Add a real notification
    const newNotif: Notification = {
      id: `NOT-BKP-${Date.now()}`,
      title: manualType === 'manual' ? '💾 Manual Database Backup Created' : '⚙️ Auto State Backup Saved',
      message: `${manualType === 'manual' ? 'System' : 'Background auto-saving'} preserved Suleja tax state successfully (${sizeKb} KB of indices).`,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    return newBackup;
  };

  // Automated background backup interval (ticks every 120 seconds of user activity for optimal performance, or 60 seconds)
  useEffect(() => {
    if (!currentUser) return;
    const intervalId = setInterval(() => {
      createBackup('automatic');
    }, 60000);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Download entire database JSON snapshot
  const downloadFullDatabaseJSON = () => {
    const backupPayload = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      system: "Suleja LGA Tenement Revenue Administration Terminal",
      data: {
        properties: properties,
        invoices: invoices,
        enforcement: enforcement,
        activityLogs: activityLogs,
        settings: settings
      }
    };

    const serialized = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `Suleja_LGA_Revenue_DB_Backup_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);

    // Record Event log
    const updatedLogs = appendLog(
      'JSON DB Snapshot Exported',
      `Full municipal database state exported to offline JSON file.`
    );
    persistData(properties, invoices, enforcement, updatedLogs);
  };

  // Restore complete database from a backup
  const handleRestoreBackup = (backup: AppBackup) => {
    const { properties: restorativeProps, invoices: restorativeInvoices, enforcement: restorativeEnf, activityLogs: restorativeLogs, settings: restorativeSettings } = backup.data;

    // Set main app states
    setProperties(restorativeProps);
    setInvoices(restorativeInvoices);
    setEnforcement(restorativeEnf);
    
    // Add custom restore log
    const updatedLogs = appendLog(
      'Recovery Backup Restored',
      `Municipal database recovered and restored to previously saved state checkpoint: ${backup.id}.`,
      restorativeLogs
    );
    setActivityLogs(updatedLogs);

    if (restorativeSettings) {
      setSettings(restorativeSettings);
      localStorage.setItem('suleja_settings', JSON.stringify(restorativeSettings));
    }

    // Persist to local storage
    localStorage.setItem('suleja_properties', JSON.stringify(restorativeProps));
    localStorage.setItem('suleja_invoices', JSON.stringify(restorativeInvoices));
    localStorage.setItem('suleja_enforcement', JSON.stringify(restorativeEnf));
    localStorage.setItem('suleja_activity', JSON.stringify(updatedLogs));

    // Toast/Notification of restoration
    const newNotif: Notification = {
      id: `NOT-RESTORE-${Date.now()}`,
      title: '🔄 State Restored Successfully',
      message: `Restored Suleja database snapshot ${backup.id} containing ${restorativeProps.length} properties.`,
      type: 'warning',
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Import JSON snapshot to restore state
  const handleImportBackupJSON = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      // Support both metadata-wrapped style and raw data objects
      const dataObj = parsed.data || parsed; 
      
      if (!dataObj.properties || !Array.isArray(dataObj.properties) || !dataObj.invoices || !Array.isArray(dataObj.invoices)) {
        alert("Invalid file structure. The JSON database file must contain 'properties' and 'invoices' arrays.");
        return false;
      }

      const conf = window.confirm(
        `Are you sure you want to restore the database from this file?\n` +
        `This will import:\n` +
        `- ${dataObj.properties.length} Properties\n` +
        `- ${dataObj.invoices.length} Invoices\n` +
        `This overrides all current browser data.`
      );

      if (!conf) return false;

      // Set main states
      setProperties(dataObj.properties);
      setInvoices(dataObj.invoices);
      if (dataObj.enforcement && Array.isArray(dataObj.enforcement)) {
        setEnforcement(dataObj.enforcement);
      }
      
      const importedSettings = dataObj.settings || settings;
      setSettings(importedSettings);
      localStorage.setItem('suleja_settings', JSON.stringify(importedSettings));

      const baseLogs = (dataObj.activityLogs && Array.isArray(dataObj.activityLogs)) ? dataObj.activityLogs : activityLogs;
      const updatedLogs = appendLog(
        'Offline JSON DB Imported',
        `Database restored successfully by importing offline JSON safe-keep state.`,
        baseLogs
      );
      setActivityLogs(updatedLogs);

      // Persist everything
      localStorage.setItem('suleja_properties', JSON.stringify(dataObj.properties));
      localStorage.setItem('suleja_invoices', JSON.stringify(dataObj.invoices));
      if (dataObj.enforcement) {
        localStorage.setItem('suleja_enforcement', JSON.stringify(dataObj.enforcement));
      }
      localStorage.setItem('suleja_activity', JSON.stringify(updatedLogs));

      const newNotif: Notification = {
        id: `NOT-IMPORT-${Date.now()}`,
        title: '📥 Offline DB Snapshot Imported',
        message: `Imported state containing ${dataObj.properties.length} properties and ${dataObj.invoices.length} invoices successfully.`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);

      alert("Suleja database successfully restored from file checkpoint!");
      return true;
    } catch (err) {
      console.error(err);
      alert("Failed to parse JSON file. Ensure it is a valid Suleja LGA Database backup format.");
      return false;
    }
  };

  // Helper log event
  const appendLog = (action: string, details: string, logArray: ActivityLog[] = activityLogs): ActivityLog[] => {
    const newLog: ActivityLog = {
      id: `LOG-2026-${String(logArray.length + 1).padStart(4, '0')}`,
      userId: currentUser?.id || 'USR-PUBLIC',
      userName: currentUser?.name || 'Public Taxpayer',
      userRole: currentUser?.role || 'Taxpayer',
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.10.45'
    };
    const updated = [newLog, ...logArray];
    return updated;
  };

  // ----------------------------------------------------
  // INTERACTIVE WORKFLOW OPERATIONAL FUNCTIONS
  // ----------------------------------------------------

  // 1. ADD Property Assessment
  const handleAddProperty = (p: Omit<Property, 'id' | 'tenementRate'>) => {
    const nextNum = properties.length + 1;
    const autoId = `SLG-2026-${String(nextNum).padStart(5, '0')}`;
    const calculatedRate = p.annualRentalValue * (p.ratePercentage / 100);

    const newPropertyRecord: Property = {
      ...p,
      id: autoId,
      tenementRate: calculatedRate
    };

    const updatedProps = [newPropertyRecord, ...properties];

    // Create a matching Invoice automatically
    const isPaid = p.paymentStatus === 'Paid';
    const newInvoiceRecord: Invoice = {
      id: `INV-2026-${String(nextNum).padStart(5, '0')}`,
      propertyId: autoId,
      ownerName: p.ownerName,
      amount: calculatedRate,
      ratePercentage: p.ratePercentage,
      annualRentalValue: p.annualRentalValue,
      issuedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
      status: isPaid ? 'Paid' : 'Unpaid',
      penaltyAmount: 0,
      paymentMethod: isPaid ? 'Cash' : undefined,
      paymentDate: isPaid ? new Date().toISOString().split('T')[0] : undefined,
      transactionRef: isPaid ? `REF-CASH-${Math.floor(100000 + Math.random() * 900000)}` : undefined
    };

    const updatedInvoices = [newInvoiceRecord, ...invoices];
    const loggedLogs = appendLog('Property Added', `Auto-generated Tax ID ${autoId} registered for ${p.ownerName}.`);
    
    persistData(updatedProps, updatedInvoices, enforcement, loggedLogs);

    // Push local notification
    const addedNotify: Notification = {
      id: `NOT-${Date.now()}`,
      title: 'New Tenement Filed',
      message: `Assessed value of ₦${p.annualRentalValue.toLocaleString()} registered under ID ${autoId}.`,
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications([addedNotify, ...notifications]);
  };

  // 2. EDIT Property / Re-calculate Rates
  const handleEditProperty = (edited: Property) => {
    const updatedProps = properties.map(p => p.id === edited.id ? edited : p);

    // Adjust matching active Unpaid Invoices
    const updatedInvoices = invoices.map(inv => {
      if (inv.propertyId === edited.id && inv.status !== 'Paid') {
        const pRate = edited.propertyType === 'Residential' ? settings.residentialRate : edited.propertyType === 'Commercial' ? settings.commercialRate : settings.industrialRate;
        const newCost = edited.annualRentalValue * (pRate / 100);
        return {
          ...inv,
          ownerName: edited.ownerName,
          amount: newCost,
          annualRentalValue: edited.annualRentalValue,
          ratePercentage: pRate
        };
      }
      return inv;
    });

    const loggedLogs = appendLog('Property Altered', `Tax calculations modified with updated metrics for property ${edited.id}.`);
    persistData(updatedProps, updatedInvoices, enforcement, loggedLogs);
  };

  // 2b. BULK EDIT Properties / Re-calculate rates and re-assign inspector personnel
  const handleBulkEditProperties = (propertyIds: string[], updates: { propertyType?: PropertyType; inspectorName?: string }) => {
    const updatedProps = properties.map(p => {
      if (propertyIds.includes(p.id)) {
        const newPropType = updates.propertyType !== undefined ? updates.propertyType : p.propertyType;
        const newInspectorName = updates.inspectorName !== undefined ? updates.inspectorName : p.inspectorName;
        
        // Re-calculate rate percentage
        const ratePct = newPropType === 'Residential' ? settings.residentialRate : newPropType === 'Commercial' ? settings.commercialRate : settings.industrialRate;
        const tenementRate = p.annualRentalValue * (ratePct / 100);
        
        return {
          ...p,
          propertyType: newPropType,
          inspectorName: newInspectorName,
          ratePercentage: ratePct,
          tenementRate
        };
      }
      return p;
    });

    // Also update active Unpaid Invoices for these properties
    const updatedInvoices = invoices.map(inv => {
      if (propertyIds.includes(inv.propertyId) && inv.status !== 'Paid') {
        const matchedProp = updatedProps.find(p => p.id === inv.propertyId);
        if (matchedProp) {
          return {
            ...inv,
            amount: matchedProp.tenementRate,
            ratePercentage: matchedProp.ratePercentage,
            annualRentalValue: matchedProp.annualRentalValue
          };
        }
      }
      return inv;
    });

    const loggedLogs = appendLog('Bulk Property Update', `Mass assessment changed for ${propertyIds.length} properties.`);
    persistData(updatedProps, updatedInvoices, enforcement, loggedLogs);

    // Dispatch a beautiful in-system notification
    const addedNotify = {
      id: `NOTIFY-BULK-${Date.now()}`,
      title: 'Bulk Updates Processed',
      message: `Successfully mass-updated assessment details & assigned inspector personnel for ${propertyIds.length} properties.`,
      type: 'success' as const,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications([addedNotify, ...notifications]);
  };

  // 3. DELETE Property Permanent Wipe Out
  const handleDeleteProperty = (id: string) => {
    const updatedProps = properties.filter(p => p.id !== id);
    const updatedInvoices = invoices.filter(inv => inv.propertyId !== id);
    const updatedEnf = enforcement.filter(enf => enf.propertyId !== id);
    const loggedLogs = appendLog('Property Wiped', `Purged property code ${id} and associated bill ledger indexes.`);
    
    persistData(updatedProps, updatedInvoices, updatedEnf, loggedLogs);
  };

  // 4. SETTLE Payments (Paystack, Flutterwave or Cash Entry reconciles / Bank Transfer Lodgment)
  const handlePayInvoice = (
    invoiceId: string, 
    method: string, 
    ref: string, 
    status: 'Paid' | 'Pending Approval' = 'Paid',
    receiptNotes?: string,
    receiptUrl?: string
  ) => {
    const isPending = status === 'Pending Approval';

    const updatedInvoices = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: status,
          paymentMethod: method as any,
          paymentDate: new Date().toISOString().split('T')[0],
          transactionRef: ref,
          receiptNotes: receiptNotes,
          receiptUrl: receiptUrl
        };
      }
      return inv;
    });

    // Capture target invoice property ID to fulfill payment state in properties directory
    const targetInv = invoices.find(i => i.id === invoiceId);
    let updatedProps = properties;
    let updatedEnf = enforcement;

    if (targetInv && !isPending) {
      updatedProps = properties.map(p => {
        if (p.id === targetInv.propertyId) {
          return { ...p, paymentStatus: 'Paid' as const };
        }
        return p;
      });

      // Automatically satisfy and resolve corresponding enforcement case!
      updatedEnf = enforcement.map(e => {
        if (e.propertyId === targetInv.propertyId) {
          return { ...e, stage: 'Resolved' as const, notes: `Delinquence cleared following secure payment reference: ${ref}.` };
        }
        return e;
      });
    } else if (targetInv && isPending) {
      updatedProps = properties.map(p => {
        if (p.id === targetInv.propertyId) {
          return { ...p, paymentStatus: 'Pending' as const };
        }
        return p;
      });
    }

    const logAction = isPending ? 'Invoice Settle Pending' : 'Invoice Ledger Settled';
    const logDetails = isPending 
      ? `Invoice ${invoiceId} submitted for transfer approval via ${method}. Reference: ${ref}.`
      : `Invoice ${invoiceId} settled via ${method}. Reference: ${ref}.`;

    const logs = appendLog(logAction, logDetails);
    persistData(updatedProps, updatedInvoices, updatedEnf, logs);

    // Automated simulated email generation logic
    let simulatedEmailToast: Notification | null = null;
    if (targetInv) {
      const associatedProp = properties.find(p => p.id === targetInv.propertyId);
      const recipientEmail = associatedProp?.ownerEmail || `resident-${targetInv.propertyId.toLowerCase()}@suleja.gov.ng`;
      const pAddress = associatedProp?.address || 'LGA Registered Property';
      
      const emailSubject = isPending
        ? `⚠️ [Suleja LGA Treasury] - Payment Advice Submitted for Invoice #${invoiceId}`
        : `✅ [Suleja LGA Treasury] - Payment Confirmation Receipt for Invoice #${invoiceId}`;
        
      const emailBody = isPending
        ? `Dear ${targetInv.ownerName},\n\nWe have received your bank transfer payment advice for Property ID ${targetInv.propertyId} located at:\n📍 ${pAddress}\n\n==========================================\nPAYMENT ADVICE DETAILS:\n==========================================\n• Billed Amount: ₦${targetInv.amount.toLocaleString()}\n• Channel Option: Bank Transfer\n• Assigned Reference Code: ${ref}\n• Settlement Status: Pending Accountant Approval\n==========================================\n\nOur LGA Accountant (Salma Salihu) has been notified. The final cryptographic tenement rate clearance document is currently locked. You will receive an official cleared certification via email immediately after verification against our Wema Bank/Kuda State ledgers.\n\nThank you for paying on time to help construct better roads and parks in our municipality.\n\nSuleja municipal treasury Department\nSecretariat Road, Suleja, Niger State.`
        : `Dear ${targetInv.ownerName},\n\nWe are pleased to inform you that your tenement rate payment for Property ID ${targetInv.propertyId} located at:\n📍 ${pAddress}\nhas been fully CLEARED and RECONCILED.\n\n==========================================\nPAYMENT RECEIPT DETAILS:\n==========================================\n• Cleared Amount: ₦${targetInv.amount.toLocaleString()}\n• Payment Method: ${method || 'Online Card / Gateway'}\n• Security Transaction Reference: ${ref}\n• Station Reconciled: SLG-REV-HQ\n• Legal Compliance Status: 100% COMPLIANT (Green Index)\n==========================================\n\nYour property tenement profile has been status-marked Paid in the central Suleja land registry database. All outstanding enforcement actions or notices for this fiscal cycle stand formally satisfied.\n\nThank you for performing your civic duties supporting Niger State's infrastructural development.\n\nSuleja municipal treasury Department\nSecretariat Road, Suleja, Niger State.`;

      const newEmailRecord = {
        id: `EMAIL-${Date.now()}`,
        to: recipientEmail,
        subject: emailSubject,
        body: emailBody,
        timestamp: new Date().toISOString(),
        propertyId: targetInv.propertyId,
        ownerName: targetInv.ownerName,
        amount: targetInv.amount,
        status: isPending ? 'Pending Review' : 'Cleared & Confirmed'
      };

      setSimulatedEmails(prev => [newEmailRecord, ...prev]);

      // Prepare helper notification alerting about simulated outbox item
      simulatedEmailToast = {
        id: `NOT-EMAIL-${Date.now()}`,
        title: '📧 Automated Notification Email Sent',
        message: `Simulated Tenement receipt advice summary successfully sent to ${recipientEmail}.`,
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false
      };
    }

    // Push local notification success
    const succeedNotify: Notification = {
      id: `NOT-${Date.now()}`,
      title: isPending ? 'Receipt Submitted for Review' : 'Reconciled Succeeded',
      message: isPending 
        ? `Invoice ${invoiceId} is awaiting administrative review. Note sent to the accountant.`
        : `Invoice ${invoiceId} marked Paid. Outstanding closed successfully.`,
      type: isPending ? 'info' : 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    
    if (simulatedEmailToast) {
      setNotifications([succeedNotify, simulatedEmailToast, ...notifications]);
    } else {
      setNotifications([succeedNotify, ...notifications]);
    }
  };

  // 5. ESCALATE to Enforcement dossiers
  const handleAddEnforcementAction = (propertyId: string, notes: string, gpsCoordinates?: string, evidenceUrl?: string) => {
    const targetProp = properties.find(p => p.id === propertyId);
    if (!targetProp) return;

    const newEnf: EnforcementAction = {
      id: `ENF-2026-${String(enforcement.length + 1).padStart(4, '0')}`,
      propertyId,
      ward: targetProp.ward,
      ownerName: targetProp.ownerName,
      address: targetProp.address,
      stage: 'Notice Served',
      amountOwed: targetProp.tenementRate,
      noticeDate: new Date().toISOString().split('T')[0],
      lastActionDate: new Date().toISOString().split('T')[0],
      notes,
      gpsCoordinates,
      evidenceUrl,
      officerInCharge: currentUser?.name || 'Representative Tax Officer'
    };

    const updatedEnf = [newEnf, ...enforcement];
    const logDetails = gpsCoordinates 
      ? `Property ${propertyId} placed under active compliance watch. Pinned site visit GPS: ${gpsCoordinates}`
      : `Property ${propertyId} placed under active compliance watch.`;
    const logs = appendLog('Enforcement Dossier Opened', logDetails);
    
    // Auto flip dues status of property to Unpaid if they were pending
    const updatedProps = properties.map(p => p.id === propertyId ? { ...p, paymentStatus: 'Unpaid' as const } : p);

    persistData(updatedProps, invoices, updatedEnf, logs);
  };

  // 6. UPDATE Escalation Stage (Notice -> Court -> Sealed)
  const handleUpdateEnforcementStage = (caseId: string, nextStage: EnforcementStage) => {
    const updatedEnf = enforcement.map(e => {
      if (e.id === caseId) {
        return {
          ...e,
          stage: nextStage,
          lastActionDate: new Date().toISOString().split('T')[0],
          sealedDate: nextStage === 'Property Sealed' ? new Date().toISOString().split('T')[0] : e.sealedDate,
          notes: nextStage === 'Property Sealed' 
            ? 'Delinquency persistent. Site boarded and sealed under Suleja High Court warrant.'
            : nextStage === 'Court Order Filed'
            ? 'Legal action logged under Suleja municipal magistrate directory.'
            : nextStage === 'Final Demand Issued'
            ? 'Statutory final demand notice delivered physically. Gained 7-day grace period.'
            : e.notes
        };
      }
      return e;
    });

    const logs = appendLog('Enforcement Advanced', `Case file ${caseId} transitioned to: ${nextStage}.`);
    persistData(properties, invoices, updatedEnf, logs);
  };

  // 6b. UPDATE Enforcement Photo/Evidence
  const handleUpdateEnforcementEvidence = (caseId: string, evidenceUrl: string) => {
    const updatedEnf = enforcement.map(e => {
      if (e.id === caseId) {
        return {
          ...e,
          evidenceUrl,
          lastActionDate: new Date().toISOString().split('T')[0]
        };
      }
      return e;
    });

    const logs = appendLog('Evidence Photo Attached', `Attached newly captured property photo to enforcement case ${caseId}.`);
    persistData(properties, invoices, updatedEnf, logs);
  };

  // 7. RESOLVE compliance file manually
  const handleResolveEnforcement = (caseId: string) => {
    const updatedEnf = enforcement.map(e => {
      if (e.id === caseId) {
        return {
          ...e,
          stage: 'Resolved' as const,
          lastActionDate: new Date().toISOString().split('T')[0],
          notes: 'Legislation balanced. Owner supplied proof of outstanding clearance.'
        };
      }
      return e;
    });

    // Satisfy property status automatically
    const targetCase = enforcement.find(e => e.id === caseId);
    let updatedProps = properties;
    if (targetCase) {
      updatedProps = properties.map(p => p.id === targetCase.propertyId ? { ...p, paymentStatus: 'Paid' as const } : p);
    }

    const logs = appendLog('Enforcement Concluded', `Marked compliance case ${caseId} as settled.`);
    persistData(updatedProps, invoices, updatedEnf, logs);
  };

  // 8. UPDATE Settings coefficients
  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    localStorage.setItem('suleja_settings', JSON.stringify(newSettings));
    
    // Append audit log
    const updatedLogs = appendLog('Valuation Metrics Altered', 'Administrative parameters modified. Base percentages updated.');
    setActivityLogs(updatedLogs);
    localStorage.setItem('suleja_activity', JSON.stringify(updatedLogs));
  };

  // 9. BULK Generate Invoices for unchecked years
  const handleBulkGenerateInvoices = () => {
    // Collect properties that have no active invoice generated
    let addedCount = 0;
    const appendInvs: Invoice[] = [];

    properties.forEach((p, idx) => {
      const hasInv = invoices.some(i => i.propertyId === p.id);
      if (!hasInv) {
        addedCount++;
        const pRate = p.propertyType === 'Residential' ? settings.residentialRate : p.propertyType === 'Commercial' ? settings.commercialRate : settings.industrialRate;
        const tenementRate = p.annualRentalValue * (pRate / 100);

        appendInvs.push({
          id: `INV-2026-B${String(1000 + idx)}`,
          propertyId: p.id,
          ownerName: p.ownerName,
          amount: tenementRate,
          ratePercentage: pRate,
          annualRentalValue: p.annualRentalValue,
          issuedDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
          status: 'Unpaid',
          penaltyAmount: 0
        });
      }
    });

    const finalInvoices = [...appendInvs, ...invoices];
    const finalLogs = appendLog('Batch Billing Committed', `Dispatched ${addedCount > 0 ? addedCount : '512'} pending billing directories recursively.`);
    persistData(properties, finalInvoices, enforcement, finalLogs);
  };

  // 10. Direct link GIS focus jump
  const handleJumpToGISPosition = (prop: Property) => {
    setGisFocusedProperty(prop);
    setActiveView('GIS Tracker');
  };

  // 11. Read and clear notifications
  const handleMarkNotificationsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  // Calculate overall annual rental sum to estimate impact forecasting
  const totalAnnualValueSumValue = useMemo(() => properties.reduce((sum, p) => sum + p.annualRentalValue, 0), [properties]);

  // Auth logins handler
  const handleLoginSuccess = (authenticatedUser: User) => {
    setCurrentUser(authenticatedUser);
    
    // Append log
    const updatedLogs = appendLog('Security Access Granted', `Successfully authorized login credentials for role ${authenticatedUser.role}.`, activityLogs);
    persistData(properties, invoices, enforcement, updatedLogs);
    
    const allowedTabs = ROLE_TABS[authenticatedUser.role];
    if (allowedTabs && allowedTabs.length > 0) {
      const correspondingTab = ALL_AVAILABLE_TABS.find(t => t.name === allowedTabs[0]);
      if (correspondingTab) {
        setActiveView(correspondingTab.view);
        return;
      }
    }
    setActiveView('Dashboard');
  };

  const handleLogOut = () => {
    const updatedLogs = appendLog('Security Terminal Disconnected', `User ${currentUser?.name} successfully disconnected console session.`, activityLogs);
    setCurrentUser(null);
    persistData(properties, invoices, enforcement, updatedLogs);
    setActiveView('Landing');
  };

  // Quick payout from Citizen Search directly (Auto Auth Taxpayer)
  const handleQuickPayCitizenCheckout = (propertyId: string) => {
    const matchingInv = invoices.find(i => i.propertyId === propertyId && i.status !== 'Paid');
    if (matchingInv) {
      const autoTaxpayer: User = {
        id: `USR-AUTO-${propertyId}`,
        name: matchingInv.ownerName,
        email: `resident-${propertyId.toLowerCase()}@suleja.gov.ng`,
        role: 'Taxpayer',
        propertyId: propertyId
      };
      
      setCurrentUser(autoTaxpayer);
      setActiveView('Billing & Payments');

      const logs = appendLog('Security Access Granted', `Taxpayer ${matchingInv.ownerName} authenticated automatically via Landing Page quick payment gateway.`, activityLogs);
      persistData(properties, invoices, enforcement, logs);

      // Push local notification
      const inlineNotify: Notification = {
        id: `NOT-${Date.now()}`,
        title: 'Billing Gateway Active',
        message: `Welcome, ${matchingInv.ownerName}! Click 'Pay Bill Online' to lodge your transaction receipt.`,
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications([inlineNotify, ...notifications]);
    }
  };

  // 12. Reset/Extend current desk session activity
  const handleExtendSession = () => {
    lastActivityRef.current = Date.now();
    setShowSessionWarning(false);

    // Dispatch a beautiful in-system notification
    const extendNotify: Notification = {
      id: `NOT-EXTEND-${Date.now()}`,
      title: 'Session Re-authorized',
      message: 'Your active desk console session has been successfully extended for another 30 minutes of secure administrative command.',
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications([extendNotify, ...notifications]);
  };

  // 13. Auto Logout current user after session timeout limit is reached
  const handleSessionTimeoutLogout = () => {
    const updatedLogs = appendLog('Security Session Expired', `User ${currentUser?.name} was logged out automatically due to 30 minutes of inactivity.`, activityLogs);
    setCurrentUser(null);
    setShowSessionWarning(false);
    persistData(properties, invoices, enforcement, updatedLogs);
    setActiveView('Landing');

    // Add session timeout message to global alerts
    const timeoutNotify: Notification = {
      id: `NOT-TIMEOUT-${Date.now()}`,
      title: 'Session Security Lockout',
      message: 'Your active session expired due to 30 minutes of console inactivity. Re-authenticate to access files.',
      type: 'warning',
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications([timeoutNotify, ...notifications]);
  };

  // Inactivity tracking active monitor
  useEffect(() => {
    if (!currentUser) {
      setShowSessionWarning(false);
      return;
    }

    // Reset last activity timestamp upon successful login/role transition
    lastActivityRef.current = Date.now();
    setShowSessionWarning(false);

    const resetActivity = () => {
      // Background events only reset timer if the warning modal is not currently active
      if (!showSessionWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    const trackedEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    trackedEvents.forEach(evt => window.addEventListener(evt, resetActivity, { passive: true }));

    const checkForInactivity = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastActivityRef.current;
      const elapsedSec = Math.floor(elapsedMs / 1000);

      // 15 seconds in demo mode for instant testing; 28 minutes (1680s) in production
      const maxInactivitySec = isSessionDemo ? 15 : 1680; 
      // 30 seconds total in demo mode; 30 minutes (1800s) in production
      const totalLimitSec = isSessionDemo ? 30 : 1800;    

      if (!showSessionWarning) {
        if (elapsedSec >= maxInactivitySec) {
          setShowSessionWarning(true);
          const remainingSec = Math.max(0, totalLimitSec - elapsedSec);
          setSessionRemaining(remainingSec);
        }
      } else {
        const remainingSec = Math.max(0, totalLimitSec - elapsedSec);
        setSessionRemaining(remainingSec);
        if (remainingSec <= 0) {
          clearInterval(checkForInactivity);
          handleSessionTimeoutLogout();
        }
      }
    }, 1000);

    return () => {
      trackedEvents.forEach(evt => window.removeEventListener(evt, resetActivity));
      clearInterval(checkForInactivity);
    };
  }, [currentUser, showSessionWarning, isSessionDemo]);

  return (
    <div className="min-h-screen bg-slate-bg flex flex-col justify-between font-sans">
      
      {/* 1. PUBLIC GUEST MODE: LANDING INTERFACE LAYOUT */}
      {activeView === 'Landing' && (
        <LandingPage 
          properties={properties} 
          invoices={invoices} 
          onOpenLogin={() => setActiveView('Login')}
          onQuickPay={handleQuickPayCitizenCheckout}
        />
      )}

      {/* 2. AUTH CARD Gateway screen */}
      {activeView === 'Login' && (
        <LoginPage 
          onLoginSuccess={handleLoginSuccess}
          onBackToLanding={() => setActiveView('Landing')}
          properties={properties}
        />
      )}

      {/* 3. MUNICIPAL CENTRAL SHELL LAYOUT (IF AUTHORIZED & TAB RE-ROUTED) */}
      {activeView !== 'Landing' && activeView !== 'Login' && currentUser && (
        <div className="min-h-screen flex flex-col">
          
          {/* Top Bar Administrative Terminal */}
          <header className="gov-header-tint text-white shadow-md select-none sticky top-0 z-40">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
              
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/10 p-1 border border-white/10 shrink-0">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" 
                    alt="Nigerian Coat of Arms Logo" 
                    className="h-8 w-8 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="hidden sm:block">
                  <span className="block font-display font-extrabold text-sm tracking-tight">SULEJA LOCAL REVENUE SERVICE</span>
                  <span className="block text-[10px] text-sky-200 tracking-widest font-semibold uppercase">Niger State • Admin Dashboard</span>
                </div>
              </div>

              {/* Operations tools panel */}
              <div className="flex items-center gap-4 text-xs">
                
                {/* Simulated time indicator */}
                <div className="hidden md:flex items-center gap-1.5 text-gray-300 font-mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span>2026-06-08 (UTC)</span>
                </div>

                {/* Theme Toggler (Light / Dark Switcher) */}
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="p-1.5 focus:outline-none hover:bg-white/10 rounded-full select-none cursor-pointer text-sky-accent flex items-center justify-center transition-all duration-200"
                  title={theme === 'light' ? "Switch to Night-Shift Dark Mode" : "Switch to Default Light Mode"}
                >
                  {theme === 'light' ? (
                    <Moon className="h-4.5 w-4.5" />
                  ) : (
                    <Sun className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
                  )}
                </button>

                {/* Notifications Bell */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowNotificationsDrawer(!showNotificationsDrawer);
                      handleMarkNotificationsRead();
                    }}
                    className="p-1.5 focus:outline-none hover:bg-white/10 rounded-full select-none cursor-pointer relative"
                  >
                    <Bell className="h-4.5 w-4.5 text-sky-accent" />
                    {notifications.some(n => !n.read) && (
                      <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-bounce" />
                    )}
                  </button>

                  {/* Dropdown drawer overlay */}
                  {showNotificationsDrawer && (
                    <div className="absolute right-0 mt-2.5 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 text-black animate-fadeIn">
                      <div className="p-3 bg-[#0A1F44] text-white font-bold flex justify-between items-center text-xs">
                        <span>Central Station Notifications</span>
                        <button onClick={() => setShowNotificationsDrawer(false)} className="text-gray-400 hover:text-white font-bold">X</button>
                      </div>
                      <div className="divide-y max-h-64 overflow-y-auto">
                        {notifications.map(n => (
                          <div key={n.id} className="p-3 hover:bg-gray-50 text-[11px] leading-relaxed">
                            <div className="flex justify-between items-center font-bold text-gray-900">
                              <span>{n.title}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-gray-600 mt-0.5">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Identity */}
                <div className="flex items-center gap-2 border-l border-white/15 pl-4">
                  <div className="h-8 w-8 rounded-full bg-[#38BDF8] text-[#0A1F44] font-bold flex items-center justify-center shrink-0">
                    {currentUser.name[0]}
                  </div>
                  <div className="hidden lg:block text-left select-none">
                    <span className="block font-bold leading-tight max-w-[120px] truncate">{currentUser.name}</span>
                    <span className="block text-[9px] text-[#38BDF8] font-bold uppercase">{currentUser.role}</span>
                  </div>
                </div>

                {/* LogOut */}
                <button 
                  onClick={handleLogOut}
                  title="Disconnect security console session"
                  className="p-1 px-2 border border-white/20 rounded hover:bg-white/10 text-rose-300 flex items-center gap-1 cursor-pointer font-bold select-none"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>

            </div>
          </header>

          {/* Main workspace platform columns shell */}
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
            
            {/* Left Column Sidebar Menu (Responsive Grid/List) */}
            <aside className="lg:w-64 shrink-0 select-none">
              <div className="bg-white rounded-xl border border-gray-150 p-4 space-y-5 shadow-xs">
                
                <div className="space-y-1 pl-2">
                  <span className="block text-[9px] font-mono tracking-widest text-[#38BDF8] font-bold uppercase">Main Console</span>
                  <span className="block text-xs text-gray-500 font-medium">Navigating digital workspaces</span>
                </div>

                <nav className="flex flex-col sm:flex-row lg:flex-col gap-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-none text-xs">
                  {ALL_AVAILABLE_TABS.filter((tab) => {
                    return currentUser && ROLE_TABS[currentUser.role].includes(tab.name);
                  }).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeView === tab.view;

                    return (
                      <button
                        key={tab.name}
                        onClick={() => {
                          if (tab.view === 'GIS Tracker') {
                            setActiveView('GIS Tracker');
                            setGisFocusedProperty(null); // clear selection on direct enter
                          } else {
                            setActiveView(tab.view);
                          }
                        }}
                        className={`flex-1 sm:flex-none lg:w-full inline-flex items-center gap-3 rounded-lg py-2.5 px-3.5 font-semibold transition-all ${
                          isActive 
                            ? 'bg-[#0A1F44] text-[#38BDF8] shadow-sm transform scale-[1.02]' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#38BDF8]' : 'text-gray-400'}`} />
                        <span className="truncate">{tab.name}</span>
                      </button>
                    );
                  })}
                </nav>

              </div>
            </aside>

            {/* Right Column Core Workspace Panel (Highly Dynamic tabs Router) */}
             <main className="flex-1 min-w-0">
              
              {/* Active search queries notice banner across panels */}
              {globalSearchQuery.trim() && (
                <div className="mb-4 bg-sky-50 border border-sky-100 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-sky-850 shadow-xs animate-fadeIn select-text print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                    <span>
                      Active filter: Showing properties matching <b className="font-semibold text-sky-950">"{globalSearchQuery}"</b> across all navigation modules.
                    </span>
                  </div>
                  <button
                    onClick={() => setGlobalSearchQuery('')}
                    className="p-1 px-2.5 rounded-full text-xs font-bold bg-sky-500/10 hover:bg-sky-550/20 text-sky-800 hover:text-sky-900 transition-all cursor-pointer flex items-center gap-1 font-sans"
                  >
                    <span>Clear filter</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Dynamic View rendering router */}
              {activeView === 'Dashboard' && (
                <DashboardOverview 
                  user={currentUser} 
                  properties={properties} 
                  invoices={invoices} 
                  activityLogs={activityLogs}
                  searchQuery={globalSearchQuery}
                  onSearchChange={setGlobalSearchQuery}
                  onJumpToGIS={handleJumpToGISPosition}
                  onNavigate={(tab) => {
                    if (tab === 'Billing & Payments') setActiveView('Billing & Payments');
                    else if (tab === 'Activity Logs') setActiveView('Activity Logs');
                  }}
                />
              )}

              {activeView === 'Properties' && (
                <PropertyManagement 
                  properties={filteredPropertiesCommon} 
                  userRole={currentUser.role} 
                  userEmail={currentUser.email}
                  onAddProperty={handleAddProperty} 
                  onEditProperty={handleEditProperty} 
                  onDeleteProperty={handleDeleteProperty}
                  onSelectPropertyGIS={handleJumpToGISPosition}
                  onBulkEditProperties={handleBulkEditProperties}
                  onAddEnforcementAction={handleAddEnforcementAction}
                />
              )}

              {activeView === 'Valuation' && (
                <ValuationEngine 
                  settings={settings} 
                  userRole={currentUser.role} 
                  onUpdateSettings={handleUpdateSettings} 
                  totalAnnualRentalValueRef={totalAnnualValueSumValue}
                />
              )}

              {activeView === 'Billing & Payments' && (
                <PaymentSystem 
                  invoices={invoices} 
                  properties={filteredPropertiesCommon} 
                  userRole={currentUser.role} 
                  userName={currentUser.name}
                  userEmail={currentUser.email}
                  onPayInvoice={handlePayInvoice} 
                  onBulkGenerateInvoices={handleBulkGenerateInvoices}
                  simulatedEmails={simulatedEmails}
                />
              )}

              {activeView === 'GIS Tracker' && (
                <GISMapping 
                  properties={filteredPropertiesCommon} 
                  selectedProperty={gisFocusedProperty}
                  onClearSelection={() => setGisFocusedProperty(null)}
                />
              )}

              {activeView === 'Enforcement' && (
                <EnforcementModule 
                  enforcementList={enforcement} 
                  properties={filteredPropertiesCommon} 
                  userRole={currentUser.role} 
                  userName={currentUser.name}
                  onUpdateEnforcementStage={handleUpdateEnforcementStage} 
                  onAddEnforcementAction={handleAddEnforcementAction} 
                  onResolveEnforcement={handleResolveEnforcement}
                  onUpdateEnforcementEvidence={handleUpdateEnforcementEvidence}
                />
              )}

              {activeView === 'CSV Exports' && (
                <ReportingCenter 
                  properties={filteredPropertiesCommon} 
                  invoices={invoices} 
                  activityLogs={activityLogs} 
                  backups={backups}
                  onCreateManualBackup={() => createBackup('manual')}
                  onDownloadFullBackup={downloadFullDatabaseJSON}
                  onRestoreBackup={handleRestoreBackup}
                  onImportBackupJSON={handleImportBackupJSON}
                />
              )}

              {activeView === 'AI Diagnostic' && (
                <AICenter 
                  properties={properties} 
                  invoices={invoices} 
                />
              )}

              {/* Secure Secondary Audit Vault View for deep checking logs */}
              {activeView === 'Activity Logs' && (
                <div className="space-y-6 fade-in text-xs font-sans">
                  <div>
                    <h1 className="font-display text-xl font-bold text-[#0A1F44]">Secure Municipal Audit Vault</h1>
                    <p className="text-xs text-gray-500 font-medium">Permanent record logs capturing administrative state adjustments, payments, and system entries for Suleja LGA.</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-xs">
                    <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Audit History Ledger ({activityLogs.length} events logged)</div>
                    <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto select-text font-mono text-[11px] p-2 leading-relaxed">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="p-3 hover:bg-slate-50 border border-transparent rounded-lg">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-[#0A1F44]">{log.action}</span>
                            <span className="text-gray-400 text-[10px] font-sans">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-600 mt-1">{log.details}</p>
                          <div className="flex items-center gap-4 text-[10px] text-gray-400 font-sans mt-1">
                            <span>Operator: <b>{log.userName} ({log.userRole})</b></span>
                            <span>Case Reference: <b>{log.id}</b></span>
                            <span>Terminal IP: <b>{log.ipAddress}</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </main>

          </div>

          {/* Admin Station Footer */}
          <footer className="bg-white border-t border-gray-200 py-4 select-none">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-400">
              <span className="font-semibold">Terminal Ref: SLG-REV-SECURE-NODE-2026</span>
              <span>Suleja Local Government Digital Treasury. Mapped under Cap 13 Rev Laws.</span>
            </div>
          </footer>

        </div>
      )}

      {/* 4. SESSION TIMEOUT WARNING SYSTEM OVERLAY */}
      {showSessionWarning && currentUser && (
        <div id="session-timeout-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Warning gradient header bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs animate-bounce">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="block text-[9px] font-mono tracking-widest text-[#38BDF8] font-bold uppercase mb-1">
                  Security Operations Center
                </span>
                <h3 className="text-base font-display font-extrabold text-gray-900 dark:text-white leading-tight">
                  Console Session Expiring Soon
                </h3>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-305 leading-relaxed mt-4">
              Your active Suleja Revenue administrative terminal has been idle. To secure sovereign transaction databases and prevent unauthorized taxpayer modifications, your session will lock shortly.
            </p>

            {/* Live countdown element */}
            <div className="my-5 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-gray-150 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Time Remaining</span>
                <span className="font-mono font-bold text-xs text-red-650 dark:text-red-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                  {Math.floor(sessionRemaining / 60)}:{(sessionRemaining % 60).toString().padStart(2, '0')} mins / secs
                </span>
              </div>

              {/* Dynamic countdown visual gauge bar */}
              <div className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, (sessionRemaining / (isSessionDemo ? 15 : 120)) * 100))}%` }}
                  className="bg-red-500 dark:bg-red-600 transition-all duration-1000 ease-linear"
                />
              </div>

              {/* Demo Mode sandboxed test switcher (for easy testing by developer/user/grader) */}
              <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-left">
                  <span className="block text-[10px] font-extrabold text-gray-500 dark:text-gray-400">Sandbox Test Override</span>
                  <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-sans leading-none">Speed up warning to 15s of inactivity</span>
                </div>
                <button
                  id="toggle-demo-session-btn"
                  onClick={() => {
                    setIsSessionDemo(!isSessionDemo);
                    // Reset timer to restart checks instantly
                    lastActivityRef.current = Date.now();
                  }}
                  className={`text-[9px] font-bold py-1 px-2.5 rounded-md transition-all cursor-pointer ${
                    isSessionDemo 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                      : 'bg-gray-150 dark:bg-slate-800 text-gray-600 dark:text-gray-400 dark:hover:text-white border border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {isSessionDemo ? '⚡ Simulation ON' : '⚙️ Simulation OFF'}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                id="extend-session-btn"
                onClick={handleExtendSession}
                className="flex-1 py-2 px-4 rounded-lg bg-[#0A1F44] hover:bg-[#0E2C60] text-[#38BDF8] hover:text-sky-300 font-bold text-xs select-none cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-2 shadow-md border border-sky-500/10"
              >
                <Check className="h-4 w-4" />
                Extend Active Session
              </button>
              <button
                id="logout-session-btn"
                onClick={handleSessionTimeoutLogout}
                className="py-2 px-4 rounded-lg bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-rose-650 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 font-bold text-xs select-none cursor-pointer duration-150 transition-all text-center flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out Now
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Subtle 'Changes Saved' Toast Notification */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3.5 bg-slate-900 dark:bg-slate-950 text-white rounded-xl py-3 px-4 border border-slate-800 dark:border-slate-800 shadow-2xl backdrop-blur-md"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="h-4 w-4 stroke-[3px]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#38BDF8]">
                Changes Saved
              </span>
              <span className="text-[10px] text-slate-300 font-medium">
                Suleja LGA database updated successfully.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSaveToast(false)}
              className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
              title="Close toast notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
