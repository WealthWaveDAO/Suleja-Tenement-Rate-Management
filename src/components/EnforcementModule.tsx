/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  ChevronRight, 
  Check, 
  Printer, 
  FileLock2, 
  FileWarning, 
  Gavel, 
  Upload, 
  Plus, 
  RefreshCw,
  Users,
  MapPin,
  Clock,
  Eye,
  FileCheck2,
  Mic,
  MicOff,
  Award,
  ThumbsUp,
  TrendingUp,
  Camera,
  Image,
  Trash2,
  Smartphone,
  Send,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { EnforcementAction, EnforcementStage, Property, UserRole, SentSmsRecord } from '../types';
import CameraCapture from './CameraCapture';

interface EnforcementProps {
  enforcementList: EnforcementAction[];
  properties: Property[];
  userRole: UserRole;
  userName: string;
  onUpdateEnforcementStage: (id: string, nextStage: EnforcementStage) => void;
  onAddEnforcementAction: (propertyId: string, notes: string, gpsCoordinates?: string, evidenceUrl?: string) => void;
  onResolveEnforcement: (id: string) => void;
  onUpdateEnforcementEvidence: (id: string, evidenceUrl: string) => void;
}

export default function EnforcementModule({ 
  enforcementList, 
  properties, 
  userRole, 
  userName,
  onUpdateEnforcementStage,
  onAddEnforcementAction,
  onResolveEnforcement,
  onUpdateEnforcementEvidence
}: EnforcementProps) {

  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'agents' | 'sms' | 'route'>('ledger');
  
  // Sent SMS state variable to store and track sent SMS records
  const [sentSmsRecords, setSentSmsRecords] = useState<SentSmsRecord[]>(() => {
    const saved = localStorage.getItem('suleja_sent_sms_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Pre-seed mock data
    return [
      {
        id: 'SMS-9012351',
        propertyId: 'SLG-2026-00401',
        ownerName: 'Mallam Ibrahim Jibrin',
        phone: '+234 803 123 4567',
        type: 'Demand',
        message: 'SULEJA LGA NOTICE: Immediate payment of tenement rate of ₦18,500 required for Property SLG-2026-00401 under Law Cap 13 or sealing will proceed.',
        sentAt: '2026-06-11 09:12:44',
        status: 'Delivered',
        gatewayResponse: 'SulejaSMS-GW SID: msg_f18e90a2'
      },
      {
        id: 'SMS-9012352',
        propertyId: 'SLG-2026-01582',
        ownerName: 'Mrs. Chidi Ngozi',
        phone: '+234 809 765 4321',
        type: 'Reminder',
        message: 'SULEJA LGA REMINDER: Please settle your outstanding tenement balance of ₦12,000 for Property SLG-2026-01582 to avoid legal penalties.',
        sentAt: '2026-06-11 14:35:10',
        status: 'Delivered',
        gatewayResponse: 'SulejaSMS-GW SID: msg_90fa72ca'
      }
    ];
  });

  // Track SMS changes in localStorage
  useEffect(() => {
    localStorage.setItem('suleja_sent_sms_records', JSON.stringify(sentSmsRecords));
  }, [sentSmsRecords]);

  // Modal alert controls
  const [showSendSmsModal, setShowSendSmsModal] = useState(false);
  const [smsTargetProperty, setSmsTargetProperty] = useState<Property | null>(null);
  const [smsTargetEnforcement, setSmsTargetEnforcement] = useState<EnforcementAction | null>(null);
  const [smsType, setSmsType] = useState<'Reminder' | 'Demand'>('Reminder');
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSendSuccess, setSmsSendSuccess] = useState(false);

  // Dynamic template generation when targets change
  useEffect(() => {
    if (smsTargetProperty) {
      const landlord = smsTargetProperty.ownerName;
      const pid = smsTargetProperty.id;
      const amount = smsTargetProperty.tenementRate;
      if (smsType === 'Reminder') {
        setSmsMessage(`SULEJA LGA TENEMENT REMINDER: Dear ${landlord}, please settle the outstanding rate of ₦${amount.toLocaleString()} for Property ${pid} to avoid penalties.`);
      } else {
        setSmsMessage(`SULEJA LGA LEGAL DEMAND: Dear ${landlord}, pay outstanding tenement of ₦${amount.toLocaleString()} for ${pid} within 7 days. Under CAP 13 Law, failure results in sealing.`);
      }
      setSmsPhone(smsTargetProperty.ownerPhone || '');
    } else if (smsTargetEnforcement) {
      const landlord = smsTargetEnforcement.ownerName;
      const pid = smsTargetEnforcement.propertyId;
      const amount = smsTargetEnforcement.amountOwed;
      if (smsType === 'Reminder') {
        setSmsMessage(`SULEJA LGA TENEMENT REMINDER: Dear ${landlord}, please settle the outstanding rate of ₦${amount.toLocaleString()} for Property ${pid} to avoid penalties.`);
      } else {
        setSmsMessage(`SULEJA LGA LEGAL DEMAND: Dear ${landlord}, pay outstanding tenement of ₦${amount.toLocaleString()} for ${pid} within 7 days. Under CAP 13 Law, failure results in sealing.`);
      }
      const matched = properties.find(p => p.id === pid);
      setSmsPhone(matched ? matched.ownerPhone : '+234 803 123 4567');
    }
  }, [smsTargetProperty, smsTargetEnforcement, smsType, properties]);

  const [smsSearchQuery, setSmsSearchQuery] = useState('');

  const handleTriggerSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsPhone || !smsMessage) {
      alert("Please enter a valid phone number and message body template.");
      return;
    }

    setIsSendingSms(true);
    setSmsSendSuccess(false);

    // Network timeout response simulation
    setTimeout(() => {
      let rName = "Custom Entry";
      let pId = "CUSTOM-ALERT";

      if (smsTargetProperty) {
        rName = smsTargetProperty.ownerName;
        pId = smsTargetProperty.id;
      } else if (smsTargetEnforcement) {
        rName = smsTargetEnforcement.ownerName;
        pId = smsTargetEnforcement.propertyId;
      }

      const newRecord: SentSmsRecord = {
        id: `SMS-${Math.floor(1000000 + Math.random() * 9000000)}`,
        propertyId: pId,
        ownerName: rName,
        phone: smsPhone,
        type: smsType,
        message: smsMessage,
        sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'Delivered',
        gatewayResponse: `SulejaSMS-GW MSG: msg_${Math.random().toString(16).substring(2, 10).toUpperCase()}`
      };

      setSentSmsRecords(prev => [newRecord, ...prev]);
      setIsSendingSms(false);
      setSmsSendSuccess(true);

      // Auto dismiss success label
      setTimeout(() => {
        setSmsSendSuccess(false);
      }, 4000);
    }, 1000);
  };

  const [agentSearch, setAgentSearch] = useState('');
  const [evaluationFeedback, setEvaluationFeedback] = useState<string>('');

  // Agent Performance Calculations
  const agentMetrics = useMemo(() => {
    const map: Record<string, {
      name: string;
      noticesServed: number;
      resolved: number;
      otherStages: number;
      total: number;
      totalAmountOwed: number;
      amountResolved: number;
    }> = {};

    // Seed default agents to ensure evaluation board has records
    const defaults = ['Umar Sani', 'Abdulrahman Muhammad', 'Salma Salihu'];
    defaults.forEach(d => {
      map[d] = {
        name: d,
        noticesServed: 0,
        resolved: 0,
        otherStages: 0,
        total: 0,
        totalAmountOwed: 0,
        amountResolved: 0
      };
    });

    enforcementList.forEach(e => {
      const officer = e.officerInCharge || 'Unassigned Duty';
      if (!map[officer]) {
        map[officer] = {
          name: officer,
          noticesServed: 0,
          resolved: 0,
          otherStages: 0,
          total: 0,
          totalAmountOwed: 0,
          amountResolved: 0
        };
      }
      const m = map[officer];
      m.total += 1;
      if (e.stage === 'Notice Served') {
        m.noticesServed += 1;
        m.totalAmountOwed += e.amountOwed;
      } else if (e.stage === 'Resolved') {
        m.resolved += 1;
        m.amountResolved += e.amountOwed;
      } else {
        m.otherStages += 1;
        m.totalAmountOwed += e.amountOwed;
      }
    });

    return Object.values(map);
  }, [enforcementList]);

  // Predictive Mode State & Logic
  const [isPredictiveMode, setIsPredictiveMode] = useState(false);
  const predictiveRecommendations = useMemo(() => {
    if (!isPredictiveMode) return [];
    
    // Find all unpaid properties that don't already have an active enforcement associated
    const riskyProps = properties
      .filter(p => p.paymentStatus === 'Unpaid')
      .filter(p => !enforcementList.find(e => e.propertyId === p.id && e.stage !== 'Resolved'))
      .map(p => {
        // Simple heuristic for default tendency: age of record or size of the rate
        const riskScore = (p.tenementRate / 1000) * (p.propertyType === 'Commercial' || p.propertyType === 'Industrial' ? 1.5 : 1);
        return { property: p, riskScore, riskLevel: riskScore > 100 ? 'High' : riskScore > 50 ? 'Medium' : 'Low' as 'High'|'Medium'|'Low' };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);
      
    return riskyProps;
  }, [properties, enforcementList, isPredictiveMode]);

  // Form states of initiating enforcement
  const [showEnforceFormModal, setShowEnforceFormModal] = useState(false);
  const [targetPropertyId, setTargetPropertyId] = useState('');
  const [escalateNotes, setEscalateNotes] = useState('');
  const [escalateError, setEscalateError] = useState('');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('');

  // GPS/Geolocation states for site visit pinning
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [enforceGpsLoading, setEnforceGpsLoading] = useState(false);
  const [enforceGpsError, setEnforceGpsError] = useState('');

  const handleSyncEnforceLocation = () => {
    if (!navigator.geolocation) {
      setEnforceGpsError('Geolocation is unsupported by this browser.');
      return;
    }
    setEnforceGpsLoading(true);
    setEnforceGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLatitude(pos.coords.latitude);
        setGpsLongitude(pos.coords.longitude);
        setEnforceGpsLoading(false);
      },
      (err) => {
        console.error("Enforcement GPS fetch error:", err);
        setEnforceGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setEnforceGpsError('Location access denied.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setEnforceGpsError('GPS signal unavailable.');
        } else {
          setEnforceGpsError('GPS acquisition timed out.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Web Speech API Voice Notes states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechObj) {
      setSpeechSupported(false);
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    const SpeechObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechObj) {
      setEscalateError("Web Speech API is unsupported in this browser container. Please use Google Chrome or Microsoft Edge, and allow active microphone access.");
      return;
    }

    setEscalateError('');

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const rec = new SpeechObj();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-NG'; // High fidelity English (Nigeria) dialect parsing for Suleja Local Council contexts
        
        rec.onstart = () => {
          setIsListening(true);
        };
        
        rec.onresult = (event: any) => {
          const resultText = event.results[0][0].transcript;
          setEscalateNotes(prev => prev ? `${prev} ${resultText}` : resultText);
        };
        
        rec.onerror = (event: any) => {
          console.error("Speech Recognition Error Event:", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setEscalateError("Microphone hardware access was denied or unauthorized. Verify permission settings in physical hardware locks.");
          } else {
            setEscalateError(`Dictation interrupted: ${event.error}`);
          }
        };
        
        rec.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.error("Speech API fatal launch failure:", err);
        setIsListening(false);
      }
    }
  };

  // Print Notice Modal
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [activeNotice, setActiveNotice] = useState<EnforcementAction | null>(null);

  // Photo Attachment Modal for existing dossiers
  const [activePhotoCase, setActivePhotoCase] = useState<EnforcementAction | null>(null);
  const [capturedPhotoUrlForCase, setCapturedPhotoUrlForCase] = useState<string>('');

  // Filter list
  const filteredEnf = enforcementList.filter((e) => {
    const matchesSearch = 
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.propertyId.toLowerCase().includes(search.toLowerCase()) ||
      e.ownerName.toLowerCase().includes(search.toLowerCase());
    
    const matchesStage = selectedStage ? e.stage === selectedStage : true;
    return matchesSearch && matchesStage;
  });

  const handleOpenNoticePrint = (action: EnforcementAction) => {
    setActiveNotice(action);
    setShowNoticeModal(true);
  };

  const handleInitiateEnforceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEscalateError('');

    const queryProp = properties.find(p => p.id.toUpperCase().trim() === targetPropertyId.toUpperCase().trim());
    if (!queryProp) {
      setEscalateError('No Suleja property records found matching code (e.g. SLG-2026-00042).');
      return;
    }

    // Check if duplicate action already exists
    const duplicate = enforcementList.find(e => e.propertyId === queryProp.id && e.stage !== 'Resolved');
    if (duplicate) {
      setEscalateError('This property code is already under an active enforcement task.');
      return;
    }

    const gpsString = gpsLatitude !== null && gpsLongitude !== null 
      ? `${gpsLatitude.toFixed(6)}, ${gpsLongitude.toFixed(6)}` 
      : undefined;

    onAddEnforcementAction(
      queryProp.id, 
      escalateNotes || 'Initiated due to prolonged delinquent unpaid balance.',
      gpsString,
      capturedPhotoUrl || undefined
    );
    setShowEnforceFormModal(false);
    setTargetPropertyId('');
    setEscalateNotes('');
    setCapturedPhotoUrl('');
    setGpsLatitude(null);
    setGpsLongitude(null);
    setEnforceGpsError('');
  };

  // Status stage buttons lists
  const stagesOrdered: EnforcementStage[] = [
    'Notice Served',
    'Final Demand Issued',
    'Court Order Filed',
    'Property Sealed'
  ];

  return (
    <div className="space-y-6 fade-in text-xs font-sans">
      
      {/* Intro info heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0A1F44]">Sovereign Tenement Enforcement Module</h1>
          <p className="text-xs text-gray-500 font-medium">
            Track tax defaulters, serve demand notice processes, and manage seal events under legal warrant mandates.
          </p>
        </div>

        {/* Initiators restricted from taxpayer / accountant */}
        {userRole !== 'Taxpayer' && userRole !== 'Accountant' && (
          <button
            onClick={() => setShowEnforceFormModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A1F44] hover:bg-opacity-95 text-white py-2.5 px-4 text-xs font-bold shadow-md cursor-pointer"
          >
            <ShieldAlert className="h-4.5 w-4.5 text-[#38BDF8]" />
            Escalate Property Dues
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
        
        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
            <FileWarning className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Notices Served</span>
            <span className="text-base font-mono font-bold text-gray-900">
              {enforcementList.filter(e => e.stage === 'Notice Served').length} dossiers
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-55 text-red-600 flex items-center justify-center">
            <Gavel className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Court Escalations</span>
            <span className="text-base font-mono font-bold text-red-650">
              {enforcementList.filter(e => e.stage === 'Court Order Filed').length} hearings
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#0A1F44] text-[#38BDF8] flex items-center justify-center">
            <FileLock2 className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-300">Properties Sealed</span>
            <span className="text-base font-mono font-bold text-white">
              {enforcementList.filter(e => e.stage === 'Property Sealed').length} properties
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Settled/Resolved</span>
            <span className="text-base font-mono font-bold text-emerald-700">
              {enforcementList.filter(e => e.stage === 'Resolved').length} cleared
            </span>
          </div>
        </div>

      </div>

      {/* Tabs Switcher Navigation */}
      <div className="flex border-b border-gray-200 select-none">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-2 px-4 font-bold border-b-2 text-xs transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-[#0A1F44] text-[#0A1F44]'
              : 'border-transparent text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <FileLock2 className="h-4 w-4 text-[#38BDF8]" />
          Active Dossiers Ledger ({filteredEnf.length})
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`py-2 px-4 font-bold border-b-2 text-xs transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'agents'
              ? 'border-[#0A1F44] text-[#0A1F44]'
              : 'border-transparent text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <Users className="h-4 w-4 text-[#38BDF8]" />
          Field Inspector Evaluation Board ({agentMetrics.length})
        </button>
        <button
          onClick={() => setActiveTab('sms')}
          className={`py-2 px-4 font-bold border-b-2 text-xs transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'sms'
              ? 'border-[#0A1F44] text-[#0A1F44]'
              : 'border-transparent text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <Smartphone className="h-4 w-4 text-[#38BDF8]" />
          SMS Alerts Gateway ({sentSmsRecords.length})
        </button>
        {(userRole === 'Super Admin' || userRole === 'LGA Admin' || userRole === 'Field Agent') && (
          <button
            onClick={() => setActiveTab('route')}
            className={`py-2 px-4 font-bold border-b-2 text-xs transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'route'
                ? 'border-[#0A1F44] text-[#0A1F44]'
                : 'border-transparent text-gray-500 hover:text-gray-900 font-medium'
            }`}
          >
            <MapPin className="h-4 w-4 text-[#38BDF8]" />
            Optimized Inspection Route
          </button>
        )}
      </div>

      {activeTab === 'ledger' && (
        /* Defaulter Table layout */
        <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden text-xs">
          <div className="p-4 border-b flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Case ID, Property ID, or defaulter name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="py-2 pl-9 pr-3 w-full rounded-lg border border-gray-300 outline-none text-xs focus:border-[#0A1F44]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 text-[11px] font-bold cursor-pointer hover:bg-indigo-100 transition shadow-xs">
                <input 
                  type="checkbox" 
                  className="accent-indigo-600 rounded" 
                  checked={isPredictiveMode}
                  onChange={(e) => setIsPredictiveMode(e.target.checked)}
                />
                Predictive Enforcement Intel
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-2 text-xs"
                disabled={isPredictiveMode}
              >
                <option value="">All Enforcement Stages</option>
                <option value="Notice Served">Demand Notice Served</option>
                <option value="Final Demand Issued">Final Demand Issued</option>
                <option value="Court Order Filed">Court Ordered File</option>
                <option value="Property Sealed">Property Sealed / Lockout</option>
                <option value="Resolved">Resolved / Ledger Cleared</option>
              </select>
            </div>
          </div>

          {/* list */}
          <div className="overflow-x-auto select-text">
            {isPredictiveMode ? (
              <div className="px-6 py-6 border-b border-indigo-100 bg-linear-to-r from-indigo-50/50 to-white">
                <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2 mb-4">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  Prioritized Default Risk Radar
                </h3>
                <p className="text-[11px] text-gray-600 max-w-3xl mb-6 leading-relaxed">
                  The predictive engine continuously analyzes default patterns, baseline arrears volume, and historical tendencies to identify properties facing severe payment stagnation. Properties below have *not* yet been served notices but exhibit the highest algorithmic probability of sustained defaulting.
                </p>
                <table className="min-w-full divide-y divide-indigo-100 border border-indigo-100 rounded-lg overflow-hidden shadow-xs">
                  <thead className="bg-[#eef2ff] text-indigo-900 font-bold uppercase text-[10px] text-left">
                    <tr>
                      <th className="px-4 py-3">Suggested Rating Target</th>
                      <th className="px-4 py-3">Ward</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Default Risk Tier</th>
                      <th className="px-4 py-3 text-right">Action Threshold (₦)</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50 bg-white">
                    {predictiveRecommendations.map((rec, idx) => (
                      <tr key={rec.property.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{rec.property.ownerName || 'Unregistered'}</div>
                          <div className="text-[10px] text-gray-500 font-mono tracking-wider">{rec.property.id}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{rec.property.ward}</td>
                        <td className="px-4 py-3 text-amber-700 font-bold">{rec.property.paymentStatus}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 flex items-center gap-1.5 w-fit rounded-full text-[10px] font-bold shadow-xs ${rec.riskLevel === 'High' ? 'bg-red-100 text-red-800 border font-black border-red-200' : rec.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-800'}`}>
                            {rec.riskLevel === 'High' && <AlertTriangle className="h-3 w-3" />}
                            {rec.riskLevel} Risk
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                          ₦{rec.property.tenementRate.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setTargetPropertyId(rec.property.id);
                              setShowEnforceFormModal(true);
                              setIsPredictiveMode(false);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-xs transition"
                          >
                            Init Enforcement
                          </button>
                        </td>
                      </tr>
                    ))}
                    {predictiveRecommendations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 font-semibold italic">
                          No high-risk tendencies identified for remaining un-enforced properties.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
            <div className="overflow-x-auto select-text font-sans border border-gray-150 rounded-xl shadow-xs">
              <table className="min-w-full divide-y divide-gray-150">
                <thead className="bg-[#F5F7FA] text-gray-400 font-bold uppercase text-[10px] text-left">
                  <tr>
                    <th className="px-4 py-3">Case / Plot Code</th>
                    <th className="px-4 py-3">Landlord Surname</th>
                    <th className="px-4 py-3">Escalose Ward</th>
                    <th className="px-4 py-3 text-right">Sum Delinquent</th>
                    <th className="px-4 py-3 text-center">Stage Progression</th>
                    <th className="px-4 py-3">Assigned Auditor</th>
                    <th className="px-4 py-3 text-center rounded-r-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {filteredEnf.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold uppercase">
                        No active tenement rate enforcement cases.
                      </td>
                    </tr>
                  ) : (
                    filteredEnf.map((caseAction) => {
                      const checkUnresolved = caseAction.stage !== 'Resolved';
                      return (
                        <tr key={caseAction.id} className="hover:bg-gray-50">
                          
                          {/* Cases */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              {/* Photo Thumbnail */}
                              <div className="relative group shrink-0">
                                {caseAction.evidenceUrl ? (
                                  <img
                                  src={caseAction.evidenceUrl}
                                  alt="Dossier"
                                  className="h-11 w-11 rounded-lg object-cover border border-gray-250 shadow-xs cursor-pointer hover:border-[#0A1F44] transition-all"
                                  onClick={() => {
                                    setActivePhotoCase(caseAction);
                                    setCapturedPhotoUrlForCase(caseAction.evidenceUrl || '');
                                  }}
                                  title="Click to view full image or capture a new photo"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePhotoCase(caseAction);
                                    setCapturedPhotoUrlForCase('');
                                  }}
                                  className="h-11 w-11 rounded-lg bg-gray-55 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-[#0A1F44] hover:bg-sky-50 hover:border-sky-300 transition-all cursor-pointer"
                                  title="Attach / Capture evidence photo with device camera"
                                >
                                  <Camera className="h-4 w-4" />
                                  <span className="text-[7px] font-bold uppercase tracking-tighter">Add Photo</span>
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="block font-mono font-bold text-gray-900 bg-[#0A1F44]/5 text-[#0A1F44] px-1.5 py-0.5 rounded text-[10px] w-fit">
                                {caseAction.id}
                              </span>
                              {caseAction.stage === 'Notice Served' && (new Date().getTime() - new Date(caseAction.noticeDate).getTime()) > 14 * 24 * 60 * 60 * 1000 && (
                                <span className="inline-flex items-center gap-1 text-[8px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider w-fit animate-pulse">
                                  ⚠️ High Priority
                                </span>
                              )}
                              <span className="block font-mono text-[10px] text-gray-500">{caseAction.propertyId}</span>
                            </div>
                          </div>
                        </td>

                        {/* Landlord */}
                        <td className="px-4 py-3.5 font-bold text-gray-900">{caseAction.ownerName}</td>

                        {/* Ward */}
                        <td className="px-4 py-3.5">
                          <span className="block text-gray-900 font-semibold">{caseAction.ward}</span>
                          <span className="block text-[10px] text-gray-400 truncate max-w-[150px] mb-0.5" title={caseAction.address}>{caseAction.address}</span>
                          {caseAction.gpsCoordinates && (
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-1.5 py-0.5 rounded mt-1">
                              <MapPin className="h-2.5 w-2.5 text-emerald-600 animate-pulse" />
                              <span>{caseAction.gpsCoordinates}</span>
                            </span>
                          )}
                        </td>

                        {/* Sum */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-red-600">
                          ₦{caseAction.amountOwed.toLocaleString()}
                        </td>

                        {/* Stage Progression Badge */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            caseAction.stage === 'Property Sealed' ? 'bg-[#0A1F44] text-[#38BDF8]' : 
                            caseAction.stage === 'Court Order Filed' ? 'bg-red-50 text-red-700 border border-red-200' :
                            caseAction.stage === 'Final Demand Issued' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            caseAction.stage === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {caseAction.stage}
                          </span>
                        </td>

                        {/* Officer */}
                        <td className="px-4 py-3.5 text-gray-500 font-bold">
                          {caseAction.officerInCharge || 'Unassigned Duty'}
                        </td>

                        {/* Print and escalate actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex gap-1 bg-gray-150 rounded-lg p-0.5 border border-gray-250 select-none">
                            <button
                              onClick={() => handleOpenNoticePrint(caseAction)}
                              title="Generate Print Demand Notice"
                              className="p-1 px-2.5 text-gray-700 bg-white border rounded font-bold text-[10px] hover:text-[#0A1F44] cursor-pointer"
                            >
                              <Printer className="h-3 w-3 text-[#38BDF8] inline mr-1" />
                              Notice
                            </button>

                            {checkUnresolved && userRole !== 'Taxpayer' && userRole !== 'Accountant' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSmsTargetEnforcement(caseAction);
                                  setSmsTargetProperty(null);
                                  setSmsType('Reminder');
                                  setActiveTab('sms');
                                }}
                                title="Dispatch instant simulated SMS alert to defaulter"
                                className="p-1 px-2 text-gray-700 bg-white border rounded font-bold text-[10px] hover:text-[#0A1F44] cursor-pointer flex items-center gap-1"
                              >
                                <Smartphone className="h-3 w-3 text-[#38BDF8]" />
                                SMS
                              </button>
                            )}

                            {/* Trigger state escalation if unresolved and admin/auditor */}
                            {checkUnresolved && userRole !== 'Taxpayer' && userRole !== 'Accountant' && (
                              <div className="flex gap-1 pl-1 border-l border-gray-300">
                                {stagesOrdered.indexOf(caseAction.stage) < 3 && (
                                  <button
                                    onClick={() => {
                                      const currIdx = stagesOrdered.indexOf(caseAction.stage);
                                      onUpdateEnforcementStage(caseAction.id, stagesOrdered[currIdx + 1]);
                                    }}
                                    title="Advance to next Legal notice stage"
                                    className="p-1 text-[#38BDF8] font-bold text-[10px] hover:bg-gray-100 rounded cursor-pointer"
                                  >
                                    Escalate
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    if (confirm(`Mark Case ${caseAction.id} cleared? (Verifies complete back-arrears reconciles)`)) {
                                      onResolveEnforcement(caseAction.id);
                                    }
                                  }}
                                  className="p-1 text-green-600 font-bold text-[10px] hover:bg-gray-100 rounded cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        /* Agent Performance metrics view */
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {evaluationFeedback && (
            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-[#0A1F44] font-medium flex items-center justify-between text-[11px] shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4 text-[#38BDF8] animate-pulse" />
                <span>{evaluationFeedback}</span>
              </span>
              <button 
                onClick={() => setEvaluationFeedback('')} 
                className="text-gray-400 hover:text-[#0A1F44] font-bold text-xs cursor-pointer bg-white/50 hover:bg-white/90 px-1.5 py-0.5 rounded-md"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Staff Statistics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider">Top Field Auditor</span>
                <span className="text-xs font-bold text-gray-900 block truncate max-w-[150px]">
                  {agentMetrics.reduce((prev, curr) => {
                    const prevEff = prev.total > 0 ? (prev.resolved / prev.total) : -1;
                    const currEff = curr.total > 0 ? (curr.resolved / curr.total) : -1;
                    return currEff >= prevEff ? curr : prev;
                  }, { name: 'None yet', total: 0, resolved: 0 }).name}
                </span>
                <span className="text-[9px] text-[#38BDF8] font-bold font-mono">HIGHEST CONVERSION INDEX</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#0A1F44]/5 text-[#0A1F44] flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="h-5 w-5 text-[#38BDF8]" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider">Registered Officers</span>
                <span className="text-xs font-mono font-bold text-[#0A1F44] block">
                  {agentMetrics.length} Personnel
                </span>
                <span className="text-[9px] text-gray-400 font-medium">Under Law CAP 13 mandate</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider">Overall Clearance Index</span>
                <span className="text-xs font-mono font-bold text-amber-700 block">
                  {Math.round((agentMetrics.reduce((a, b) => a + b.resolved, 0) / Math.max(1, agentMetrics.reduce((a, b) => a + b.total, 0))) * 100)}% Mean Clear
                </span>
                <span className="text-[9px] text-gray-400 font-medium font-sans">Resolved arrears cases vs total tasks</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
            <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
              <div>
                <h3 className="font-display font-bold text-sm text-[#0A1F44]">Field Auditor Evaluation Matrix</h3>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Suleja Local Council staff evaluation dashboard mapping **Notices Served** against **Successfully Resolved** cases.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by inspector name..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="py-1.5 pl-8 pr-3 w-full rounded-lg border border-gray-300 outline-none text-xs focus:border-[#0A1F44]"
                />
              </div>
            </div>

            <div className="overflow-x-auto text-[11px] text-gray-700 font-medium">
              <table className="min-w-full divide-y divide-gray-100 text-left">
                <thead className="bg-[#F5F7FA] text-gray-400 font-bold uppercase text-[9px]">
                  <tr>
                    <th className="px-4 py-3">Suleja Inspector Personnel</th>
                    <th className="px-4 py-3 text-center">Total Cases Mapped</th>
                    <th className="px-4 py-3">Notice Served vs Settled Cases Mapped</th>
                    <th className="px-4 py-3 text-right">Resolve efficiency</th>
                    <th className="px-4 py-3">LGA Class Designation</th>
                    <th className="px-4 py-3 text-center">Auditor Operations Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agentMetrics
                    .filter(m => m.name.toLowerCase().includes(agentSearch.toLowerCase()))
                    .length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400 uppercase font-semibold">
                          No matching field personnel registry found.
                        </td>
                      </tr>
                    ) : (
                      agentMetrics
                        .filter(m => m.name.toLowerCase().includes(agentSearch.toLowerCase()))
                        .map((metrics) => {
                          const eff = metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0;
                          
                          let classification = "No assigned caseload";
                          let classStyle = "bg-gray-100 text-gray-500 border border-gray-200";
                          if (metrics.total > 0) {
                            if (eff >= 75) {
                              classification = "🌟 Outstanding Class A";
                              classStyle = "bg-green-100 text-green-850 font-extrabold border border-green-200";
                            } else if (eff >= 50) {
                              classification = "🟢 Effective Class B";
                              classStyle = "bg-emerald-100 text-emerald-850 font-extrabold border border-emerald-200";
                            } else if (eff >= 25) {
                              classification = "🟡 Satisfactory Class C";
                              classStyle = "bg-amber-100 text-amber-850 font-extrabold border border-amber-200";
                            } else {
                              classification = "🔴 Audited Review Stage";
                              classStyle = "bg-rose-100 text-rose-850 font-extrabold border border-rose-200 animate-pulse";
                            }
                          }

                          return (
                            <tr key={metrics.name} className="hover:bg-gray-50/50">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 rounded-full bg-[#0A1F44] text-[#38BDF8] flex items-center justify-center font-bold text-xs uppercase border-2 border-white/20 shadow-sm shrink-0">
                                    {metrics.name.substring(0, 2)}
                                  </div>
                                  <div>
                                    <span className="font-bold block text-gray-900 text-xs">{metrics.name}</span>
                                    <span className="text-[10px] text-gray-400 font-sans font-semibold">Tenement Tax Officer</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-center font-mono font-bold text-slate-800 text-xs">
                                {metrics.total} <span className="text-[9px] text-gray-400 font-semibold block">Dossiers</span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="space-y-1.5 max-w-[240px]">
                                  <div className="flex justify-between text-[10px] text-gray-550 font-extrabold font-sans">
                                    <span className="text-orange-600 inline-flex items-center gap-1">⚠️ {metrics.noticesServed} Notices Served</span>
                                    <span className="text-emerald-700 inline-flex items-center gap-1">✓ {metrics.resolved} Settled</span>
                                  </div>
                                  
                                  {/* Multi-segment micro-bar graph */}
                                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex shadow-inner border border-gray-200">
                                    {metrics.total > 0 ? (
                                      <>
                                        <div 
                                          style={{ width: `${(metrics.noticesServed / metrics.total) * 100}%` }} 
                                          className="bg-orange-400 h-full border-r border-white/10" 
                                          title={`Notices Served: ${metrics.noticesServed}`}
                                        />
                                        <div 
                                          style={{ width: `${(metrics.otherStages / metrics.total) * 100}%` }} 
                                          className="bg-[#0A1F44] h-full border-r border-white/10" 
                                          title={`Progressing Demands/Court: ${metrics.otherStages}`}
                                        />
                                        <div 
                                          style={{ width: `${(metrics.resolved / metrics.total) * 100}%` }} 
                                          className="bg-emerald-500 h-full" 
                                          title={`Resolved: ${metrics.resolved}`}
                                        />
                                      </>
                                    ) : (
                                      <div className="w-full bg-slate-200 h-full" />
                                    )}
                                  </div>
                                  <div className="flex justify-between text-[8px] text-gray-400 font-mono scale-95 origin-left">
                                    <span>Served notices</span>
                                    <span>Progressing in court/seals</span>
                                    <span>Successfully cleared</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-right font-mono font-bold">
                                <span className={`text-sm ${eff >= 50 ? 'text-emerald-750' : 'text-slate-800'}`}>{eff}%</span>
                                <span className="block text-[8px] font-sans text-gray-400 font-bold uppercase tracking-wider">resolution rate</span>
                              </td>

                              <td className="px-4 py-4 text-left">
                                <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wide ${classStyle}`}>
                                  {classification}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-center">
                                <div className="inline-flex gap-1.5 select-none">
                                  <button
                                    onClick={() => {
                                      setEvaluationFeedback(`Super Admin dispatched instant performance commendation notification alert directly to officer ${metrics.name}'s workspace.`);
                                    }}
                                    disabled={metrics.total === 0}
                                    className="px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-700 bg-white border border-emerald-200 rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                    Commend
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEvaluationFeedback(`Suleja LGA Director summoned officer ${metrics.name} for standard Chapter 13 administrative alignment review.`);
                                    }}
                                    className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 bg-white border border-gray-300 rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    Summon Audit
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
          </div>
        </div>
      )}

      {activeTab === 'sms' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Dashboard Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-150 shadow-xs flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-lg bg-[#0A1F44]/5 text-[#0a1f44] flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-[#38BDF8]" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-400">Gateway Status</span>
                <span className="text-xs font-bold text-emerald-600 block flex items-center gap-1.5 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  ACTIVE
                </span>
                <span className="text-[9px] text-gray-400">SulejaSMS-GW v2.4</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-150 shadow-xs flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-400">Total Transmissions</span>
                <span className="text-sm font-mono font-bold text-[#0A1F44] block">
                  {sentSmsRecords.length} SMS Sent
                </span>
                <span className="text-[9px] text-gray-400">All simulated gateways OK</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-150 shadow-xs flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-400 font-sans">Delivery Rate</span>
                <span className="text-sm font-mono font-bold text-emerald-600 block">
                  100% Verified
                </span>
                <span className="text-[9px] text-gray-400">Zero drop rates recorded</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-150 shadow-xs flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center shrink-0">
                <FileWarning className="h-5 w-5 text-orange-650" />
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-400 font-sans">Legal Demands Out</span>
                <span className="text-sm font-mono font-bold text-orange-700 block">
                  {sentSmsRecords.filter(r => r.type === 'Demand').length} Notices
                </span>
                <span className="text-[9px] text-gray-400 font-sans">CAP 13 statutory alerts</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Dispatcher form & live phone preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-xl border border-gray-150 shadow-xs p-4.5 space-y-4">
                <div className="border-b pb-3">
                  <h3 className="font-display font-black text-sm text-[#0A1F44] flex items-center gap-1.5">
                    <MessageSquare className="h-4.5 w-4.5 text-[#38BDF8]" />
                    Simulate SMS Broadcast
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                    Transmit immediate payment notices to landlords or property representatives under Suleja LGA ordinance.
                  </p>
                </div>

                {smsSendSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold animate-in fade-in slide-in-from-top-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span>✓ Broadcast transmitted! Mock SMS Gateway returned SID status.</span>
                  </div>
                )}

                <form onSubmit={handleTriggerSendSms} className="space-y-3.5">
                  {/* Select Recipient Property Option */}
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-gray-400 mb-1">
                      Quick-Select Arrears Property
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setSmsTargetProperty(null);
                            setSmsTargetEnforcement(null);
                            setSmsPhone('');
                          } else {
                            const matchedProp = properties.find(p => p.id === val);
                            if (matchedProp) {
                              setSmsTargetProperty(matchedProp);
                              setSmsTargetEnforcement(null);
                              setSmsPhone(matchedProp.ownerPhone || '');
                            }
                          }
                        }}
                        value={smsTargetProperty ? smsTargetProperty.id : (smsTargetEnforcement ? smsTargetEnforcement.propertyId : '')}
                        className="flex-1 rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none focus:border-[#0A1F44]"
                      >
                        <option value="">-- Or choose custom recipient --</option>
                        {properties
                          .filter(p => p.paymentStatus !== 'Paid')
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.id} - {p.ownerName} (₦{p.tenementRate.toLocaleString()} rate)
                            </option>
                          ))
                        }
                      </select>
                      {(smsTargetProperty || smsTargetEnforcement) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSmsTargetProperty(null);
                            setSmsTargetEnforcement(null);
                            setSmsPhone('');
                            setSmsMessage('');
                          }}
                          className="px-2 py-1 text-[10px] bg-gray-100 border rounded-lg text-gray-600 hover:bg-gray-200 text-center font-bold font-sans cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-gray-400 mb-1">
                        Alert Paradigm
                      </label>
                      <select
                        value={smsType}
                        onChange={(e) => setSmsType(e.target.value as 'Reminder' | 'Demand')}
                        className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white outline-none focus:border-[#0A1F44]"
                      >
                        <option value="Reminder">🔔 Friendly Reminder</option>
                        <option value="Demand">🛑 Law CAP 13 Demand Notice</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-gray-400 mb-1">
                        Recipient Phone *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +234 803 123 4567"
                        value={smsPhone}
                        onChange={(e) => setSmsPhone(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono outline-none focus:border-[#0A1F44]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-gray-400 mb-1 flex justify-between">
                      <span>Message Body Notice Template</span>
                      <span className="font-mono lowercase font-normal text-gray-500">
                        {smsMessage.length} chars ({~~((smsMessage.length / 160) + 1)} SMS)
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Type statutory SMS message here..."
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#0A1F44] focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingSms}
                    className="w-full bg-[#0A1F44] hover:bg-opacity-95 text-[#38BDF8] border border-sky-950 font-bold p-2.5 rounded-lg text-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {isSendingSms ? (
                      <>
                        <RefreshCw className="h-4 w-4 text-[#38BDF8] animate-spin" />
                        <span>Transmitting over Suleja Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Simulate Gateway Broadcast</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Smartphone Preview Visualizer Frame */}
              <div className="bg-[#0f172a] rounded-2xl p-4 border border-slate-800 text-white shadow-2xl relative overflow-hidden select-none max-w-sm mx-auto">
                {/* Speaker pill notch */}
                <div className="h-5 w-32 bg-slate-900 rounded-b-xl mx-auto absolute top-0 left-0 right-0 z-10 flex items-center justify-center">
                  <div className="h-1.5 w-8 bg-slate-850 rounded-full animate-pulse" />
                </div>
                
                <div className="flex justify-between items-center text-[9px] text-slate-400 px-2 pt-1 pb-4 font-mono">
                  <span>9:41 AM</span>
                  <div className="flex items-center gap-1">
                    <span>5G LTE</span>
                    <span className="h-2.5 w-4 bg-emerald-500 rounded-sm inline-block scale-90" />
                  </div>
                </div>

                <div className="bg-slate-900 rounded-xl p-3 border border-slate-800/85 space-y-2 min-h-[140px] flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-[9px] text-[#38BDF8] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Smartphone className="h-3 w-3" /> SulejaLGA-Alert
                    </span>
                    <span className="text-[8px] text-slate-500">Just Now</span>
                  </div>

                  <p className="text-[10px] text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-wrap break-words">
                    {smsMessage || "Choose an outstanding arrears property or select custom type parameter above to visualize preview alerts in real-time..."}
                  </p>

                  <div className="pt-1.5 border-t border-slate-800/40 text-center">
                    <span className="text-[7.5px] text-slate-500 font-mono">SulejaSMS Gateway Sec-ID Server</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Sent Logs Registry */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
                <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#0A1F44]">LGA SMS Transmissions Registry</h3>
                    <p className="text-[10px] text-gray-500 font-medium">Immutable audit trail of messages issued with delivery states & network identifiers.</p>
                  </div>
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search sent log registry..."
                      value={smsSearchQuery}
                      onChange={(e) => setSmsSearchQuery(e.target.value)}
                      className="py-1.5 pl-8 pr-3 w-full rounded-lg border border-gray-300 outline-none text-xs focus:border-[#0A1F44]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto text-[11px] text-gray-700 font-medium font-sans">
                  <table className="min-w-full divide-y divide-gray-100 text-left">
                    <thead className="bg-[#F5F7FA] text-gray-400 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="px-4 py-3">Recipient / Ref</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Message Snippet</th>
                        <th className="px-4 py-3">Sent Timestamp</th>
                        <th className="px-4 py-3">Carrier Log</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sentSmsRecords
                        .filter(r => 
                          r.ownerName.toLowerCase().includes(smsSearchQuery.toLowerCase()) ||
                          r.phone.includes(smsSearchQuery) ||
                          r.propertyId.toLowerCase().includes(smsSearchQuery.toLowerCase()) ||
                          r.message.toLowerCase().includes(smsSearchQuery.toLowerCase())
                        )
                        .length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-gray-400 font-mono uppercase font-semibold">
                              No SMS records matching query found.
                            </td>
                          </tr>
                        ) : (
                          sentSmsRecords
                            .filter(r => 
                              r.ownerName.toLowerCase().includes(smsSearchQuery.toLowerCase()) ||
                              r.phone.includes(smsSearchQuery) ||
                              r.propertyId.toLowerCase().includes(smsSearchQuery.toLowerCase()) ||
                              r.message.toLowerCase().includes(smsSearchQuery.toLowerCase())
                            )
                            .map((sms) => (
                              <tr key={sms.id} className="hover:bg-gray-50/50 group">
                                <td className="px-4 py-3">
                                  <span className="font-bold block text-gray-900 text-xs truncate max-w-[120px]">{sms.ownerName}</span>
                                  <span className="text-[10px] text-[#38BDF8] font-bold block">{sms.phone}</span>
                                  <span className="text-[8.5px] text-gray-405 block font-mono">PID: {sms.propertyId}</span>
                                </td>

                                <td className="px-4 py-3">
                                  <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    sms.type === 'Demand'
                                      ? 'bg-rose-50 border border-rose-100 text-rose-700 animate-pulse'
                                      : 'bg-sky-50 border border-sky-100 text-sky-700'
                                  }`}>
                                    {sms.type}
                                  </span>
                                </td>

                                <td className="px-4 py-3 max-w-[185px]">
                                  <p className="text-[10px] leading-relaxed line-clamp-2 text-gray-500 font-medium" title={sms.message}>
                                    {sms.message}
                                  </p>
                                </td>

                                <td className="px-4 py-3 text-gray-450 font-mono text-[9px] whitespace-nowrap">
                                  {sms.sentAt}
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="font-mono text-[9px] font-bold block text-emerald-600">● {sms.status}</span>
                                  <span className="font-mono text-[8.5px] block text-gray-400 truncate max-w-[140px]" title={sms.gatewayResponse}>
                                    {sms.gatewayResponse}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-center">
                                  <div className="inline-flex gap-1">
                                    <button
                                      onClick={() => {
                                        // Repopulate form
                                        setSmsPhone(sms.phone);
                                        setSmsMessage(sms.message);
                                        setSmsType(sms.type);
                                        
                                        // Pick the property if applicable
                                        const p = properties.find(prop => prop.id === sms.propertyId);
                                        if (p) {
                                          setSmsTargetProperty(p);
                                        } else {
                                          setSmsTargetProperty(null);
                                        }
                                        
                                        // Display flash feedback
                                        setEvaluationFeedback(`Repopulated SMS template with records from message ID ${sms.id}`);
                                        setTimeout(() => setEvaluationFeedback(''), 4000);
                                      }}
                                      title="Load back into composer template"
                                      className="p-1 px-2 hover:bg-slate-100 rounded border border-gray-200 text-gray-600 hover:text-slate-900 cursor-pointer font-bold text-[10px]"
                                    >
                                      Reload
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Verify action: discard transmission audit entry ${sms.id} from Suleja database registry?`)) {
                                          setSentSmsRecords(prev => prev.filter(item => item.id !== sms.id));
                                        }
                                      }}
                                      type="button"
                                      title="Remove from audit log"
                                      className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded text-gray-400 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'route' && (
        <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden h-[600px] flex flex-col relative">
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#38BDF8]" />
              Smart Inspection Routing
            </h3>
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-mono font-bold shadow-xs">BETA ROUTING ENGINE</span>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-100 text-center relative overflow-hidden group p-6">
             <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=9.183,7.181&zoom=14&size=800x600&maptype=roadmap&markers=color:blue%7Clabel:1%7C9.185,7.182&markers=color:red%7Clabel:2%7C9.176,7.175&key=MOCK')] bg-cover bg-center opacity-40 mix-blend-multiply transition-opacity duration-700 ease-in-out"></div>
             
             <div className="relative z-10 bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-lg w-full border border-gray-200 text-left">
                <h4 className="font-bold text-lg text-slate-800 mb-2">Optimize Field Patrol</h4>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  The routing intelligence agent can request your current GPS location to triangulate the most optimal visitation path for the <b>{filteredEnf.length}</b> properties requiring attention.
                </p>
                
                <div className="space-y-3">
                   <button className="w-full bg-[#0A1F44] hover:bg-[#38BDF8] hover:text-[#0A1F44] text-white py-3 px-4 rounded-xl text-sm font-bold shadow transition-all flex items-center justify-center gap-2" onClick={() => alert('Location permissions denied in sandbox. Simulating optimized route generated and dispatched to your device.')}>
                     <MapPin className="h-4 w-4" /> Generate Optimized Route
                   </button>
                   <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl text-sm font-bold transition-colors">
                     View Priority Static Map
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Escalate Property Dues Dialog Input Modal */}
      {showEnforceFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-display font-extrabold text-sm text-[#0A1F44] flex items-center gap-1.5">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Initialize Enforcement Entry
              </h3>
              <button onClick={() => setShowEnforceFormModal(false)} className="text-gray-400 hover:text-black font-bold">✕</button>
            </div>

            <form onSubmit={handleInitiateEnforceSubmit} className="space-y-4">
              {escalateError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700">
                  {escalateError}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Tax Code Property ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SLG-2026-00042"
                  value={targetPropertyId}
                  onChange={(e) => setTargetPropertyId(e.target.value)}
                  className="w-full rounded border border-gray-300 p-2 text-xs font-mono select-all uppercase outline-none focus:border-[#0A1F44]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] uppercase font-bold text-gray-500">
                    Delinquency Case Notes
                  </label>
                  {speechSupported ? (
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        isListening
                          ? 'bg-rose-600 text-white animate-pulse shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-[#0A1F44]'
                      }`}
                      title={isListening ? "Stop voice recording" : "Transcribe recording into notes"}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-3.5 w-3.5 text-white animate-spin" />
                          <span>Stop Rec</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5 text-[#38BDF8]" />
                          <span>Record Voice Note</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-400">Speech API Unsupported</span>
                  )}
                </div>
                <textarea
                  rows={3}
                  placeholder="Provide brief comments outlining arrears delays..."
                  value={escalateNotes}
                  onChange={(e) => setEscalateNotes(e.target.value)}
                  className="w-full rounded border border-gray-300 p-2 text-xs outline-none focus:border-[#0A1F44] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 focus:ring-1 focus:ring-sky-accent"
                />
              </div>

              {/* Camera Capture Attachment block */}
              <div className="border-t pt-2.5">
                <CameraCapture
                  label="Take Property Defaulter Photo"
                  onCapture={(dataUrl) => setCapturedPhotoUrl(dataUrl)}
                  onClear={() => setCapturedPhotoUrl('')}
                  initialImageUrl={capturedPhotoUrl}
                />
              </div>

              {/* GPS site visit Sync and Pinning */}
              <div className="space-y-2 border-t pt-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] uppercase font-bold text-gray-500">
                    Site Visit GPS Geolocation
                  </label>
                  <button
                    type="button"
                    onClick={handleSyncEnforceLocation}
                    disabled={enforceGpsLoading}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      enforceGpsLoading
                        ? 'bg-sky-100 text-sky-700 animate-pulse'
                        : 'bg-[#0A1F44] hover:bg-[#38BDF8] hover:text-[#0A1F44] text-white'
                    }`}
                    title="Pin exact GPS coordinates of this site visit to the case file"
                  >
                    <MapPin className={`h-3 w-3 ${enforceGpsLoading ? 'animate-spin' : ''}`} />
                    <span>{enforceGpsLoading ? 'Acquiring...' : 'Sync Current Location'}</span>
                  </button>
                </div>

                {enforceGpsError && (
                  <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
                    {enforceGpsError}
                  </p>
                )}

                {gpsLatitude !== null && gpsLongitude !== null ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded text-[10px] font-mono">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Pinned Coords: <b>{gpsLatitude.toFixed(6)}, {gpsLongitude.toFixed(6)}</b></span>
                  </div>
                ) : (
                  <p className="text-[9px] text-gray-400 font-medium">No site visit GPS coordinates pinned yet.</p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t text-xs">
                <button
                  type="button"
                  onClick={() => setShowEnforceFormModal(false)}
                  className="flex-1 border p-2 rounded text-gray-600 font-bold hover:bg-gray-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0A1F44] text-white p-2 font-bold rounded hover:bg-opacity-95"
                >
                  Initiate Served
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Legal Notice Demand Letter Modal */}
      {showNoticeModal && activeNotice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-black font-sans">
          <div 
            id="printable-official-notice-modal" 
            className="bg-[#FCFBF7] rounded-2xl max-w-2xl w-full p-8 border border-gray-450 shadow-2xl space-y-5 relative select-text overflow-hidden ring-1 ring-black/10"
          >
            {/* Embedded Print Override Style */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-official-notice-modal, #printable-official-notice-modal * {
                  visibility: visible !important;
                }
                #printable-official-notice-modal {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  border: none !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  padding: 1.5in !important;
                  background: white !important;
                  color: black !important;
                }
                .print-hidden-element, #btn-trigger-hardware-print, #btn-close-notice-modal {
                  display: none !important;
                }
              }
            `}} />

            {/* Side color stripe ribbon resembling the green-blue security scan margin */}
            <div className="absolute top-0 bottom-0 right-0 w-3 flex gap-[2px] pointer-events-none opacity-90">
              <div className="w-[5px] bg-[#00A86B] h-full"></div>
              <div className="w-[3px] bg-[#38BDF8] h-full"></div>
            </div>

            {/* Security background watermark emblem pattern */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none rotate-12">
              <div className="text-center">
                <span className="block text-5xl font-extrabold tracking-widest text-red-800 font-serif">SULEJA LGA</span>
                <span className="block text-xl font-bold tracking-widest text-[#0A1F44] uppercase mt-2">ENFORCEMENT ACTION WARRANT</span>
                <span className="block text-lg font-bold font-mono text-amber-705">★ SANCTION COMMISSION ★</span>
              </div>
            </div>

            {/* Beautiful Official Embossed Gold Seal Stamp */}
            <div className="absolute right-32 top-[480px] h-20 w-20 rounded-full bg-amber-500/10 border-4 border-amber-600/30 flex items-center justify-center font-serif text-[10px] uppercase font-extrabold rotate-12 flex-col select-none border-dashed text-amber-700/80 leading-none shadow-xs pointer-events-none z-10">
              <div className="text-[7px]">MUN. COURT</div>
              <div className="font-extrabold text-[12px] my-0.5">SEAL</div>
              <div className="text-[6px] tracking-widest">NIGER STATE</div>
            </div>

            {/* Header insignias of court notice */}
            <div className="text-center relative pb-2 select-none">
              <div className="flex justify-between items-start mb-1">
                <span className="rounded bg-[#E11D48] text-white px-2 py-0.5 font-bold font-mono text-[8px] uppercase tracking-wider select-none">
                  STATUTORY LAWS SERVICE
                </span>
                <button 
                  id="btn-close-notice-modal" 
                  onClick={() => setShowNoticeModal(false)} 
                  className="text-gray-400 hover:text-black font-bold text-sm cursor-pointer print-hidden-element"
                  title="Close inspection view"
                >
                  ✕
                </button>
              </div>

              <div className="font-black tracking-tight text-center text-[#15803D] uppercase text-xl md:text-2xl leading-none font-sans">
                SULEJA LOCAL GOVERNMENT COUNCIL
              </div>
              <div className="font-extrabold text-center text-gray-900 tracking-widest text-[11px] uppercase mt-1 pb-1 border-b-2 border-gray-900">
                NIGER STATE
              </div>
            </div>

            {/* Handwriting Form Header Block */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mt-2">
              {/* Left Side: Owner / Address Handwriting lines exactly structured like a scanned form */}
              <div className="w-full sm:w-2/3 space-y-2 text-xs">
                <div className="flex gap-2 border-b border-gray-400 pb-0.5 min-h-[22px] items-end">
                  <span className="text-gray-400 font-bold tracking-tight text-[9px] uppercase select-none shrink-0">OWNER/OCCUPANT:</span>
                  <span className="font-mono text-[11.5px] text-[#1E3A8A] font-bold italic tracking-wide">
                    {activeNotice.ownerName.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2 border-b border-gray-400 pb-0.5 min-h-[22px] items-end">
                  <span className="text-gray-400 font-bold tracking-tight text-[9px] uppercase select-none shrink-0">ADDRESS:</span>
                  <span className="font-mono text-[11px] text-[#1E3A8A] font-bold italic tracking-wide truncate max-w-[280px]">
                    {activeNotice.address.toUpperCase() || 'PLAZA EXP ROAD'}
                  </span>
                </div>
                <div className="flex gap-2 border-b border-gray-400 pb-0.5 min-h-[22px] items-end">
                  <span className="text-gray-400 font-bold tracking-tight text-[9px] uppercase select-none shrink-0">COORD/WARD:</span>
                  <span className="font-mono text-[11px] text-[#1E3A8A] font-bold italic tracking-wide">
                    {activeNotice.ward.toUpperCase()} WARD, SULEJA
                  </span>
                </div>
              </div>

              {/* Right Side: Serial & Date Lines matches handwritten style */}
              <div className="w-full sm:w-1/3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-1.5 border-b border-gray-400 pb-0.5 min-h-[22px]">
                  <span className="font-bold text-gray-500 text-[9px] uppercase select-none shrink-0">NO.:</span>
                  <span className="font-mono text-[11.5px] text-[#1E3A8A] font-bold italic tracking-wider text-right pr-1 flex-grow">
                    11276-{activeNotice.id.split('-').pop()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1.5 border-b border-gray-400 pb-0.5 min-h-[22px]">
                  <span className="font-bold text-gray-500 text-[9px] uppercase select-none shrink-0">DATE:</span>
                  <span className="font-mono text-[11px] text-[#1E3A8A] font-bold italic text-right pr-1 flex-grow">
                    {activeNotice.lastActionDate || '2026-06-14'}
                  </span>
                </div>
                <div className="text-right text-[8.5px] font-mono font-extrabold text-[#15803D] tracking-wider uppercase pr-1 select-none">
                  REF: TR/MD/{activeNotice.id.split('-').pop()}B
                </div>
              </div>
            </div>

            {/* RED/PINK Display Title Section */}
            <div className="text-center my-4 space-y-0.5 relative select-none">
              <div className="text-[#E11D48] font-black tracking-widest text-center text-sm md:text-[15px] uppercase font-sans">
                TENEMENT RATE VALUATION
              </div>
              <div className="text-[#9D174D] font-black text-center text-xs md:text-sm uppercase font-sans border-b border-pink-700/20 pb-1 max-w-md mx-auto">
                ASSESSMENT REPORT AND DEMAND NOTICE
              </div>
            </div>

            {/* Statues/Constitutional Preamble text */}
            <p className="text-[9.5px] text-justify text-gray-700 leading-relaxed font-sans mb-3 px-0.5 select-all">
              Pursuant to the constitution of the Federal Republic of Nigeria 1999 (As amended), and the tenement rate collection Bye-law (No.1) 2023 of Suleja Local Government council hereby gives you thirty (30) clear days notice from the date of service of this notice to pay Tenement Rate in respect of your property laying and situated at Suleja Local Government Area of Niger State.
            </p>

            {/* Underlined metrics form fields exactly styled like the image */}
            <div className="p-4 bg-amber-50/15 border border-gray-300 rounded-xl font-sans text-xs space-y-2.5">
              <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                <span className="font-extrabold text-gray-600 tracking-tight text-[9.5px] uppercase shrink-0">DESCRIPTION OF PROPERTY:</span>
                <span className="font-mono text-[#1E3A8A] font-bold italic text-[11px] flex-grow px-2 truncate">
                  {activeNotice.address.toUpperCase()} ({activeNotice.ward.toUpperCase()} UNIT)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                  <span className="font-bold text-gray-500 tracking-tight text-[9px] uppercase shrink-0">ANNUAL VALUE (EST):</span>
                  <span className="font-mono text-[#1E3A8A] font-bold italic text-[11px] flex-grow text-center">
                    ₦{(activeNotice.amountOwed * 25).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                  <span className="font-bold text-gray-500 tracking-tight text-[9px] uppercase shrink-0">ASSESSMENT PROCESS:</span>
                  <span className="font-mono text-[#1E3A8A] font-bold italic text-[11px] flex-grow text-center">
                    4% Flat Tenement Coefficient
                  </span>
                </div>

                <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                  <span className="font-bold text-gray-500 tracking-tight text-[9px] uppercase shrink-0">ASSESSMENT BILL YEAR:</span>
                  <span className="font-mono text-[#1E3A8A] font-bold italic text-[11px] flex-grow text-center">
                    2026 Fiscal Season
                  </span>
                </div>
                <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                  <span className="font-bold text-gray-500 tracking-tight text-[9px] uppercase shrink-0">ENFORCED LEGAL STATE:</span>
                  <span className="font-mono text-[#E11D48] font-bold italic text-[10.5px] flex-grow text-center uppercase">
                    {activeNotice.stage}
                  </span>
                </div>

                <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                  <span className="font-bold text-gray-500 tracking-tight text-[9px] uppercase shrink-0">OUTSTANDING ARREARS:</span>
                  <span className="font-mono text-[#1E3A8A] font-bold italic text-[11px] flex-grow text-center">
                    ₦{activeNotice.amountOwed.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                  <span className="font-extrabold text-red-750 tracking-tight text-[9px] uppercase shrink-0">TOTAL OUTSTANDING DEMAND:</span>
                  <span className="font-mono text-[#E11D48] font-black italic text-[12px] flex-grow text-center">
                    ₦{activeNotice.amountOwed.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Payment directions and warnings */}
            <div className="text-[10px] text-justify text-gray-800 leading-relaxed font-sans space-y-3.5 mt-4 select-all">
              {activeNotice.gpsCoordinates && (
                <p className="bg-[#E0F2FE]/55 text-[#0369A1] font-semibold border border-[#BAE6FD] p-2 rounded text-[10px] font-mono flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-blue-505" />
                  <span>Verified Site GPS Coordinate Pinpoint: {activeNotice.gpsCoordinates}</span>
                </p>
              )}

              <p>
                You are by this notice urged to come to the office to effect the payment, if this assessment is disputed, you may give notice of objection(s) in writing stating the ground(s) of objection(s) within 14 days from the day the date of service of this notice or you may pay the rate to this account: <span className="bg-slate-100 hover:bg-slate-200 border border-gray-350 px-1.5 py-0.5 rounded font-bold font-mono text-[10.5px]">Bank Name: ACCESS BANK</span>, <span className="bg-slate-100 hover:bg-slate-200 border border-gray-350 px-1.5 py-0.5 rounded font-bold font-mono text-[10.5px]">Account No.: 1220131589</span>, Name: <span className="font-bold">RAM-ZURAT NIG LTD</span> and come to the Tenement Rate office to obtain your receipt of payment for proper documentation.
              </p>

              <p>
                <span className="text-[#991B1B] font-extrabold uppercase pr-1 shrink-0 select-none">PLEASE TAKE NOTICE</span> that on no account should you pay the above tax to any individual/staff besides the above designated account. You are expected to come to the Tenement Rate office located at Suit B20 Sidi Plaza, No 2, Usman Baba Street, Beside Old NEPA Office Suleja, Niger State.
              </p>

              <p>
                <span className="text-[#991B1B] font-extrabold uppercase pr-1 shrink-0 select-none">FURTHER TAKE NOTICE</span> that failure to pay the rate within the stipulated time may expose you to legal actions with the attendant penalties and inconveniences.
              </p>

              <p className="italic font-bold text-gray-600 text-center py-1 select-none">"May wise counsel prevail."</p>
            </div>

            {/* Footer sign-off and acknowledgments structure matches picture */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch pt-4 border-t border-dashed border-gray-300 gap-6">
              {/* Left: Chief Revenue Collector with signature simulation */}
              <div className="flex-1 space-y-3 text-[10.5px] flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="h-6 flex items-end">
                    <span className="font-mono font-bold text-blue-900 text-xs italic tracking-wide select-none">M. Zubairu</span>
                  </div>
                  <div className="w-full border-t border-gray-400"></div>
                  <span className="block font-bold text-gray-950">MUHAMMAD ZUBAIRU</span>
                  <span className="block text-gray-500 font-bold text-[8.5px] uppercase tracking-wider select-none">For SULEJA LOCAL GOVERNMENT COUNCIL</span>
                </div>
                <div className="text-[9px] font-mono font-bold text-gray-650 bg-slate-150/40 p-2 rounded border border-gray-250 leading-tight">
                  TELS: 08036359027, 08057978763
                </div>
              </div>

              {/* Right: Customer Acknowledgment grid (exactly as on physical scan) */}
              <div className="w-full sm:w-[220px] bg-slate-200/40 p-3 rounded-lg border border-gray-250 font-sans">
                <span className="block text-[10px] font-black text-center text-slate-800 border-b border-gray-350 pb-1 mb-2 select-none">
                  ACKNOWLEDGED
                </span>
                <div className="space-y-2 text-[9.5px]">
                  <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                    <span className="font-bold text-gray-500 shrink-0 select-none">NAME:</span>
                    <div className="flex-grow min-h-[14px]"></div>
                  </div>
                  <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                    <span className="font-bold text-gray-500 shrink-0 select-none">DATE:</span>
                    <div className="flex-grow min-h-[14px]"></div>
                  </div>
                  <div className="flex items-center gap-1 border-b border-gray-350 pb-0.5">
                    <span className="font-bold text-gray-500 shrink-0 select-none">SIGN:</span>
                    <div className="flex-grow min-h-[14px]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Print button */}
            <div className="border-t pt-4 print-hidden-element">
              <button
                id="btn-trigger-hardware-print"
                onClick={() => {
                  window.print();
                }}
                className="w-full bg-[#0A1F44] text-[#38BDF8] border-2 border-[#38BDF8]/45 hover:bg-[#11254d] rounded-lg py-2.5 font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4 text-[#38BDF8]" />
                Print Official Report (Government-Stamped)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Existing Case Photo Evidence Attachment/Camera Modal */}
      {activePhotoCase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-display font-extrabold text-sm text-[#0A1F44] flex items-center gap-1.5 animate-pulse">
                <Camera className="h-5 w-5 text-[#38BDF8]" />
                <span>Attach Photo Evidence</span>
              </h3>
              <button 
                onClick={() => {
                  setActivePhotoCase(null);
                  setCapturedPhotoUrlForCase('');
                }} 
                className="text-gray-400 hover:text-black font-bold text-sm cursor-pointer hover:scale-110 active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="block text-[9px] font-mono text-gray-500 font-extrabold uppercase">Dossier / Case ID:</span>
                <b className="text-xs text-indigo-950 font-semibold">{activePhotoCase.id}</b>
                
                <span className="block text-[9px] font-mono text-gray-500 font-extrabold uppercase mt-1.5">Property / Landlord:</span>
                <span className="text-xs text-indigo-950 block">{activePhotoCase.propertyId} / {activePhotoCase.ownerName}</span>
                
                <span className="block text-[9px] font-mono text-gray-500 font-extrabold uppercase mt-1.5">Address:</span>
                <span className="text-[10px] text-gray-500 block truncate">{activePhotoCase.address}</span>
              </div>

              <CameraCapture
                label="Stream Inspection Cam"
                onCapture={(imgData) => setCapturedPhotoUrlForCase(imgData)}
                onClear={() => setCapturedPhotoUrlForCase('')}
                initialImageUrl={capturedPhotoUrlForCase}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t text-xs">
              <button
                type="button"
                onClick={() => {
                  setActivePhotoCase(null);
                  setCapturedPhotoUrlForCase('');
                }}
                className="flex-1 border p-2 rounded text-gray-600 font-bold hover:bg-gray-55 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (capturedPhotoUrlForCase) {
                    onUpdateEnforcementEvidence(activePhotoCase.id, capturedPhotoUrlForCase);
                    setActivePhotoCase(null);
                    setCapturedPhotoUrlForCase('');
                  } else {
                    alert("Please capture or choose a photo first.");
                  }
                }}
                className="flex-1 bg-[#0A1F44] text-white p-2 font-bold rounded hover:bg-opacity-95 cursor-pointer flex items-center justify-center gap-1 transition-all active:scale-98"
              >
                <Check className="h-3.5 w-3.5 text-[#38BDF8]" />
                <span>Save Attachment</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
