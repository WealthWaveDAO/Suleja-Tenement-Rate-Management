/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  TrendingUp, 
  MapPin, 
  Check, 
  AlertTriangle,
  Receipt,
  FileCheck,
  Search,
  Calendar,
  FileDown,
  Cpu,
  Clock
} from 'lucide-react';
import { Property, Invoice, ActivityLog, AppBackup } from '../types';
import { exportOfficialReceiptPDF } from '../utils/receiptGenerator';

interface ReportingProps {
  properties: Property[];
  invoices: Invoice[];
  activityLogs: ActivityLog[];
  backups: AppBackup[];
  onCreateManualBackup: () => void;
  onDownloadFullBackup: () => void;
  onRestoreBackup: (backup: AppBackup) => void;
  onImportBackupJSON: (jsonData: string) => boolean;
}

export default function ReportingCenter({ 
  properties, 
  invoices, 
  activityLogs,
  backups,
  onCreateManualBackup,
  onDownloadFullBackup,
  onRestoreBackup,
  onImportBackupJSON
}: ReportingProps) {
  
  const [reportType, setReportType] = useState<'properties' | 'collections' | 'defaulters' | 'audit'>('properties');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');

  // SULEJA wards list
  const wards = Array.from(new Set(properties.map(p => p.ward)));

  // Generate and download highly compliant CSV spreadsheets
  const handleCSVDownload = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `Suleja_LGA_Report_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'properties') {
      headers = ['Property ID', 'Owner Name', 'Owner Phone', 'Address', 'Ward', 'Classification', 'Annual Rent Value (NGN)', 'Tenement Rate Due (NGN)', 'Payment Status'];
      const targetList = selectedWard ? properties.filter(p => p.ward === selectedWard) : properties;
      rows = targetList.map(p => [
        p.id,
        p.ownerName,
        p.ownerPhone,
        p.address,
        p.ward,
        p.propertyType,
        p.annualRentalValue.toString(),
        p.tenementRate.toString(),
        p.paymentStatus
      ]);
    } else if (reportType === 'collections') {
      headers = ['Invoice ID', 'Property ID', 'Landlord Name', 'Total Amount Billed (NGN)', 'Paid Date', 'Payment Channel', 'Transaction Reference'];
      const paidInvoices = invoices.filter(i => i.status === 'Paid');
      rows = paidInvoices.map(i => [
        i.id,
        i.propertyId,
        i.ownerName,
        i.amount.toString(),
        i.paymentDate || '—',
        i.paymentMethod || '—',
        i.transactionRef || '—'
      ]);
    } else if (reportType === 'defaulters') {
      headers = ['Property ID', 'Owner Name', 'Owner Phone', 'Zoned Ward', 'Delinquent Arrears Outstanding (NGN)', 'Billing Issued Date'];
      const unpaidInvoices = invoices.filter(i => i.status === 'Unpaid' || i.status === 'Overdue');
      rows = unpaidInvoices.map(i => {
        const correspondingProp = properties.find(p => p.id === i.propertyId);
        return [
          i.propertyId,
          i.ownerName,
          correspondingProp?.ownerPhone || '—',
          correspondingProp?.ward || '—',
          i.amount.toString(),
          i.issuedDate
        ];
      });
    } else {
      headers = ['Log ID', 'Authorized Officers', 'Role Clearance', 'Logged Activity Type', 'Date Registered', 'Device IP Address'];
      rows = activityLogs.map(l => [
        l.id,
        l.userName,
        l.userRole,
        l.action + ': ' + l.details,
        l.timestamp,
        l.ipAddress || '—'
      ]);
    }

    // Compose CSV string compliant with raw encodings
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for static diagnostics in reports tab
  const totalValueSum = properties.reduce((sum, p) => sum + p.tenementRate, 0);
  const paidDuesSum = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const generalDueSum = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6 fade-in text-xs font-sans">
      
      {/* Intro */}
      <div>
        <h1 className="font-display text-xl font-bold text-[#0A1F44]">Audits and CSV Reports Generator</h1>
        <p className="text-xs text-gray-500 font-medium">
          Dispatch administrative compliance summaries or compile downloadable raw logs with advanced CSV spreadsheet serialization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Parametric selectors and print trigger */}
        <div className="bg-white rounded-xl p-6 border border-gray-150 shadow-xs lg:col-span-8 space-y-6">
          <div className="flex items-center gap-2 border-b pb-3.5">
            <FileSpreadsheet className="h-5 w-5 text-[#38BDF8]" />
            <h3 className="font-display font-bold text-[#0A1F44] text-sm">Discussions & Serialization Configurations</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Compilation Scope</label>
              <div className="space-y-2 select-none">
                {[
                  { key: 'properties', label: 'Registered Tenement Listings' },
                  { key: 'collections', label: 'Treasury Collection Invoices' },
                  { key: 'defaulters', label: 'Dues Delinquents (Defaulters)' },
                  { key: 'audit', label: 'Administrative System Audit Trails' }
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100/50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="reportOption"
                      checked={reportType === item.key}
                      onChange={() => setReportType(item.key as any)}
                      className="h-4 w-4 text-[#0A1F44] focus:ring-[#0A1F44]"
                    />
                    <span className="font-semibold text-gray-750">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Optional filters depending on items */}
              {reportType === 'properties' && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Filter Zoning Ward</label>
                  <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs outline-none"
                  >
                    <option value="">All Registered Suleja Wards</option>
                    {wards.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-lg bg-[#F5F7FA] p-3 border border-gray-200 leading-relaxed text-gray-500">
                <span className="font-bold text-gray-750 block mb-1">Spreadsheet encoding standard:</span>
                <span>Values are compiled into standard UTF-8 CSV matrices readable inside Microsoft Excel, Google Sheets, or local database import utilities.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCSVDownload}
              className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <Download className="h-4 w-4 text-green-300" />
              Download CSV Spreadsheet
            </button>
            <button
              onClick={() => {
                window.print();
              }}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="h-4 w-4 text-[#38BDF8]" />
              Print Administrative Copy
            </button>
          </div>
        </div>

        {/* Audit summaries sidebar summary */}
        <div className="bg-white rounded-xl p-6 border border-gray-150 shadow-xs lg:col-span-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-widest text-[#38BDF8] font-bold uppercase">TREASURY MONITOR</span>
            <h3 className="font-display font-bold text-[#0A1F44] text-[#0A1F44] text-sm">Compliance Report Card</h3>
            <p className="text-[11px] text-gray-500 leading-normal">
              Continuous overview of ledger balances and active tax coverage indices.
            </p>
          </div>

          <div className="space-y-3.5 pt-2 border-t border-gray-55">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-semibold flex items-center gap-1">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Treasury collections sum:
              </span>
              <span className="font-mono text-emerald-700 font-bold">₦{paidDuesSum.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Remaining arrears sum:
              </span>
              <span className="font-mono text-amber-700 font-bold">₦{generalDueSum.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-semibold flex items-center gap-1">
                <Receipt className="h-4 w-4 text-sky-600" />
                Projected Rate Dues:
              </span>
              <span className="font-mono text-[#0A1F44] font-bold">₦{totalValueSum.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200/50 rounded-lg text-sky-820 font-medium leading-relaxed font-sans">
            <b>Zonal Performance Indicator</b>
            <p className="mt-1 text-[10px] text-sky-700">Maje and Sabo Gari show the highest financial yield rates, contributing to 42% of total collections. Kurmin Sarki remains in active notice served cycle.</p>
          </div>
        </div>

      </div>

      {/* 💾 Database Backup & Safe-keeping Ledger */}
      <div className="bg-white rounded-xl p-6 border border-gray-150 shadow-xs space-y-6">
        <div className="flex items-center gap-2 border-b pb-3.5 justify-between flex-wrap">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-emerald-500 animate-pulse" />
            <div>
              <h3 className="font-display font-semibold text-[#0A1F44] text-sm">Database Safe-keeping & Disaster Recovery</h3>
              <p className="text-[11px] text-gray-400 font-medium">Offline JSON database compilation and automated background LocalStorage snapshot rotation.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded shadow-xs border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AUTO-BACKUP: RUNNING (60s checks)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls & Import section */}
          <div className="space-y-4">
            <h4 className="font-display font-bold text-gray-700 text-xs uppercase tracking-wider">Database Operations</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Export the entire state (including properties, bills, settings, and logs) into a single portable, human-readable offline JSON file for safe-keeping. You can import this file anytime to restore the complete system state.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={onDownloadFullBackup}
                className="bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all text-xs"
                title="Download full current database in high fidelity JSON format"
              >
                <Download className="h-4 w-4 text-sky-400" />
                <span>Export Full JSON DB</span>
              </button>

              <button
                type="button"
                onClick={onCreateManualBackup}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all text-xs border border-emerald-500"
                title="Save an instant snapshot to local storage"
              >
                <FileCheck className="h-4 w-4 text-emerald-200" />
                <span>Trigger Manual Backup</span>
              </button>
            </div>

            <div className="pt-3.5 border-t border-gray-150">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Import Database Snapshot (.json)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const content = evt.target?.result as string;
                      const ok = onImportBackupJSON(content);
                      if (ok) {
                        e.target.value = ''; // Reset input
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="block w-full text-[11px] text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-sky-50 file:text-[#0A1F44] hover:file:bg-sky-100 cursor-pointer"
                />
              </div>
              <span className="block mt-1.5 text-[9.5px] text-amber-600 font-semibold leading-normal">
                ⚠️ Warning: Importing a previous database backup will completely overwrite your current browser dataset.
              </span>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="space-y-4">
            <h4 className="font-display font-bold text-gray-700 text-xs uppercase tracking-wider">
              Stored Local Storage Backups ({backups.length})
            </h4>

            {backups.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 font-semibold text-xs leading-normal">
                No automatic or manual snapshots recorded yet.<br />
                <span className="font-normal text-[10px] text-gray-400">Background daemon auto-saves changes locally every 60 seconds of active console usage.</span>
              </div>
            ) : (
              <div className="border border-gray-150 rounded-xl overflow-hidden divide-y divide-gray-150 max-h-[220px] overflow-y-auto">
                {backups.map((bkp) => (
                  <div key={bkp.id} className="p-3 bg-gray-50/40 hover:bg-gray-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-gray-900 bg-gray-200 px-1 py-0.5 rounded text-[10px]">
                          {bkp.id}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 rounded-full ${
                          bkp.type === 'automatic' 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-150'
                        }`}>
                          {bkp.type === 'automatic' ? 'Auto' : 'Manual'}
                        </span>
                        <span className="text-gray-400 font-mono text-[10px]">{bkp.sizeKb} KB</span>
                      </div>
                      <div className="text-gray-600 font-medium font-sans">
                        Properties: <span className="text-[#0A1F44] font-bold">{bkp.propertiesCount}</span> • 
                        Invoices: <span className="text-[#0A1F44] font-bold">{bkp.invoicesCount}</span> •
                        Logs: <span className="text-[#0A1F44] font-bold">{bkp.logsCount}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(bkp.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const conf = window.confirm(`Restore to snapshot ${bkp.id}? This overrides current active listings.`);
                          if (conf) onRestoreBackup(bkp);
                        }}
                        className="bg-sky-50 hover:bg-[#0A1F44] text-sky-800 hover:text-white px-2.5 py-1.5 rounded-lg border border-sky-200 hover:border-transparent font-bold transition-all cursor-pointer text-[10px]"
                        title="Restore all collections and properties to this state"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bkp.data, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `Suleja_DB_Snapshot_${bkp.id}_${new Date(bkp.timestamp).toISOString().split('T')[0]}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.removeChild(downloadAnchor);
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg border border-transparent transition-all cursor-pointer flex items-center justify-center"
                        title="Download raw copy of this snapshot"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📜 Suleja LGA Government Invoice Issuance Bureau */}
      <div className="bg-white rounded-xl p-6 border border-gray-150 shadow-xs space-y-6">
        <div className="flex items-center gap-2 border-b pb-3.5 justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#38BDF8]" />
            <div>
              <h3 className="font-display font-semibold text-[#0A1F44] text-sm">Government Rate Invoice Issuance Bureau</h3>
              <p className="text-[11px] text-gray-400">Search and render official tax certificates or demand notice printouts for any citizen property.</p>
            </div>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-sm">ISSUANCE UNIT</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Invoice List & Finder */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 h-4 w-4 text-gray-400 mt-2.5" />
              <input
                type="text"
                placeholder="Search citizen landowner or Invoice Code..."
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="block w-full rounded-lg border border-gray-250 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#0A1F44]"
              />
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {invoices
                .filter(inv => 
                  inv.ownerName.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) || 
                  inv.id.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
                  inv.propertyId.toLowerCase().includes(invoiceSearchQuery.toLowerCase())
                )
                .map(inv => {
                  const correspondingProperty = properties.find(p => p.id === inv.propertyId);
                  const isOverdue = inv.status === 'Overdue';
                  const isPaid = inv.status === 'Paid';
                  
                  return (
                    <div 
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className={`p-3 border rounded-xl cursor-pointer text-left transition-all ${
                        selectedInvoiceId === inv.id 
                          ? 'bg-[#0A1F44]/5 border-[#0A1F44] shadow-sm ring-1 ring-[#0A1F44]' 
                          : 'border-gray-150 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-[10px] text-gray-900 bg-gray-100 px-1 py-0.5 rounded">{inv.id}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isPaid ? 'bg-green-100 text-green-800' : isOverdue ? 'bg-red-105 text-red-850' : 'bg-amber-100 text-amber-805'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <span className="block font-bold text-gray-800 text-xs">{inv.ownerName}</span>
                        <span className="block text-[10px] text-gray-450 font-semibold">{correspondingProperty?.address || 'Suleja Municipal Ward'}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-dashed">
                        <span className="text-[9.5px] text-gray-400">Total rate:</span>
                        <span className="font-mono font-bold text-[#0A1F44]">₦{(inv.amount + inv.penaltyAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Official Invoice PDF Blueprint Visual Proof */}
          <div className="lg:col-span-7 bg-slate-100/50 rounded-2xl p-4 border border-gray-150 relative min-h-[300px] flex items-center justify-center">
            {selectedInvoiceId ? (() => {
              const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);
              if (!selectedInvoice) return <div className="text-gray-400 font-bold">Select property invoice to preview printout</div>;
              
              const correspondingProperty = properties.find(p => p.id === selectedInvoice.propertyId);
              const invoiceTotal = selectedInvoice.amount + selectedInvoice.penaltyAmount;
              
              return (
                <div className="w-full space-y-4">
                  {/* Interactive Control buttons */}
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => {
                        const styleNode = document.createElement("style");
                        styleNode.innerHTML = `
                          @media print {
                            body * {
                              visibility: hidden;
                            }
                            #official-government-printout-blueprint, #official-government-printout-blueprint * {
                              visibility: visible;
                            }
                            #official-government-printout-blueprint {
                              position: absolute;
                              left: 0;
                              top: 0;
                              width: 100%;
                              background: white !important;
                              color: black !important;
                            }
                          }
                        `;
                        document.head.appendChild(styleNode);
                        window.print();
                        document.head.removeChild(styleNode);
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#0A1F44] hover:bg-opacity-95 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer shadow-md"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#38BDF8]" />
                      Print Copy
                    </button>
                    {selectedInvoice.status === 'Paid' && (
                      <button 
                        onClick={async () => {
                          const prop = properties.find(p => p.id === selectedInvoice.propertyId);
                          if (prop) {
                            await exportOfficialReceiptPDF(selectedInvoice, prop, "Internal Auditor", "Tax Inspector");
                          } else {
                            alert("Property metadata reference not found in active dataset.");
                          }
                        }}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer shadow-md border border-emerald-500"
                        title="Export official PDF with seals"
                      >
                        <FileDown className="h-3.5 w-3.5 text-white" />
                        Export Official Receipt
                      </button>
                    )}
                  </div>

                  {/* Document Blueprint container */}
                  <div 
                    id="official-government-printout-blueprint" 
                    className="bg-white border text-black border-gray-300 rounded-lg p-6 max-w-2xl mx-auto shadow-md leading-relaxed text-left font-sans select-none relative overflow-hidden"
                  >
                    {/* Security watermark pattern */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none rotate-12">
                      <div className="text-center">
                        <span className="block text-4xl font-extrabold tracking-widest text-slate-800 font-mono">SULEJA LGA</span>
                        <span className="block text-xl font-bold tracking-widest text-slate-800 uppercase">Official Security Bond</span>
                      </div>
                    </div>

                    {/* Government Emblem Header */}
                    <div className="text-center border-b-2 border-gray-900 pb-3.5 space-y-1 relative">
                      <span className="block text-[10px] font-mono tracking-widest text-gray-500 font-bold uppercase">FEDERAL REPUBLIC OF NIGERIA</span>
                      <h2 className="text-sm font-black text-[#0A1F44] tracking-tight">SULEJA LOCAL GOVERNMENT AREA</h2>
                      <span className="block text-[10.5px] font-bold text-gray-750">COUNCIL SECRETARIAT • LAND REVENUE ASSESSMENT COMMISSION</span>
                      <span className="block text-[9px] text-gray-400 italic">P.M.B. 10, Suleja, Niger State, Nigeria</span>
                    </div>

                    {/* Report Status Header */}
                    <div className="my-4 text-center">
                      <h3 className="text-[11px] font-black tracking-widest text-[#0A1F44] border-y border-dashed py-1.5 bg-slate-50 uppercase">
                        {selectedInvoice.status === 'Paid' ? 'TENEMENT RATE OFFICIAL CLEARANCE RECEIPTS' : 'LAND ASSESSMENT & TENEMENT RATE DEMAND NOTICE'}
                      </h3>
                    </div>

                    {/* Grid of details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10.5px] pb-4 border-b border-gray-200">
                      <div className="space-y-1 text-left">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">ASSESSED RATEPAYER COORDINATES</span>
                        <div>
                          <span className="block font-bold text-gray-950 text-xs">{selectedInvoice.ownerName}</span>
                          <span className="block text-gray-600 font-semibold">{correspondingProperty?.address || 'No location logged'}</span>
                          <span className="block text-gray-600 font-semibold">Ward: <span className="text-[#0A1F44] font-bold">{correspondingProperty?.ward || 'Unzoned'}</span></span>
                          <span className="block text-gray-400 font-mono text-[9px]">Coordinates: Lat {correspondingProperty?.latitude.toFixed(4) || '9.18'}, Lng {correspondingProperty?.longitude.toFixed(4) || '7.18'}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-left sm:text-right">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider sm:text-right">OFFICIAL RECORD BILLING INDICES</span>
                        <div className="text-left sm:text-right font-medium text-gray-800 space-y-0.5">
                          <div>Invoice Code: <span className="font-mono font-bold text-[#0A1F44]">{selectedInvoice.id}</span></div>
                          <div>Property Code: <span className="font-mono font-bold text-gray-900">{selectedInvoice.propertyId}</span></div>
                          <div>Issued Date: <span className="font-mono font-bold">{selectedInvoice.issuedDate}</span></div>
                          <div>Due Date: <span className="font-mono font-bold text-red-650">{selectedInvoice.dueDate}</span></div>
                          <div>Status Badge: <span className="font-sans font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[9.5px]">{selectedInvoice.status}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Accounting Ledger Table */}
                    <div className="my-4">
                      <table className="w-full text-left text-[11px] leading-snug">
                        <thead>
                          <tr className="border-b-2 border-gray-900 text-[9px] uppercase font-bold text-gray-400">
                            <th className="py-2">ASSESSMENT DESCRIPTION / PARTICULARS</th>
                            <th className="py-2 text-right">VALUATION METRIC</th>
                            <th className="py-2 text-right">AMOUNT (NGN)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-gray-800 font-semibold">
                          <tr>
                            <td className="py-2.5">
                              <span className="block font-bold text-gray-900">Annual Rental value (ARV) Assay</span>
                              <span className="text-[9.5px] text-gray-400">Standardized zonal rental worth rating index</span>
                            </td>
                            <td className="py-2.5 text-right font-mono">Assay Limit</td>
                            <td className="py-2.5 text-right font-mono">₦{selectedInvoice.annualRentalValue.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="py-2.5">
                              <span className="block font-bold text-gray-900">Tenement Rate percentage Due</span>
                              <span className="text-[9.5px] text-gray-400">Classification: {correspondingProperty?.propertyType || 'Residential'} Tenement Unit</span>
                            </td>
                            <td className="py-2.5 text-right font-mono">@{selectedInvoice.ratePercentage}% of ARV</td>
                            <td className="py-2.5 text-right font-mono text-[#0A1F44]">₦{selectedInvoice.amount.toLocaleString()}</td>
                          </tr>
                          {selectedInvoice.penaltyAmount > 0 && (
                            <tr>
                              <td className="py-2.5 text-red-700 font-bold">
                                <span className="block">Add Ledger Delinquency penalty</span>
                                <span className="text-[9.5px] text-red-500 font-normal">Cap 13 Rev Laws - Standard 10% interest for arrears</span>
                              </td>
                              <td className="py-2.5 text-right text-red-650 font-mono">10% statutory</td>
                              <td className="py-2.5 text-right text-red-650 font-mono">₦{selectedInvoice.penaltyAmount.toLocaleString()}</td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-gray-900 bg-slate-50 text-gray-900 text-[11px] font-black">
                            <td className="py-3">GRAND TOTAL DEMAND BALANCE</td>
                            <td className="py-3"></td>
                            <td className="py-3 text-right font-mono text-xs text-[#0A1F44]">₦{invoiceTotal.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Compliance terms */}
                    <div className="bg-slate-50 border p-3 rounded-lg text-[9px] text-justify leading-relaxed text-gray-500 mt-5">
                      <b>REGULATORY STATUTORY WARNING (Cap 13, Sec 4):</b> Under Suleja municipal tenement rate structures, this demand notice serves as a legal notice of government levies. If payment remains outstanding beyond the due date coordinates, the Local Government Council reserves full powers to seal properties, secure legal court orders, or initiate forfeiture processes. Remit rate payments through official council bank draft channels or secure online options.
                    </div>

                    {/* Official Signatories signatures */}
                    <div className="flex justify-between items-center pt-8 mt-6 border-t border-dashed border-gray-300">
                      <div className="text-center space-y-1">
                        <div className="h-6 flex items-end justify-center">
                          <span className="font-mono text-gray-400 text-[10px] italic">Hon. Ibrahim Abubakar</span>
                        </div>
                        <div className="w-[120px] border-t border-gray-400"></div>
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">Revenue Director, SLC</span>
                      </div>

                      {/* Official Stamp */}
                      <div className="h-10 w-10 border border-double border-red-500 rounded-full flex items-center justify-center rotate-12 select-none opacity-[0.4]">
                        <span className="text-[7px] font-bold text-red-500 tracking-wider font-mono">L.G.A. STAMP</span>
                      </div>

                      <div className="text-center space-y-1">
                        <div className="h-6 flex items-end justify-center">
                          <span className="font-mono text-gray-400 text-[10px] italic">Maje Council Inspector</span>
                        </div>
                        <div className="w-[120px] border-t border-gray-400"></div>
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">Council Treasurer</span>
                      </div>
                    </div>

                    {/* QR validation reference */}
                    <div className="flex justify-between items-center mt-6 pt-3 border-t text-[8px] font-mono text-gray-400">
                      <span>SECURE RECORD DEED HASH: SULEJA-REV-2026-FBM-{selectedInvoice.id}</span>
                      <span>GEN DATE: 2026-06-10 GMT</span>
                    </div>

                  </div>
                </div>
              );
            })() : (
              <div className="text-center space-y-2 text-gray-400 py-10 leading-normal font-sans">
                <Receipt className="h-12 w-12 text-slate-300 mx-auto opacity-40" />
                <div>
                  <span className="font-bold text-gray-600 block">No invoice selected</span>
                  Select an invoice record from the sidebar to inspect and run print processes.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
