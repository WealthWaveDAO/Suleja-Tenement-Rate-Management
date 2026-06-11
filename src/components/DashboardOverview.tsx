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
  FileDown
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
  Area 
} from 'recharts';
import { Property, Invoice, User, UserRole, ActivityLog, EnforcementAction } from '../types';
import { SULEJA_WARDS } from '../data';
import { exportOfficialReceiptPDF } from '../utils/receiptGenerator';

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
  enforcement = []
}: DashboardProps) {
  const [isWardFocusExpanded, setIsWardFocusExpanded] = React.useState(true);
  
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

  // 2. Monthly Revenue simulation (January to June 2026)
  const monthlyRevenueData = [
    { name: 'Jan 2026', Projected: 18450000, Collected: 17120000, Pending: 1330000 },
    { name: 'Feb 2026', Projected: 22400000, Collected: 19800000, Pending: 2600000 },
    { name: 'Mar 2026', Projected: 19100000, Collected: 15450000, Pending: 3650000 },
    { name: 'Apr 2026', Projected: 24500000, Collected: 18200000, Pending: 6300000 },
    { name: 'May 2026', Projected: 28900000, Collected: 22450000, Pending: 6450000 },
    { name: 'Jun 2026', Projected: 31200000, Collected: 21822500, Pending: 9377500 },
  ];

  // 3. Property Classification Dist
  const typeDistribution = [
    { name: 'Residential', value: properties.filter(p => p.propertyType === 'Residential').length },
    { name: 'Commercial', value: properties.filter(p => p.propertyType === 'Commercial').length },
    { name: 'Industrial', value: properties.filter(p => p.propertyType === 'Industrial').length },
  ];

  const COLORS = ['#0A1F44', '#38BDF8', '#E2E8F0'];

  // Personal filter if current user is a plain resident (Taxpayer)
  const isTaxpayer = user.role === 'Taxpayer';
  const taxpayerProperties = isTaxpayer ? properties.filter(p => p.id === user.id || p.ownerEmail === user.email || p.ownerPhone === user.phone) : [];
  const taxpayerInvoices = isTaxpayer ? invoices.filter(inv => taxpayerProperties.some(tp => tp.id === inv.propertyId)) : [];
  const taxpayerOutstandingBill = taxpayerInvoices.filter(i => i.status !== 'Paid').reduce((sum, inv) => sum + inv.amount, 0);

  // Dynamic lookup results
  const matchingProperties = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return properties.filter(
      p => p.id.toLowerCase().includes(q) || 
           p.address.toLowerCase().includes(q) || 
           p.ownerName.toLowerCase().includes(q)
    );
  }, [properties, searchQuery]);

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
            <p className="text-[11px] text-gray-500 font-medium">Quickly locate properties, verify tax IDs, or review landlord profiles in real-time.</p>
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

        {/* Dynamic Search Results */}
        {searchQuery.trim() && (
          <div className="mt-3 border-t border-slate-100 pt-3 select-text">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-3 bg-slate-50/80 p-2 px-3 rounded-lg">
              <span>Found <b className="text-[#0A1F44] font-mono">{matchingProperties.length}</b> properties matching <span className="text-[#38BDF8]">"{searchQuery}"</span></span>
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

      {/* Main Stats Widgets Grid */}
      {!isTaxpayer ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
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
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
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
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
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
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
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
          </div>

          {/* Card 5 */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-3">
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
          </div>
        </div>
      ) : (
        /* Taxpayer Perspective (Public Dues screen) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A1F44] text-white rounded-xl p-6 space-y-4">
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
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#0A1F44] uppercase tracking-wider">Personal Properties Ledger</span>
            <span className="block text-3xl font-mono font-bold text-[#0A1F44]">{taxpayerProperties.length}</span>
            <div className="text-xs text-gray-500 leading-normal border-t border-gray-50 pt-2">
              If your Suleja properties do not populate, click Register Property or present physical details to LGA Revenue Desk.
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#0A1F44] uppercase tracking-wider">Paid Dues Ratio</span>
            <span className="block text-3xl font-mono font-bold text-emerald-600">
              ₦{taxpayerInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
            </span>
            <div className="text-xs text-gray-500 leading-normal border-t border-gray-50 pt-2">
              Total historic payment contributions toward Suleja municipality public development services.
            </div>
          </div>
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
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs lg:col-span-8 flex flex-col justify-between">
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
                  <Bar dataKey="Projected" fill="#0A1F44" radius={[4, 4, 0, 0]} barSize={24} name="Valuation Projected" />
                  <Bar dataKey="Collected" fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={24} name="Actual Cash Reconciled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Classification classification */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs lg:col-span-4 flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-[#0A1F44] text-base">Property Class Balance</h3>
              <p className="text-[11px] text-gray-500 font-medium">Audit classification distribution</p>
            </div>

            <div className="h-52 w-full my-4 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
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
                <span className="text-xl font-bold font-mono text-[#0A1F44]">{totalPropertiesCount}</span>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Properties</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-50 pt-3">
              {typeDistribution.map((entry, idx) => (
                <div key={entry.name} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-gray-600">{entry.name}</span>
                  </div>
                  <span className="font-mono text-[#0A1F44]">
                    {entry.value} ({Math.round((entry.value / totalPropertiesCount) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

    </div>
  );
}
