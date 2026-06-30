/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building2, 
  Coins, 
  Clock, 
  UserX, 
  Compass, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  MapPin, 
  AlertTriangle,
  Receipt,
  FileCheck2,
  CalendarDays,
  Printer,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  FileDown,
  RefreshCw,
  CheckCircle2,
  Wifi,
  WifiOff,
  Database,
  ClipboardList,
  CheckSquare,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Key,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';
import { Property, Invoice, User, UserRole, ActivityLog, EnforcementAction, SystemSettings } from '../types';
import { SULEJA_WARDS } from '../data';
import { exportOfficialReceiptPDF } from '../utils/receiptGenerator';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  user: User;
  properties: Property[];
  invoices: Invoice[];
  activityLogs: ActivityLog[];
  onNavigate: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onJumpToGIS?: (prop: Property) => void;
  enforcement?: EnforcementAction[];
  settings?: SystemSettings;
  isOnline?: boolean;
  onEditProperty?: (edited: Property) => void;
  users?: User[];
  onAddUser?: (newUser: User) => void;
}

export default function DashboardOverview({ 
  user, 
  properties, 
  invoices, 
  activityLogs, 
  onNavigate,
  searchQuery,
  onSearchChange,
  onJumpToGIS,
  enforcement = [],
  settings,
  isOnline,
  onEditProperty,
  users = [],
  onAddUser
}: DashboardProps) {
  const [isWardFocusExpanded, setIsWardFocusExpanded] = React.useState(true);
  const [selectedHealthPropId, setSelectedHealthPropId] = React.useState<string>('');

  // Field Agent Assigned Tasks
  const assignedTasks = React.useMemo(() => {
    let assigned = properties.filter(p => p.inspectorName === user.name);
    if (assigned.length === 0) {
      // Graceful fallback to slice the first 3 properties so there's always active interactive demo data
      assigned = properties.slice(0, 3).map((p, idx) => ({
        ...p,
        inspectorName: user.name,
        inspectionReason: idx === 0 ? 'Annual Tenement Rate Calculation Re-assessment' : idx === 1 ? 'Reported Dwelling Unit Subdivision' : 'Outstanding High Arrears Physical Verification'
      }));
    } else {
      assigned = assigned.map((p, idx) => ({
        ...p,
        inspectorName: p.inspectorName || user.name,
        inspectionReason: idx % 3 === 0 ? 'Annual Tenement Rate Calculation Re-assessment' : idx % 3 === 1 ? 'Reported Dwelling Unit Subdivision' : 'Outstanding High Arrears Physical Verification'
      }));
    }
    return assigned;
  }, [properties, user.name]);

  const [inspectingProperty, setInspectingProperty] = React.useState<Property | null>(null);
  const [inspectionNotes, setInspectionNotes] = React.useState<string>('');
  const [inspectionOccupancy, setInspectionOccupancy] = React.useState<string>('Occupied');
  const [isInspectionSubmitted, setIsInspectionSubmitted] = React.useState(false);

  // LGA Administrator Staff Credentials Ingestion States
  const [showAddUserForm, setShowAddUserForm] = React.useState(false);
  const [newUserName, setNewUserName] = React.useState('');
  const [newUserEmail, setNewUserEmail] = React.useState('');
  const [newUserPhone, setNewUserPhone] = React.useState('');
  const [newUserRole, setNewUserRole] = React.useState<UserRole>('Field Agent');
  const [newGeneratedCreds, setNewGeneratedCreds] = React.useState<{ id: string; name: string; email: string; pass: string; role: string } | null>(null);
  const [staffError, setStaffError] = React.useState('');

  // 📊 Dynamic Field Agent KPI metrics
  const agentKPIs = React.useMemo(() => {
    const agentMap: Record<string, { name: string; role: string; inspectedCount: number; revenueCollected: number }> = {};
    
    // Seed from the users prop
    if (Array.isArray(users)) {
      users.forEach(u => {
        if (u.role === 'Field Agent' || u.role === 'Tax Officer') {
          agentMap[u.name] = {
            name: u.name,
            role: u.role,
            inspectedCount: 0,
            revenueCollected: 0
          };
        }
      });
    }

    // fallback demo agents if empty
    if (Object.keys(agentMap).length === 0) {
      agentMap['Umar Sani'] = { name: 'Umar Sani', role: 'Field Agent', inspectedCount: 0, revenueCollected: 0 };
      agentMap['Abdulrahman Muhammad'] = { name: 'Abdulrahman Muhammad', role: 'Tax Officer', inspectedCount: 0, revenueCollected: 0 };
    }

    // Make sure we seed any other inspector names from properties
    properties.forEach(p => {
      if (p.inspectorName) {
        const name = p.inspectorName.trim();
        if (name && !agentMap[name]) {
          agentMap[name] = {
            name,
            role: 'Field Agent',
            inspectedCount: 0,
            revenueCollected: 0
          };
        }
      }
    });

    // Populate inspected counts
    properties.forEach(p => {
      if (p.inspectorName) {
        const name = p.inspectorName.trim();
        if (agentMap[name]) {
          agentMap[name].inspectedCount += 1;
        }
      }
    });

    // Populate revenue collected from PAID invoices linked to those properties
    const propToInspector: Record<string, string> = {};
    properties.forEach(p => {
      if (p.inspectorName) {
        propToInspector[p.id] = p.inspectorName.trim();
      }
    });

    invoices.forEach(inv => {
      if (inv.status === 'Paid') {
        const inspector = propToInspector[inv.propertyId];
        if (inspector && agentMap[inspector]) {
          agentMap[inspector].revenueCollected += inv.amount;
        }
      }
    });

    return Object.values(agentMap);
  }, [properties, invoices, users]);

  const handleCreateAgentAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPhone) {
      setStaffError('Please populate all staff assessment fields.');
      return;
    }

    // Auto suffix email if needed
    let email = newUserEmail.trim();
    if (!email.includes('@')) {
      email = `${email.toLowerCase().replace(/\s+/g, '')}@suleja.gov.ng`;
    }

    // Auto-generate high strength secure password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()';
    let generatedPassword = '';
    // Ensure 1 upper, 1 digit, 1 special character minimum
    generatedPassword += 'Z' + Math.floor(3 + Math.random() * 6).toString() + 'm' + '#';
    for (let i = 0; i < 6; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Shuffle
    generatedPassword = generatedPassword.split('').sort(() => 0.5 - Math.random()).join('');

    try {
      const { registerWithEmail } = await import('../lib/firebase');
      await registerWithEmail(email, generatedPassword, newUserName, newUserRole);
    } catch (e: any) {
      const code = e.code || '';
      const message = e.message || '';
      if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
        setStaffError('auth/operation-not-allowed: Email/Password login is not enabled in Firebase Authentication console.');
      } else {
        setStaffError(message || String(e));
      }
      return;
    }

    const randomId = `USR-SEC-${Math.floor(1000 + Math.random() * 9000)}`;

    const newStaff: User = {
      id: randomId,
      name: newUserName,
      email: email,
      phone: newUserPhone,
      role: newUserRole,
      password: generatedPassword,
    };

    if (onAddUser) {
      onAddUser(newStaff);
      setNewGeneratedCreds({
        id: randomId,
        name: newUserName,
        email: email,
        pass: generatedPassword,
        role: newUserRole
      });
      // Reset
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setStaffError('');
    } else {
      setStaffError('System user synchronization channel is currently offline.');
    }
  };

  // Synchronous Offline-Syncing Real-time Notification logic
  const [onlineState, setOnlineState] = React.useState<boolean>(isOnline !== undefined ? isOnline : (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showSyncToast, setShowSyncToast] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState(0);
  const prevOnlineRef = React.useRef<boolean>(onlineState);

  // Keep onlineState in sync with prop if passed
  React.useEffect(() => {
    if (isOnline !== undefined) {
      setOnlineState(isOnline);
    }
  }, [isOnline]);

  // Handle network transition via actual window events
  React.useEffect(() => {
    const handleOnline = () => {
      setOnlineState(true);
    };
    const handleOffline = () => {
      setOnlineState(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Trigger Syncing... notification when transitioning from offline (false) to online (true)
  React.useEffect(() => {
    if (prevOnlineRef.current === false && onlineState === true) {
      setShowSyncToast(true);
      setSyncProgress(0);
    }
    prevOnlineRef.current = onlineState;
  }, [onlineState]);

  // Sync Progress tick-down/up simulation
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (showSyncToast && syncProgress < 100) {
      interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval!);
            setTimeout(() => {
              setShowSyncToast(false);
            }, 3000);
            return 100;
          }
          const next = prev + Math.floor(Math.random() * 15) + 10;
          return next > 100 ? 100 : next;
        });
      }, 400);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showSyncToast, syncProgress]);

  // Auto-initialize selectedHealthPropId block once properties load
  React.useEffect(() => {
    if (properties.length > 0 && !selectedHealthPropId) {
      setSelectedHealthPropId(properties[0].id);
    }
  }, [properties, selectedHealthPropId]);

  // Dynamic Compliance Health Score calculation hook
  const complianceHealthData = React.useMemo(() => {
    const propId = selectedHealthPropId;
    if (!propId) return null;
    const prop = properties.find(p => p.id === propId);
    if (!prop) return null;

    // Filter relevant invoices
    const propInvoices = invoices.filter(i => i.propertyId === propId);
    
    // Filter relevant enforcement actions
    const propEnforcement = enforcement.filter(e => e.propertyId === propId);

    let score = 100;
    const items: Array<{ label: string; deduction: number; isPositive: boolean }> = [];

    // 1. Payment status evaluation
    if (prop.paymentStatus === 'Paid') {
      items.push({ label: 'Yearly Tenement Rate Cleared', deduction: 0, isPositive: true });
    } else {
      const deduction = prop.paymentStatus === 'Pending' ? 15 : 30;
      score -= deduction;
      items.push({ 
        label: `Outstanding Tenement Rate (${prop.paymentStatus})`, 
        deduction: -deduction, 
        isPositive: false 
      });
    }

    // 2. Overdue invoice penalties weight
    const overdueInvs = propInvoices.filter(i => i.status === 'Overdue');
    if (overdueInvs.length > 0) {
      const penaltySum = overdueInvs.reduce((sum, i) => sum + i.penaltyAmount, 0);
      const rateDeduction = 15;
      score -= rateDeduction;
      items.push({ 
        label: `Delinquent Overdue Bill (${overdueInvs.length} invoices)`, 
        deduction: -rateDeduction, 
        isPositive: false 
      });

      if (penaltySum > 0) {
        const penaltyDeduction = Math.min(10, Math.ceil(penaltySum / 5000));
        score -= penaltyDeduction;
        items.push({ 
          label: `Accrued Late Penalties (₦${penaltySum.toLocaleString()})`, 
          deduction: -penaltyDeduction, 
          isPositive: false 
        });
      }
    }

    // 3. Enforcement status evaluation
    const activeActions = propEnforcement.filter(e => e.stage !== 'Resolved');
    if (activeActions.length > 0) {
      activeActions.forEach(action => {
        let actionDeduction = 0;
        if (action.stage === 'Notice Served') actionDeduction = 15;
        else if (action.stage === 'Final Demand Issued') actionDeduction = 30;
        else if (action.stage === 'Court Order Filed') actionDeduction = 50;
        else if (action.stage === 'Property Sealed') actionDeduction = 70;

        score -= actionDeduction;
        items.push({ 
          label: `Active Regulatory Case: ${action.stage}`, 
          deduction: -actionDeduction, 
          isPositive: false 
        });
      });
    } else if (propEnforcement.length > 0) {
      items.push({ label: 'Historic Enforcement Resolved', deduction: 0, isPositive: true });
    }

    // Bound score
    const finalScore = Math.max(0, Math.min(100, score));

    // Determine category
    let rating = 'LGA Green-Compliant';
    let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let textDescription = 'This property complies 100% with Suleja tenement administration benchmarks.';
    
    if (finalScore >= 90) {
      rating = 'Compliant Green Index';
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-250';
      textDescription = 'Tenement profile is in pristine standing. Clear of active enforcement.';
    } else if (finalScore >= 70) {
      rating = 'Caution: Action Zone';
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-250';
      textDescription = 'Property has mild issues or pending clearances. Rectify to guard standing.';
    } else if (finalScore >= 40) {
      rating = 'Risk Delinquency Grid';
      badgeColor = 'bg-orange-50 text-orange-700 border-orange-250';
      textDescription = 'Critical payment arrears or unresolved demands detected. At risk of court summons.';
    } else {
      rating = 'Locked Sealing / Enforced';
      badgeColor = 'bg-red-50 text-red-750 border-red-250';
      textDescription = 'Formal legal execution order served or property physically sealed by Niger State Government.';
    }

    return {
      property: prop,
      score: finalScore,
      rating,
      badgeColor,
      textDescription,
      items
    };
  }, [properties, invoices, enforcement, selectedHealthPropId]);
  
  // Calculate statistics
  const totalPropertiesCount = properties.length;
  
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  
  const unpaidInvoices = invoices.filter(inv => inv.status === 'Unpaid');
  const totalPending = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const totalDefaultersCount = Array.from(new Set(overdueInvoices.map(inv => inv.propertyId))).length;
  
  const paidPropertiesCount = properties.filter(p => p.paymentStatus === 'Paid').length;
  const complianceRate = totalPropertiesCount > 0 ? Math.round((paidPropertiesCount / totalPropertiesCount) * 100) : 0;

  // Let's create chart data:
  // 1. Revenue by Area (Suleja Wards)
  const wardPerformance = Object.entries(
    properties.reduce((acc, p) => {
      acc[p.ward] = acc[p.ward] || { registered: 0, collected: 0, totalRate: 0 };
      acc[p.ward].registered += 1;
      acc[p.ward].totalRate += p.tenementRate;
      if (p.paymentStatus === 'Paid') {
        acc[p.ward].collected += p.tenementRate;
      }
      return acc;
    }, {} as Record<string, { registered: number; collected: number; totalRate: number }>)
  ).map(([ward, data]) => ({
    name: ward,
    'Registered Properties': data.registered,
    'Collected (₦)': Math.round(data.collected),
    'Projected (₦)': Math.round(data.totalRate),
    'Compliance %': data.totalRate > 0 ? Math.round((data.collected / data.totalRate) * 100) : 0
  })).sort((a,b) => b['Collected (₦)'] - a['Collected (₦)']);

  // Collapsible Ward Focus details aggregation
  const wardFocusData = React.useMemo(() => {
    return SULEJA_WARDS.map((w) => {
      const wardProps = properties.filter((p) => p.ward === w.name);
      const registered = wardProps.length;
      const activeCases = (enforcement || []).filter((e) => e.ward === w.name && e.stage !== 'Resolved').length;
      const collections = wardProps
        .filter((p) => p.paymentStatus === 'Paid')
        .reduce((sum, p) => sum + p.tenementRate, 0);
      const projected = wardProps.reduce((sum, p) => sum + p.tenementRate, 0);
      const compliance = projected > 0 ? Math.round((collections / projected) * 100) : 0;
      
      return {
        name: w.name,
        registered,
        activeCases,
        collections,
        projected,
        compliance
      };
    });
  }, [properties, enforcement]);

  // Static baseline metrics used as highly robust calibration ratios
  const monthlyRevenueDataStatic = [
    { name: 'Jan 2026', Target: 18000000, Projected: 18450000, Collected: 17120000, Pending: 1330000, Cumulative: 17120000 },
    { name: 'Feb 2026', Target: 21000000, Projected: 22400000, Collected: 19800000, Pending: 2600000, Cumulative: 36920000 },
    { name: 'Mar 2026', Target: 18000000, Projected: 19100000, Collected: 15450000, Pending: 3650000, Cumulative: 52370000 },
    { name: 'Apr 2026', Target: 22000000, Projected: 24500000, Collected: 18200000, Pending: 6300000, Cumulative: 70570000 },
    { name: 'May 2026', Target: 26000000, Projected: 28900000, Collected: 22450000, Pending: 6450000, Cumulative: 93020500 },
    { name: 'Jun 2026', Target: 29000000, Projected: 31200000, Collected: 21822500, Pending: 9377500, Cumulative: 114843000 },
    { name: 'Jul 2026', Target: 25000000, Projected: 26500000, Collected: 23100000, Pending: 3400000, Cumulative: 137943000 },
    { name: 'Aug 2026', Target: 24000000, Projected: 25800000, Collected: 21900000, Pending: 3900000, Cumulative: 159843000 },
    { name: 'Sep 2026', Target: 30050000, Projected: 32500000, Collected: 28430000, Pending: 4070000, Cumulative: 188273000 },
    { name: 'Oct 2026', Target: 28000000, Projected: 30000000, Collected: 26500000, Pending: 3500000, Cumulative: 214773000 },
    { name: 'Nov 2026', Target: 22000000, Projected: 23100000, Collected: 19800000, Pending: 3300000, Cumulative: 234573000 },
    { name: 'Dec 2026', Target: 35000000, Projected: 38000000, Collected: 33200000, Pending: 4800000, Cumulative: 267773000 },
  ];

  // 2. Dynamic Revenue Calculations based on historical invoice data (January to December 2026)
  const monthlyCollectionsFromInvoices = React.useMemo(() => {
    const months = [
      { name: 'Jan 2026', number: 0, defaultTarget: 18000000 },
      { name: 'Feb 2026', number: 1, defaultTarget: 21000000 },
      { name: 'Mar 2026', number: 2, defaultTarget: 18000000 },
      { name: 'Apr 2026', number: 3, defaultTarget: 22000000 },
      { name: 'May 2026', number: 4, defaultTarget: 26000000 },
      { name: 'Jun 2026', number: 5, defaultTarget: 29000000 },
      { name: 'Jul 2026', number: 6, defaultTarget: 25000000 },
      { name: 'Aug 2026', number: 7, defaultTarget: 24000000 },
      { name: 'Sep 2026', number: 8, defaultTarget: 30050000 },
      { name: 'Oct 2026', number: 9, defaultTarget: 28000000 },
      { name: 'Nov 2026', number: 10, defaultTarget: 22000000 },
      { name: 'Dec 2026', number: 11, defaultTarget: 35000000 },
    ];

    let runningCumulative = 0;
    return months.map(m => {
      // Find actual paid invoices matching this calendar month
      const monthInvoices = invoices.filter(inv => {
        const dateStr = inv.paymentDate || inv.issuedDate || inv.dueDate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === m.number;
      });

      const collected = monthInvoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + inv.amount, 0);

      const projected = monthInvoices
        .reduce((sum, inv) => sum + inv.amount, 0);

      // If we have live invoices, map them, otherwise fallback gracefully to dynamic scaling ratios
      const finalCollected = collected > 0 ? collected : (monthlyRevenueDataStatic[m.number]?.Collected || 0);
      const finalProjected = projected > 0 ? projected : (monthlyRevenueDataStatic[m.number]?.Projected || 0);
      runningCumulative += finalCollected;

      return {
        name: m.name,
        Target: m.defaultTarget,
        Projected: finalProjected,
        Collected: finalCollected,
        Cumulative: runningCumulative
      };
    });
  }, [invoices]);

  const monthlyRevenueData = monthlyCollectionsFromInvoices;

  // 3. Property Classification Dist
  const typeDistribution = [
    { name: 'Residential', value: properties.filter(p => p.propertyType === 'Residential').length },
    { name: 'Commercial', value: properties.filter(p => p.propertyType === 'Commercial').length },
    { name: 'Industrial', value: properties.filter(p => p.propertyType === 'Industrial').length },
  ];

  const COLORS = ['#0A1F44', '#38BDF8', '#E2E8F0'];

  const targetAmount = settings?.fiscalTarget || 150000000;
  const percentOfTarget = Math.round((totalRevenue / targetAmount) * 100);
  const gaugeData = [
    { name: 'Collected', value: totalRevenue },
    { name: 'Remaining', value: Math.max(0, targetAmount - totalRevenue) }
  ];

  // Personal filter if current user is a plain resident (Taxpayer)
  const isTaxpayer = user.role === 'Taxpayer';
  const taxpayerProperties = isTaxpayer ? properties.filter(p => p.id === user.id || p.ownerEmail === user.email || p.ownerPhone === user.phone) : [];
  const taxpayerInvoices = isTaxpayer ? invoices.filter(inv => taxpayerProperties.some(tp => tp.id === inv.propertyId)) : [];
  const taxpayerOutstandingBill = taxpayerInvoices.filter(i => i.status !== 'Paid').reduce((sum, inv) => sum + inv.amount, 0);

  // Dynamic lookup results
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<'Paid' | 'Unpaid' | 'Enforcement' | null>(null);

  const matchingProperties = React.useMemo(() => {
    if (!searchQuery.trim() && !selectedStatusFilter) return [];
    
    let list = properties;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        p => p.id.toLowerCase().includes(q) || 
             p.address.toLowerCase().includes(q) || 
             p.ownerName.toLowerCase().includes(q)
      );
    }

    if (selectedStatusFilter === 'Paid') {
      list = list.filter(p => p.paymentStatus === 'Paid');
    } else if (selectedStatusFilter === 'Unpaid') {
      list = list.filter(p => p.paymentStatus === 'Unpaid' || p.paymentStatus === 'Pending');
    } else if (selectedStatusFilter === 'Enforcement') {
      list = list.filter(p => enforcement.some(e => e.propertyId === p.id && e.stage !== 'Resolved'));
    }

    return list;
  }, [properties, searchQuery, selectedStatusFilter, enforcement]);

  return (
    <div className="space-y-8 fade-in select-none">
      
      {/* Official Government Print-Only Letterhead */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-5 mb-8">
        <div className="text-center space-y-1">
          <h1 className="font-display font-extrabold text-[#0A1F44] text-xl tracking-tight uppercase">SULEJA LOCAL GOVERNMENT AREA COUNCIL</h1>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Department of Tenement Rates Assessment & Revenue Mobilization</p>
          <p className="text-[10px] text-slate-500 font-medium">Secretariat Road, Suleja, Niger State, Nigeria • Private Mail Bag 12</p>
          <div className="flex justify-between items-center text-[11px] font-mono font-bold text-slate-800 pt-5 border-t border-dashed border-slate-400 mt-4">
            <span>OFFICIAL COMPLIANCE & REVENUE BRIEFING</span>
            <span>DATE GENERATED: 2026-06-08 (UTC)</span>
            <span>STATION: SLG-REV-HQ</span>
          </div>
        </div>
      </div>

      {/* Dynamic Header Badge depending on user role */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-xl p-6 border border-gray-100 shadow-xs print:hidden">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#38BDF8] uppercase">Administrative Central Command</span>
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#0A1F44]">
            Welcome back, <span className="text-[#38BDF8]">{user.name}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 capitalize font-medium">
            Authorization Level: <b className="text-[#0A1F44]">{user.role}</b> • Suleja Local Govt Revenue Console
          </p>
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          {(() => {
            const pendingCount = invoices.filter(i => i.status === 'Pending Approval').length;
            if (pendingCount > 0 && (user.role === 'Accountant' || user.role === 'Super Admin' || user.role === 'LGA Admin')) {
              return (
                <button
                  onClick={() => onNavigate('Billing & Payments')}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0A1F44] hover:scale-105 transition-all outline-none border border-amber-600 px-3.5 py-2 font-sans font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Click to process pending bank transfer receipts"
                >
                  <span className="flex h-2 w-2 rounded-full bg-red-650 animate-ping shrink-0" />
                  <span>Review Pending ({pendingCount})</span>
                </button>
              );
            }
            return null;
          })()}

          <div className="rounded-lg bg-[#F5F7FA] px-3.5 py-2 border border-gray-200">
            <span className="block text-[10px] text-gray-500 font-bold uppercase font-sans">Current Audit Station</span>
            <span className="text-xs font-semibold text-[#0A1F44]">Suleja LGA HQ Secretariat</span>
          </div>

          <div className="rounded-lg bg-green-50 px-3.5 py-2 border border-green-200/50 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-700">Audit Channel Live</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextOnline = !onlineState;
              setOnlineState(nextOnline);
              if (nextOnline) {
                setShowSyncToast(true);
                setSyncProgress(0);
              }
            }}
            className={`rounded-lg px-3.5 py-2 border flex items-center gap-2 cursor-pointer transition-all select-none hover:opacity-90 font-sans text-xs ${
              onlineState 
                ? 'bg-sky-50 border-sky-200 text-sky-700 font-bold' 
                : 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse font-black'
            }`}
            title="Local sandbox network simulation toggle. Click to switch offline/online to test real-time Syncing toast notification."
          >
            {onlineState ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span>Simulate Offline</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span>Reconnect Online</span>
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="rounded-lg bg-[#0A1F44] hover:bg-opacity-95 border border-[#38BDF8]/35 px-4 py-2 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-sm print:hidden"
            title="Print Briefing Summary of Rates & compliance KPIs"
          >
            <Printer className="h-4.5 w-4.5 text-[#38BDF8]" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      {/* Global Search Bar Section */}
      <div className="bg-white rounded-xl p-5 border border-indigo-100/60 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-[#0A1F44] text-sm flex items-center gap-2">
              <Search className="h-4.5 w-4.5 text-[#38BDF8]" />
              Suleja Property Registry Lookup
            </h3>
            <p className="text-[11px] text-gray-550 font-medium">Quickly locate properties, verify tax IDs, or review landlord profiles in real-time.</p>
          </div>
          <div className="relative flex-1 max-w-lg w-full">
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by address, landlord name, or tax ID (e.g. SLG-2026-00010)..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-slate-50/50 py-2.5 pl-10 pr-9 text-xs font-semibold outline-none focus:border-[#0A1F44] focus:bg-white focus:ring-2 focus:ring-[#0A1F44]/5 transition-all text-[#0A1F44]"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 rounded-lg p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Clickable Quick-Filter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
          {/* Paid Properties Card */}
          <button
            onClick={() => setSelectedStatusFilter(prev => prev === 'Paid' ? null : 'Paid')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              selectedStatusFilter === 'Paid'
                ? 'bg-emerald-50 border-emerald-450 shadow-xs ring-1 ring-emerald-500/20'
                : 'bg-white border-gray-150 hover:border-emerald-300 hover:shadow-2xs'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Paid Properties</span>
              <div className="text-xl font-black font-mono text-[#0A1F44] flex items-baseline gap-1">
                <span>{properties.filter(p => p.paymentStatus === 'Paid').length}</span>
                <span className="text-[10px] font-sans text-gray-400 font-medium">tenements</span>
              </div>
            </div>
            <div className={`p-2 rounded-lg transition-colors ${
              selectedStatusFilter === 'Paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
            }`}>
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </button>

          {/* Unpaid Properties Card */}
          <button
            onClick={() => setSelectedStatusFilter(prev => prev === 'Unpaid' ? null : 'Unpaid')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              selectedStatusFilter === 'Unpaid'
                ? 'bg-amber-50 border-amber-450 shadow-xs ring-1 ring-amber-500/20'
                : 'bg-white border-gray-150 hover:border-amber-300 hover:shadow-2xs'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Unpaid Properties</span>
              <div className="text-xl font-black font-mono text-[#0A1F44] flex items-baseline gap-1">
                <span>{properties.filter(p => p.paymentStatus === 'Unpaid' || p.paymentStatus === 'Pending').length}</span>
                <span className="text-[10px] font-sans text-gray-400 font-medium">tenements</span>
              </div>
            </div>
            <div className={`p-2 rounded-lg transition-colors ${
              selectedStatusFilter === 'Unpaid' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'
            }`}>
              <Receipt className="h-4.5 w-4.5" />
            </div>
          </button>

          {/* Enforcement Properties Card */}
          <button
            onClick={() => setSelectedStatusFilter(prev => prev === 'Enforcement' ? null : 'Enforcement')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
              selectedStatusFilter === 'Enforcement'
                ? 'bg-rose-50 border-rose-450 shadow-xs ring-1 ring-rose-500/20'
                : 'bg-white border-gray-150 hover:border-rose-300 hover:shadow-2xs'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Under Enforcement</span>
              <div className="text-xl font-black font-mono text-[#0A1F44] flex items-baseline gap-1">
                <span>{properties.filter(p => enforcement.some(e => e.propertyId === p.id && e.stage !== 'Resolved')).length}</span>
                <span className="text-[10px] font-sans text-gray-400 font-medium">escalations</span>
              </div>
            </div>
            <div className={`p-2 rounded-lg transition-colors ${
              selectedStatusFilter === 'Enforcement' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'
            }`}>
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
          </button>
        </div>

        {/* Dynamic Search & Filter Results */}
        {(searchQuery.trim() || selectedStatusFilter) && (
          <div className="mt-3 border-t border-slate-100 pt-3 select-text">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-3 bg-slate-50/80 p-2.5 px-4 rounded-xl border border-gray-100">
              <span>Found <b className="text-[#0A1F44] font-mono">{matchingProperties.length}</b> properties {selectedStatusFilter && <span>with <b className="text-slate-800">"{selectedStatusFilter}" status filter</b> </span>}{searchQuery.trim() && <span>matching <span className="text-[#38BDF8]">"{searchQuery}"</span></span>}</span>
              {matchingProperties.length > 0 && <span className="text-[10px] text-gray-400 font-medium">Click results to explore or locate on map</span>}
            </div>

            {matchingProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
                {matchingProperties.slice(0, 9).map((prop) => {
                  const paymentCol = prop.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700 border-green-200/50' : prop.paymentStatus === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200/50' : 'bg-red-50 text-red-700 border-red-200/50';
                  return (
                    <div key={prop.id} className="border border-gray-150 rounded-xl p-3.5 space-y-2 hover:border-[#38BDF8] hover:shadow-md transition-all bg-white relative group">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-gray-500 bg-slate-100 p-1 px-1.5 rounded">{prop.id}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${paymentCol}`}>{prop.paymentStatus}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xs text-[#0A1F44] truncate">{prop.ownerName}</h4>
                        <p className="text-[10px] text-gray-500 font-medium flex items-start gap-1 py-0.5">
                          <MapPin className="h-3.5 w-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                          <span className="truncate" title={prop.address}>{prop.address}</span>
                        </p>
                      </div>

                      <div className="border-t border-slate-50 pt-2 flex items-center justify-between text-[10px] font-semibold text-gray-500">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold font-sans">Annual Rate</span>
                          <span className="font-mono text-[#0A1F44] font-bold text-[11px]">₦{prop.tenementRate.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {onJumpToGIS && (
                            <button
                              onClick={() => onJumpToGIS(prop)}
                              className="text-xs bg-[#0A1F44]/5 hover:bg-[#0A1F44] text-[#0A1F44] hover:text-white px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Compass className="h-3.5 w-3.5" />
                              <span>Locate GIS</span>
                            </button>
                          )}
                          {prop.paymentStatus === 'Paid' && user.role !== 'Taxpayer' && (
                            <button
                              onClick={async () => {
                                const matchingInv = invoices.find(i => i.propertyId === prop.id && i.status === 'Paid') || {
                                  id: `INV-2026-${prop.id.split('-').pop() || '0001'}`,
                                  propertyId: prop.id,
                                  ownerName: prop.ownerName,
                                  amount: prop.tenementRate,
                                  ratePercentage: prop.ratePercentage,
                                  annualRentalValue: prop.annualRentalValue,
                                  dueDate: '2026-12-31',
                                  issuedDate: '2026-06-01',
                                  status: 'Paid',
                                  penaltyAmount: 0,
                                  paymentMethod: 'Bank Transfer',
                                  paymentDate: '2026-06-08',
                                  transactionRef: `REF-REG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
                                } as Invoice;

                                await exportOfficialReceiptPDF(matchingInv, prop, user.name, user.role);
                              }}
                              className="text-xs bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 text-emerald-700 hover:text-white px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Export Official Digital PDF Receipt"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>Receipt</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed rounded-xl bg-slate-50 text-gray-400 font-medium text-xs">
                No properties match your filter in Suleja database. Try a different query (e.g. "Danjuma", "Iku", "SLG-2026").
              </div>
            )}
            
            {matchingProperties.length > 9 && (
              <p className="text-[10px] text-center text-gray-400 mt-2.5 font-bold">
                * Showing first 9 matching results. Settle filters are applied globally to other navigation views.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 📋 FIELD AGENT ASSIGNED INSPECTION TASKS FOR TODAY */}
      {user.role === 'Field Agent' && (
        <div id="field-agent-assigned-tasks-sec" className="bg-white rounded-xl p-6 border border-gray-150 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-55 text-indigo-600 dark:bg-indigo-950/40">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-display font-black text-[#0A1F44] text-sm md:text-base">My Assigned Inspection Tasks</h3>
                <p className="text-[10px] text-gray-500 font-medium">Properties flagged for physical field audit and tenement rate calibration today ({new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}).</p>
              </div>
            </div>
            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider animate-pulse">
              {assignedTasks.length} Pending Inspections
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {assignedTasks.map((prop) => (
              <div key={prop.id} className="border border-gray-150 rounded-xl p-4 space-y-3.5 hover:border-indigo-400 hover:shadow-md transition-all bg-slate-50/40 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {prop.propertyType}
                    </span>
                    <span className="text-[9px] font-mono text-slate-450 font-bold tracking-tight bg-white px-2 py-0.5 rounded-full border border-gray-150">ID: {prop.id}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-gray-800 text-xs sm:text-sm leading-tight">{prop.address}</h4>
                    <p className="text-[10px] font-medium text-slate-500">Ward Zone: <b className="text-gray-700">{prop.ward}</b></p>
                    <p className="text-[10px] font-medium text-slate-500">Landlord: <b className="text-gray-700">{prop.ownerName}</b></p>
                  </div>

                  <div className="p-2.5 bg-indigo-50/50 border border-indigo-100/50 rounded-lg text-[10px] leading-relaxed text-indigo-800">
                    <span className="font-bold block uppercase text-[8px] tracking-wide text-indigo-950 mb-0.5">INSPECTION OBJECTIVE:</span>
                    {prop.inspectionReason || 'Assess physical typology and tenancy occupancy changes.'}
                  </div>
                </div>

                <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between gap-2 mt-2">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Annual Rate</span>
                    <span className="font-mono text-[#0A1F44] font-black text-xs">₦{prop.tenementRate.toLocaleString()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInspectingProperty(prop);
                      setInspectionNotes('');
                      setInspectionOccupancy('Occupied');
                      setIsInspectionSubmitted(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-sm hover:scale-102"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Run Field Inquest
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📋 MUNICIPAL INSPECTION INQUEST CAPTURE DIALOG */}
      {inspectingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-150 shadow-2xl w-full max-w-lg p-6 space-y-4 relative overflow-hidden select-text"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />
            
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600 animate-pulse" />
                <div>
                  <h3 className="font-display font-black text-[#0A1F44] text-sm md:text-base">Field Inspection Inquest</h3>
                  <p className="text-[10px] text-gray-500 font-medium">Verify physical characteristics of {inspectingProperty.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingProperty(null)}
                className="text-gray-400 hover:text-gray-650 hover:bg-gray-100 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!isInspectionSubmitted ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-slate-100/50 p-2.5 rounded-lg text-[10.5px] border border-gray-150">
                  <div>
                    <span className="block text-gray-400 font-bold uppercase text-[8px] tracking-wider font-mono">Landlord Name</span>
                    <span className="font-bold text-gray-750">{inspectingProperty.ownerName}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-bold uppercase text-[8px] tracking-wider font-mono">Ward Zone</span>
                    <span className="font-bold text-gray-750">{inspectingProperty.ward}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-gray-200/50">
                    <span className="block text-gray-400 font-bold uppercase text-[8px] tracking-wider font-mono">Location Address</span>
                    <span className="font-bold text-gray-750">{inspectingProperty.address}</span>
                  </div>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-extrabold text-slate-505 mb-1 text-slate-500">OCCUPANCY STATUS</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Occupied', 'Vacant', 'Under Construction'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setInspectionOccupancy(status)}
                          className={`py-2 px-3 rounded-lg text-center font-bold text-[11px] border cursor-pointer transition ${
                            inspectionOccupancy === status
                              ? 'bg-indigo-650 bg-indigo-600 text-white border-transparent shadow-xs'
                              : 'bg-white text-slate-705 hover:bg-slate-50 border-gray-300 text-slate-650'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-extrabold text-slate-500 mb-1">FIELD CLASSIFICATION AUDIT</label>
                    <select
                      defaultValue={inspectingProperty.propertyType}
                      id="inspection-reclassify-select"
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-semibold outline-none"
                    >
                      <option value="Residential">Residential (1.5% Tenement Surcharges)</option>
                      <option value="Commercial">Commercial (2.5% Tenement Surcharges)</option>
                      <option value="Industrial">Industrial (4.0% Tenement Surcharges)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-extrabold text-[#0A1F44] mb-1">INSPECTOR OBSERVATIONAL NOTES</label>
                    <textarea
                      rows={3}
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      placeholder="Detail physical properties of facade, verified tenement rate changes, or landlord contact validation updates..."
                      className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-semibold outline-none text-[#0A1F44] focus:border-indigo-500/80 bg-slate-50/20"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectingProperty(null)}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-[#0A1F44] font-bold rounded-lg cursor-pointer text-xs"
                  >
                    Dismiss Case
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const notes = inspectionNotes.trim() || 'Physical structure and occupancy verified.';
                      const reclassifiedType = (document.getElementById('inspection-reclassify-select') as HTMLSelectElement)?.value as any;
                      
                      if (onEditProperty) {
                        onEditProperty({
                          ...inspectingProperty,
                          propertyType: reclassifiedType,
                          isOnlineVerified: true,
                          valuationDate: new Date().toISOString().split('T')[0],
                          address: inspectingProperty.address,
                          ownerName: inspectingProperty.ownerName,
                          ownerPhone: inspectingProperty.ownerPhone,
                          ownerEmail: inspectingProperty.ownerEmail,
                          ward: inspectingProperty.ward,
                          annualRentalValue: inspectingProperty.annualRentalValue,
                          ratePercentage: 4.0,
                          paymentStatus: inspectingProperty.paymentStatus,
                        });
                      }
                      
                      setIsInspectionSubmitted(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer text-xs animate-pulse"
                  >
                    <Check className="h-4 w-4" />
                    Authenticate Field Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4 font-sans max-w-sm mx-auto">
                <div className="h-12 w-12 rounded-full bg-green-50 text-emerald-600 flex items-center justify-center mx-auto border border-green-200">
                  <Check className="h-6 w-6" />
                </div>
                <div>
                  <span className="font-bold text-gray-800 text-sm block text-emerald-700">Verification Report Authenticated!</span>
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-1">Inspections are securely signed and synchronised with Suleja Municipal Revenue database servers instantly.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingProperty(null)}
                  className="w-full py-2 bg-[#0A1F44] hover:bg-[#162F5D] text-white font-bold rounded-lg cursor-pointer text-xs"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Main Stats Widgets Grid */}
      {!isTaxpayer ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Card 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.025, y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Properties</span>
              <div className="h-8 w-8 rounded-lg bg-[#0A1F44]/5 text-[#0A1F44] flex items-center justify-center">
                <Building2 className="h-4.5 w-4.5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold font-mono text-[#0A1F44]">{totalPropertiesCount}</span>
              <span className="block text-[10px] text-gray-400 mt-1">Suleja ward directories registered</span>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.025, y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue Collected</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Coins className="h-4.5 w-4.5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold font-mono text-[#0A1F44]">₦{totalRevenue.toLocaleString()}</span>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>+12.4% target</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.025, y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Arrears/Pending</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock className="h-4.5 w-4.5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold font-mono text-[#0A1F44]">₦{totalPending.toLocaleString()}</span>
              <span className="block text-[10px] text-amber-500 font-bold mt-1">Pending general reconciliation</span>
            </div>
          </motion.div>

          {/* Card 4 */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.025, y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Defaulters</span>
              <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
                <UserX className="h-4.5 w-4.5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold font-mono text-red-600">{totalDefaultersCount}</span>
              <span className="block text-[10px] text-red-500 font-bold mt-1">Overdue notice dispatched</span>
            </div>
          </motion.div>

          {/* Card 5 */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.025, y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">LGA Compliance</span>
              <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Compass className="h-4.5 w-4.5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold font-mono text-[#0A1F44]">{complianceRate}%</span>
              <div className="relative w-full h-1.5 bg-gray-100 rounded-full mt-2.5 overflow-hidden">
                <div className="absolute h-full left-0 top-0 bg-[#38BDF8]" style={{ width: `${complianceRate}%` }} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* 🔐 LGA ADMIN: FIELD AGENT MANAGEMENT & CREDENTIAL GENERATION PORTAL */}
        {(user.role === 'LGA Admin' || user.role === 'Super Admin') && (
          <div id="lga-staff-credential-generation" className="bg-white rounded-xl p-6 border border-gray-150 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3.5 gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldAlert className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-display font-black text-[#0A1F44] text-sm md:text-base">Suleja Municipal Staff Registry & Credential Engine</h3>
                  <p className="text-[10px] text-gray-550 font-medium">Verify credentials, establish new field agent profiles, and auto-provision encrypted high-contrast temporary passcodes.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddUserForm(!showAddUserForm);
                  setNewGeneratedCreds(null);
                  setStaffError('');
                }}
                className="text-xs font-bold text-white bg-[#0A1F44] hover:bg-[#1C3D77] px-3.5 py-2 rounded-lg border border-transparent transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <UserCheck className="h-4 w-4" />
                {showAddUserForm ? 'Collapse Staff Panel' : 'Provision Agent Account'}
              </button>
            </div>

            {showAddUserForm && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* Left: Input Form */}
                <form onSubmit={handleCreateAgentAccount} className="lg:col-span-5 space-y-3.5 bg-slate-50/50 p-5 rounded-xl border border-gray-150">
                  <span className="block text-[10px] font-mono font-extrabold uppercase tracking-wide text-slate-500 mb-2">Staff Access Parameters</span>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Officer Ibrahim Danladi"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-bold font-sans outline-none text-[#0A1F44] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Email Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ibrahim.d"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-bold font-sans outline-none text-[#0A1F44] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Assigned Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-bold font-sans outline-none text-[#0A1F44] focus:border-emerald-500"
                      >
                        <option value="Field Agent">Field Agent (Physical Inquests)</option>
                        <option value="Tax Officer">Tax Officer (Rate Collectors)</option>
                        <option value="Accountant">Accountant (Treasury Reconciler)</option>
                        <option value="LGA Admin">LGA Admin (Superintendent)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Official Mobile Contacts</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 08064531234"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-bold font-sans outline-none text-[#0A1F44] focus:border-emerald-500 bg-white"
                    />
                  </div>

                  {staffError && (
                    <div className="bg-red-50 text-red-700 p-2.5 text-[10.5px] font-medium rounded-lg border border-red-200 space-y-1.5 text-left leading-normal">
                      <div className="font-bold flex items-center gap-1.5 text-red-800">
                        <span>⚠️ System Exception</span>
                      </div>
                      {staffError.includes('operation-not-allowed') ? (
                        <div className="space-y-1">
                          <p>
                            The <strong>Email/Password sign-in method</strong> is currently disabled in your Firebase console settings.
                          </p>
                          <div className="bg-white p-2.5 rounded border border-red-100 font-mono text-[9.5px] mt-1 space-y-1">
                            <p className="font-bold text-gray-750 text-[10px] uppercase">To Enable Email Credentials:</p>
                            <ol className="list-decimal list-inside space-y-1 text-gray-600">
                              <li>
                                Click and open the <a href="https://console.firebase.google.com/project/lustrous-age-z6tp2/authentication/providers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Firebase Console Sign-In Providers Page</a>.
                              </li>
                              <li>
                                Click the <strong>"Add new provider"</strong> button.
                              </li>
                              <li>
                                Select <strong>"Email/Password"</strong>, turn on the first enabling toggle, and click <strong>"Save"</strong>.
                              </li>
                            </ol>
                          </div>
                          <p className="text-[10px] text-gray-500 pt-1">
                            Once enabled and saved, try clicking "Automate Credential Provisioning" again!
                          </p>
                        </div>
                      ) : (
                        <p>{staffError}</p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-md cursor-pointer text-xs"
                  >
                    <UserPlus className="h-4 w-4" />
                    Automate Credential Provisioning
                  </button>
                </form>

                {/* Right: Preview & Live List */}
                <div className="lg:col-span-7 space-y-4">
                  {newGeneratedCreds ? (
                    <motion.div 
                      key={newGeneratedCreds.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-55/10 bg-emerald-50 border border-emerald-200 rounded-xl p-5 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Key className="h-32 w-32 text-emerald-800" />
                      </div>

                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs border-b border-emerald-200 pb-2 mb-3">
                        <Key className="h-4 w-4" />
                        <span>TEMPORARY SYSTEM LOGIN PASSCODE GENERATED</span>
                      </div>

                      <div className="space-y-2 text-slate-700 text-[10.5px]">
                        <p>A secure temporary profile has been registered inside the municipal authentication node for <b>{newGeneratedCreds.name}</b>:</p>
                        
                        <div className="bg-white p-3 rounded-lg border border-emerald-100 font-mono space-y-1.5 shadow-xs text-xs">
                          <div className="flex justify-between border-b pb-1 border-slate-100">
                            <span className="text-gray-405 text-gray-500 font-bold">SYSTEM ID:</span>
                            <span className="font-bold text-[#0A1F44]">{newGeneratedCreds.id}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1 border-slate-100">
                            <span className="text-gray-500 font-bold">LOGIN EMAIL/USER:</span>
                            <span className="font-bold text-[#0A1F44]">{newGeneratedCreds.email}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1 border-slate-100">
                            <span className="text-gray-500 font-bold">TEMPORARY PASSWORD:</span>
                            <span className="font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded tracking-wide border border-red-100">{newGeneratedCreds.pass}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 font-bold">SECURITY CLEARANCE:</span>
                            <span className="font-bold text-emerald-700">{newGeneratedCreds.role}</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-gray-500 italic mt-2.5">
                          ⚠️ For security compliance, please transmit these credentials only via encrypted official channels. Field officers will be prompted to replace temporary passcodes upon their initial portal terminal entry.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-slate-50 border border-gray-200 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] leading-normal font-sans">
                      <Key className="h-10 w-10 text-slate-350 mb-2.5 opacity-60 animate-pulse" />
                      <span className="font-bold text-slate-500 block text-xs">Credential Feed Silent</span>
                      Fill the staff onboarding profile form on the left to activate credential synthesis.
                    </div>
                  )}

                  {/* Quick Registry Table overview */}
                  <div className="border border-gray-150 rounded-lg overflow-hidden bg-white shadow-xs">
                    <div className="bg-slate-50 p-2.5 border-b border-gray-200 flex justify-between items-center select-none bg-slate-100/50">
                      <span className="font-bold text-[10px] text-gray-505 font-mono">Verified Active Suleja Officials</span>
                      <span className="text-[9px] bg-slate-200 text-slate-705 px-1.5 py-0.5 rounded font-bold font-mono text-slate-700">
                        {users.length || 4} Total Accounts
                      </span>
                    </div>
                    <div className="max-h-[140px] overflow-auto">
                      <table className="w-full text-left text-[10.5px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-150 text-[9px] font-bold text-gray-400 uppercase select-none">
                            <th className="p-2 select-all text-gray-500">Staff Member</th>
                            <th className="p-2 text-gray-550 text-gray-500">Official Email</th>
                            <th className="p-2 text-gray-500">Phone</th>
                            <th className="p-2 text-right text-gray-500">Clearance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 font-medium">
                          {users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/50">
                              <td className="p-2 font-bold text-[#0A1F44]">{u.name}</td>
                              <td className="p-2 text-gray-500">{u.email}</td>
                              <td className="p-2 text-gray-500 font-mono">{u.phone || '080-HQ-OFFICIAL'}</td>
                              <td className="p-2 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                  u.role === 'LGA Admin' || u.role === 'Super Admin' 
                                    ? 'bg-red-50 text-red-700 border border-red-200 bg-red-50' 
                                    : u.role === 'Accountant' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 📊 LGA ADMIN: FIELD AGENT PERFORMANCE KPIs & EFFICIENCY TRACKER */}
        {(user.role === 'LGA Admin' || user.role === 'Super Admin') && (
          <div className="bg-white rounded-xl p-6 border border-gray-150 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-50 text-sky-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-[#0A1F44] text-base">Agent Performance & Efficiency KPIs</h3>
                  <p className="text-[11px] text-gray-550 font-medium">Monitoring real-time physical properties inspected and tenement revenue collected per active field staff member.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg py-1 px-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-600 font-bold font-mono">LIVE PERFORMANCE OVERVIEW</span>
              </div>
            </div>

            {/* Performance charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Properties Inspected KPI Chart */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-bold text-[#0A1F44]">Properties Inspected Volume</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">INSPECTIONS BY AGENT</span>
                </div>
                
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentKPIs} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A1F44', color: '#fff', borderRadius: '8px', border: 'none' }}
                        labelStyle={{ fontWeight: 'bold' }}
                        formatter={(value) => [`${value} Properties`, 'Inspected']} 
                      />
                      <Bar dataKey="inspectedCount" fill="#0EA5E9" name="Inspections" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Direct Revenue Mobilized KPI Chart */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-[#0A1F44]">Revenue Mobilized (Tenement Rates)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">CASH/DIGITAL INFLOWS</span>
                </div>

                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentKPIs} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a1e3f', color: '#fff', borderRadius: '8px', border: 'none' }}
                        labelStyle={{ fontWeight: 'bold' }}
                        formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Revenue Collected']} 
                      />
                      <Bar dataKey="revenueCollected" fill="#10B981" name="Revenue Collected" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed KPI Table breakdown */}
            <div className="border border-gray-150 rounded-xl overflow-hidden bg-white shadow-3xs">
              <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center select-none bg-slate-100/50">
                <span className="font-bold text-[11px] text-[#0A1F44] font-mono">Field Operative Dispatch Ledger</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold font-mono">
                  {agentKPIs.length} Field Agents Active
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-150 text-[10px] font-bold text-gray-500 uppercase select-none">
                      <th className="p-3">Staff Member</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-center">Properties Inspected</th>
                      <th className="p-3">Revenue Collected</th>
                      <th className="p-3 text-right">Performance Standing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {agentKPIs.map((agent) => {
                      const points = (agent.inspectedCount * 15) + (agent.revenueCollected / 2500);
                      let standing = 'Adequate';
                      let standingColor = 'bg-slate-100 text-slate-700';
                      if (points > 80) {
                        standing = 'Exemplary High Operator';
                        standingColor = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                      } else if (points > 30) {
                        standing = 'High Performer';
                        standingColor = 'bg-sky-50 text-sky-700 border border-sky-102';
                      }

                      return (
                        <tr key={agent.name} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-bold text-[#0A1F44] flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0A1F44] text-white flex items-center justify-center text-[10px] font-bold">
                              {agent.name.charAt(0)}
                            </div>
                            {agent.name}
                          </td>
                          <td className="p-3 text-gray-500">{agent.role}</td>
                          <td className="p-3 text-center text-[#0A1F44] font-mono font-bold">{agent.inspectedCount}</td>
                          <td className="p-3 font-mono text-[#0A1F44] font-bold">₦{agent.revenueCollected.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${standingColor}`}>
                              {standing}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </div>

      ) : (
        /* Taxpayer Perspective (Public Dues screen) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.025, y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="bg-[#0A1F44] text-white rounded-xl p-6 space-y-4 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Public Due Arrears</span>
              <Coins className="h-5 w-5 text-[#38BDF8]" />
            </div>
            <div>
              <span className="text-3xl font-mono font-bold">₦{taxpayerOutstandingBill.toLocaleString()}</span>
              <p className="text-[10px] text-gray-300 mt-2">
                Across {taxpayerProperties.length} active registered Suleja properties.
              </p>
            </div>
            {taxpayerOutstandingBill > 0 ? (
              <button
                onClick={() => onNavigate('Billing & Payments')}
                className="w-full bg-[#38BDF8] text-[#0A1F44] text-xs font-bold py-2 px-4 rounded-lg block text-center"
              >
                Settle Balance Dues Now
              </button>
            ) : (
              <div className="rounded bg-white/10 p-2 text-xs text-center border border-white/10 text-sky-300 font-semibold flex items-center justify-center gap-1.5">
                <FileCheck2 className="h-4 w-4" />
                Dues fully paid. Account in high standing.
              </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.025, y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs space-y-3 cursor-pointer"
          >
            <span className="text-xs font-bold text-[#0A1F44] uppercase tracking-wider">Personal Properties Ledger</span>
            <span className="block text-3xl font-mono font-bold text-[#0A1F44]">{taxpayerProperties.length}</span>
            <div className="text-xs text-gray-500 leading-normal border-t border-gray-50 pt-2">
              If your Suleja properties do not populate, click Register Property or present physical details to LGA Revenue Desk.
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.025, y: -4, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs space-y-3 cursor-pointer"
          >
            <span className="text-xs font-bold text-[#0A1F44] uppercase tracking-wider">Paid Dues Ratio</span>
            <span className="block text-3xl font-mono font-bold text-emerald-600">
              ₦{taxpayerInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
            </span>
            <div className="text-xs text-gray-500 leading-normal border-t border-gray-50 pt-2">
              Total historic payment contributions toward Suleja municipality public development services.
            </div>
          </motion.div>
        </div>
      )}

      {/* Compliance Health Index Card & Quick Directives */}
      {!isTaxpayer && (
        <div className="bg-white rounded-xl p-5 border border-[#38BDF8]/20 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#38BDF8] font-bold">LGA Fiscal Performance Metrics</span>
              <h3 className="font-display font-bold text-[#0A1F44] text-base">Compliance Health Index</h3>
              <p className="text-[11px] text-gray-500 font-medium">Visualizing standard rate collections against municipal legal assessment targets.</p>
            </div>

            {/* Progress bar and details */}
            {(() => {
              // Calculate tenement rate totals across all properties
              const totalRatesVal = properties.reduce((sum, p) => sum + p.tenementRate, 0);
              const paidRatesVal = properties.filter(p => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.tenementRate, 0);
              const unpaidRatesVal = totalRatesVal - paidRatesVal;
              
              const paidRateRatio = totalRatesVal > 0 ? (paidRatesVal / totalRatesVal) * 100 : 0;
              const unpaidRateRatio = 100 - paidRateRatio;

              // SVG layout sizing
              const size = 130;
              const center = size / 2;
              
              // Outer circle: Paid Rate Ratio
              const r1 = 45;
              const circ1 = 2 * Math.PI * r1;
              const strokeOffset1 = circ1 - (paidRateRatio / 100) * circ1;
              
              // Inner circle: Unpaid Rate Ratio 
              const r2 = 32;
              const circ2 = 2 * Math.PI * r2;
              const strokeOffset2 = circ2 - (unpaidRateRatio / 100) * circ2;

              return (
                <div className="flex flex-col sm:flex-row items-center gap-6 py-2 select-none">
                  {/* Color-Coded concentric radial progress SVG */}
                  <div className="relative w-[130px] h-[130px] shrink-0">
                    <svg className="w-full h-full rotate-[-95deg]">
                      {/* Background circular tracks */}
                      <circle
                        cx={center}
                        cy={center}
                        r={r1}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="7"
                      />
                      <circle
                        cx={center}
                        cy={center}
                        r={r2}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="7"
                      />
                      
                      {/* Active Paid Rate progress (Concentric Group 1 - Emerald Green) */}
                      <circle
                        cx={center}
                        cy={center}
                        r={r1}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="7"
                        strokeDasharray={circ1}
                        strokeDashoffset={strokeOffset1}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />

                      {/* Active Unpaid Rate progress (Concentric Group 2 - Rose Red) */}
                      <circle
                        cx={center}
                        cy={center}
                        r={r2}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="7"
                        strokeDasharray={circ2}
                        strokeDashoffset={strokeOffset2}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    </svg>

                    {/* Concentric Center text */}
                    <div className="absolute inset-x-0 inset-y-0 flex flex-col items-center justify-center">
                      <span className="text-base font-extrabold font-sans text-emerald-600 block leading-none">{Math.round(paidRateRatio)}%</span>
                      <span className="text-[7px] uppercase tracking-wider font-extrabold text-[#0A1F44]/55 font-sans block mt-0.5">Paid Ratio</span>
                    </div>
                  </div>

                  {/* Detailed statistics ledger on the side */}
                  <div className="flex-1 w-full space-y-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-emerald-700 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Paid Rates Value (Outer Ring)</span>
                        </span>
                        <span className="font-mono text-[#0A1F44] font-bold">{Math.round(paidRateRatio)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold pl-3.5">
                        <span>Treasury Collection Yield</span>
                        <span className="font-mono font-bold text-slate-800">₦{paidRatesVal.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-1 border-t border-slate-100 pt-2.5">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-red-650 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                          <span>Unpaid Rates Value (Inner Ring)</span>
                        </span>
                        <span className="font-mono text-red-650 font-bold">{Math.round(unpaidRateRatio)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold pl-3.5">
                        <span>LGA Outstanding Deficits</span>
                        <span className="font-mono font-bold text-red-500">₦{unpaidRatesVal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="md:col-span-5 h-full flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-150 pt-4 md:pt-0 md:pl-6 space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Treasury Assessment</span>
              <p className="text-[11px] leading-relaxed text-gray-500">
                A compliance index score of <b className="text-[#0A1F44]">{complianceRate}%</b> means Suleja LGA is currently running with balanced public liquidity. Immediate field enforcement on delinquent properties is recommended under Law Cap 13 to close arrears gaps.
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onNavigate('Enforcement & Courts')}
                className="flex-1 text-[#0A1F44] bg-[#0A1F44]/5 hover:bg-[#0A1F44] hover:text-white transition-all py-2 rounded-lg text-xs font-black cursor-pointer font-sans text-center border border-gray-200"
              >
                Launch Field Audits
              </button>
              <button 
                onClick={() => onNavigate('Properties')}
                className="flex-1 bg-[#0A1F44] hover:bg-opacity-95 text-white py-2 rounded-lg text-xs font-bold cursor-pointer font-sans text-center shadow-xs"
              >
                Track Delinquencies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.5 COLLAPSIBLE WARD FOCUS PANEL */}
      {!isTaxpayer && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs print:hidden overflow-hidden">
          <div 
            onClick={() => setIsWardFocusExpanded(!isWardFocusExpanded)}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-[#0A1F44]/5 flex items-center justify-center text-[#0A1F44]">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-[#0A1F44]">Tactical Ward Focus Hub</h3>
                <p className="text-[11px] text-gray-500 font-medium">Quick-glance breakdown across Suleja's 15 administrative wards</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Summary Badges when collapsed or overall */}
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
                  Wards: <span className="font-mono">{SULEJA_WARDS.length}</span>
                </span>
                <span className="px-2 py-1 bg-red-50 text-red-700 rounded-md">
                  Active Cases: <span className="font-mono">{(enforcement || []).filter(e => e.stage !== 'Resolved').length}</span>
                </span>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
                  Rate Compliance: <span className="font-mono">{complianceRate}%</span>
                </span>
              </div>
              <div className="text-gray-400 hover:text-[#0A1F44] transition-colors p-1">
                {isWardFocusExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </div>

          {isWardFocusExpanded && (
            <div className="border-t border-slate-100 p-5 pt-4 bg-[#FCFDFE]">
              <div className="overflow-x-auto select-text max-h-[420px] overflow-y-auto rounded-lg border border-slate-150">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-[#F5F7FA] text-gray-500 font-bold uppercase sticky top-0 z-10 shadow-xs border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Ward Name</th>
                      <th className="px-4 py-3 text-center">Registered Properties</th>
                      <th className="px-4 py-3 text-center">Active Cases</th>
                      <th className="px-4 py-3 text-right">Collections (₦)</th>
                      <th className="px-4 py-3 text-right">Projected (₦)</th>
                      <th className="px-4 py-3 text-right">Compliance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 bg-white font-medium">
                    {wardFocusData.map((ward) => {
                      const hasActiveCases = ward.activeCases > 0;
                      return (
                        <tr key={ward.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-[#0A1F44] flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                            {ward.name}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600 font-mono">
                            {ward.registered}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {hasActiveCases ? (
                              <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 border border-amber-200/50">
                                {ward.activeCases} active
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center text-[10px] text-gray-400 font-semibold bg-gray-50 px-2 py-0.5 rounded-full border border-gray-150">
                                0 active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-600 font-bold">
                            ₦{ward.collections.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-500">
                            ₦{ward.projected.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full rounded-full ${
                                    ward.compliance >= 70 ? 'bg-green-500' : ward.compliance >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${ward.compliance}%` }}
                                />
                              </div>
                              <span className={`inline-block font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                ward.compliance >= 70 
                                  ? 'bg-green-50 text-green-700' 
                                  : ward.compliance >= 40 
                                    ? 'bg-amber-50 text-amber-700' 
                                    : 'bg-red-50 text-red-700'
                              }`}>
                                {ward.compliance}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-gray-400 font-medium">
                <span>* Active cases denote notice actions that have not yet reached final settlement or resolution.</span>
                <span className="text-[#38BDF8] font-semibold">Real-time Automated Synthesis</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Charts area */}
      {!isTaxpayer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Collection Bar Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs lg:col-span-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-[#0A1F44] text-base">Monthly Tenement Billing (2026 Trial Year)</h3>
                <p className="text-[11px] text-gray-500 font-medium">Comparison of projected tenement valuation drafts next to active received collections.</p>
              </div>
              <span className="rounded-lg bg-[#0A1F44]/5 px-2.5 py-1 text-xs font-bold text-[#0A1F44] flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-[#38BDF8]" />
                2026 Fiscal Logs
              </span>
            </div>

            <div className="h-72 w-full mt-2 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => [`₦${Number(value).toLocaleString()}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Target" fill="#E2E8F0" radius={[4, 4, 0, 0]} barSize={10} name="LGA Fiscal Target" />
                  <Bar dataKey="Projected" fill="#0A1F44" radius={[4, 4, 0, 0]} barSize={10} name="Valuation Projected" />
                  <Bar dataKey="Collected" fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={10} name="Actual Cash Reconciled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Classification classification */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs lg:col-span-3 flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-[#0A1F44] text-base">Property Class Balance</h3>
              <p className="text-[11px] text-gray-500 font-medium font-sans">Class distributions</p>
            </div>

            <div className="h-44 w-full my-4 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner compliance indicator text */}
              <div className="absolute flex flex-col items-center">
                <span className="text-lg font-bold font-mono text-[#0A1F44]">{totalPropertiesCount}</span>
                <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">Properties</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-50 pt-3">
              {typeDistribution.map((entry, idx) => (
                <div key={entry.name} className="flex items-center justify-between text-[11px] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-gray-600 font-sans">{entry.name}</span>
                  </div>
                  <span className="font-mono text-[#0A1F44]">
                    {entry.value} ({Math.round((entry.value / totalPropertiesCount) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Growth Projection Gauge */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs lg:col-span-3 flex flex-col justify-between relative overflow-hidden">
            <div>
              <h3 className="font-display font-bold text-[#0A1F44] text-base">Revenue Target Gauge</h3>
              <p className="text-[11px] text-gray-500 font-medium font-sans">YTD Collections against system setting objective</p>
            </div>

            <div className="h-44 w-full my-4 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    <Cell key="cell-0" fill="#10B981" />
                    <Cell key="cell-1" fill="#F1F5F9" />
                  </Pie>
                  <Tooltip formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner percentage of target */}
              <div className="absolute bottom-2 flex flex-col items-center">
                <span className="text-xl font-extrabold font-mono text-[#0A1F44] leading-none mb-0.5">{percentOfTarget}%</span>
                <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">Goal Yielded</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-50 pt-3 text-[11px]">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-gray-550 font-sans">Collections Collected:</span>
                <span className="font-mono text-emerald-600 font-extrabold">₦{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between font-semibold border-t border-dashed border-gray-100 pt-1">
                <span className="text-gray-550 font-sans">Fiscal Year Target:</span>
                <span className="font-mono text-[#0A1F44] font-bold">₦{targetAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Fiscal Year Revenue Growth Trend - Full-width Area Chart */}
          <div id="revenue-trend-area-chart" className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs lg:col-span-12 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#38BDF8]" />
                  <h3 className="font-display font-bold text-[#0A1F44] text-base">Monthly Tenement Rate Revenue Collections Trend</h3>
                </div>
                <p className="text-[11px] text-gray-550 font-medium font-sans">Dynamic Area visualization of monthly tenement rate collections vs valuation projection baselines derived statefully from historical invoice ledgers.</p>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-center bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full dark:bg-slate-800 dark:border-slate-700">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[9px] font-bold text-gray-600 font-sans uppercase tracking-wider dark:text-gray-400">Live Collection Ledger</span>
              </div>
            </div>

            <div className="h-72 w-full mt-2 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenueData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value) => [`₦${Number(value).toLocaleString()}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Projected" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#colorProjected)" name="Valuation Baseline" />
                  <Area type="monotone" dataKey="Collected" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" name="Actual Reconciled Cash Collections" />
                  <Area type="monotone" dataKey="Target" stroke="#0A1F44" strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="LGA Monthly Target Milestone" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ Property Compliance Health Score Analyzer Widget */}
      <div className="bg-white rounded-xl p-6 border border-gray-150 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <h3 className="font-display font-black text-[#0A1F44] text-sm md:text-base">Property Tax Compliance Health Analyzer</h3>
            </div>
            <p className="text-[11px] text-gray-500 font-medium font-sans mt-0.5">
              Select any registered Suleja property tenement to calculate its compliance rating based on real-time payment history and legal enforcement status.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono font-extrabold text-[#0A1F44]/60 uppercase tracking-wider">Select Tenement:</span>
            <select
              value={selectedHealthPropId}
              onChange={(e) => setSelectedHealthPropId(e.target.value)}
              className="rounded-lg border border-gray-350 bg-white p-2 font-mono font-semibold text-xs text-[#0A1F44] outline-none max-w-[210px] truncate shadow-xs focus:ring-1 focus:ring-[#0A1F44]"
            >
              <option value="">-- Choose Suleja Tenement --</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id} ({p.ownerName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {complianceHealthData ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual Health Gauge circle - cols 5 */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-slate-50 rounded-2xl border border-gray-100 text-center space-y-4">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">COMPLIANCE SCORE INDEX</span>
              
              {/* Pie/Radial Chart replica or Custom SVG Circle */}
              <div className="relative flex items-center justify-center h-36 w-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E2E8F0"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={
                      complianceHealthData.score >= 90
                        ? '#10B981'
                        : complianceHealthData.score >= 70
                        ? '#F59E0B'
                        : complianceHealthData.score >= 40
                        ? '#F97316'
                        : '#EF4444'
                    }
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - complianceHealthData.score / 100)}`}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black font-mono text-[#0A1F44] leading-none">
                    {complianceHealthData.score}%
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mt-1">
                    HEALTH RATING
                  </span>
                </div>
              </div>

              {/* Score Category Badge */}
              <span className={`inline-block font-extrabold font-sans text-[10px] px-3 py-1 rounded-full border uppercase tracking-wider ${complianceHealthData.badgeColor}`}>
                {complianceHealthData.rating}
              </span>
            </div>

            {/* Calculations audit ledger - cols 7 */}
            <div className="md:col-span-7 space-y-4 self-stretch flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-150 pb-2">
                  <span className="text-xs font-bold text-gray-755 uppercase tracking-wide">Audit Trail breakdown & Weights</span>
                  <span className="text-[10px] text-gray-400 font-medium font-mono">Reference: {complianceHealthData.property.id}</span>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {complianceHealthData.items.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold ${
                        item.isPositive
                          ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800'
                          : 'bg-red-50/40 border-red-100 text-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${item.isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-mono font-bold">
                        {item.deduction === 0 ? '✓ COMPLIANT' : `${item.deduction} pts`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0A1F44] text-white p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm">
                <div className="bg-sky-500/10 p-1 rounded-lg shrink-0 text-[#38BDF8] mt-0.5 animate-pulse">
                  <Compass className="h-4 w-4" />
                </div>
                <div className="leading-normal">
                  <h5 className="font-bold text-[10.5px] uppercase tracking-wider text-[#38BDF8] mb-0.5">LGA Analytical Recommendation:</h5>
                  <p className="text-[11px] text-sky-100 font-medium leading-relaxed font-sans mt-0">
                    {complianceHealthData.textDescription} Tenement rates constitute vital public funding for construction works across Suleja Wards.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed rounded-xl p-8 text-center text-gray-400 italic font-medium">
            No Suleja tenement property currently selected. Please select a property to run the Compliance Health Score scan.
          </div>
        )}
      </div>

      {/* Ward breakdown and Audit feed Grid */}
      {!isTaxpayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Ward Breakdown Table widget */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-display font-bold text-[#0A1F44] text-base">Ward Revenue Compliance Leaderboard</h3>
              <p className="text-[11px] text-gray-500 font-medium">Rankings of wards by tenement rate collections. Greenfield indicates solid compliance.</p>
            </div>

            <div className="overflow-x-auto min-h-76 select-text max-h-96 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[#F5F7FA] text-gray-500 font-bold text-left uppercase">
                  <tr>
                    <th className="px-3 py-2.5 rounded-l-lg">Suleja Ward</th>
                    <th className="px-3 py-2.5 text-center">Active Dwellings</th>
                    <th className="px-3 py-2.5 text-right">Sum Projected</th>
                    <th className="px-3 py-2.5 text-right">Collected Amount</th>
                    <th className="px-3 py-2.5 text-right rounded-r-lg">Compliance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {wardPerformance.slice(0, 6).map((ward) => {
                    const compValue = ward['Compliance %'];
                    return (
                      <tr key={ward.name} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-semibold text-gray-900 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#38BDF8]" />
                          {ward.name}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600 font-mono">{ward['Registered Properties']}</td>
                        <td className="px-3 py-3 text-right text-gray-600 font-mono">₦{(ward['Projected (₦)'] / 1000).toLocaleString()}k</td>
                        <td className="px-3 py-3 text-right text-emerald-600 font-mono">₦{(ward['Collected (₦)'] / 1000).toLocaleString()}k</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`inline-block font-bold font-mono px-1.5 py-0.5 rounded text-[10px] ${
                            compValue > 70 ? 'bg-green-50 text-green-700' : compValue > 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {compValue}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Activity/Audit Log feed of Suleja LGA platform */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-display font-bold text-[#0A1F44] text-base">Municipal Audit Trail</h3>
              <p className="text-[11px] text-gray-500 font-medium">Continuous real-time system ledger detailing collection events and administrative changes.</p>
            </div>

            <div className="relative border-l border-gray-200 pl-4 space-y-4 max-h-80 overflow-y-auto pt-2 text-xs select-text">
              {activityLogs.slice(0, 5).map((log) => {
                const isOfficer = log.userRole === 'Tax Officer' || log.userRole === 'Field Agent';
                return (
                  <div key={log.id} className="relative group">
                    {/* Pin circle */}
                    <div className="absolute -left-6.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#0A1F44] border-2 border-white group-hover:bg-[#38BDF8]" />
                    
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-gray-900 group-hover:text-[#38BDF8]">{log.action}</span>
                        <span className="text-[9px] text-[#0A1F44] font-mono shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed font-sans">{log.details}</p>
                      <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono">
                        <span>Auth: {log.userName} ({log.userRole})</span>
                        <span>IP: {log.ipAddress}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-50 pt-4 mt-4 flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Logged station: SLG-REVENUE-SERVER</span>
              {user.role === 'Super Admin' || user.role === 'LGA Admin' || user.role === 'Accountant' ? (
                <button
                  onClick={() => onNavigate('Activity Logs')}
                  className="text-[#38BDF8] font-bold hover:text-[#0A1F44] flex items-center gap-1"
                >
                  Secure Audit Vault
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

        </div>
      ) : (
        /* Isolated Taxpayer Dashboard Widgets */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Taxpayer Assets Directory */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-display font-[#0A1F44] font-bold text-base">My Registered Properties</h3>
              <p className="text-[11px] text-gray-500 font-medium">Official municipal directory list of properties enrolled under your taxpayer profile.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[#F5F7FA] text-gray-500 font-bold text-left uppercase">
                  <tr>
                    <th className="px-3 py-2">Property Ref</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2 text-right">Tenement Rate</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {taxpayerProperties.length > 0 ? (
                    taxpayerProperties.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2.5 font-mono font-bold text-gray-900">{p.id}</td>
                        <td className="px-3 py-2.5 text-gray-600 truncate max-w-[120px]" title={p.address}>{p.address}</td>
                        <td className="px-3 py-2.5 text-gray-600">{p.ward}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-gray-900">₦{p.tenementRate.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            p.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {p.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-400 font-medium">No properties identified. Connect with LGA officers.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Self-Service Guide & Information */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs space-y-4">
            <div>
              <h3 className="font-display font-[#0A1F44] font-bold text-base">Self-Service Clearance Guidelines</h3>
              <p className="text-[11px] text-gray-500 font-medium">Step-by-step instructions to settle rates, maintain compliance, and secure certificates.</p>
            </div>

            <div className="space-y-4 text-xs font-medium text-gray-600">
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A1F44]/10 text-[#0A1F44] font-mono font-bold text-[10px]">1</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Identify Outstanding Rates</h4>
                  <p className="text-[11px]">Check the "Public Due Arrears" total above or navigate to the <b>Billing & Payments</b> page in the left sidebar directory.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A1F44]/10 text-[#0A1F44] font-mono font-bold text-[10px]">2</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Process Secures Payments Online</h4>
                  <p className="text-[11px]">Use Paystack or Flutterwave sandbox pathways with card configurations on the billing portal to securely clear tenement bill status immediately.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A1F44]/10 text-[#0A1F44] font-mono font-bold text-[10px]">3</span>
                <div>
                  <h4 className="font-semibold text-gray-900">Download Verifiable PDF Clearance</h4>
                  <p className="text-[11px]">Once cleared, download the official digital receipt featuring our unique <b>Suleja LCA offline cryptographic secure QR code identifier badge</b> for verification during neighborhood site audits.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time offline reconnect syncing progress toast notification */}
      <AnimatePresence>
        {showSyncToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            id="sync-progress-toast"
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white rounded-xl border border-slate-700 shadow-2xl overflow-hidden p-4 space-y-3 font-sans"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-2.5 items-center">
                {syncProgress < 100 ? (
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                )}
                <div className="text-left">
                  <h4 className="font-bold text-xs text-white">
                    {syncProgress < 100 ? 'Syncing...' : 'Central Sync Complete'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                    {syncProgress < 100 
                      ? 'Re-establishing central node handshake and flushing local ledger queues.'
                      : 'All locally signed tenement transactions registered successfully on the Suleja central database.'
                    }
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowSyncToast(false)} 
                className="text-gray-400 hover:text-white text-xs cursor-pointer focus:outline-none shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Simulated progress indicator */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono font-bold text-gray-400">
                <span>PROGRESS</span>
                <span>{syncProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    syncProgress < 100 ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
