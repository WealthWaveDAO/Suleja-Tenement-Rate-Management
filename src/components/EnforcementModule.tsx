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
  Trash2
} from 'lucide-react';
import { EnforcementAction, EnforcementStage, Property, UserRole } from '../types';
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
  const [activeTab, setActiveTab] = useState<'ledger' | 'agents'>('ledger');
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
      </div>

      {activeTab === 'ledger' ? (
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
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-2 text-xs"
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
        </div>
      ) : (
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
          <div id="printable-official-notice-modal" className="bg-white rounded-2xl max-w-2xl w-full p-8 border border-gray-200 shadow-2xl space-y-6 relative select-text overflow-hidden">
            
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

            {/* Custom Background Diagonals Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none rotate-30">
              <div className="text-[72px] font-mono tracking-widest font-extrabold uppercase border-8 border-current p-4 select-none">
                SULEJA ENFORCEMENT
              </div>
            </div>

            {/* Beautiful Official Embossed Gold Seal Stamp */}
            <div className="absolute right-8 top-16 h-20 w-20 rounded-full bg-amber-500/10 border-4 border-amber-600/30 flex items-center justify-center font-serif text-[10px] uppercase font-extrabold rotate-12 flex-col select-none border-dashed text-amber-700/80 leading-none shadow-xs pointer-events-none">
              <div className="text-[7px]">MUN. COURT</div>
              <div className="font-extrabold text-[12px] my-0.5">SEAL</div>
              <div className="text-[6px] tracking-widest">NIGER STATE</div>
            </div>
            
            {/* Header insignias of court notice */}
            <div className="text-center space-y-2 border-b pb-6 relative z-10 text-left">
              <div className="flex justify-between items-start mb-2">
                <span className="rounded bg-[#0A1F44] text-white px-2 py-0.5 font-bold font-mono text-[9px] uppercase tracking-wider">
                  STATUTORY LAWS ENFORCEMENT
                </span>
                <button 
                  id="btn-close-notice-modal" 
                  onClick={() => setShowNoticeModal(false)} 
                  className="text-gray-400 hover:text-black font-bold text-md cursor-pointer print-hidden-element"
                >
                  ✕
                </button>
              </div>

              <h4 className="font-display font-extrabold text-sm uppercase text-[#0A1F44]">SULEJA LOCAL GOVERNMENT AREA COUNCIL</h4>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Office of the Chief Revenue Collector & Valuer</p>
              <p className="text-[9px] text-gray-400">Secretariat Road, Suleja, Niger State, Nigeria</p>
            </div>

            {/* Document contents */}
            <div className="space-y-4 font-sans leading-normal leading-relaxed text-xs">
              <div className="flex justify-between font-mono text-[10px]">
                <span>CASE INDEX: <b>{activeNotice.id}</b></span>
                <span>DATE SERVED: <b>2026-06-08</b></span>
              </div>

              <div className="space-y-1">
                <span className="block text-[10px] font-bold uppercase text-gray-400">To the Landlord / Occupant:</span>
                <b className="text-sm block">{activeNotice.ownerName}</b>
                <span className="text-gray-600 block">{activeNotice.address} ({activeNotice.ward} Ward)</span>
              </div>

              {/* Subject Title */}
              <div className="text-center font-bold underline uppercase tracking-tight py-2">
                RE: STATUTORY DEMAND NOTICE OF OUTSTANDING TENEMENT RATES LIABILITIES
              </div>

              <p className="text-justify font-medium text-gray-800">
                You are hereby notified that pursuant to the powers vested under the Local Government Tenement Rate Laws of Niger State,Cap 10, your assessment records indicate an unpaid tenement rates backlog of <b className="font-mono text-red-600 text-sm">₦{activeNotice.amountOwed.toLocaleString()}</b>.
              </p>

              <div className="bg-[#F5F7FA] border rounded p-3 font-medium text-gray-600 space-y-1">
                <span><b>Active Legal Case Stage:</b> {activeNotice.stage}</span>
                <p className="text-[10px] leading-relaxed"><b>Status Comments:</b> {activeNotice.notes}</p>
                {activeNotice.gpsCoordinates && (
                  <p className="text-[10px] text-emerald-700 font-semibold font-mono flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 inline text-emerald-600 animate-pulse" />
                    <span>Verified Site Coordinates: {activeNotice.gpsCoordinates}</span>
                  </p>
                )}
              </div>

              <p className="text-justify font-medium text-gray-850">
                FAILURE TO CLEAR THE OUTSTANDING AMOUNT OR TO DELIVER AN OFFICIAL CLEARANCE RECEIPT TO THE COUNCIL OFFICE WITHIN SEVEN (7) CLEAR WORKING DAYS FROM THIS RECEIPT WILL MANDATE THE COUNCIL TO SEAL COVER OF THE PREMISES, PETITION COMPLIANCE TO THE STATE BOARD OF INTERNAL REVENUE, AND TRIGGER DIRECT COURT ORDER DISTRAIN ACTION.
              </p>

              <div className="pt-6 flex justify-between items-end">
                <div className="text-center font-sans">
                  <div className="h-10 w-24 border-b border-gray-300 mx-auto" />
                  <span className="block text-[9px] mt-1 text-gray-500">Valuer-in-Charge</span>
                  <span className="block text-[10px] font-bold text-gray-900">Suleja Local Government</span>
                </div>

                <div className="text-center font-sans">
                  <div className="h-10 w-24 border-b border-gray-300 mx-auto" />
                  <span className="block text-[9px] mt-1 text-gray-500">Legal Representative</span>
                  <span className="block text-[10px] font-bold text-gray-900">Niger State Magistrate</span>
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
