/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import * as QRCodeLib from 'qrcode';
const QRCode = (QRCodeLib as any).default || QRCodeLib;
import { motion, AnimatePresence } from 'motion/react';
import { exportOfficialReceiptPDF } from '../utils/receiptGenerator';
import { 
  Receipt, 
  CreditCard, 
  Plus, 
  Search, 
  FileDown, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Printer, 
  ShieldCheck, 
  CircleAlert, 
  RefreshCw,
  Coins,
  Send,
  MessageSquare,
  Smartphone,
  QrCode,
  Award,
  Download,
  FileText
} from 'lucide-react';
import { Invoice, Property, UserRole } from '../types';

interface PaymentSystemProps {
  invoices: Invoice[];
  properties: Property[];
  userRole: UserRole;
  userName: string;
  userEmail?: string;
  onPayInvoice: (
    invoiceId: string, 
    method: string, 
    ref: string, 
    status?: 'Paid' | 'Pending Approval',
    receiptNotes?: string,
    receiptUrl?: string
  ) => void;
  onBulkGenerateInvoices?: () => void;
  onAddManualPayment?: (propertyId: string, amount: number) => void;
  simulatedEmails?: any[];
}

export default function PaymentSystem({ 
  invoices, 
  properties, 
  userRole, 
  userName,
  userEmail,
  onPayInvoice, 
  onBulkGenerateInvoices,
  onAddManualPayment,
  simulatedEmails = []
}: PaymentSystemProps) {

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Checkout Simulator Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [activeCheckoutInvoice, setActiveCheckoutInvoice] = useState<Invoice | null>(null);
  const [checkoutGateway, setCheckoutGateway] = useState<'Bank Transfer'>('Bank Transfer');
  const [checkoutMethod, setCheckoutMethod] = useState<'Bank Transfer'>('Bank Transfer');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Input, 3: Success

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<Invoice | null>(null);

  // Manual payment entry state for cash collections
  const [showManualPayModal, setShowManualPayModal] = useState(false);
  const [manualPropertyId, setManualPropertyId] = useState('');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualError, setManualError] = useState('');

  // Taxpayer bank transfer receipt submission state
  const [receiptNotesText, setReceiptNotesText] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptFileUrl, setReceiptFileUrl] = useState('');
  const [senderAccountName, setSenderAccountName] = useState('');
  const [senderBankName, setSenderBankName] = useState('');
  const [bankReceiptError, setBankReceiptError] = useState('');

  // Accountant bank transfer review states
  const [activeReviewInvoice, setActiveReviewInvoice] = useState<Invoice | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Bulk generator tracking
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [isGeneratingSuccess, setIsGeneratingSuccess] = useState(false);

  // Twilio SMS Simulation States
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [activeSmsInvoice, setActiveSmsInvoice] = useState<Invoice | null>(null);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSentLogs, setSmsSentLogs] = useState<Array<{ 
    id: string; 
    phone: string; 
    message: string; 
    timestamp: string; 
    invoiceId: string; 
    type: 'Reminder' | 'Receipt' 
  }>>([
    {
      id: 'SMS-1',
      phone: '+234 803 456 7890',
      message: 'Suleja LGA Notice: Taxpayer Alhaji Bello, tenement rate bill INV-2026-0001 has an outstanding balance of ₦84,000 due. Please transfer to Kuda MFB, Acct No: 3000112753 immediately. Avoid sealing.',
      timestamp: '14:20:15 2026-06-10',
      invoiceId: 'INV-2026-0001',
      type: 'Reminder'
    }
  ]);
  
  // Property deep-linked QR billing states
  const [showQrBillingModal, setShowQrBillingModal] = useState(false);
  const [qrPropertyId, setQrPropertyId] = useState('');
  const [qrOwnerName, setQrOwnerName] = useState('');

  // Tax Certificate Modal States
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertInvoice, setSelectedCertInvoice] = useState<Invoice | null>(null);

  const handleTriggerSms = (inv: Invoice) => {
    setActiveSmsInvoice(inv);
    
    // Find matching property to grab their actual registered phone number
    const parentProperty = properties.find(p => p.id === inv.propertyId);
    const phone = parentProperty?.ownerPhone || '+234 803 123 4567';
    setSmsPhone(phone);

    const isPaid = inv.status === 'Paid';
    const messageText = isPaid
      ? `Suleja Revenue: Receipt for ${inv.id} has been processed successfully. Paid ₦${inv.amount.toLocaleString()} for tenement rate 2026 season clear of arrears. Thank you for your statutory compliance!`
      : `Suleja LGA Notice: Taxpayer ${inv.ownerName}, your tenement rate bill ${inv.id} for property ${inv.propertyId} has an outstanding balance of ₦${inv.amount.toLocaleString()} due. Please transfer to Kuda MFB, Acct No: 3000112753 to clear arrears immediately. Avoid legal sealing.`;
    
    setSmsMessage(messageText);
    setShowSmsModal(true);
  };

  const [serverWebhookLogs, setServerWebhookLogs] = useState<Array<{
    id: string;
    timestamp: string;
    payload: any;
    direction: 'inbound' | 'callback';
    event: string;
  }>>([]);

  const fetchServerSmsLogs = async () => {
    try {
      const res = await fetch('/api/twilio/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.smsLogs && data.smsLogs.length > 0) {
          const mappedOut = data.smsLogs.map((l: any) => ({
            id: l.id,
            phone: l.phone,
            message: l.message,
            timestamp: l.timestamp,
            invoiceId: l.invoiceId,
            type: l.type as 'Reminder' | 'Receipt'
          }));
          setSmsSentLogs(prev => {
            const defaultItem = prev.filter(p => p.id === 'SMS-1');
            const merged = [...mappedOut];
            defaultItem.forEach(d => {
              if (!merged.some(m => m.id === d.id)) merged.push(d);
            });
            return merged;
          });
        }
        if (data.webhookLogs) {
          setServerWebhookLogs(data.webhookLogs);
        }
      }
    } catch (err) {
      console.warn("[Twilio logs load skip]", err);
    }
  };

  React.useEffect(() => {
    fetchServerSmsLogs();
  }, []);

  React.useEffect(() => {
    if (showSmsModal) {
      fetchServerSmsLogs();
    }
  }, [showSmsModal]);

  const sendSmsViaSimulatedTwilio = async () => {
    if (!smsPhone || !smsMessage) return;
    setIsSendingSms(true);
    
    // 1-second simulation delay of Twilio API handshake
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const res = await fetch('/api/twilio/sms-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: smsPhone,
          message: smsMessage,
          invoiceId: activeSmsInvoice?.id || 'GLOBAL',
          type: activeSmsInvoice?.status === 'Paid' ? 'Receipt' : 'Reminder'
        })
      });
      if (res.ok) {
        await fetchServerSmsLogs();
      } else {
        throw new Error("HTTP error on send");
      }
    } catch (e) {
      console.warn("Utilizing offline SMS local fallback collection:", e);
      const newLog = {
        id: `SMS-${Date.now()}`,
        phone: smsPhone,
        message: smsMessage,
        timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toISOString().split('T')[0],
        invoiceId: activeSmsInvoice?.id || 'GLOBAL',
        type: (activeSmsInvoice?.status === 'Paid' ? 'Receipt' : 'Reminder') as 'Reminder' | 'Receipt'
      };
      setSmsSentLogs(prev => [newLog, ...prev]);
    }

    setIsSendingSms(false);
    setShowSmsModal(false);
  };

  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  const simulateCallbackWebhook = async () => {
    setIsSimulatingWebhook(true);
    try {
      await fetch('/api/twilio/sms-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          MessageSid: `SM${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          SmsStatus: 'delivered',
          To: smsPhone || '+234 803 456 7890',
          From: 'SULEJA_REV',
          ErrorCode: '0'
        })
      });
      await fetchServerSmsLogs();
    } catch (e) {
      console.error(e);
    }
    setIsSimulatingWebhook(false);
  };

  const simulateInboundSmsWebhook = async () => {
    setIsSimulatingWebhook(true);
    try {
      await fetch('/api/twilio/sms-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          MessageSid: `SM${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          From: smsPhone || '+234 803 456 7890',
          To: '+18884949114',
          Body: `PAYMENT SLG-${activeSmsInvoice?.propertyId || '2026-00042'}`,
          AccountSid: 'AC49b1ff3ad72ce10aef'
        })
      });
      await fetchServerSmsLogs();
    } catch (e) {
      console.error(e);
    }
    setIsSimulatingWebhook(false);
  };

  // Filters
  const taxpayerInvoices = userRole === 'Taxpayer' 
    ? invoices.filter(i => {
        const matchesOwner = i.ownerName === userName || i.propertyId === userName;
        const matchesEmail = userEmail ? (i.propertyId === userEmail || userEmail.toLowerCase().includes(i.propertyId.toLowerCase())) : false;
        return matchesOwner || matchesEmail;
      })
    : invoices;

  const filteredInvoices = taxpayerInvoices.filter((i) => {
    const matchesSearch = 
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.propertyId.toLowerCase().includes(search.toLowerCase()) ||
      i.ownerName.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = selectedStatus ? i.status === selectedStatus : true;
    return matchesSearch && matchesStatus;
  });

  // Pages
  const totalItems = filteredInvoices.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + pageSize);

  // Trigger Online checkout
  const handleOpenCheckout = (inv: Invoice) => {
    setActiveCheckoutInvoice(inv);
    setCheckoutGateway('Bank Transfer');
    setCheckoutMethod('Bank Transfer');
    setCheckoutStep(1);
    setIsProcessingCheckout(false);
    setShowCheckoutModal(true);
  };

  // Complete simulation
  const handleSimulatorPaySubmit = () => {
    if (!activeCheckoutInvoice) return;
    setIsProcessingCheckout(true);

    setTimeout(() => {
      onPayInvoice(
        activeCheckoutInvoice.id, 
        checkoutGateway, 
        `REF-ONLINE-${Math.floor(100000000 + Math.random() * 900000000)}`
      );
      setIsProcessingCheckout(false);
      setCheckoutStep(3); // success view
    }, 1200);
  };

  // Complete bank transfer submission and receipt capture
  const handleBankTransferSubmit = () => {
    if (!activeCheckoutInvoice) return;
    if (!senderAccountName.trim()) {
      setBankReceiptError('Please type the Sender Account (Depositor) Name.');
      return;
    }
    if (!receiptFileName) {
      setBankReceiptError('Please choose/attach a Payment Receipt screenshot.');
      return;
    }

    setBankReceiptError('');
    setIsProcessingCheckout(true);

    const simulatedRef = `REF-TRANSFER-${Math.floor(100000000 + Math.random() * 900000000)}`;
    const proofNotes = `Depositor: ${senderAccountName} | Origin Bank: ${senderBankName || 'Other MFB'} | Remarks: ${receiptNotesText || 'None'}`;
    const fileUrl = receiptFileUrl || 'simulated_uploaded_file.png';

    setTimeout(() => {
      onPayInvoice(
        activeCheckoutInvoice.id,
        'Bank Transfer',
        simulatedRef,
        'Pending Approval',
        proofNotes,
        fileUrl
      );
      setIsProcessingCheckout(false);
      setCheckoutStep(3); // success view with custom message
    }, 1400);
  };

  // Trigger view receipt
  const handleOpenReceipt = (inv: Invoice) => {
    setActiveReceiptInvoice(inv);
    setShowReceiptModal(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const prop = properties.find(p => p.id === invoice.propertyId);
      if (!prop) {
        alert("Error: Property reference not found in database.");
        return;
      }
      await exportOfficialReceiptPDF(invoice, prop, userName, userRole);
    } catch (e) {
      console.error("PDF Export Failure: ", e);
      alert("Failed to export official receipt PDF. Please try again.");
    }
  };

  // Manual Cash entry
  const handleManualPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');

    const targetProp = properties.find(p => p.id.toUpperCase().trim() === manualPropertyId.toUpperCase().trim());
    if (!targetProp) {
      setManualError('No registered Suleja property found matching code. Ensure correct format (e.g., SLG-2026-00104).');
      return;
    }

    const payValue = parseFloat(manualAmount) || 0;
    if (payValue <= 0) {
      setManualError('Please provide a valid cash payment value exceeding ₦0.');
      return;
    }

    // Capture Manual Cash payment via callback towards corresponding invoice of this property
    const matchingInv = invoices.find(i => i.propertyId === targetProp.id && i.status !== 'Paid');
    if (!matchingInv) {
      setManualError('All invoices for this property code are already marked Paid.');
      return;
    }

    onPayInvoice(matchingInv.id, 'Cash', `REF-CASH-${Math.floor(100000 + Math.random() * 900000)}`);
    setShowManualPayModal(false);
    setManualPropertyId('');
    setManualAmount('');
  };

  // Bulk Generator Simulation
  const handleTriggerBulk = () => {
    if (!onBulkGenerateInvoices) return;
    setIsGeneratingBulk(true);
    setTimeout(() => {
      onBulkGenerateInvoices();
      setIsGeneratingBulk(false);
      setIsGeneratingSuccess(true);
      setTimeout(() => setIsGeneratingSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-6 fade-in">
      
      {/* Intro section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0A1F44]">Tenement Billing & Payments Hub</h1>
          <p className="text-xs text-gray-500 font-medium">
            Review yearly invoices, generate digital prints, and process simulated payment checkouts.
          </p>
        </div>

        <div className="flex gap-2">
          {/* Dispatcher Actions */}
          {(userRole === 'Super Admin' || userRole === 'LGA Admin' || userRole === 'Accountant') && onBulkGenerateInvoices && (
            <button
              onClick={handleTriggerBulk}
              disabled={isGeneratingBulk}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-[#0A1F44] py-2 px-3.5 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4 text-[#38BDF8]" />
              {isGeneratingBulk ? 'Dispatching Bulk...' : isGeneratingSuccess ? 'Bills Emailed/Sent!' : 'Batch Billing Run'}
            </button>
          )}

          {/* Cash Reco for Tax Officers */}
          {userRole !== 'Taxpayer' && (
            <button
              onClick={() => setShowManualPayModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A1F44] hover:bg-opacity-95 text-white py-2 px-3.5 text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5 text-[#38BDF8]" />
              Record Cash Receipt
            </button>
          )}
        </div>
      </div>

      {/* ⚡ Batch Billing Generation / Distribution Progress Feedback Animations */}
      <AnimatePresence>
        {isGeneratingBulk && (
          <motion.div
            initial={{ opacity: 0, y: -15, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -15, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-[#E0F2FE] border-2 border-dashed border-[#0284C7]/30 rounded-xl p-4 flex items-center justify-between text-xs text-[#0369A1] font-sans">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#BAE6FD] text-[#0369A1] rounded-lg animate-spin">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <strong className="block text-sm font-display text-[#0369A1] font-black">Executing Batch Billing Run...</strong>
                  <p className="text-[11px] font-medium text-[#0284C7] mt-0.5">Please wait, compiling municipal records, generating dynamic QR links, and mailing invoices to taxpayers.</p>
                </div>
              </div>
              <span className="text-[10px] bg-[#BAE6FD] text-[#0369A1] px-2.5 py-1 rounded font-black font-mono animate-pulse">DISPATCHING</span>
            </div>
          </motion.div>
        )}

        {isGeneratingSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -15, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -15, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-[#D1FAE5] border border-emerald-300 rounded-xl p-4 flex items-center justify-between text-xs text-[#065F46] font-sans">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#A7F3D0] text-[#065F46] rounded-lg">
                  <Check className="h-4 w-4 text-emerald-600 font-bold" />
                </div>
                <div>
                  <strong className="block text-sm font-display text-[#065F46] font-black">Batch Billings Successfully Dispatched!</strong>
                  <p className="text-[11px] font-medium text-emerald-700 mt-0.5">All designated Suleja tenement invoices have been successfully emailed, SMS-notified, and recorded to local secure ledger database.</p>
                </div>
              </div>
              <span className="text-[10px] bg-[#A7F3D0] text-[#065F46] px-2.5 py-1 rounded font-black font-mono">COMPLETE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      {userRole !== 'Taxpayer' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400">Paid Invoices</span>
              <span className="text-lg font-mono font-bold text-gray-900">
                {invoices.filter(i => i.status === 'Paid').length} bills
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400">Overdue Balances</span>
              <span className="text-lg font-mono font-bold text-red-600">
                ₦{invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#0A1F44]/5 text-[#0A1F44] flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400">General Billing Sum</span>
              <span className="text-lg font-mono font-bold text-gray-900">
                ₦{invoices.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Invoices List table card */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden select-text text-xs">
        {/* Table Filters */}
        <div className="p-4 border-b border-gray-150 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Bill Code, Property ID, or Owner Name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="py-2 pl-9 pr-3 w-full rounded-lg border border-gray-300 text-xs outline-none focus:border-[#0A1F44]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-gray-300 bg-white p-2 text-xs"
            >
              <option value="">All Billing Statuses</option>
              <option value="Paid">🟢 Settlement Succeeded</option>
              <option value="Unpaid">🟡 Outstanding Arrears</option>
              <option value="Overdue">🔴 Legal Overdue / Penalties</option>
            </select>

            <span className="rounded bg-[#F5F7FA] px-2.5 py-1.5 font-bold font-mono text-gray-500">
              Hits: {totalItems}
            </span>
          </div>
        </div>

        {/* List Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-105">
            <thead className="bg-[#F5F7FA] text-gray-500 font-bold uppercase text-[10px] tracking-wider text-left">
              <tr>
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Tenement ID</th>
                <th className="px-4 py-3">Payer Landmark / Name</th>
                <th className="px-4 py-3 text-right">Draft Value</th>
                <th className="px-4 py-3 text-right">Fee Penalty</th>
                <th className="px-4 py-3 text-right">Sum Outstanding</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Checkout Options / Receipts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                    No matching Suleja billing invoices registered.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const isPaid = inv.status === 'Paid';
                  const isOverdue = inv.status === 'Overdue';
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      {/* Inv Code */}
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-900">{inv.id}</td>
                      
                      {/* Prop Code */}
                      <td className="px-4 py-3.5 font-mono text-gray-500">{inv.propertyId}</td>

                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <span className="block font-bold text-gray-900 truncate max-w-[150px]">{inv.ownerName}</span>
                        <span className="block text-[10px] text-gray-400">Assigned 2026 Season</span>
                      </td>

                      {/* Base Value */}
                      <td className="px-4 py-3.5 text-right font-mono text-gray-600">
                        ₦{(inv.amount - inv.penaltyAmount).toLocaleString()}
                      </td>

                      {/* Penalty */}
                      <td className="px-4 py-3.5 text-right font-mono text-red-500">
                        {inv.penaltyAmount > 0 ? `₦${inv.penaltyAmount.toLocaleString()}` : '—'}
                      </td>

                      {/* Total Out */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-[#0A1F44]">
                        ₦{inv.amount.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                          isPaid 
                            ? 'bg-green-150 text-green-700' 
                            : inv.status === 'Pending Approval'
                              ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse'
                              : isOverdue 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-gray-150 text-gray-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>

                      {/* Payment simulator actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {isPaid ? (
                            <div className="flex gap-1 flex-wrap">
                              <button
                                onClick={() => handleOpenReceipt(inv)}
                                className="inline-flex items-center gap-1 rounded bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white px-2 py-0.5 font-bold text-[10px] cursor-pointer"
                              >
                                <Printer className="h-3 w-3 text-[#38BDF8]" />
                                Receipt
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCertInvoice(inv);
                                  setShowCertificateModal(true);
                                }}
                                className="inline-flex items-center gap-1 rounded bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0A1F44] px-2 py-0.5 font-bold text-[10px] cursor-pointer shadow-xs border border-sky-300 transition-colors"
                                title="Generate and view Printable Tax Clearance Certificate"
                              >
                                <Award className="h-3 w-3 text-[#0A1F44]" />
                                Cert
                              </button>
                              {userRole !== 'Taxpayer' && (
                                <button
                                  onClick={() => handleDownloadPDF(inv)}
                                  className="inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 font-bold text-[10px] cursor-pointer shadow-xs border border-emerald-500"
                                  title="Export Signed Official Receipt PDF"
                                >
                                  <FileDown className="h-3 w-3 text-white" />
                                  Export
                                </button>
                              )}
                            </div>
                          ) : inv.status === 'Pending Approval' ? (
                            (userRole === 'Accountant' || userRole === 'Super Admin' || userRole === 'LGA Admin') ? (
                              <button
                                onClick={() => {
                                  setActiveReviewInvoice(inv);
                                  setShowReviewModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0A1F44] px-2 py-1 font-extrabold text-[10px] cursor-pointer shadow-xs border border-amber-400"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                Verify
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                <Clock className="h-3 w-3 text-amber-550 animate-pulse" />
                                Pending
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => handleOpenCheckout(inv)}
                              className="rounded bg-[#0A1F44] hover:bg-[#0A1F44]/95 text-[#38BDF8] font-bold text-[10px] px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-sm border border-[#38BDF8]/20"
                            >
                              <Coins className="h-3.5 w-3.5" />
                              Pay Link
                            </button>
                          )}

                          {/* Twilio SMS Trigger Action */}
                          {(userRole === 'Super Admin' || userRole === 'LGA Admin' || userRole === 'Accountant' || userRole === 'Tax Officer') && (
                            <button
                              onClick={() => handleTriggerSms(inv)}
                              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-extrabold transition-all cursor-pointer ${
                                isPaid
                                  ? 'bg-sky-50 hover:bg-sky-100 text-[#38BDF8] border border-sky-100'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              }`}
                              title={isPaid ? "Simulate sending Payment SMS Receipt via Twilio" : "Simulate sending Payment SMS Reminder via Twilio"}
                            >
                              <Smartphone className="h-3 w-3" />
                              <span>SMS</span>
                            </button>
                          )}

                          {/* QR Code Deep link Generator */}
                          <button
                            onClick={() => {
                              setQrPropertyId(inv.propertyId);
                              setQrOwnerName(inv.ownerName);
                              setShowQrBillingModal(true);
                            }}
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-extrabold transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-gray-750 border border-gray-200"
                            title="Generate Billing QR Code Deep Link"
                          >
                            <QrCode className="h-3 w-3 text-sky-600" />
                            <span>QR</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination indicators footer */}
        <div className="bg-gray-50 p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 font-medium">
          <div>
            Showing <span className="text-gray-700 font-bold">{startIndex + 1}</span> to <span className="text-gray-700 font-bold">{Math.min(startIndex + pageSize, totalItems)}</span> of <span className="text-gray-700 font-bold">{totalItems}</span> invoices
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-gray-300 bg-white text-[#0A1F44] disabled:opacity-40"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <span className="font-mono text-gray-700 font-semibold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-gray-300 bg-white text-[#0A1F44] disabled:opacity-40"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Automated Email Outbox Hub */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs p-6 select-text">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2 mb-4">
          <div className="space-y-1">
            <h3 className="font-display font-extrabold text-sm text-[#0A1F44] flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">📧</span>
              Suleja Municipal Email Dispatch Centre
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Simulated public messaging logs showing automated tenement rate notices transmitted to taxpayers.
            </p>
          </div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Active Mail Queue (2026 UTC)
          </span>
        </div>

        {simulatedEmails.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 border border-dashed rounded-xl p-4 text-gray-400 font-medium text-xs space-y-1">
            <p className="text-gray-550 font-bold">Mailbox Outbox Empty</p>
            <p className="text-[11px] text-gray-400 max-w-md mx-auto">
              Simulated email summaries trigger automatically the instant a taxpayer completes an online checkout payment or lodges a bank transfer receipt advice.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {simulatedEmails.map((email: any) => {
              const dateObj = new Date(email.timestamp);
              const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return (
                <div key={email.id} className="border border-gray-150 rounded-xl bg-slate-50/50 p-4 space-y-3 hover:border-indigo-200 transition-all">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-gray-100 pb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">RECIPIENT:</span>
                        <span className="font-mono text-xs font-extrabold text-indigo-750 bg-indigo-50/60 p-1 px-2 rounded border border-indigo-100/30">{email.to}</span>
                      </div>
                      <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>{email.subject}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                        email.status.includes('Cleared') 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {email.status}
                      </span>
                      <span className="font-mono text-[9px] text-gray-400 font-bold">
                        {formattedTime} (UTC)
                      </span>
                    </div>
                  </div>

                  {/* Mail Message Body Simulation Preview */}
                  <div className="bg-white border rounded-lg p-3.5 text-[11px] font-mono whitespace-pre-wrap text-gray-700 leading-relaxed shadow-xs border-gray-150 overflow-hidden select-text break-words">
                    {email.body}
                  </div>

                  {email.invoiceId && email.status === 'Cleared & Confirmed' && (
                    <div className="bg-indigo-50/50 border border-indigo-150/40 p-3 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-1.5">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-5 w-5 text-indigo-650 shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="text-[11px] font-bold text-gray-850 truncate">Suleja_Official_Receipt_Cleared_ID_{email.invoiceId}.pdf</div>
                          <div className="text-[9.5px] text-gray-500 font-bold font-mono">Size: ~25 KB • Format: PDF Document</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const matchingInv = invoices.find(i => i.id === email.invoiceId);
                          const matchingProp = properties.find(p => p.id === email.propertyId);
                          if (matchingInv && matchingProp) {
                            await exportOfficialReceiptPDF(matchingInv, matchingProp, userName || "Salma Salihu", userRole || "LGA Accountant");
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition shadow-sm shrink-0 font-sans"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Receipt PDF</span>
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-1">
                    <span className="text-[9px] text-[#0A1F44]/60 font-bold tracking-wider uppercase font-sans flex items-center gap-1">
                      🛡️ Cryptographically signed • Suleja Govt Gateway
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Online Checkout Simulation Popup */}
      {showCheckoutModal && activeCheckoutInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 text-white flex items-center justify-between bg-[#0A1F44]">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#38BDF8]" />
                <div>
                  <span className="block text-[10px] font-mono font-bold text-sky-200">OFFICIAL REVENUE PORTAL</span>
                  <h4 className="font-display font-bold text-sm tracking-tight">Bank Transfer Settle Engine</h4>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setBankReceiptError('');
                }}
                className="text-white hover:text-[#38BDF8] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Portal Content */}
            <div className="p-6 space-y-5 shadow-inner">
              {checkoutStep === 1 ? (
                // Step 1: Inputting credit or bank details
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200 text-xs">
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Billed invoice:</span>
                      <span className="font-bold text-gray-700 font-mono">{activeCheckoutInvoice.id}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#0A1F44] font-bold text-sm mt-1.5 pt-1.5 border-t">
                      <span>Amount Due:</span>
                      <span className="font-mono text-base text-[#0A1F44]">₦{activeCheckoutInvoice.amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                          <span className="font-bold text-[#0A1F44] uppercase text-[10px]">Official LGA Bank Transfer details</span>
                        </div>
                        <span className="text-[9px] bg-sky-100 text-[#0A1F44] px-1.5 py-0.5 rounded font-bold">SCAN QR TO PAY</span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="font-mono space-y-1.5 text-[11px] text-gray-800 flex-1 w-full">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Bank Name:</span>
                            <span className="font-bold text-gray-900">Kuda MFB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Account Name:</span>
                            <span className="font-bold text-gray-900 text-right truncate max-w-[125px]">RamZurat Nig Ltd</span>
                          </div>
                          <div className="flex justify-between bg-sky-100/30 p-1 rounded items-center border border-sky-100/50">
                            <span className="text-sky-800 font-bold text-[10px]">Account No:</span>
                            <b className="text-[#0A1F44] text-xs tracking-wider">3000112753</b>
                          </div>
                          <div className="flex justify-between text-[10px] text-green-700 font-extrabold mt-1 border-t border-dashed border-sky-100 pt-1">
                            <span>Amount Due:</span>
                            <span>₦{activeCheckoutInvoice.amount.toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {/* QR Code Container */}
                        <div className="flex flex-col items-center shrink-0 bg-white p-2 rounded-lg border border-gray-150 shadow-sm w-[90px] h-[90px] justify-center">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                              `otpauth://transfer?bank=KudaMFB;acct=3000112753;name=RamZuratNigLtd;amount=${activeCheckoutInvoice.amount};ref=${activeCheckoutInvoice.id}`
                            )}`}
                            alt="LGA Treasury Payment QR"
                            referrerPolicy="no-referrer"
                            className="h-[68px] w-[68px] object-contain"
                            title="Scan using your mobile banking application for rapid payment routing"
                          />
                          <span className="text-[7px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Scannable Account</span>
                        </div>
                      </div>
                    </div>

                      {/* Taxpayer lodgment input details */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-600 font-bold uppercase mb-1">Sender Account Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Ibrahim Musa"
                              value={senderAccountName}
                              onChange={(e) => setSenderAccountName(e.target.value)}
                              className="w-full rounded border border-gray-300 p-2 text-xs outline-none focus:border-[#0A1F44]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-600 font-bold uppercase mb-1">Origin Bank Name</label>
                            <input
                              type="text"
                              placeholder="e.g. GTBank PLC"
                              value={senderBankName}
                              onChange={(e) => setSenderBankName(e.target.value)}
                              className="w-full rounded border border-gray-300 p-2 text-xs outline-none focus:border-[#0A1F44]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-600 font-bold uppercase mb-1">Remarks & Depositor Notes</label>
                          <textarea
                            rows={2}
                            placeholder="Type any additional payment reference notes..."
                            value={receiptNotesText}
                            onChange={(e) => setReceiptNotesText(e.target.value)}
                            className="w-full rounded border border-gray-300 p-2 text-xs outline-none focus:border-[#0A1F44]"
                          />
                        </div>

                        {/* Drag and Drop style Simulated upload button */}
                        <div>
                          <label className="block text-[10px] text-gray-600 font-bold uppercase mb-1">Include Payment Receipt (Screenshot) *</label>
                          <div 
                            onClick={() => {
                              const input = document.getElementById('tax-receipt-input') as HTMLInputElement;
                              input?.click();
                            }}
                            className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                              receiptFileName 
                                ? 'border-green-400 bg-green-50/40 text-green-800' 
                                : 'border-gray-250 hover:border-[#38BDF8] bg-gray-50 text-gray-400'
                            }`}
                          >
                            <input
                              id="tax-receipt-input"
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setReceiptFileName(e.target.files[0].name);
                                  setReceiptFileUrl('Simulated File: ' + e.target.files[0].name);
                                } else {
                                  setReceiptFileName('receipt_capture_signed.png');
                                }
                              }}
                            />
                            {receiptFileName ? (
                              <div>
                                <span className="block text-xs font-bold text-green-700 truncate">✓ {receiptFileName}</span>
                                <span className="block text-[9px] text-gray-500 mt-0.5">Click to change attached file proof.</span>
                              </div>
                            ) : (
                              <div>
                                <span className="block text-xs font-bold text-gray-700">Attach receipt photo / screenshot</span>
                                <span className="block text-[9px] text-gray-400 mt-0.5">Click to select file</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {bankReceiptError && (
                          <p className="text-red-500 font-semibold text-[10px]">{bankReceiptError}</p>
                        )}
                      </div>
                    </div>

                  {/* Submit pay */}
                  <button
                    onClick={checkoutMethod === 'Bank Transfer' ? handleBankTransferSubmit : handleSimulatorPaySubmit}
                    disabled={isProcessingCheckout}
                    className="w-full bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white rounded-lg py-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {isProcessingCheckout ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Treasury secure handshake syncing...
                      </span>
                    ) : (
                      checkoutMethod === 'Bank Transfer' 
                        ? 'Submit Receipt for Accountant Review' 
                        : 'Simulate Payment Process'
                    )}
                  </button>
                </div>
              ) : (
                // Step 3: Payment Success / pending Receipt screen
                <div className="space-y-4 text-center">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto ${
                    checkoutMethod === 'Bank Transfer' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-green-50 text-green-600'
                  }`}>
                    {checkoutMethod === 'Bank Transfer' ? <Clock className="h-6 w-6" /> : <Check className="h-6 w-6" />}
                  </div>
                  <div>
                    <h5 className="font-display font-bold text-gray-900 text-sm">
                      {checkoutMethod === 'Bank Transfer' ? 'Receipt Submitted Successfully' : 'Payment Authorized Successfully!'}
                    </h5>
                    <p className="text-xs text-gray-500 mt-1 leading-normal">
                      {checkoutMethod === 'Bank Transfer' 
                        ? 'Your payment proof has been queued. Please wait for Accountant Salma Salihu to approve your settlement.' 
                        : 'Receipt index created in the local government treasury database logging unique security coordinates.'}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border text-xs text-left font-mono space-y-1">
                    <div className="flex justify-between text-gray-500">
                      <span>Ref Code:</span>
                      <span className="text-[#0A1F44] font-bold">
                        {checkoutMethod === 'Bank Transfer' ? 'Awaiting Verification' : `REF-ONLINE-${activeCheckoutInvoice.id.slice(-5)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Status:</span>
                      {checkoutMethod === 'Bank Transfer' ? (
                        <b className="text-amber-600">Pending approval</b>
                      ) : (
                        <b className="text-green-700">Settled (Paid)</b>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowCheckoutModal(false);
                        setBankReceiptError('');
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-xs font-bold hover:bg-gray-200"
                    >
                      Return to Bills
                    </button>
                    {checkoutMethod !== 'Bank Transfer' && (
                      <button
                        onClick={() => {
                          setShowCheckoutModal(false);
                          handleOpenReceipt(activeCheckoutInvoice);
                        }}
                        className="flex-1 bg-[#0A1F44] text-white rounded-lg py-2 text-xs font-bold hover:bg-opacity-95"
                      >
                        Export Receipt PDF
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* High Fidelity Printable Receipt Modal */}
      {showReceiptModal && activeReceiptInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full overflow-hidden shadow-2xl relative select-text text-black">
            
            {/* Header print visual */}
            <div className="p-6 border-b border-gray-200 text-center space-y-2 bg-[#F5F7FA]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-[#38BDF8] font-mono">OFFICIAL MUNICIPAL SLIP</span>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-400 hover:text-black font-bold text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mx-auto h-12 w-12 rounded-full border border-gray-300 flex items-center justify-center bg-white text-[#0A1F44]">
                <Receipt className="h-6 w-6 text-[#38BDF8]" />
              </div>
              <h3 className="font-display font-extrabold text-xs sm:text-sm text-[#0A1F44]">SULEJA LOCAL GOVERNMENT AREA</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Niger State Government, Nigeria</p>
            </div>

            {/* Content box details */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Sum Paid</span>
                <span className="text-3xl font-extrabold font-mono text-[#0A1F44]">
                  ₦{activeReceiptInvoice.amount.toLocaleString()}
                </span>
                <span className="inline-block mt-1.5 rounded-full bg-green-50 px-3 py-0.5 text-[10px] text-green-700 border border-green-200/50 font-bold uppercase">
                  Cash Succeeded Reconciled
                </span>
              </div>

              {/* Fields */}
              <div className="border-t border-b border-gray-150 py-3 text-xs space-y-2.5 font-sans font-medium">
                <div className="flex justify-between">
                  <span className="text-gray-400">Municipal Receipt ID:</span>
                  <b className="font-mono">{activeReceiptInvoice.id}</b>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Property Code ID:</span>
                  <b className="font-mono">{activeReceiptInvoice.propertyId}</b>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Assessed Landlord Name:</span>
                  <span className="font-semibold text-gray-950 truncate max-w-[170px]">{activeReceiptInvoice.ownerName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Assessed rental annual value:</span>
                  <span className="font-mono">₦{activeReceiptInvoice.annualRentalValue.toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Treasury Method Used:</span>
                  <span className="font-semibold capitalize text-gray-900">{activeReceiptInvoice.paymentMethod || 'Online Checkout API'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Filing Settle Date:</span>
                  <span className="font-mono text-gray-900">{activeReceiptInvoice.paymentDate || '2026-06-08'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Reference Code:</span>
                  <span className="font-mono font-bold text-gray-900 truncate max-w-[170px]">{activeReceiptInvoice.transactionRef || 'REF-N/A'}</span>
                </div>
              </div>

              {/* Print notice */}
              <p className="text-[10px] text-gray-400 text-center italic leading-normal font-medium">
                Suleja tenement rate collections mapped under Revenue Act, Cap 13. Certificate printed electronically serves as statutory clearance.
              </p>

              {/* Download and Print Actions */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-2.5 pt-2">
                <button
                  type="button"
                  id="btn-download-pdf-receipt"
                  onClick={() => handleDownloadPDF(activeReceiptInvoice)}
                  className="flex-1 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg py-2.5 px-3 text-[11px] font-bold font-sans flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  title="Export official cleared tenement rate receipt with digital government stamp"
                >
                  <FileDown className="h-4 w-4 text-white" />
                  <span>Export Official Receipt</span>
                </button>
                <button
                  type="button"
                  id="btn-trigger-hardware-print"
                  onClick={() => {
                    window.print();
                  }}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg py-2.5 px-3 text-[11px] font-bold font-sans flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  title="Trigger Official Printer View"
                >
                  <Printer className="h-4 w-4 text-gray-500" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  id="btn-trigger-sms-receipt"
                  onClick={() => {
                    setShowReceiptModal(false);
                    handleTriggerSms(activeReceiptInvoice);
                  }}
                  className="bg-[#0A1F44] hover:bg-[#0A1F44]/95 text-[#38BDF8] border border-[#38BDF8]/20 rounded-lg py-2.5 px-3 text-[11px] font-extrabold font-sans flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  title="Simulate SMS Receipt Dispatch via Twilio API"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Twilio SMS Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Cash Settle Modal Entry */}
      {showManualPayModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-xs font-sans">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display font-extrabold text-[#0A1F44] text-sm flex items-center gap-1.5">
                <Coins className="h-5 w-5 text-amber-500" />
                Ledger Entry Cash Capture
              </h3>
              <button onClick={() => setShowManualPayModal(false)} className="text-gray-400 hover:text-black font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleManualPaySubmit} className="space-y-3.5">
              {manualError && (
                <div className="p-2.5 rounded bg-red-50 text-red-700 border border-red-200">
                  {manualError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Assigned Property ID Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SLG-2026-00042"
                  value={manualPropertyId}
                  onChange={(e) => setManualPropertyId(e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 font-mono focus:border-[#0A1F44] text-xs outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Cash Value Provided (₦) *</label>
                <input
                  type="number"
                  required
                  placeholder="Enter exact amount matching invoice dues"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 focus:border-[#0A1F44] text-xs outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded border text-[10px] leading-relaxed text-amber-800 flex items-start gap-1">
                <CircleAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <span>Entering a manual ledger receipt bypasses bank portals. Reco Officer: <b>{userName} ({userRole})</b> remains personally responsible for accurate physical cash vault counts.</span>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowManualPayModal(false)}
                  className="flex-1 border p-2 rounded text-gray-500 font-bold hover:bg-gray-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-700 text-white rounded p-2 font-bold hover:bg-green-800"
                >
                  Commit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accountant Review Advice Modal */}
      {showReviewModal && activeReviewInvoice && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full overflow-hidden shadow-2xl relative select-text text-black text-xs font-sans">
            <div className="bg-amber-500 p-5 text-[#0A1F44] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <span className="block text-[9px] font-mono font-bold text-[#0A1F44]/70">TREASURY MANAGEMENT PORTAL</span>
                  <h4 className="font-display font-bold text-sm tracking-tight">Review Bank Transfer Advice</h4>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-[#0A1F44] hover:text-[#0A1F44]/70 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3.5 text-amber-800 space-y-1 text-xs">
                <span className="font-bold">Compliance Status: Pending Review</span>
                <p className="text-[11px] leading-relaxed">
                  Please confirm transfer value reflects in the official Kuda LGA bank ledger before releasing the official cryptographic revenue clearance receipt.
                </p>
              </div>

              {/* Bill brief */}
              <div className="bg-gray-50 border rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between border-b pb-1.5 font-semibold text-gray-750">
                  <span>Bill Code:</span>
                  <span className="font-mono text-[#0A1F44] font-bold">{activeReviewInvoice.id}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-gray-500">Property Code:</span>
                  <span className="font-mono text-gray-800">{activeReviewInvoice.propertyId}</span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-gray-500">Assessed Value:</span>
                  <span className="font-mono font-bold text-gray-900">₦{activeReviewInvoice.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assessed Landlord:</span>
                  <span className="font-bold text-gray-900 truncate max-w-[155px]">{activeReviewInvoice.ownerName}</span>
                </div>
              </div>

              {/* Submitted advice info */}
              <div className="border border-sky-100 bg-sky-50/40 rounded-xl p-3 space-y-2">
                <h5 className="font-bold text-[#0A1F44] uppercase tracking-wider text-[9px] pb-1 border-b border-sky-100 mb-1">Taxpayer Payment Evidence</h5>
                <div className="space-y-1.5 font-medium">
                  <div>
                    <span className="block text-gray-500 text-[9px] uppercase font-bold">LODGED EVIDENCE/RECEIPT:</span>
                    <span className="font-mono text-emerald-800 font-bold text-[11px] flex items-center gap-1 bg-emerald-50 p-1.5 rounded border border-emerald-200/50 mt-1">
                      📄 {activeReviewInvoice.receiptUrl || 'transfer_receipt.png'} (Assigned Proof Advised)
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-[9px] uppercase font-bold">PAYMENT DETAILS & DEPOSITOR NOTES:</span>
                    <p className="text-gray-700 bg-white p-2 rounded border border-sky-100 text-[11px] select-text mt-1 font-mono break-all leading-normal">
                      {activeReviewInvoice.receiptNotes || 'Sender details missing.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => {
                    // Reject action: reset status to Unpaid and remove receipt
                    onPayInvoice(
                      activeReviewInvoice.id,
                      'Bank Transfer',
                      activeReviewInvoice.transactionRef || '',
                      'Unpaid' as any,
                      '',
                      ''
                    );
                    setShowReviewModal(false);
                  }}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg py-2.5 text-xs font-bold cursor-pointer font-sans"
                >
                  Decline Receipt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Approve action: mark as Paid
                    onPayInvoice(
                      activeReviewInvoice.id,
                      'Bank Transfer',
                      activeReviewInvoice.transactionRef || `REF-RECONCILED-${Date.now().toString().slice(-4)}`,
                      'Paid',
                      activeReviewInvoice.receiptNotes,
                      activeReviewInvoice.receiptUrl
                    );
                    setShowReviewModal(false);
                  }}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-lg py-2.5 text-xs font-bold font-sans cursor-pointer shadow-md"
                >
                  Approve Clearance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Twilio SMS Simulation / Operation Console Modal */}
      {showSmsModal && activeSmsInvoice && (
        <div id="twilio-sms-modal" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-xs font-sans">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header with Twilio Crimson Theme */}
            <div className="bg-[#F22F46] p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-xs">
                  <Smartphone className="h-5 w-5 text-[#F22F46]" />
                </div>
                <div className="text-left">
                  <span className="block text-[8.5px] font-mono tracking-widest text-red-100 font-extrabold uppercase animate-pulse">
                    TWILIO REST INTEGRATION LIVE
                  </span>
                  <h4 className="font-extrabold text-sm tracking-tight text-white">
                    Twilio Serverless SMS Console
                  </h4>
                </div>
              </div>
              <button 
                onClick={() => setShowSmsModal(false)}
                className="text-white hover:text-red-100 font-bold text-lg cursor-pointer transition-colors"
                title="Close console"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              {/* Twilio Account Credentials simulation summary */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-gray-400">
                <div>
                  <span className="block text-gray-500 text-[9px] uppercase">Account SID</span>
                  <span className="text-gray-250 font-bold">AC49b1ff3ad72ce10aef...</span>
                </div>
                <div>
                  <span className="block text-gray-500 text-[9px] uppercase">Webhook Target URI</span>
                  <span className="text-gray-250 font-bold truncate block" title={window.location.origin + "/api/twilio/sms-webhook"}>
                    {window.location.origin}/api/twilio/sms-webhook
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-900 flex justify-between items-center mt-1.5 text-emerald-400">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    SIMULATED NODE CONNECTED
                  </span>
                  <span>v1.2.4</span>
                </div>
              </div>

              {/* Input targets form */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Sender ID (Alphanumeric)</label>
                    <input
                      type="text"
                      disabled
                      value="SULEJA_REV"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs font-mono font-bold text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Taxpayer Phone Target</label>
                    <input
                      type="text"
                      required
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      placeholder="e.g. +234 803 XXXXXXX"
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-mono font-bold text-gray-800 outline-none focus:border-[#F22F46]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] uppercase font-bold text-gray-500">Body Message Content</label>
                    <span className="text-[10px] font-mono text-gray-400">
                      Chars: {smsMessage.length} • {Math.ceil(smsMessage.length / 160)} SMS segment(s)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Type SMS text..."
                    className="w-full rounded-lg border border-[#BCD0E4] bg-white p-3 text-xs outline-none focus:border-[#F22F46] font-sans text-gray-850 leading-relaxed"
                  />
                  <p className="text-[9.5px] text-gray-400 italic mt-1 leading-normal">
                    You can modify the SMS copy freely. Taxpayers will receive clear instructions to use Niger State payment frameworks.
                  </p>
                </div>
              </div>

              {/* Submit trigger with REST Log */}
              <div>
                <button
                  type="button"
                  onClick={sendSmsViaSimulatedTwilio}
                  disabled={isSendingSms || !smsPhone}
                  className="w-full bg-[#F22F46] hover:bg-[#D1253A] disabled:bg-gray-300 text-white py-2.5 rounded-lg font-bold text-xs cursor-pointer text-center flex items-center justify-center gap-2 shadow-md transition-all select-none"
                >
                  {isSendingSms ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Contacting Twilio REST Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Fire Twilio SMS Alert</span>
                    </>
                  )}
                </button>
              </div>

              {/* Webhook Interactive Testing Sandbox */}
              <div className="border rounded-xl p-4 bg-slate-50 space-y-3.5 border-dashed border-[#F22F46]/40">
                <div>
                  <h5 className="font-extrabold text-[11px] text-[#F22F46] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                    Webhooks & Web Services Sandbox
                  </h5>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                    Trigger custom simulations interacting live with the Express server's webhooks.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSimulatingWebhook}
                    onClick={simulateCallbackWebhook}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-[#0A1F44] py-2 px-3 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs select-none transition-all disabled:opacity-50"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                    Simulate Callback
                  </button>

                  <button
                    type="button"
                    disabled={isSimulatingWebhook}
                    onClick={simulateInboundSmsWebhook}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-[#0A1F44] py-2 px-3 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs select-none transition-all disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5 text-green-500" />
                    Simulate Inbound
                  </button>
                </div>

                {/* Live Webhook traffic log list */}
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-extrabold text-gray-400 uppercase tracking-widest block">
                    Server Webhook Real-time Feeds ({serverWebhookLogs.length})
                  </span>
                  {serverWebhookLogs.length === 0 ? (
                    <div className="text-center italic text-[9px] text-gray-400 py-2 border rounded-lg bg-white bg-opacity-60 border-dashed">
                      No webhook queries processed yet. Fire a test simulation above.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {serverWebhookLogs.map((log) => (
                        <div key={log.id} className="p-2 border rounded-lg bg-white relative text-[9.5px] text-left shadow-2xs">
                          <div className="flex justify-between items-center mb-1 font-mono text-[8px]">
                            <span className={`font-bold uppercase ${log.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`}>
                              {log.direction === 'inbound' ? ' Inbound User SMS' : ' Status Callback'}
                            </span>
                            <span className="text-gray-400">{log.timestamp}</span>
                          </div>
                          <p className="text-gray-750 font-bold leading-tight font-sans text-[10px] mb-1">{log.event}</p>
                          <details className="mt-1">
                            <summary className="text-[8px] text-gray-400 font-bold hover:text-gray-650 cursor-pointer select-none">
                              Inspect JSON Payload
                            </summary>
                            <pre className="p-1.5 mt-1 rounded bg-slate-950 text-[8px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Historic Sent logs for audit trail */}
              <div className="border-t pt-3.5 space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">SMS Dispatch Ledger History ({smsSentLogs.length})</span>
                  <button 
                    onClick={() => {
                      if (confirm("Clear simulated dispatch logs?")) {
                        setSmsSentLogs([]);
                      }
                    }} 
                    className="text-[9px] text-[#F22F46] hover:underline font-bold cursor-pointer"
                  >
                    Purge History
                  </button>
                </div>

                {smsSentLogs.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-4 text-center text-gray-400 italic text-[10px]">
                    No messages dispatched this session. Logs will appear here on trigger.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {smsSentLogs.map((log) => (
                      <div key={log.id} className="p-2 border rounded bg-slate-50 relative text-[10.5px] text-left">
                        <div className="flex justify-between items-center mb-1 font-mono text-[9px]">
                          <span className="font-bold text-gray-800">{log.phone}</span>
                          <span className="text-gray-400">{log.timestamp}</span>
                        </div>
                        <p className="text-gray-650 font-normal leading-relaxed">{log.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8.5px] font-mono text-indigo-700 bg-indigo-50 font-extrabold px-1 rounded">
                            ID: {log.invoiceId}
                          </span>
                          <span className={`text-[8px] font-bold px-1 rounded uppercase ${
                            log.type === 'Receipt' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-[#0A1F44]/5 text-[#0A1F44]'
                          }`}>
                            {log.type} Sent
                          </span>
                          <span className="ml-auto text-[8.5px] text-green-700 font-bold bg-green-50 px-1 rounded flex items-center gap-0.5 border border-green-200">
                            <span className="h-1 w-1 rounded-full bg-green-500 inline-block" />
                            DELIVERED
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowSmsModal(false)}
                className="bg-gray-200 border hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-bold text-xs cursor-pointer font-sans"
              >
                Close Gateway Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Bill Citizen Quick-Pay QR Modal */}
      {showQrBillingModal && qrPropertyId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-sm w-full overflow-hidden shadow-2xl relative text-black text-xs font-sans">
            <div className="bg-[#0A1F44] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-sans font-bold">
                <QrCode className="h-5 w-5 text-[#38BDF8]" />
                <div>
                  <span className="block text-[9px] font-mono font-bold text-[#38BDF8]/80">TENEMENT SYSTEM QUICK-PAY</span>
                  <h4 className="font-bold text-sm tracking-tight text-white mb-0">Bill Deep-Link QR Code</h4>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowQrBillingModal(false);
                  setQrPropertyId('');
                }}
                className="text-white hover:text-gray-300 font-bold text-lg cursor-pointer border-0 bg-transparent p-0"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-center space-y-4 bg-slate-50">
              <p className="text-gray-500 font-medium text-[11px] leading-relaxed">
                Scan this official municipal billing QR code to instantly bypass general logins and deep-link directly into the citizen payment checkout interface for this tenement property.
              </p>

              {/* QR Code Container */}
              <div className="inline-block bg-white p-4 rounded-xl border border-gray-150 shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    `${window.location.origin}${window.location.pathname}?quickpay=${qrPropertyId}`
                  )}`}
                  alt={`QR Code for Property ${qrPropertyId}`}
                  referrerPolicy="no-referrer"
                  className="w-[180px] h-[180px] object-contain mx-auto"
                />
                <span className="block text-[9.5px] font-mono text-gray-500 font-bold mt-2.5 uppercase tracking-wider bg-slate-100 p-1 rounded border">
                  Property ID: {qrPropertyId}
                </span>
                <span className="block text-[9px] font-semibold text-gray-400 mt-1">
                  Owner: {qrOwnerName}
                </span>
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-left">
                <h5 className="font-bold text-[#0A1F44] text-[10px] uppercase font-sans">Deep Link Address:</h5>
                <p className="font-mono text-[9px] text-sky-850 break-all select-all font-semibold mt-1 bg-white p-1.5 rounded border">
                  {`${window.location.origin}${window.location.pathname}?quickpay=${qrPropertyId}`}
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-100 text-center border-t text-[9px] uppercase font-extrabold text-[#0A1F44]">
              ● Suleja LGA Board of Internal Revenue
            </div>
          </div>
        </div>
      )}

      {/* 📜 Printable, Formal PDF-style Tax Clearance Certificate Modal */}
      {showCertificateModal && selectedCertInvoice && (() => {
        const matchingProp = properties.find(p => p.id === selectedCertInvoice.propertyId);
        const certNo = `TCC-2026-SUL-${selectedCertInvoice.id.replace('INV-', '')}`;
        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:bg-white print:p-0 print:static print:h-auto select-text text-slate-850">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-250 shadow-2xl overflow-hidden print:shadow-none print:border-0 print:max-w-none print:w-full print:rounded-none">
              
              {/* Header actions (Hidden during printing) */}
              <div className="bg-slate-50 border-b border-gray-200 p-4 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-sky-600" />
                  <span className="font-bold text-xs text-[#0A1F44]">Tax Clearance Certificate Issuer</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white font-bold text-xs cursor-pointer shadow-sm active:translate-y-[1px] transition-all"
                  >
                    <Printer className="h-3.5 w-3.5 text-[#38BDF8]" />
                    Print / save PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowCertificateModal(false);
                      setSelectedCertInvoice(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-750 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Certificate Canvas Body */}
              <div className="p-8 relative bg-amber-50/5 print:p-0">
                <div className="border-4 border-double border-[#0A1F44] p-8 relative rounded-xl bg-white select-text">
                  
                  {/* Decorative corner accents */}
                  <div className="absolute top-2 left-2 border-t-2 border-l-2 border-[#0A1F44] w-6 h-6 rounded-tl-sm pointer-events-none" />
                  <div className="absolute top-2 right-2 border-t-2 border-r-2 border-[#0A1F44] w-6 h-6 rounded-tr-sm pointer-events-none" />
                  <div className="absolute bottom-2 left-2 border-b-2 border-l-2 border-[#0A1F44] w-6 h-6 rounded-bl-sm pointer-events-none" />
                  <div className="absolute bottom-2 right-2 border-b-2 border-r-2 border-[#0A1F44] w-6 h-6 rounded-br-sm pointer-events-none" />

                  {/* Coat of arms emblem placeholder */}
                  <div className="text-center mb-5 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[#0A1F44] text-amber-400 flex items-center justify-center font-bold relative shadow-md border-2 border-amber-300 mb-2">
                      <Award className="h-9 w-9 text-amber-300" />
                      <div className="absolute -bottom-1.5 bg-amber-400 text-[#0A1F44] text-[8px] font-black px-1.5 py-0.5 rounded-sm select-none border">
                        SULEJA
                      </div>
                    </div>
                    <span className="block text-[8px] font-bold tracking-[0.2em] uppercase text-gray-400">Federal Republic of Nigeria</span>
                    <h3 className="font-display font-black text-[#0A1F44] text-base leading-tight mt-1">SULEJA LOCAL GOVERNMENT AREA</h3>
                    <span className="block text-[9px] font-bold text-sky-850 tracking-wider">BOARD OF INTERNAL REVENUE DEPUTY CHAMBER</span>
                  </div>

                  {/* Document general Title */}
                  <div className="border-y border-dashed border-[#0A1F44]/40 py-2.5 text-center mb-6">
                    <h2 className="font-display font-black text-[#0A1F44] tracking-[0.25em] text-[15px] uppercase">
                      Tenement Tax Clearance Certificate
                    </h2>
                    <div className="flex justify-between items-center text-[10px] font-sans font-bold text-gray-500 mt-1 max-w-sm mx-auto px-4">
                      <span>Serial Code: <strong className="font-mono text-gray-700">{certNo}</strong></span>
                      <span>•</span>
                      <span>Clearance Year: <span className="text-emerald-700 font-bold">2026 Season</span></span>
                    </div>
                  </div>

                  {/* Affirmation body text */}
                  <p className="text-center text-xs text-gray-700 font-sans leading-relaxed mb-6 max-w-lg mx-auto font-medium">
                    This is to formally certify and affirm that the tenement building entity described below is completely up-to-date and registered on the sovereign property registers of Suleja LGA, Niger State. The appropriate yearly rates, statutory tenement charges, and assessed municipal utility dues have been cleared in full by the property owner, fully reconciled with the treasury of the council, and cleared of all liabilities.
                  </p>

                  {/* Certified Property Audit Details Group */}
                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 mb-6 text-xs text-left max-w-lg mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider">Property Owner Name</span>
                      <strong className="text-[#0A1F44] text-[11px] truncate block font-sans font-black">{selectedCertInvoice.ownerName}</strong>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider">Property Registry Code</span>
                      <strong className="font-mono text-gray-700 text-[11px] block">{selectedCertInvoice.propertyId}</strong>
                    </div>
                    <div className="md:col-span-2 border-t border-slate-100 pt-2">
                      <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider">Property Physical Address</span>
                      <strong className="text-gray-700 text-[11px] font-sans font-bold block">
                        {matchingProp?.address || 'Suleja Municipal Ward Central'}, {matchingProp?.ward || 'Sabo Gari Ward'}, Niger State
                      </strong>
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider">Rated Typology Class</span>
                      <strong className="text-gray-700 font-sans font-bold block">{matchingProp?.propertyType || 'Residential Category'}</strong>
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider">Full Amount Cleared</span>
                      <strong className="text-emerald-700 font-mono text-[11.5px] block font-bold">₦{selectedCertInvoice.amount.toLocaleString()} NGN</strong>
                    </div>
                    <div className="md:col-span-2 border-t border-slate-100 pt-2.5 flex justify-between items-center">
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider">Settlement Auth Code</span>
                        <span className="font-mono text-gray-600 font-bold bg-[#E0F2FE] text-[#0369A1] px-1.5 py-0.5 rounded border border-sky-100 text-[9.5px]">
                          {selectedCertInvoice.id}-OK-SUL
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider">Payment Cleared Date</span>
                        <strong className="text-gray-700 text-[11px] font-sans">
                          {selectedCertInvoice.dueDate} (Automated)
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Signatures and Seals Section */}
                  <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 max-w-lg mx-auto pt-4 border-t border-gray-150 relative">
                    
                    {/* Left: Stamp */}
                    <div className="flex flex-col items-center text-center">
                      <div className="h-10 w-32 border-b border-gray-400 flex items-center justify-center font-serif text-[10px] text-gray-400 italic">
                        Chairman Suleja LGA
                      </div>
                      <span className="text-[8px] font-black uppercase text-gray-450 tracking-widest mt-1.5">Executive Chairman</span>
                      <span className="text-[7.5px] text-gray-400 font-bold">Suleja Local Council Board</span>
                    </div>

                    {/* Middle: Decal Seal Stamp */}
                    <div className="flex items-center justify-center select-none shrink-0">
                      <div className="w-18 h-18 rounded-full border-4 border-dashed border-emerald-650 flex flex-col items-center justify-center text-center p-1 bg-emerald-50/10 rotate-[-12deg] shadow-3xs">
                        <div className="text-[8.5px] font-black text-emerald-700 font-mono leading-none tracking-widest">SULEJA LGA</div>
                        <Award className="h-4.5 w-4.5 text-emerald-600 my-0.5" />
                        <div className="text-[7.5px] font-bold text-emerald-600 leading-none">PAID & CLEAR</div>
                      </div>
                    </div>

                    {/* Right: Stamp */}
                    <div className="flex flex-col items-center text-center">
                      <div className="h-10 w-32 border-b border-gray-400 flex items-center justify-center font-serif text-[10px] text-gray-400 italic">
                        Admin Officer Revenue
                      </div>
                      <span className="text-[8px] font-black uppercase text-gray-455 tracking-widest mt-1.5">Director of Taxation</span>
                      <span className="text-[7.5px] text-gray-400 font-bold">Suleja Municipal Treasury</span>
                    </div>

                  </div>

                </div>
              </div>

              {/* Footer legalities */}
              <div className="bg-slate-100 p-3 text-center border-t text-[9px] uppercase tracking-wider text-slate-500 font-black select-none flex justify-between px-6">
                <span>● INTEGRITY AND SELF-RELIANCE DECLARED</span>
                <span>SYSTEM ID: {selectedCertInvoice.id}</span>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
