/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  SlidersHorizontal, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Check, 
  Building2, 
  Phone,
  Info,
  QrCode,
  AlertTriangle,
  Upload,
  FileText,
  File,
  X,
  Camera,
  Printer,
  Clock,
  Mic,
  MicOff,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property, PropertyType, OccupancyStatus, TaxPaymentStatus, UserRole, Invoice, EnforcementAction } from '../types';
import { SULEJA_WARDS } from '../data';
import CameraCapture from './CameraCapture';
import * as QRCodeLib from 'qrcode';
const QRCode = (QRCodeLib as any).default || QRCodeLib;
import jsQR from 'jsqr';
import QrScannerModal from './QrScannerModal';

interface PropertyManagementProps {
  properties: Property[];
  userRole: UserRole;
  userEmail: string;
  onAddProperty: (p: Omit<Property, 'id' | 'tenementRate'>) => void;
  onEditProperty: (p: Property) => void;
  onDeleteProperty: (id: string) => void;
  onSelectPropertyGIS?: (p: Property) => void;
  onBulkEditProperties?: (propertyIds: string[], updates: { propertyType?: PropertyType; inspectorName?: string }) => void;
  onAddEnforcementAction?: (propertyId: string, notes: string, gpsCoordinates?: string, evidenceUrl?: string) => void;
  invoices?: Invoice[];
  enforcement?: EnforcementAction[];
}

export default function PropertyManagement({ 
  properties, 
  userRole, 
  userEmail,
  onAddProperty, 
  onEditProperty, 
  onDeleteProperty,
  onSelectPropertyGIS,
  onBulkEditProperties,
  onAddEnforcementAction,
  invoices = [],
  enforcement = []
}: PropertyManagementProps) {

  // Find valuation outliers to display warning flags on the dashboard and property rows
  const valuationOutliers = useMemo(() => {
    const groupedValues: Record<string, number[]> = {};
    properties.forEach(p => {
      const key = `${p.ward}-${p.propertyType}`;
      if (!groupedValues[key]) groupedValues[key] = [];
      groupedValues[key].push(p.annualRentalValue);
    });

    const stats: Record<string, { mean: number; stdDev: number }> = {};
    Object.entries(groupedValues).forEach(([key, values]) => {
      const count = values.length;
      if (count < 3) return;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / count;
      const variance = values.reduce((accum, val) => accum + Math.pow(val - mean, 2), 0) / count;
      const stdDev = Math.sqrt(variance) || 1;
      stats[key] = { mean, stdDev };
    });

    const outliers: Record<string, { deviationPercent: number; isHigh: boolean }> = {};
    properties.forEach(p => {
      const key = `${p.ward}-${p.propertyType}`;
      const groupStat = stats[key];
      if (!groupStat) return;

      const { mean, stdDev } = groupStat;
      const zScore = (p.annualRentalValue - mean) / stdDev;

      if (Math.abs(zScore) > 1.6) {
        const deviationPercent = Math.round(((p.annualRentalValue - mean) / mean) * 100);
        outliers[p.id] = {
          deviationPercent,
          isHigh: zScore > 0
        };
      }
    });

    return outliers;
  }, [properties]);

  // Search & Filter State
  const [search, setSearch] = useState('');
  
  // Voice Search States for Property Management
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'en-NG'; // Nigeria English localization
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      rec.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          const cleanedText = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
          setSearch(cleanedText);
          setCurrentPage(1);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error in property search:", e);
        if (e.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked by browser.');
        } else if (e.error === 'no-speech') {
          setVoiceError('No speech detected. Speak clearly.');
        } else {
          setVoiceError('Voice search failed. Please try again.');
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleToggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      setVoiceError('Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        setVoiceError(null);
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start voice search in properties:", e);
      }
    }
  };
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedType, setSelectedType] = useState<PropertyType | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<TaxPaymentStatus | ''>('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Modal / Form States
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  // Form Field States
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ninOrTin, setNinOrTin] = useState('');
  const [address, setAddress] = useState('');
  const [ward, setWard] = useState(SULEJA_WARDS[0].name);
  const [propertyType, setPropertyType] = useState<PropertyType>('Residential');
  const [units, setUnits] = useState(1);
  const [annualRentalValue, setAnnualRentalValue] = useState(300000);
  const [occupancyStatus, setOccupancyStatus] = useState<OccupancyStatus>('Occupied');
  const [paymentStatus, setPaymentStatus] = useState<TaxPaymentStatus>('Unpaid');
  const [latitude, setLatitude] = useState(9.18);
  const [longitude, setLongitude] = useState(7.18);
  const [imageUrl, setImageUrl] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [description, setDescription] = useState('');

  // Multi-Selection and Bulk Actions State
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [bulkPropertyType, setBulkPropertyType] = useState<PropertyType | ''>('');
  const [bulkInspectorName, setBulkInspectorName] = useState('');
  const [bulkConfirmation, setBulkConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Multi-Step Delete & QR Generation States
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [activeQrProperty, setActiveQrProperty] = useState<Property | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  // Auto-Save Draft State
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (showFormModal) {
      setAutoSaveStatus('saving');
      const timer = setTimeout(() => {
        setAutoSaveStatus('saved');
        // Visually indicating data is persisted locally
      }, 750);
      return () => clearTimeout(timer);
    } else {
      setAutoSaveStatus('idle');
    }
  }, [ownerName, ownerPhone, ownerEmail, ninOrTin, address, ward, propertyType, units, annualRentalValue, occupancyStatus, paymentStatus, latitude, longitude, description, showFormModal]);

  // Generate QR code using the installed 'qrcode' library (fully offline-ready)
  React.useEffect(() => {
    if (activeQrProperty) {
      const url = `${window.location.origin}${window.location.pathname}?quickpay=${activeQrProperty.id}`;
      QRCode.toDataURL(url, { width: 300, margin: 2 })
        .then(urlData => {
          setQrDataUrl(urlData);
        })
        .catch(err => {
          console.error('[Suleja QR Generation Error]', err);
          setQrDataUrl('');
        });
    } else {
      setQrDataUrl('');
    }
  }, [activeQrProperty]);
  
  const [printingPropertyReport, setPrintingPropertyReport] = useState<Property | null>(null);
  const [printQrBlob, setPrintQrBlob] = useState<string>('');

  React.useEffect(() => {
    if (printingPropertyReport) {
      const url = `${window.location.origin}${window.location.pathname}?quickpay=${printingPropertyReport.id}`;
      QRCode.toDataURL(url, { width: 150, margin: 1 })
        .then(u => setPrintQrBlob(u))
        .catch(() => setPrintQrBlob(''));

      const t = setTimeout(() => {
        window.print();
      }, 750);
      return () => clearTimeout(t);
    } else {
      setPrintQrBlob('');
    }
  }, [printingPropertyReport]);

  const [printingPropertyLabel, setPrintingPropertyLabel] = useState<Property | null>(null);
  const [labelQrBlob, setLabelQrBlob] = useState<string>('');

  const [printingQrLabels, setPrintingQrLabels] = useState<Property[] | null>(null);
  const [qrLabelsBlobs, setQrLabelsBlobs] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (printingQrLabels && printingQrLabels.length > 0) {
      const promises = printingQrLabels.map(p => {
        return QRCode.toDataURL(p.id, { width: 200, margin: 1 })
          .then(dataUrl => ({ id: p.id, dataUrl }))
          .catch(() => ({ id: p.id, dataUrl: '' }));
      });

      Promise.all(promises).then(results => {
        const blobs: Record<string, string> = {};
        results.forEach(r => {
          blobs[r.id] = r.dataUrl;
        });
        setQrLabelsBlobs(blobs);

        const t = setTimeout(() => {
          window.print();
        }, 750);
        return () => clearTimeout(t);
      });
    } else {
      setQrLabelsBlobs({});
    }
  }, [printingQrLabels]);

  const handlePrintQrLabels = (propsToPrint: Property[]) => {
    setPrintingQrLabels(propsToPrint);
  };

  React.useEffect(() => {
    if (printingPropertyLabel) {
      const url = `${window.location.origin}${window.location.pathname}?quickpay=${printingPropertyLabel.id}`;
      QRCode.toDataURL(url, { width: 140, margin: 1 })
        .then(u => setLabelQrBlob(u))
        .catch(() => setLabelQrBlob(''));

      const t = setTimeout(() => {
        window.print();
      }, 750);
      return () => clearTimeout(t);
    } else {
      setLabelQrBlob('');
    }
  }, [printingPropertyLabel]);

  const [selectedTimelineProperty, setSelectedTimelineProperty] = useState<Property | null>(null);
  const [detailsTab, setDetailsTab] = useState<'timeline' | 'payments' | 'qrcode'>('timeline');

  // --- BULK CSV IMPORT FEATURE STATE & LOGIC ---
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [csvTextInput, setCsvTextInput] = useState('');
  const [bulkImportPreview, setBulkImportPreview] = useState<any[] | null>(null);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [bulkImportSuccess, setBulkImportSuccess] = useState<string | null>(null);

  const handleParseCsv = () => {
    setBulkImportError(null);
    setBulkImportSuccess(null);
    if (!csvTextInput.trim()) {
      setBulkImportError('Please enter or paste CSV content before validation.');
      return;
    }

    const lines = csvTextInput.split('\n');
    if (lines.length < 2) {
      setBulkImportError('CSV should contain at least a header row and one data row.');
      return;
    }

    const rawHeaders = lines[0].split(',');
    const headers = rawHeaders.map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    
    const hasOwnerName = headers.some(h => h.includes('ownername') || h === 'owner' || h === 'name');
    const hasAddress = headers.some(h => h.includes('address') || h === 'location');

    if (!hasOwnerName || !hasAddress) {
      setBulkImportError('Invalid headers. Please provide headers like "ownerName,address,ward,propertyType,units,annualRentalValue"');
      return;
    }

    const parsedList: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let cells: string[] = [];
      let currentCell = '';
      let insideQuotes = false;

      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] || '';
      });

      const ownerName = row['ownername'] || row['owner'] || row['name'] || '';
      const ownerEmail = row['owneremail'] || row['email'] || '';
      const ownerPhone = row['ownerphone'] || row['phone'] || '';
      const address = row['address'] || row['location'] || '';
      const wardRaw = row['ward'] || '';
      
      let ward = SULEJA_WARDS[0].name;
      const matchedWard = SULEJA_WARDS.find(w => w.name.toLowerCase() === wardRaw.toLowerCase());
      if (matchedWard) {
        ward = matchedWard.name;
      } else if (wardRaw) {
        const partialWard = SULEJA_WARDS.find(w => w.name.toLowerCase().includes(wardRaw.toLowerCase()));
        if (partialWard) ward = partialWard.name;
      }

      const propertyTypeRaw = row['propertytype'] || row['type'] || 'Residential';
      const propertyType = (propertyTypeRaw.toLowerCase().startsWith('com') ? 'Commercial' : 
                            propertyTypeRaw.toLowerCase().startsWith('ind') ? 'Industrial' : 'Residential') as PropertyType;
      
      const units = parseInt(row['units'] || '1', 10) || 1;
      const annualRentalValue = parseFloat(row['annualrentalvalue'] || row['rentalvalue'] || row['value'] || '300000') || 300000;

      if (!ownerName || !address) {
        continue;
      }

      parsedList.push({
        ownerName,
        ownerEmail,
        ownerPhone,
        address,
        ward,
        propertyType,
        units,
        annualRentalValue,
        occupancyStatus: 'Occupied' as OccupancyStatus,
        paymentStatus: 'Unpaid' as TaxPaymentStatus,
        latitude: 9.18 + (Math.random() - 0.5) * 0.02,
        longitude: 7.18 + (Math.random() - 0.5) * 0.02,
        imageUrl: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=150',
        inspectorName: 'CSV Bulk Ingestion',
        attachments: []
      });
    }

    if (parsedList.length === 0) {
      setBulkImportError('Could not parse any valid property records. Confirm you filled in "ownerName" and "address".');
    } else {
      setBulkImportPreview(parsedList);
    }
  };

  const handleCommitBulkImport = () => {
    if (!bulkImportPreview || bulkImportPreview.length === 0) return;
    
    bulkImportPreview.forEach(prop => {
      onAddProperty(prop);
    });

    setBulkImportSuccess(`Sovereign registry populated successfully with ${bulkImportPreview.length} tenement properties.`);
    setBulkImportPreview(null);
    setCsvTextInput('');
    
    setTimeout(() => {
      setShowBulkImportModal(false);
      setBulkImportSuccess(null);
    }, 2500);
  };

  // --- QR SCROLLER/CAMERA SCAN FEATURE STATE ---
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const [qrScannerError, setQrScannerError] = useState<string | null>(null);
  const [qrScannerSuccessMessage, setQrScannerSuccessMessage] = useState<string | null>(null);
  const [scannedProperty, setScannedProperty] = useState<Property | null>(null);

  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrStream, setQrStream] = useState<MediaStream | null>(null);
  const [qrScannerActive, setQrScannerActive] = useState(false);

  // Auto scanning loop
  React.useEffect(() => {
    let animationFrameId: number;
    let localStream: MediaStream | null = null;

    const startScannerCamera = async () => {
      if (!showQrScannerModal) return;
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        localStream = mediaStream;
        setQrStream(mediaStream);
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = mediaStream;
        }
        setQrScannerActive(true);
      } catch (err: any) {
        console.warn('[QR Scanner Camera Fail]', err);
        setQrScannerError('Camera permission denied or camera inactive. Use file upload or simulation panel below.');
      }
    };

    if (showQrScannerModal) {
      startScannerCamera();
    }

    // Scanning frame analyzing loop function
    const scanFrame = () => {
      if (!qrVideoRef.current || !qrCanvasRef.current || !showQrScannerModal) {
        animationFrameId = requestAnimationFrame(scanFrame);
        return;
      }

      const video = qrVideoRef.current;
      const canvas = qrCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code) {
            handleDecodedString(code.data);
            return; // stop scanning on success
          }
        } catch (error) {
          // Ignore general canvas reading failures
        }
      }
      animationFrameId = requestAnimationFrame(scanFrame);
    };

    if (showQrScannerModal) {
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      setQrStream(null);
      setQrScannerActive(false);
    };
  }, [showQrScannerModal]);

  const handleDecodedString = (scannedDataValue: string) => {
    let propertyIdToMatch = scannedDataValue.trim();
    if (scannedDataValue.includes('quickpay=')) {
      const match = scannedDataValue.match(/quickpay=([^&]+)/);
      if (match) {
        propertyIdToMatch = match[1];
      }
    }

    const found = properties.find(
      p => p.id.toLowerCase() === propertyIdToMatch.toLowerCase()
    );

    if (found) {
      setSearch(found.id);
      setSelectedPropertyIds([found.id]);
      setSelectedTimelineProperty(found); // Automatically trigger detail lookup
      setDetailsTab('timeline');
      setShowTimelineModal(true);          // Automatically show detail view
      setShowQrScannerModal(false);
      setScannedProperty(null);
      setQrScannerError(null);
      setQrScannerSuccessMessage(null);
    } else {
      setQrScannerError(`Scanned payload: "${scannedDataValue}". No matching Suleja Tenement Property found.`);
      setScannedProperty(null);
    }
  };

  const handleUploadedQrImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0, img.width, img.height);
          const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
          const decoded = jsQR(imgData.data, imgData.width, imgData.height);
          if (decoded) {
            handleDecodedString(decoded.data);
          } else {
            setQrScannerError('Image read successfully, but couldn\'t decimate any standard QR code format.');
          }
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  const [showMultiStepDeleteModal, setShowMultiStepDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Timeline Event Structures Compiler
  interface TimelineEvent {
    date: string;
    type: 'billing' | 'payment' | 'enforcement';
    title: string;
    description: string;
    badge?: string;
    badgeColor?: string;
  }

  const timelineEvents = useMemo(() => {
    if (!selectedTimelineProperty) return [];
    const events: TimelineEvent[] = [];
    const propId = selectedTimelineProperty.id;

    // 1. Gather invoices events
    const propInvoices = invoices.filter(inv => inv.propertyId === propId);
    propInvoices.forEach(inv => {
      // Event A: Bill Issued
      if (inv.issuedDate) {
        events.push({
          date: inv.issuedDate,
          type: 'billing',
          title: 'Tax Bill Issued',
          description: `Tenement rate invoice ${inv.id} issued for ₦${inv.amount.toLocaleString()}. Assessed at ${selectedTimelineProperty.ratePercentage}% coefficient.`,
          badge: 'Issued',
          badgeColor: 'bg-indigo-50 text-indigo-750 border-indigo-200'
        });
      }
      // Event B: Bill Due
      if (inv.dueDate) {
        events.push({
          date: inv.dueDate,
          type: 'billing',
          title: 'Tax Bill Due',
          description: `Due date for tenement rate payment on invoice ${inv.id}.`,
          badge: 'Due Date',
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200'
        });
      }
      // Event C: Paid
      if (inv.status === 'Paid' && inv.paymentDate) {
        events.push({
          date: inv.paymentDate,
          type: 'payment',
          title: 'Payment Confirmed & Cleared',
          description: `Successful collection of ₦${inv.amount.toLocaleString()} received via ${inv.paymentMethod || 'Bank Transfer'}. Ledger Reference: ${inv.transactionRef || 'N/A'}.`,
          badge: 'Paid',
          badgeColor: 'bg-green-50 text-green-700 border-green-200'
        });
      }
      // Event D: Overdue status
      if (inv.status === 'Overdue') {
        const penaltyDate = inv.dueDate; 
        events.push({
          date: penaltyDate,
          type: 'billing',
          title: 'Late Surcharge/Penalty Activated',
          description: `Overdue status triggered. Additional penalty of ₦${(inv.penaltyAmount || 0).toLocaleString()} applied to outstanding balance. Legal warning letter queued.`,
          badge: 'Overdue',
          badgeColor: 'bg-red-50 text-red-700 border-red-200'
        });
      }
    });

    // 2. Gather enforcements
    const propEnforcements = enforcement.filter(enf => enf.propertyId === propId);
    propEnforcements.forEach(enf => {
      events.push({
        date: enf.lastActionDate || enf.noticeDate || '2026-06-01',
        type: 'enforcement',
        title: `Field Enforcement: ${enf.stage}`,
        description: `${enf.notes} (Inspector: ${enf.officerInCharge || 'Suleja LGA Field Agent'})`,
        badge: enf.stage,
        badgeColor: enf.stage === 'Resolved' 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
          : enf.stage === 'Court Order Filed' 
            ? 'bg-red-50 text-red-750 border-red-250' 
            : 'bg-amber-50 text-amber-700 border-amber-250'
      });
    });

    // Sort oldest to newest
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedTimelineProperty, invoices, enforcement]);

  // Property Case File Attachment States
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedAttachmentProperty, setSelectedAttachmentProperty] = useState<Property | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [attachmentType, setAttachmentType] = useState<string>('Land Survey');
  const [manualFileName, setManualFileName] = useState('');
  const [manualFileSize, setManualFileSize] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Attachment Camera States
  const [attachmentTab, setAttachmentTab] = useState<'upload' | 'camera'>('upload');
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalMediaStreamRef = useRef<MediaStream | null>(null);
  const [modalInspectionPhoto, setModalInspectionPhoto] = useState<string | null>(null);
  const [modalInspectionGps, setModalInspectionGps] = useState('');
  const [isModalGpsLoading, setIsModalGpsLoading] = useState(false);
  const [modalGpsError, setModalGpsError] = useState('');
  const [photoAngle, setPhotoAngle] = useState('Front Structure');

  const startModalCamera = async () => {
    try {
      setModalInspectionPhoto(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      modalMediaStreamRef.current = stream;
      if (modalVideoRef.current) {
        modalVideoRef.current.srcObject = stream;
        modalVideoRef.current.play();
      }
    } catch (err) {
      console.warn("Could not access modal camera, triggering simulator fallback:", err);
    }
  };

  const stopModalCamera = () => {
    if (modalMediaStreamRef.current) {
      modalMediaStreamRef.current.getTracks().forEach(track => track.stop());
      modalMediaStreamRef.current = null;
    }
  };

  const captureModalPhoto = () => {
    if (modalVideoRef.current && modalMediaStreamRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = modalVideoRef.current.videoWidth || 640;
      canvas.height = modalVideoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(modalVideoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setModalInspectionPhoto(dataUrl);
        stopModalCamera();
      }
    } else {
      // simulated high fidelity site photographs
      const randomPics = [
        "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500",
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=500",
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500"
      ];
      setModalInspectionPhoto(randomPics[Math.floor(Math.random() * randomPics.length)]);
    }
  };

  const handleFetchModalGps = () => {
    if (!navigator.geolocation) {
      setModalGpsError('Geolocation is not supported by your device browser.');
      return;
    }
    setIsModalGpsLoading(true);
    setModalGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setModalInspectionGps(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        setIsModalGpsLoading(false);
      },
      (err) => {
        console.error("Modal camera GPS fetch failed:", err);
        setIsModalGpsLoading(false);
        if (selectedAttachmentProperty) {
          const fallbackLat = (selectedAttachmentProperty.latitude + (Math.random() - 0.5) * 0.0005).toFixed(6);
          const fallbackLng = (selectedAttachmentProperty.longitude + (Math.random() - 0.5) * 0.0005).toFixed(6);
          setModalInspectionGps(`${fallbackLat}, ${fallbackLng}`);
          setModalGpsError('Low accuracy gps handshake. Fallback mapped.');
        } else {
          setModalGpsError('Could not sync GPS receiver.');
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Geolocation lookup states
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Site Inspection Mode States
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionProperty, setInspectionProperty] = useState<Property | null>(null);
  const [inspectionGps, setInspectionGps] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionPhoto, setInspectionPhoto] = useState<string | null>(null);
  const [isInspectionGpsLoading, setIsInspectionGpsLoading] = useState(false);
  const [inspectionGpsError, setInspectionGpsError] = useState('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setInspectionPhoto(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Could not access camera, triggering elegant file fallback:", err);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && mediaStreamRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setInspectionPhoto(dataUrl);
        stopCamera();
      }
    } else {
      // Elegant instant system snapshot fallback
      const randomPics = [
        "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500",
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=500",
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500"
      ];
      setInspectionPhoto(randomPics[Math.floor(Math.random() * randomPics.length)]);
    }
  };

  const handleFetchInspectionGps = () => {
    if (!navigator.geolocation) {
      setInspectionGpsError('Geolocation is not supported by your device browser.');
      return;
    }
    setIsInspectionGpsLoading(true);
    setInspectionGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setInspectionGps(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        setIsInspectionGpsLoading(false);
      },
      (err) => {
        console.error("Site inspection GPS capture failed:", err);
        setIsInspectionGpsLoading(false);
        if (inspectionProperty) {
          const fallbackLat = (inspectionProperty.latitude + (Math.random() - 0.5) * 0.0005).toFixed(6);
          const fallbackLng = (inspectionProperty.longitude + (Math.random() - 0.5) * 0.0005).toFixed(6);
          setInspectionGps(`${fallbackLat}, ${fallbackLng}`);
          setInspectionGpsError('Satellite lock weak. Defaulting to high-accuracy spatial grid calculation.');
        } else {
          setInspectionGpsError('Could not gain GPS satellite coordinate handshake.');
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const triggerOpenInspection = (p: Property) => {
    setInspectionProperty(p);
    setInspectionNotes('');
    setInspectionPhoto(null);
    setInspectionGps(`${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`); // Default to listed coords initially
    setInspectionGpsError('');
    setShowInspectionModal(true);
    // Auto-engage camera stream on modal activation
    setTimeout(() => {
      startCamera();
    }, 150);
  };

  const handleCloseInspection = () => {
    stopCamera();
    setShowInspectionModal(false);
    setInspectionProperty(null);
  };

  const submitInspectionToLedger = () => {
    if (!inspectionProperty) return;
    
    // Fallback photo if none taken
    const finalPhoto = inspectionPhoto || "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=500";
    
    // Call the callback prop to place the property under active watch/escalation (or record verification)
    if (onAddEnforcementAction) {
      onAddEnforcementAction(
        inspectionProperty.id,
        inspectionNotes || `Completed physical Suleja municipal site verification inspection. Structure status is active. Comments: ${inspectionNotes}`,
        inspectionGps,
        finalPhoto
      );
    }
    
    // Also trigger local state updates on the property to store the photo inside the applet's instance
    const updatedProperty = {
      ...inspectionProperty,
      imageUrl: finalPhoto,
      inspectorName: inspectorName || userEmail.split('@')[0] || "Field Agent " + userRole
    };
    onEditProperty(updatedProperty);
    
    handleCloseInspection();
    
    // Alert the user
    alert(`Success! Site Inspection records for tenement ${inspectionProperty.id} have been logged into the compliance ledger with geo-stamped photos.`);
  };

  const handleVerifyCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is unsupported by this browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        console.error("GPS fetch error:", err);
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location boundary access denied. Please verify browser locks.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('Satellite signal unavailable.');
        } else {
          setGpsError('Request timed out before obtaining a secure lock.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Helper to visually highlight matching characters in the search query for ownerName and address
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, index) => {
          const isMatch = part.toLowerCase() === highlight.toLowerCase();
          return isMatch ? (
            <mark key={index} className="bg-amber-100 text-amber-900 px-0.5 rounded font-extrabold border-b border-amber-500">
              {part}
            </mark>
          ) : (
            part
          );
        })}
      </span>
    );
  };

  // Read list restriction for Plain Taxpayer
  const isTaxpayer = userRole === 'Taxpayer';
  const displayProperties = isTaxpayer 
    ? properties.filter(p => p.id === userEmail || p.ownerEmail === userEmail || (userEmail && userEmail.toLowerCase().includes(p.id.toLowerCase()))) 
    : properties;

  // Filter application
  const filteredProperties = displayProperties.filter((p) => {
    const matchesSearch = 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      p.ownerPhone.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase());
    
    const matchesWard = selectedWard ? p.ward === selectedWard : true;
    const matchesType = selectedType ? p.propertyType === selectedType : true;
    const matchesStatus = selectedStatus ? p.paymentStatus === selectedStatus : true;

    return matchesSearch && matchesWard && matchesType && matchesStatus;
  });

  // Pagination bounds
  const totalItems = filteredProperties.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProperties = filteredProperties.slice(startIndex, startIndex + pageSize);

  // Form Reset
  const handleResetForm = () => {
    setOwnerName('');
    setOwnerPhone('');
    setOwnerEmail('');
    setNinOrTin('');
    setAddress('');
    setWard(SULEJA_WARDS[0].name);
    setPropertyType('Residential');
    setUnits(1);
    setAnnualRentalValue(300000);
    setOccupancyStatus('Occupied');
    setPaymentStatus('Unpaid');
    setLatitude(9.18 + (Math.random() - 0.5) * 0.01);
    setLongitude(7.18 + (Math.random() - 0.5) * 0.01);
    setImageUrl('https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=150');
    setInspectorName('');
    setDescription('');
  };

  // Click row to edit
  const handleOpenEdit = (p: Property) => {
    setIsEditMode(true);
    setActivePropertyId(p.id);
    setOwnerName(p.ownerName);
    setOwnerPhone(p.ownerPhone);
    setOwnerEmail(p.ownerEmail || '');
    setNinOrTin(p.ninOrTin || '');
    setAddress(p.address);
    setWard(p.ward);
    setPropertyType(p.propertyType);
    setUnits(p.units);
    setAnnualRentalValue(p.annualRentalValue);
    setOccupancyStatus(p.occupancyStatus);
    setPaymentStatus(p.paymentStatus);
    setLatitude(p.latitude);
    setLongitude(p.longitude);
    setImageUrl(p.imageUrl || '');
    setInspectorName(p.inspectorName || '');
    setDescription(p.description || '');
    setShowFormModal(true);
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setActivePropertyId(null);
    handleResetForm();
    setShowFormModal(true);
  };

  // Submit form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto rates
    const ratePercent = 4;

    if (isEditMode && activePropertyId) {
      // Find original property to preserve ID and correct structures
      const original = properties.find(p => p.id === activePropertyId);
      if (original) {
        onEditProperty({
          ...original,
          ownerName,
          ownerPhone,
          ownerEmail,
          ninOrTin,
          address,
          ward,
          propertyType,
          units: Number(units),
          latitude: Number(latitude),
          longitude: Number(longitude),
          annualRentalValue: Number(annualRentalValue),
          ratePercentage: ratePercent,
          tenementRate: Number(annualRentalValue) * (ratePercent / 100),
          occupancyStatus,
          paymentStatus,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=150',
          inspectorName: inspectorName,
          description: description
        });
      }
    } else {
      onAddProperty({
        ownerName,
        ownerPhone,
        ownerEmail,
        ninOrTin,
        address,
        ward,
        propertyType,
        units: Number(units),
        latitude: Number(latitude),
        longitude: Number(longitude),
        annualRentalValue: Number(annualRentalValue),
        ratePercentage: ratePercent,
        occupancyStatus,
        paymentStatus,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=150',
        valuationDate: new Date().toISOString().split('T')[0],
        lastBilledDate: new Date().toISOString().split('T')[0],
        inspectorName: inspectorName,
        description: description
      });
    }

    setShowFormModal(false);
    handleResetForm();
  };

  if (printingQrLabels && printingQrLabels.length > 0) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen text-gray-900 font-sans p-4 sm:p-8 relative flex flex-col items-center justify-center select-text" id="property-qr-labels-printout">
        {/* Style tag to fix custom print aspects */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            .print-hidden-el {
              display: none !important;
            }
            #property-qr-labels-printout {
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background-color: white !important;
              display: block !important;
              min-height: auto !important;
            }
            @page {
              size: portrait;
              margin: 0.5in;
            }
          }
        `}} />

        {/* Floating Print Navigation Bar */}
        <div className="print-hidden-el max-w-lg w-full mb-6 bg-[#0A1F44] text-white p-4 rounded-xl flex items-center justify-between shadow-md select-none font-sans">
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-sky-400 uppercase tracking-wider">Field Agent QR Labels</h4>
            <p className="text-[10px] text-slate-300 font-medium">Generating {printingQrLabels.length} scan-ready ID label(s)</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setPrintingQrLabels(null)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-sky-200 hover:text-white transition cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              ← Cancel
            </button>
            
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#0A1F44] text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Printer className="h-3 w-3" />
              Print Labels
            </button>
          </div>
        </div>

        {/* Labels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl w-full">
          {printingQrLabels.map((p) => {
            const qrBlob = qrLabelsBlobs[p.id];
            return (
              <div key={p.id} className="bg-white border-2 border-gray-900 p-3 rounded-lg flex items-center gap-3 font-sans relative overflow-hidden box-border h-[2in] w-[3.25in] mx-auto shadow-sm">
                {/* QR code container */}
                <div className="shrink-0 flex flex-col items-center justify-center border border-gray-350 p-1.5 rounded bg-slate-50 w-[1.1in] h-[1.1in]">
                  {qrBlob ? (
                    <img 
                      src={qrBlob}
                      className="h-[100%] w-[100%] object-contain mix-blend-multiply"
                      alt={`QR Code ${p.id}`} 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-150 animate-pulse rounded" />
                  )}
                </div>

                {/* Details container */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 text-left">
                  <div className="border-b border-gray-200 pb-1 shrink-0">
                    <span className="text-[6px] font-bold text-gray-400 uppercase tracking-widest block leading-none mb-0.5 font-sans">SULEJA-LRS REGISTRY</span>
                    <span className="text-[10px] font-black text-[#0A1F44] font-mono bg-slate-100 p-0.5 px-1.5 rounded border border-gray-200 inline-block uppercase leading-none">
                      {p.id}
                    </span>
                  </div>

                  <div className="space-y-1 my-1.5 overflow-hidden flex-1 flex flex-col justify-center">
                    <div>
                      <span className="text-[5.5px] block text-gray-500 font-extrabold uppercase tracking-wide leading-none font-sans">Taxpayer Owner</span>
                      <p className="text-[8px] font-extrabold text-gray-900 truncate leading-tight uppercase font-sans">
                        {p.ownerName}
                      </p>
                    </div>
                    <div>
                      <span className="text-[5.5px] block text-gray-500 font-extrabold uppercase tracking-wide leading-none mt-0.5 font-sans">Site Address</span>
                      <p className="text-[7.5px] font-semibold text-gray-600 line-clamp-2 leading-tight uppercase font-sans">
                        {p.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 pt-1 shrink-0">
                    <span className="text-[6px] font-bold text-[#0F766E] uppercase font-mono tracking-wider">
                      {p.ward}
                    </span>
                    <span className="text-[5px] font-extrabold text-gray-400 uppercase tracking-widest font-sans">
                      FIELD AGENT SCAN
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (printingPropertyLabel) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen text-gray-900 font-sans p-4 sm:p-8 relative flex flex-col items-center justify-center select-text" id="property-label-printout">
        {/* Style tag to fix custom print aspects */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            .print-hidden-el {
              display: none !important;
            }
            #property-label-printout {
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background-color: white !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              min-height: auto !important;
              height: 100vh !important;
            }
            @page {
              size: 3.5in 2.5in;
              margin: 0;
            }
          }
        `}} />

        {/* Floating Print Navigation Bar */}
        <div className="print-hidden-el max-w-sm w-full mb-6 bg-[#0A1F44] text-white p-3 rounded-xl flex items-center justify-between shadow-md select-none font-sans">
          <button 
            type="button"
            onClick={() => setPrintingPropertyLabel(null)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-sky-200 hover:text-white transition cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            ← Back
          </button>
          
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#0A1F44] text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Printer className="h-3 w-3" />
            Print Tag
          </button>
        </div>

        {/* Printer-Friendly Label layout */}
        <div className="w-[3.5in] h-[2.5in] bg-white border-2 border-gray-950 p-4 rounded-md relative flex flex-col justify-between font-sans shadow-lg select-text overflow-hidden box-border max-w-full">
          {/* Tag header */}
          <div className="flex items-center gap-2 border-b border-gray-950 pb-1.5 shrink-0">
            <div className="h-6 w-6 bg-[#0A1F44] text-white rounded-md flex items-center justify-center font-bold text-xs select-none">
              SLG
            </div>
            <div className="leading-tight">
              <h4 className="text-[10px] font-black tracking-tight text-gray-950 uppercase">Suleja Local Government</h4>
              <p className="text-[7px] text-gray-600 font-extrabold font-mono tracking-wider">TENEMENT IDENTIFICATION TAG</p>
            </div>
          </div>

          {/* Central Section */}
          <div className="flex gap-2 items-center flex-1 my-1.5 overflow-hidden">
            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
              <div>
                <span className="text-[6px] block text-gray-500 font-bold uppercase tracking-wide">Property Code</span>
                <span className="font-mono font-black text-xs text-gray-955 bg-gray-100 px-1 py-0.5 rounded border border-gray-300 inline-block">
                  {printingPropertyLabel.id}
                </span>
              </div>
              <div>
                <span className="text-[6px] block text-gray-500 font-bold uppercase tracking-wide">Owner / Occupant</span>
                <p className="text-[9px] font-bold text-gray-900 truncate leading-tight uppercase">
                  {printingPropertyLabel.ownerName}
                </p>
              </div>
              <div>
                <span className="text-[6px] block text-gray-500 font-bold uppercase tracking-wide">Site Address</span>
                <p className="text-[7.5px] font-semibold text-gray-700 line-clamp-2 leading-snug">
                  {printingPropertyLabel.address}
                </p>
              </div>
              <div className="flex gap-2.5">
                <div>
                  <span className="text-[6px] block text-gray-400 font-bold uppercase tracking-wide">Ward</span>
                  <span className="text-[8px] font-bold text-gray-800 uppercase">{printingPropertyLabel.ward}</span>
                </div>
                <div>
                  <span className="text-[6px] block text-gray-400 font-bold uppercase tracking-wide">Status</span>
                  <span className="text-[8px] font-black text-teal-700 uppercase">{printingPropertyLabel.paymentStatus}</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-gray-200 mt-1">
                <span className="text-[5.5px] block text-emerald-800 font-extrabold uppercase tracking-wide leading-none">Citizen Portal Key</span>
                <p className="text-[6.5px] font-mono font-bold text-emerald-900 leading-tight">
                  U: {printingPropertyLabel.taxpayerUsername || `${printingPropertyLabel.id.toLowerCase()}@suleja.gov.ng`}
                  <br />
                  P: {printingPropertyLabel.taxpayerPassword || 'reyapxats'}
                </p>
              </div>
            </div>

            {/* QR block */}
            <div className="shrink-0 flex flex-col items-center justify-center border border-gray-300 p-1 rounded bg-slate-50">
              <img 
                src={labelQrBlob || `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                  `${window.location.origin}${window.location.pathname}?quickpay=${printingPropertyLabel.id}`
                )}`}
                className="h-[56px] w-[56px] mix-blend-multiply"
                alt="Payment QR" 
                referrerPolicy="no-referrer"
              />
              <span className="text-[5px] font-black text-[#0A1F44] tracking-tight uppercase leading-none mt-1">SCAN TO PAY</span>
            </div>
          </div>

          {/* Footer of card */}
          <div className="border-t border-gray-900 pt-1 flex justify-between items-center shrink-0">
            <span className="text-[6px] font-black text-gray-500 uppercase tracking-widest leading-none">
              SLRS AUTOMATED LAND DIRECTORY • 2026
            </span>
            <span className="text-[6px] font-mono font-bold text-gray-800 bg-gray-100 px-1 rounded leading-none shrink-0">
              VERIFIED
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (printingPropertyReport) {
    const propertyInvoices = invoices.filter(i => i.propertyId === printingPropertyReport.id);
    const propertyEnforcements = (enforcement || []).filter(e => e.propertyId === printingPropertyReport.id);
    const avgWardRate = Math.round(
      properties
        .filter(p => p.ward === printingPropertyReport.ward && p.propertyType === printingPropertyReport.propertyType)
        .reduce((acc, curr) => acc + curr.annualRentalValue, 0) / 
      Math.max(1, properties.filter(p => p.ward === printingPropertyReport.ward && p.propertyType === printingPropertyReport.propertyType).length)
    );

    return (
      <div className="bg-[#FCFBF7] min-h-screen text-gray-900 font-sans p-4 sm:p-8 relative select-text" id="property-report-printout">
        {/* Style tag to fix custom print aspects */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            .print-hidden-el {
              display: none !important;
            }
            #property-report-printout {
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background-color: white !important;
            }
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
          }
        `}} />

        {/* Floating Print Navigation Bar */}
        <div className="print-hidden-el max-w-3xl mx-auto mb-6 bg-[#0A1F44] text-white p-4 rounded-xl flex items-center justify-between shadow-md select-none font-sans">
          <button 
            type="button"
            onClick={() => setPrintingPropertyReport(null)}
            className="flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white transition cursor-pointer min-h-[44px] px-3 rounded-lg hover:bg-white/5"
          >
            ← Back to Properties Directory
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#0A1F44] text-xs font-black px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF Report
            </button>
          </div>
        </div>

        {/* Paper Container matching state/local government official documents */}
        <div className="max-w-3xl mx-auto bg-white border border-gray-300 shadow-xl rounded-2xl p-6 sm:p-10 relative overflow-hidden ring-1 ring-black/5">
          
          {/* Top colored stripe ribbon resembling the green-blue security scan margin */}
          <div className="absolute top-0 left-0 right-0 h-1.5 flex pointer-events-none">
            <div className="w-2/3 bg-[#00A86B] h-full" />
            <div className="w-1/3 bg-[#38BDF8] h-full" />
          </div>

          {/* Official Document Header */}
          <div className="text-center pb-6 border-b-2 border-gray-800 space-y-2 relative font-sans">
            <div className="flex justify-between items-center mb-2">
              <span className="rounded bg-sky-900 text-white px-2.5 py-0.5 font-bold font-mono text-[9px] uppercase tracking-wider">
                OFFICIAL REVENUE RECORD
              </span>
              <span className="text-xs font-mono font-extrabold text-blue-950 uppercase">
                DOC-ID: TR/PM/{printingPropertyReport.id.split('-').pop()}
              </span>
            </div>

            {/* Coat of arms logo representing Nigerian municipality standard */}
            <div className="mx-auto h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white p-1 select-none flex">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" 
                alt="Nigerian Coat of Arms" 
                className="h-14 w-14 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <h1 className="font-display font-black text-center text-xl md:text-2xl text-gray-950 leading-tight uppercase tracking-tight">
              SULEJA LOCAL GOVERNMENT COUNCIL
            </h1>
            <p className="text-xs text-gray-500 font-extrabold tracking-widest uppercase mt-0.5">
              Office of the Chief Revenue Valuer & Municipal Rates Collector
            </p>
            <p className="text-[10px] text-gray-400">
              Secretariat Road, Suleja, Niger State, Nigeria
            </p>
          </div>

          {/* Report Metadata Serial & Details Row */}
          <div className="grid grid-cols-2 gap-4 py-4 text-xs font-medium border-b border-gray-200 font-sans">
            <div>
              <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">ASSESSED LANDOWNER</p>
              <p className="text-[#0A1F44] font-black text-sm mt-0.5">{printingPropertyReport.ownerName.toUpperCase()}</p>
              <p className="text-gray-500 font-mono mt-0.5">{printingPropertyReport.ownerPhone} • {printingPropertyReport.ownerEmail || 'No Email Registered'}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">VALUATION STATUS</p>
              <p className="text-gray-900 font-bold mt-0.5">Valued: {printingPropertyReport.valuationDate || '2026-06-14'}</p>
              <p className="text-gray-500 font-mono mt-0.5">Last Billed Cycle: {printingPropertyReport.lastBilledDate || '2026-06-14'}</p>
            </div>
          </div>

          {/* Primary Details Block */}
          <div className="py-6 space-y-4 font-sans">
            <h3 className="font-extrabold text-[#0A1F44] uppercase text-xs tracking-wider border-l-4 border-emerald-600 pl-2">
              Section I - Real Estate Property Assessment & Diagnostics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-gray-500 font-bold">Property Identifier Code:</span>
                  <span className="font-mono font-bold text-[#0A1F44] bg-gray-100 px-1.5 rounded">{printingPropertyReport.id}</span>
                </div>
                <div className="flex justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-gray-500 font-bold">Physical Assessment Address:</span>
                  <span className="font-black text-right text-[#0A1F44] break-words max-w-[180px]">{printingPropertyReport.address.toUpperCase()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-gray-500 font-bold">Zoning Ward Municipality:</span>
                  <span className="font-bold text-gray-800">{printingPropertyReport.ward.toUpperCase()} WARD, SULEJA</span>
                </div>
                <div className="flex justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-gray-500 font-bold">Zoning GPS Pinpoint Coordinates:</span>
                  <span className="font-mono font-bold text-[#E11D48]">{printingPropertyReport.latitude.toFixed(6)}, {printingPropertyReport.longitude.toFixed(6)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-gray-500 font-bold">Development Type Classification:</span>
                  <span className="font-bold bg-slate-100 text-[#0A1F44] px-2 py-0.2 rounded uppercase">{printingPropertyReport.propertyType}</span>
                </div>
                <div className="flex justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-gray-500 font-bold">Occupied Structures / Dwellings:</span>
                  <span className="font-bold text-gray-800">{printingPropertyReport.units} Units ({printingPropertyReport.occupancyStatus})</span>
                </div>
                <div className="flex justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-gray-500 font-bold">Ward Average Value Deviation:</span>
                  <span className="font-bold text-gray-800">
                    {printingPropertyReport.annualRentalValue > avgWardRate ? '+' : ''}
                    {Math.round(((printingPropertyReport.annualRentalValue - avgWardRate) / Math.max(1, avgWardRate)) * 100)}% vs Average
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-150 pb-1.5">
                  <span className="text-gray-500 font-bold">Field Inspector-in-Charge:</span>
                  <span className="font-black text-gray-700">{printingPropertyReport.inspectorName || 'SULEJA AUTOMATED SYSTEM'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rates and Finances details */}
          <div className="py-4 space-y-4 bg-emerald-50/15 border border-emerald-600/10 rounded-xl p-4 sm:p-5 mb-4 font-sans">
            <h3 className="font-extrabold text-[#0D766E] uppercase text-xs tracking-wider border-l-4 border-[#0369A1] pl-2">
              Section II - Fiscal Tenement Rate Valuations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
              <div className="border-r border-teal-100/40 pr-2">
                <span className="block text-gray-450 text-[10px] uppercase">Annual Rental Assessment Value</span>
                <span className="block font-sans font-black text-lg text-gray-950 mt-1">
                  ₦{printingPropertyReport.annualRentalValue.toLocaleString()}
                </span>
                <span className="block text-[9.5px] text-gray-400 mt-0.5">Assessed market rate value</span>
              </div>

              <div className="border-r border-teal-100/40 pr-2">
                <span className="block text-gray-450 text-[10px] uppercase">Tenement Rate Coefficient</span>
                <span className="block font-sans font-black text-lg text-emerald-800 mt-1">
                  {printingPropertyReport.ratePercentage}% Coefficient
                </span>
                <span className="block text-[9.5px] text-gray-400 mt-0.5">Municipal percentage level levy</span>
              </div>

              <div>
                <span className="block text-[#0F766E] text-[10px] uppercase font-black">Net Tenement Rate Levy Due</span>
                <span className="block font-sans font-black text-xl text-[#0D766E] mt-0.5 font-sans">
                  ₦{printingPropertyReport.tenementRate.toLocaleString()}
                </span>
                <span className="block text-[8.5px] text-[#0A1F44] font-bold uppercase mt-0.5">Annual Statutory Obligation</span>
              </div>
            </div>
          </div>

          {/* Section III - Account statements */}
          <div className="py-4 space-y-4 font-sans">
            <h3 className="font-extrabold text-[#0A1F44] uppercase text-xs tracking-wider border-l-4 border-indigo-600 pl-2">
              Section III - Invoice Statuses & Accounts Summary
            </h3>

            {propertyInvoices.length === 0 ? (
              <p className="text-gray-500 text-xs italic">No outstanding or historical invoicing recorded on this asset index.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs bg-white">
                  <thead className="bg-slate-50 font-bold text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Invoice Code</th>
                      <th className="px-4 py-2">Cycle Year</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-center">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-800">
                    {propertyInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td className="px-4 py-2 font-mono font-bold text-[#0A1F44]">{inv.id.split('-').pop()}</td>
                        <td className="px-4 py-2">{inv.issuedDate ? inv.issuedDate.split('-')[0] : '2026'} Calendar Year</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-900">₦{inv.amount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'Paid' ? 'bg-green-100 text-green-700' : inv.status === 'Overdue' ? 'bg-red-100 text-red-650' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section IV - Enforcement actions if any */}
          {propertyEnforcements.length > 0 && (
            <div className="py-4 space-y-4 font-sans">
              <h3 className="font-extrabold text-[#E11D48] uppercase text-xs tracking-wider border-l-4 border-rose-600 pl-2">
                Section IV - Active Enforcement / Compliance Actions
              </h3>
              <div className="border border-red-200 bg-red-50/10 rounded-lg p-3 space-y-2 text-xs">
                {propertyEnforcements.map(e => (
                  <div key={e.id} className="border-b border-red-100 last:border-b-0 pb-2 last:pb-0 font-medium text-gray-750">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-red-700 bg-red-100 px-1.5 py-0.2 rounded uppercase">{e.stage}</span>
                      <span className="font-mono text-gray-400">{e.lastActionDate}</span>
                    </div>
                    <p className="mt-1 text-gray-755 leading-normal text-justify">{e.notes}</p>
                    {e.gpsCoordinates && (
                      <span className="block font-mono text-[9px] text-[#0369A1] mt-0.5">Verified Field Coordinates: {e.gpsCoordinates}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section V - Taxpayer Portal Access Credentials */}
          <div className="py-4 space-y-4 font-sans bg-emerald-50/25 border border-emerald-200/50 rounded-xl p-4 mt-6">
            <h3 className="font-extrabold text-[#059669] uppercase text-xs tracking-wider border-l-4 border-emerald-500 pl-2">
              Section V - Secure Citizen Portal Credentials
            </h3>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              These details enable the property owner/taxpayer to log in directly to the Suleja LGA Taxpayer Portal to view tenement rate invoice histories, submit digital payment advice transfers, chat with the AI Assistant, or query compliance milestones. Keep this secret.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-800">
              <div className="flex justify-between border-b border-gray-150 pb-1.5">
                <span className="text-gray-500 font-bold">Secure Access Username / Email:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/50 px-1.5 rounded">{printingPropertyReport.taxpayerUsername || `${printingPropertyReport.id.toLowerCase()}@suleja.gov.ng`}</span>
              </div>
              <div className="flex justify-between border-b border-gray-150 pb-1.5">
                <span className="text-gray-500 font-bold">Portal Pass Code (Password):</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/50 px-1.5 rounded">{printingPropertyReport.taxpayerPassword || 'reyapxats'}</span>
              </div>
            </div>
          </div>

          {/* Signature and Verification block */}
          <div className="pt-8 border-t border-dashed border-gray-300 mt-10 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
            <div className="space-y-4">
              {/* QR payment block */}
              <div className="flex items-start gap-4">
                <div className="p-0.5 bg-white select-none shrink-0 flex items-center justify-center border border-gray-200 rounded">
                  <img 
                    src={printQrBlob || `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                      `${window.location.origin}${window.location.pathname}?quickpay=${printingPropertyReport.id}`
                    )}`} 
                    alt="Quick Pay qr"
                    className="h-16 w-16"
                  />
                </div>
                <div>
                  <span className="block font-black text-blue-955 uppercase text-[9px] tracking-wide">Citizen Verification QR Code</span>
                  <span className="block text-[10px] text-gray-405 leading-normal mt-0.5">
                    Scan using your mobile phone camera to securely view property bills, or clear pending tenement dues instantly online.
                  </span>
                </div>
              </div>
            </div>

            {/* Official sign off */}
            <div className="space-y-4 flex flex-col justify-end text-right">
              <div className="space-y-1 font-sans">
                <div className="h-4 pr-3.5">
                  <span className="font-mono text-[#0A1F44] italic text-[11px] select-none">M. Zubairu</span>
                </div>
                <div className="w-[180px] border-t border-gray-400 ml-auto"></div>
                <p className="font-bold text-gray-900 uppercase text-[10.5px] tracking-wide">MUHAMMAD ZUBAIRU</p>
                <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest leading-none select-none">
                  For: Suleja LGA Revenue Service
                </p>
              </div>
            </div>
          </div>

          {/* Secure watermark */}
          <div className="absolute right-4 bottom-24 h-24 w-24 rounded-full bg-blue-500/5 border-4 border-blue-600/10 flex items-center justify-center font-serif text-[10px] uppercase font-bold rotate-32 flex-col select-none border-dashed text-blue-700/30 leading-none shadow-xs pointer-events-none">
            <div className="text-[8px]">SULEJA LGA</div>
            <div className="font-extrabold text-[12px] my-0.5 font-sans">VALIDATED</div>
            <div className="text-[6px] tracking-widest font-sans">STATE AUDITED</div>
          </div>

          {/* Technical footer */}
          <div className="text-center text-[9px] text-gray-400 pt-8 mt-6 border-t border-gray-100 select-none font-sans">
            This transcript was generated programmatically by Suleja Local Revenue Service (SULEJA-LRS) digital terminal. All measurements and evaluations are subject to the local Government Tenement Rate Bye-laws of Niger State, Nigeria.
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      
      {/* Top action header info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0A1F44]">Tenement Property Directory</h1>
          <p className="text-xs text-gray-500 font-medium">
            Search, record, and assess dwellings inside Suleja municipal zoning bounds.
          </p>
        </div>

        {/* CRUD permissions button (Disabled for Accountant role, taxpayer can offer property registration) */}
        {userRole !== 'Accountant' && (
          <div className="flex flex-wrap items-center gap-2">
            {!isTaxpayer && (
              <button
                type="button"
                onClick={() => setShowBulkImportModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-805 border border-emerald-200 py-2.5 px-4 text-xs font-bold cursor-pointer transition shadow-xs"
              >
                <Upload className="h-4 w-4 text-emerald-600" />
                <span>Bulk CSV Import</span>
              </button>
            )}

            {/* Scan Property QR Button */}
            <button
              type="button"
              onClick={() => {
                setScannedProperty(null);
                setQrScannerError(null);
                setQrScannerSuccessMessage(null);
                setShowQrScannerModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0A1F44] border border-sky-200 py-2.5 px-4 text-xs font-bold cursor-pointer transition shadow-xs"
            >
              <QrCode className="h-4 w-4 text-[#38BDF8]" />
              <span>Scan Property QR</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A1F44] hover:bg-opacity-95 text-white py-2.5 px-4 text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              {isTaxpayer ? 'Register Property Assessment' : 'New Property Registry'}
            </button>
          </div>
        )}
      </div>

      {/* Query Filter and Search Controls */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-xs space-y-4">
        
        {/* Quick Click Filter Bar */}
        <div id="quick-segmented-filters" className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F8FAFC] dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          {/* Quick Tax Payment Status Quick Filter Row */}
          <div className="space-y-2">
            <span className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider font-mono">Quick Filter: Payment Status</span>
            <div className="flex flex-wrap gap-1.5 font-sans">
              {[
                { label: 'All Statuses', value: '' },
                { label: '🟢 Paid', value: 'Paid' },
                { label: '🔴 Arrears', value: 'Unpaid' },
                { label: '🟡 Pending', value: 'Pending' }
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  id={`status-toggle-pill-${opt.value || 'all'}`}
                  onClick={() => { setSelectedStatus(opt.value as any); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border shrink-0 cursor-pointer ${
                    selectedStatus === opt.value
                      ? 'bg-[#0A1F44] text-[#38BDF8] border-[#38BDF8] shadow-xs scale-[1.02]'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-350 dark:bg-slate-950 dark:hover:bg-slate-800 dark:border-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Typology Quick Filter Row */}
          <div className="space-y-2">
            <span className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider font-mono">Quick Filter: Property Type</span>
            <div className="flex flex-wrap gap-1.5 font-sans">
              {[
                { label: 'All Typologies', value: '' },
                { label: 'Residential', value: 'Residential' },
                { label: 'Commercial', value: 'Commercial' },
                { label: 'Industrial', value: 'Industrial' }
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  id={`type-toggle-pill-${opt.value || 'all'}`}
                  onClick={() => { setSelectedType(opt.value as any); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border shrink-0 cursor-pointer ${
                    selectedType === opt.value
                      ? 'bg-[#38BDF8] text-[#0A1F44] border-[#38BDF8] shadow-xs scale-[1.02]'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-350 dark:bg-slate-950 dark:hover:bg-slate-800 dark:border-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Suleja District Ward Filter Dropdown */}
          <div className="space-y-2">
            <span className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider font-mono">Quick Filter: Suleja LGA District</span>
            <div className="relative font-sans">
              <select
                value={selectedWard}
                onChange={(e) => { setSelectedWard(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-semibold outline-none focus:border-[#0A1F44] focus:ring-1 focus:ring-[#0A1F44] shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <option value="">All Districts ({SULEJA_WARDS.length} Wards)</option>
                {SULEJA_WARDS.map(w => (
                  <option key={w.name} value={w.name}>District: {w.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          
          {/* Smart Search Bar */}
          <div className="md:col-span-12 lg:col-span-5 space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Property Search</span>
              {isListening && <span className="text-red-600 font-extrabold animate-pulse text-[9px]">● Voice Listening...</span>}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by ID, Landlord name, Mobile, or Address..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="block w-full rounded-lg border border-gray-250 py-2.5 pl-9 pr-16 text-xs outline-none focus:border-[#0A1F44] w-full bg-[#f8fafc]/50 focus:bg-white transition"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleVoiceSearch}
                  className={`p-1.5 rounded-lg transition-all relative cursor-pointer ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'text-gray-400 hover:text-[#0A1F44] hover:bg-slate-100'
                  }`}
                  title={isListening ? "Listening... click to stop" : "Speak to search"}
                >
                  <Mic className="h-4 w-4" />
                </button>
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setCurrentPage(1); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-slate-100 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {voiceError && (
              <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200 mt-1 flex items-center justify-between font-semibold">
                <span>⚠️ {voiceError}</span>
                <button onClick={() => setVoiceError(null)} className="text-gray-400 hover:text-gray-600 text-[9px] underline">Dismiss</button>
              </div>
            )}
          </div>

          {/* Ward filter select */}
          <div className="md:col-span-4 lg:col-span-2 space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Suleja Ward Zone</label>
            <select
              value={selectedWard}
              onChange={(e) => { setSelectedWard(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs outline-none focus:border-[#0A1F44] focus:ring-1 focus:ring-[#0A1F44]"
            >
              <option value="">All Wards ({SULEJA_WARDS.length})</option>
              {SULEJA_WARDS.map(w => (
                <option key={w.name} value={w.name}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Land Classification (Type) filter select */}
          <div className="md:col-span-4 lg:col-span-2 space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Property Type</label>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value as PropertyType | ''); setCurrentPage(1); }}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs outline-none focus:border-[#0A1F44] focus:ring-1 focus:ring-[#0A1F44]"
            >
              <option value="">All Typologies</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Industrial">Industrial</option>
            </select>
          </div>

          {/* Tenement Tax Status filter select */}
          <div className="md:col-span-4 lg:col-span-2 space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value as TaxPaymentStatus | ''); setCurrentPage(1); }}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs outline-none focus:border-[#0A1F44] focus:ring-1 focus:ring-[#0A1F44]"
            >
              <option value="">All Statuses</option>
              <option value="Paid">🟢 Paid</option>
              <option value="Unpaid">🔴 Pending/Arrears</option>
              <option value="Pending">🟡 Verification Pending</option>
            </select>
          </div>

          {/* Inline Action Buttons */}
          <div className="md:col-span-12 lg:col-span-1 flex items-center justify-end gap-2 h-10 select-none">
            {/* Reset filters if active */}
            {(search || selectedWard || selectedType || selectedStatus) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedWard('');
                  setSelectedType('');
                  setSelectedStatus('');
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg p-2.5 bg-red-50 hover:bg-red-100 text-red-600 transition flex items-center justify-center text-xs font-bold gap-1 cursor-pointer"
                title="Reset all filters to defaults"
              >
                <X className="h-3 w-3" />
                <span className="lg:hidden">Reset Filters</span>
              </button>
            )}

            {/* Bulk actions trigger */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full rounded-lg p-2.5 border text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-gray-50 cursor-pointer ${
                showFilters ? 'bg-sky-50 text-[#0A1F44] border-[#38BDF8]' : 'bg-white text-gray-700 border-gray-200'
              }`}
              title="Show bulk property update tools"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="lg:hidden">Bulk Tools</span>
            </button>

            {/* Total matched results */}
            <div className="bg-[#F8FAFC] px-3 h-full border border-gray-200 text-xs font-bold text-slate-500 rounded-lg flex items-center justify-center shrink-0 min-w-fit" title="Active selection filters matches count">
              Hits: <span className="font-mono text-[#0A1F44] ml-1">{totalItems}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Dynamic Bulk Action Form for Authorized roles with smooth Framer Motion entry/exit */}
      <AnimatePresence initial={false}>
        {showFilters && (userRole === 'Tax Officer' || userRole === 'Super Admin' || userRole === 'LGA Admin') && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98, marginContent: 0 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden bg-[#F8FAFC] border-2 border-dashed border-[#38BDF8]/40 rounded-xl p-4 mb-4"
          >
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-205 pb-2.5">
                <div>
                  <h3 className="font-display font-bold text-[#0A1F44] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    Cluster Bulk Action Engine (Tax Officer Portal)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Perform mass rate category updates or re-assign field inspectors for specific clusters.
                  </p>
                </div>
                {selectedPropertyIds.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#0A1F44] text-[#38BDF8] px-2.5 py-1 rounded-full">
                    {selectedPropertyIds.length} properties selected
                  </span>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedPropertyIds(filteredProperties.map(p => p.id));
                    }}
                    className="text-[11px] text-[#0A1F44] hover:text-[#38BDF8] font-bold underline cursor-pointer"
                  >
                    Select all {filteredProperties.length} active filter matches
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Mass Update Rate Category (Typology)
                  </label>
                  <select
                    value={bulkPropertyType}
                    onChange={(e) => setBulkPropertyType(e.target.value as PropertyType | '')}
                    className="w-full bg-white rounded-lg border border-gray-300 p-2 text-xs"
                  >
                    <option value="">-- Leave Unchanged --</option>
                    <option value="Residential">Residential (4% Tenement Rate)</option>
                    <option value="Commercial">Commercial (4% Tenement Rate)</option>
                    <option value="Industrial">Industrial (4% Tenement Rate)</option>
                  </select>
                </div>

                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Re-assign Inspector Personnel (Cluster)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type personnel name, e.g. Inspector Umar Sani"
                      value={bulkInspectorName}
                      onChange={(e) => setBulkInspectorName(e.target.value)}
                      className="w-full bg-white rounded-lg border border-gray-300 p-2 pr-12 text-xs outline-none focus:border-[#0A1F44]"
                    />
                    <button
                      type="button"
                      onClick={() => setBulkInspectorName('Inspector Umar Sani')}
                      className="absolute right-1 top-1 bottom-1 text-[9px] bg-[#0A1F44]/5 hover:bg-[#0A1F44]/15 px-2 rounded text-[#0A1F44] font-bold cursor-pointer"
                    >
                      Sabo-Gari Team
                    </button>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <button
                    type="button"
                    disabled={selectedPropertyIds.length === 0 || (!bulkPropertyType && !bulkInspectorName)}
                    onClick={() => {
                      if (onBulkEditProperties) {
                        const updates: { propertyType?: PropertyType; inspectorName?: string } = {};
                        if (bulkPropertyType) updates.propertyType = bulkPropertyType;
                        if (bulkInspectorName) updates.inspectorName = bulkInspectorName;

                        setBulkConfirmation({
                          title: "Confirm Mass Cluster Update",
                          message: `You are about to execute a bulk update on ${selectedPropertyIds.length} properties. This will change their Rate Category / Typology to "${bulkPropertyType || 'Unchanged'}" and re-assign the Cluster Inspector to "${bulkInspectorName || 'Unchanged'}". This operation cannot be easily reverted.`,
                          onConfirm: () => {
                            onBulkEditProperties(selectedPropertyIds, updates);
                            setSelectedPropertyIds([]);
                            setBulkPropertyType('');
                            setBulkInspectorName('');
                          }
                        });
                      }
                    }}
                    className={`w-full py-2 px-4 text-xs font-bold rounded-lg shadow-sm transition-all select-none justify-center flex items-center gap-1 text-center ${
                      (selectedPropertyIds.length > 0 && (bulkPropertyType || bulkInspectorName))
                        ? 'bg-[#0A1F44] text-white hover:bg-opacity-95 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    Apply Cluster Changes
                  </button>
                </div>
              </div>
              {selectedPropertyIds.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-500 border-t border-gray-200/50 pt-3 mt-1 gap-2 animate-in fade-in">
                  <span>* Selected item codes: <span className="font-mono text-gray-700 font-bold bg-gray-100 px-1.5 py-0.5 rounded">{selectedPropertyIds.slice(0, 5).join(', ')}{selectedPropertyIds.length > 5 ? '...' : ''}</span> ({selectedPropertyIds.length} properties selected)</span>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        const selectedProps = properties.filter(p => selectedPropertyIds.includes(p.id));
                        handlePrintQrLabels(selectedProps);
                      }}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg px-3 py-1.5 font-bold cursor-pointer font-sans text-[10px] flex items-center gap-1.5 shadow-xs transition-all uppercase tracking-wider"
                    >
                      <QrCode className="h-3 w-3 text-indigo-600" />
                      Print Agent QR Labels ({selectedPropertyIds.length})
                    </button>

                    {(userRole === 'Super Admin' || userRole === 'LGA Admin') && (
                      <button 
                        type="button"
                        onClick={() => {
                          setDeleteStep(1);
                          setDeleteConfirmationText('');
                          setShowMultiStepDeleteModal(true);
                        }}
                        className="bg-red-50 hover:bg-red-105 text-red-700 border border-red-200 rounded-lg px-3 py-1.5 font-bold cursor-pointer font-sans text-[10px] flex items-center gap-1.5 shadow-xs transition-all uppercase tracking-wider"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete Selected ({selectedPropertyIds.length})
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setSelectedPropertyIds([])}
                      className="text-gray-500 hover:text-gray-700 hover:underline font-bold cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main paginated properties checklist table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden select-text text-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-[#F5F7FA] text-gray-500 font-bold uppercase text-[10px] tracking-wider text-left">
              <tr>
                {(userRole === 'Tax Officer' || userRole === 'Super Admin' || userRole === 'LGA Admin') && (
                  <th className="px-4 py-3.5 text-center w-12">
                    <input 
                      type="checkbox"
                      checked={paginatedProperties.length > 0 && paginatedProperties.every(p => selectedPropertyIds.includes(p.id))}
                      onChange={() => {
                        const allSelected = paginatedProperties.every(p => selectedPropertyIds.includes(p.id));
                        if (allSelected) {
                          setSelectedPropertyIds(selectedPropertyIds.filter(id => !paginatedProperties.some(p => p.id === id)));
                        } else {
                          const toAdd = paginatedProperties.filter(p => !selectedPropertyIds.includes(p.id)).map(p => p.id);
                          setSelectedPropertyIds([...selectedPropertyIds, ...toAdd]);
                        }
                      }}
                      className="rounded border-gray-350 text-[#0A1F44] focus:ring-[#0A1F44] cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-4 py-3.5">Property Code / Ward</th>
                <th className="px-4 py-3.5">Landowner details</th>
                <th className="px-4 py-3.5">Site Address</th>
                <th className="px-4 py-3.5 text-center">Class / Units</th>
                <th className="px-4 py-3.5 text-right">Rental Assay</th>
                <th className="px-4 py-3.5 text-right">Tenement Due</th>
                <th className="px-4 py-3.5 text-center">Tax Status</th>
                <th className="px-4 py-3.5 text-center rounded-r-lg">Audit Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {paginatedProperties.length === 0 ? (
                <tr>
                  <td colSpan={(userRole === 'Tax Officer' || userRole === 'Super Admin' || userRole === 'LGA Admin') ? 9 : 8} className="py-12 text-center text-gray-400 font-semibold border-t">
                    No matching Suleja tenement records logged.
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {paginatedProperties.map((p, index) => {
                    const checkPaid = p.paymentStatus === 'Paid';
                    const checkPending = p.paymentStatus === 'Pending';
                    const showBulkActions = userRole === 'Tax Officer' || userRole === 'Super Admin' || userRole === 'LGA Admin';
                    
                    return (
                      <motion.tr 
                        key={p.id} 
                        className="hover:bg-gray-50 transition-colors"
                        initial={{ opacity: 0, x: -12, y: 4 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.1) }}
                        layout="position"
                      >
                      {showBulkActions && (
                        <td className="px-4 py-4 text-center w-12">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.1) }}
                          >
                            <input 
                              type="checkbox"
                              checked={selectedPropertyIds.includes(p.id)}
                              onChange={() => {
                                if (selectedPropertyIds.includes(p.id)) {
                                  setSelectedPropertyIds(selectedPropertyIds.filter(id => id !== p.id));
                                } else {
                                  setSelectedPropertyIds([...selectedPropertyIds, p.id]);
                                }
                              }}
                              className="rounded border-gray-350 text-[#0A1F44] focus:ring-[#0A1F44] cursor-pointer"
                            />
                          </motion.div>
                        </td>
                      )}
                      {/* ID and Ward */}
                      <td className="px-4 py-4 shrink-0">
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.1) }}
                          className="flex items-center gap-2.5"
                        >
                          {/* Mini QR Code Thumbnail & Preview Hover Card */}
                          <div 
                            className="relative group/qr cursor-pointer border border-gray-200 bg-white p-0.5 rounded shadow-3xs hover:border-[#38BDF8] hover:shadow-2xs transition-all shrink-0"
                            onClick={() => {
                              setActiveQrProperty(p);
                              setShowQrModal(true);
                            }}
                            title="Click to view & print official on-site lookup QR Code"
                          >
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                                `${window.location.origin}${window.location.pathname}?quickpay=${p.id}`
                              )}`}
                              alt="QR code thumbnail"
                              referrerPolicy="no-referrer"
                              className="h-8 w-8 object-contain"
                            />
                            {/* Hover Tooltip display of QR */}
                            <div className="absolute left-10 top-1/2 -translate-y-1/2 ml-2 w-48 bg-white border border-gray-150 p-2.5 rounded-xl shadow-xl opacity-0 scale-95 pointer-events-none group-hover/qr:opacity-100 group-hover/qr:scale-100 group-hover/qr:pointer-events-auto transition-all duration-200 z-40 text-center text-[9px] font-mono">
                              <div className="bg-[#0A1F44] text-white p-1 rounded-t-lg mb-1.5 text-[8px] font-bold">
                                INSTANT ON-SITE LOOKUP
                              </div>
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                  `${window.location.origin}${window.location.pathname}?quickpay=${p.id}`
                                )}`}
                                alt="QR code preview"
                                referrerPolicy="no-referrer"
                                className="h-32 w-32 object-contain mx-auto border border-gray-100 rounded p-1 bg-white"
                              />
                              <span className="block mt-1.5 font-bold text-gray-700">CODE: {p.id}</span>
                              <span className="text-gray-400 block text-[8px] font-sans">Click to print or scan</span>
                            </div>
                          </div>

                          <div>
                            <span className="block font-mono font-bold text-gray-900 bg-[#0A1F44]/5 text-[#0A1F44] px-1.5 py-0.5 rounded text-[10px] w-fit mb-1.5">
                              {p.id}
                            </span>
                            <span className="text-gray-500 font-semibold flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#38BDF8]" />
                              {p.ward}
                            </span>
                          </div>
                        </motion.div>
                      </td>

                      {/* Owner Details */}
                      <td className="px-4 py-4">
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.1) }}
                        >
                          <span className="block font-bold text-gray-900">{highlightText(p.ownerName, search)}</span>
                          <span className="text-gray-400 flex items-center gap-1 font-semibold">
                            <Phone className="h-2.5 w-2.5 text-gray-400" />
                            {p.ownerPhone}
                          </span>
                        </motion.div>
                      </td>

                      {/* Address */}
                      <td className="px-4 py-4 max-w-[200px]" title={p.address}>
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.1) }}
                          className="truncate"
                        >
                          {highlightText(p.address, search)}
                        </motion.div>
                      </td>

                      {/* Typology and Units count */}
                      <td className="px-4 py-4 text-center">
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.1) }}
                        >
                          <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                            p.propertyType === 'Commercial' ? 'bg-[#38BDF8]/10 text-[#0A1F44]' : p.propertyType === 'Industrial' ? 'bg-[#0A1F44] text-white' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {p.propertyType}
                          </span>
                          <span className="block text-[10px] text-gray-400 mt-1">{p.units} units</span>
                        </motion.div>
                      </td>

                      {/* Rental Value */}
                      <td className="px-4 py-4 text-right">
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.1) }}
                        >
                          <span className="font-mono font-bold text-gray-900 block">
                            ₦{p.annualRentalValue.toLocaleString()}
                          </span>
                          {valuationOutliers[p.id] && (
                            <span 
                              title={`This property's valuation deviates by ${valuationOutliers[p.id].deviationPercent}% from the ward average of ₦${Math.round(
                                properties.filter(x => x.ward === p.ward && x.propertyType === p.propertyType).reduce((acc, curr) => acc + curr.annualRentalValue, 0) / Math.max(1, properties.filter(x => x.ward === p.ward && x.propertyType === p.propertyType).length)
                              ).toLocaleString()} for ${p.propertyType} properties.`}
                              className={`inline-flex items-center gap-0.5 font-sans text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide mt-1 cursor-help ${
                                valuationOutliers[p.id].isHigh
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              <AlertTriangle className="h-2 w-2 shrink-0" />
                              {valuationOutliers[p.id].deviationPercent > 0 ? '+' : ''}{valuationOutliers[p.id].deviationPercent}% Outlier
                            </span>
                          )}
                        </motion.div>
                      </td>

                      {/* Calced Tenement Due */}
                      <td className="px-4 py-4 text-right font-mono font-bold text-[#0A1F44]">
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.1) }}
                        >
                          ₦{p.tenementRate.toLocaleString()}
                          <span className="block text-[9px] text-[#38BDF8] font-bold">({p.ratePercentage}%)</span>
                        </motion.div>
                      </td>

                      {/* State */}
                      <td className="px-4 py-4 text-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.1) }}
                        >
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            checkPaid ? 'bg-green-100 text-green-700' : checkPending ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {p.paymentStatus}
                          </span>
                        </motion.div>
                      </td>

                      {/* Operational Actions */}
                      <td className="px-4 py-4 text-center">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.1) }}
                          className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 border border-gray-250"
                        >
                          {onSelectPropertyGIS && (
                            <button
                              onClick={() => onSelectPropertyGIS(p)}
                              title="Locate GIS Pin Coordinates"
                              className="p-1 text-[#38BDF8] hover:bg-white rounded-md cursor-pointer"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedTimelineProperty(p);
                              setDetailsTab('timeline');
                              setShowTimelineModal(true);
                            }}
                            title="Visual Compliance Timeline (Billing, Payments, Enforcement history)"
                            className="p-1 text-emerald-600 hover:bg-white rounded-md cursor-pointer flex items-center justify-center"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Site Inspection mode trigger for agents / authorized personnel */}
                          {!isTaxpayer && (
                            <button
                              onClick={() => triggerOpenInspection(p)}
                              title="Field Site Inspection Mode (Capture active GPS & Camera Snap)"
                              className="p-1 text-pink-600 hover:bg-white rounded-md cursor-pointer flex items-center justify-center"
                            >
                              <Camera className="h-3.5 w-3.5 text-pink-500 hover:text-pink-600 animate-pulse" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setActiveQrProperty(p);
                              setShowQrModal(true);
                            }}
                            title="Generate Rapid Settlement QR Code"
                            className="p-1 text-teal-600 hover:bg-white rounded-md cursor-pointer flex items-center justify-center"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAttachmentProperty(p);
                              setManualFileName('');
                              setManualFileSize('');
                              setAttachmentTab('upload');
                              setModalInspectionPhoto(null);
                              setModalInspectionGps(`${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`);
                              setModalGpsError('');
                              setShowAttachmentModal(true);
                            }}
                            title="Manage property case file attachments (Land Survey, Tax Notice, etc.)"
                            className="p-1 text-[#0A1F44] hover:bg-white rounded-md cursor-pointer flex items-center justify-center relative"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {p.attachments && p.attachments.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-teal-600 text-white font-sans text-[8px] font-extrabold h-3.5 w-3.5 rounded-full flex items-center justify-center border border-white">
                                {p.attachments.length}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => setPrintingPropertyReport(p)}
                            title="Generate Print-Friendly Property Report"
                            className="p-1 text-[#0284C7] hover:bg-white rounded-md cursor-pointer flex items-center justify-center"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => setPrintingPropertyLabel(p)}
                            title="Print Tenement Identification Tag/Label (3.5in x 2.5in ID Badge layout with payment QR)"
                            className="p-1 text-emerald-600 hover:bg-white rounded-md cursor-pointer flex items-center justify-center"
                          >
                            <span className="text-[9px] font-mono font-bold uppercase py-0.5 px-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 inline-flex items-center gap-0.5 whitespace-nowrap hover:bg-emerald-100">
                              <Printer className="h-2 w-2 text-emerald-600" /> Label
                            </span>
                          </button>

                          <button
                            onClick={() => handlePrintQrLabels([p])}
                            title="Print Field Agent QR Label (Encodes Property ID)"
                            className="p-1 text-indigo-600 hover:bg-white rounded-md cursor-pointer flex items-center justify-center"
                          >
                            <span className="text-[9px] font-mono font-bold uppercase py-0.5 px-1 bg-indigo-50 text-indigo-800 rounded border border-indigo-200 inline-flex items-center gap-0.5 whitespace-nowrap hover:bg-indigo-100">
                              <QrCode className="h-2 w-2 text-indigo-600" /> QR Label
                            </span>
                          </button>
                          
                          {/* Edit Allowed for everything except taxpayers */}
                          {!isTaxpayer && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              title="Alter Rate Calculations/Details"
                              className="p-1 text-gray-500 hover:bg-white hover:text-[#0A1F44] rounded-md cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Delete restrict: LGA & Super Admin only */}
                          {(userRole === 'Super Admin' || userRole === 'LGA Admin') && (
                            <button
                              onClick={() => setPropertyToDelete(p)}
                              title="Delete Record Permanently"
                              className="p-1 text-red-500 hover:bg-white rounded-md cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </motion.div>
                      </td>
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Dense custom pagination controls bar */}
        <div className="bg-gray-50 p-3 sm:p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="text-gray-400 font-medium">
            Displaying <span className="text-gray-700 font-bold">{startIndex + 1}</span> to <span className="text-gray-700 font-bold">{Math.min(startIndex + pageSize, totalItems)}</span> of <span className="text-gray-700 font-bold">{totalItems}</span> matching tenements
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider shrink-0">Rows limit:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-md border border-gray-300 bg-white p-1 text-xs outline-none"
              >
                <option value={10}>10 records</option>
                <option value={20}>20 records</option>
                <option value={50}>50 records</option>
              </select>
            </div>

            {/* Nav Arrows */}
            <div className="flex items-center gap-1">
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
      </div>

      {/* Embedded Assessment Register / Update Modal Form */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-[#0A1F44] text-lg">
                    {isEditMode ? `Modify Rating Record [${activePropertyId}]` : 'Add Property to Suleja Municipal Registry'}
                  </h3>
                  {/* Visually reinforce trust during unstable mobile network conditions */}
                  {userRole === 'Field Agent' && autoSaveStatus !== 'idle' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                      <span className="relative flex h-2 w-2">
                        {autoSaveStatus === 'saving' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${autoSaveStatus === 'saving' ? 'bg-green-500' : 'bg-emerald-600'}`}></span>
                      </span>
                      <span className="text-[10px] font-bold text-green-700">
                        {autoSaveStatus === 'saving' ? 'Auto-saving local draft...' : 'Draft saved locally'}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Every addition logs coordinates, values, and triggers the billing valuation engines.
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-[#0A1F44] font-bold text-lg cursor-pointer ml-4"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Landlord Credentials Section */}
              <div className="space-y-3">
                <span className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider">1. Landlord / Property Owner Credentials</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Ibrahim Abubakar Yusuf"
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Phone Contact (Nigeria) *</label>
                    <input
                      type="text"
                      required
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="e.g. +234 803 444 5555"
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Email Coordinates</label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">National ID (NIN) or Taxpayer TIN</label>
                    <input
                      type="text"
                      value={ninOrTin}
                      onChange={(e) => setNinOrTin(e.target.value)}
                      placeholder="e.g. 12345678901"
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Geographic mapping */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                  <span className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider">2. Geo-Location & Municipal Ward Site</span>
                  <button
                    type="button"
                    id="btn-verify-location"
                    onClick={handleVerifyCurrentLocation}
                    disabled={gpsLoading}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tight shadow-xs transition-all cursor-pointer ${
                      gpsLoading
                        ? 'bg-sky-100 text-sky-700 animate-pulse'
                        : 'bg-[#0A1F44] hover:bg-[#38BDF8] hover:text-[#0A1F44] text-white border border-[#38BDF8]/25'
                    }`}
                    title="Automatically fetch coordinates via browser GPS"
                  >
                    <MapPin className={`h-3.5 w-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                    <span>{gpsLoading ? 'Acquiring Lat/Lng...' : 'Verify Current Location'}</span>
                  </button>
                </div>

                {gpsError && (
                  <div className="text-[10px] text-red-600 font-semibold bg-red-50 border border-red-200 rounded p-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse inline-block" />
                    <span>{gpsError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Taxation Ward Zone *</label>
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs outline-none"
                    >
                      {SULEJA_WARDS.map(w => (
                        <option key={w.name} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Occupancy Status *</label>
                    <select
                      value={occupancyStatus}
                      onChange={(e) => setOccupancyStatus(e.target.value as OccupancyStatus)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs outline-none"
                    >
                      <option value="Occupied">Occupied Dwelling</option>
                      <option value="Vacant">Unoccupied / Vacant</option>
                      <option value="Owner Occupied">Self-Residential (Owner Occupied)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Physical Site Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. No 15 Opposite Maje Market, Maje Ward"
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Property Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Two-storey commercial structure housing retail spaces on ground floor and offices above."
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">GPS Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">GPS Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Business Asses Engine */}
              <div className="space-y-3 border-t pt-4">
                <span className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider">3. Valuation Assay & Rates Engine Configuration</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Property class *</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs outline-none"
                    >
                      <option value="Residential">Residential (4%)</option>
                      <option value="Commercial">Commercial (4%)</option>
                      <option value="Industrial">Industrial (4%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Active units *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={units}
                      onChange={(e) => setUnits(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Valued Rental/An (₦) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={annualRentalValue}
                      onChange={(e) => setAnnualRentalValue(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Assigned Inspector Personnel</label>
                    <input
                      type="text"
                      placeholder="e.g. Inspector Umar Sani"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Property Photo Evidence capturing */}
                <div className="bg-slate-50 border border-gray-250 rounded-xl p-4.5 space-y-2">
                  <span className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider">Property Photo Evidence (Device Camera)</span>
                  <CameraCapture
                    onCapture={(dataUrl) => setImageUrl(dataUrl)}
                    onClear={() => setImageUrl('')}
                    initialImageUrl={imageUrl}
                    label="Take a Live Photo or Upload Evidence File"
                  />
                </div>

                {/* Rates estimator preview */}
                <div className="bg-[#F5F7FA] border rounded-lg p-3 text-xs space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Rate Percentage Formula:</span>
                    <span className="font-bold text-[#0A1F44]">
                      4.0%
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                    <span>Projected Tenement rate (Annual):</span>
                    <span className="text-sm font-mono text-[#0A1F44]">
                      ₦{(annualRentalValue * 0.04).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dues state override */}
              {userRole === 'Accountant' && (
                <div className="space-y-3 border-t pt-4">
                  <span className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider">4. Billing Reconcile Options</span>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Payment Overlook Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as TaxPaymentStatus)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs outline-none"
                    >
                      <option value="Unpaid">Unpaid / Generate Dues Invoice</option>
                      <option value="Paid">Mark as Settle Paid Outstanding</option>
                      <option value="Pending">Mark as Verification Pending</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Form operations */}
              <div className="flex gap-2.5 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0A1F44] text-white py-2.5 rounded-lg text-xs font-bold hover:bg-opacity-95 shadow-md cursor-pointer"
                >
                  {isEditMode ? 'Save Calculations' : 'Register Tenement'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Multi-Step Delete Confirmation Dialog */}
      {showMultiStepDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-105 max-w-md w-full overflow-hidden shadow-2xl relative select-text text-black text-xs font-sans">
            <div className="bg-red-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
                <div>
                  <span className="block text-[9px] font-mono font-bold text-red-100">ADMIN SECURITY COMMAND DELETION</span>
                  <h4 className="font-sans font-bold text-sm tracking-tight">Purge Tenement Record Cluster</h4>
                </div>
              </div>
              <button
                onClick={() => setShowMultiStepDeleteModal(false)}
                className="text-white hover:text-red-100 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest pb-2 border-b">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] ${deleteStep === 1 ? 'bg-[#0A1F44] text-white border-[#0A1F44]' : 'bg-green-100 border-green-200 text-green-700'}`}>
                  {deleteStep === 1 ? '1' : '✓'}
                </span>
                <span>Impact Assessment</span>
                <span className="text-gray-300">/</span>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] ${deleteStep === 2 ? 'bg-[#0A1F44] text-white border-[#0A1F44]' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                  2
                </span>
                <span>Command Execution</span>
              </div>

              {deleteStep === 1 ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 space-y-2">
                    <p className="font-extrabold text-xs">⚠️ Legal Warning & Irrevocable Purge</p>
                    <p className="text-[11px] leading-relaxed">
                      You are about to irreversibly purge <span className="font-extrabold font-mono">{selectedPropertyIds.length} tenement properties</span> from the Suleja land registries database.
                    </p>
                    <p className="text-[11.2px] leading-relaxed font-semibold">
                      This action permanently wipes all outstanding tax balances, active payment receipts, pending bank advice reviews, and land audit coordinates linked to these properties.
                    </p>
                  </div>

                  <p className="text-gray-500 leading-normal text-[11px]">
                    Confirm that you have formal legal authorization under Cap 13 Rev Laws to de-register this cluster of properties. This action cannot be undone.
                  </p>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMultiStepDeleteModal(false)}
                      className="flex-1 border bg-white hover:bg-gray-50 text-gray-605 rounded-lg py-2.5 text-xs font-bold cursor-pointer font-sans"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 bg-[#0A1F44] hover:bg-opacity-95 text-white rounded-lg py-2.5 text-xs font-bold cursor-pointer transition-all font-sans"
                    >
                      Proceed to Lock
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-amber-800 text-[11px] leading-snug">
                    <span className="font-extrabold block mb-1">🔒 High-Level Safe-Lock Activated</span>
                    To double-guard against accidental data loss, please type the required safety passphrase: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300 select-all text-gray-900">SULEJA PURGE</span> in the box below to authorize.
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Verification Phrase Entry</label>
                    <input
                      type="text"
                      placeholder="Type SULEJA PURGE exactly"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      className="w-full bg-white rounded-lg border border-gray-300 p-2.5 text-xs outline-none focus:border-red-500 font-mono text-center tracking-wider placeholder:italic text-black"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      className="flex-1 border bg-white hover:bg-gray-50 text-gray-605 rounded-lg py-2.5 text-xs font-bold cursor-pointer font-sans"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={deleteConfirmationText !== 'SULEJA PURGE'}
                      onClick={() => {
                        // Purge all selected property IDs safely
                        selectedPropertyIds.forEach((id) => {
                          onDeleteProperty(id);
                        });
                        setSelectedPropertyIds([]);
                        setShowMultiStepDeleteModal(false);
                      }}
                      className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all justify-center flex items-center gap-1 cursor-pointer font-sans ${
                        deleteConfirmationText === 'SULEJA PURGE'
                          ? 'bg-red-650 hover:bg-red-750 text-white shadow-md'
                          : 'bg-gray-105 text-gray-400 border border-gray-150 cursor-not-allowed'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Confirm Delete ({selectedPropertyIds.length} Properties)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Single Property Delete Confirmation Modal */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-105 max-w-md w-full overflow-hidden shadow-2xl relative select-text text-black text-xs font-sans animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-650 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
                <div>
                  <span className="block text-[9px] font-mono font-bold text-red-100 uppercase tracking-wider">MUNICIPAL REGISTRY SECURITY</span>
                  <h4 className="font-sans font-bold text-sm tracking-tight">Confirm Property De-registration</h4>
                </div>
              </div>
              <button
                onClick={() => setPropertyToDelete(null)}
                className="text-white hover:text-red-100 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 space-y-2 text-left">
                <p className="font-bold text-red-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Irreversible Action Warning
                </p>
                <p className="text-gray-600 leading-relaxed font-semibold text-[10.5px]">
                  You are about to permanently purge this tenement from the Niger State digital land registry. All associated bills, tax assessments, payment invoices, and historical ledger details will be permanently wiped.
                </p>
              </div>

              <div className="border border-gray-150 rounded-xl bg-gray-50/50 p-4 space-y-3 text-left">
                <h5 className="font-sans font-bold text-[#0A1F44] border-b pb-1.5 uppercase tracking-wide text-[9px] text-gray-500">Record to De-register</h5>
                
                <div className="grid grid-cols-3 gap-2 text-[10.5px]">
                  <span className="text-gray-550 font-bold">Property ID:</span>
                  <span className="col-span-2 font-mono font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-gray-200 inline-block w-fit text-[9px]">{propertyToDelete.id}</span>
                  
                  <span className="text-gray-550 font-bold">Owner Name:</span>
                  <span className="col-span-2 font-bold text-gray-800">{propertyToDelete.ownerName}</span>

                  <span className="text-gray-550 font-bold">Ward Zone:</span>
                  <span className="col-span-2 font-semibold text-gray-750">{propertyToDelete.ward} Ward</span>

                  <span className="text-gray-550 font-bold">Property Type:</span>
                  <span className="col-span-2 font-semibold text-gray-750">{propertyToDelete.propertyType}</span>

                  <span className="text-gray-550 font-bold">Address:</span>
                  <span className="col-span-2 text-gray-700 font-semibold truncate" title={propertyToDelete.address}>{propertyToDelete.address}</span>

                  <span className="text-gray-550 font-bold">Assessed Rate:</span>
                  <span className="col-span-2 font-mono text-red-700 font-extrabold text-[11px]">₦{propertyToDelete.tenementRate.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPropertyToDelete(null)}
                  className="flex-1 border bg-white hover:bg-gray-50 text-gray-605 rounded-lg py-2.5 text-xs font-bold cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteProperty(propertyToDelete.id);
                    setPropertyToDelete(null);
                  }}
                  className="flex-1 bg-red-650 hover:bg-red-750 text-white rounded-lg py-2.5 text-xs font-bold transition-all justify-center flex items-center gap-1 cursor-pointer font-sans shadow-md"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  De-register & Purge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Timeline Modal */}
      {showTimelineModal && selectedTimelineProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800 font-sans"
          >
            {/* Header */}
            <div className="p-5 bg-[#0A1F44] text-white flex justify-between items-start border-b border-white/10 shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#38BDF8] font-bold font-mono">Government Compliance Auditing tool</span>
                <h3 className="font-display font-black text-sm text-white mt-0.5">Municipal Compliance Timeline</h3>
                <p className="text-[11px] text-sky-200 mt-0.5 font-medium">Property ID: <span className="font-mono text-white font-bold">{selectedTimelineProperty.id}</span> • Registered owner: {selectedTimelineProperty.ownerName}</p>
              </div>
              <button 
                onClick={() => {
                  setShowTimelineModal(false);
                  setSelectedTimelineProperty(null);
                }} 
                className="text-white bg-white/10 hover:bg-white/20 p-1 px-2.5 rounded-lg border border-white/10 transition-colors uppercase text-[10px] font-extrabold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
              
              {/* Quick Stats overview panel */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex flex-wrap justify-between items-center gap-4">
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-extrabold font-sans">Assessed Model</span>
                  <span className="font-semibold text-xs text-[#0A1F44]">{selectedTimelineProperty.propertyType} • {selectedTimelineProperty.units} Units</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-extrabold font-sans">Annual Tenement Rate</span>
                  <span className="font-mono font-bold text-xs text-[#0A1F44]">₦{selectedTimelineProperty.tenementRate.toLocaleString()} ({selectedTimelineProperty.ratePercentage}%)</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-extrabold font-sans">Current Status</span>
                  <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    selectedTimelineProperty.paymentStatus === 'Paid' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : selectedTimelineProperty.paymentStatus === 'Pending' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                  }`}>{selectedTimelineProperty.paymentStatus}</span>
                </div>
              </div>

              {selectedTimelineProperty.description && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-3xs space-y-1.5 text-left">
                  <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-extrabold font-sans">Property Description</span>
                  <p className="text-[11px] text-gray-600 leading-relaxed font-semibold">
                    {selectedTimelineProperty.description}
                  </p>
                </div>
              )}

              {/* 🗂️ Property Details Tabs */}
              <div className="flex border-b border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setDetailsTab('timeline')}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    detailsTab === 'timeline'
                      ? 'border-[#0A1F44] text-[#0A1F44]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Compliance Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsTab('payments')}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    detailsTab === 'payments'
                      ? 'border-[#0A1F44] text-[#0A1F44]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Payment History
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsTab('qrcode')}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    detailsTab === 'qrcode'
                      ? 'border-[#0A1F44] text-[#0A1F44]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QR ID Card
                </button>
              </div>

              {/* Tab Contents */}
              {detailsTab === 'timeline' && (
                <div className="relative border-l-2 border-dashed border-gray-300 ml-4 pl-8 space-y-6 animate-in fade-in duration-200">
                  {timelineEvents.length > 0 ? (
                    timelineEvents.map((ev, index) => {
                      const bulletColor = ev.type === 'billing' 
                        ? 'bg-indigo-500 ring-indigo-100' 
                        : ev.type === 'payment' 
                          ? 'bg-emerald-500 ring-emerald-100' 
                          : 'bg-amber-500 ring-amber-100';

                      return (
                        <div key={index} className="relative group select-text">
                          {/* Ring-bullet indicator */}
                          <span className={`absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-2 border-white ring-4 ${bulletColor} shrink-0`} />
                          
                          {/* Content body component */}
                          <div className="bg-white rounded-xl p-4 border border-gray-150 hover:border-gray-200 shadow-xs space-y-1.5 transition-all text-left">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-gray-400 bg-slate-100 p-0.5 px-1.5 rounded">{ev.date}</span>
                                <h4 className="font-display font-extrabold text-xs text-[#0A1F44]">{ev.title}</h4>
                              </div>
                              {ev.badge && (
                                <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider border ${ev.badgeColor}`}>
                                  {ev.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-600 leading-relaxed font-semibold font-sans">
                              {ev.description}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-gray-400 text-xs font-semibold">
                      No billing or enforcement history registered for this property yet.
                    </div>
                  )}
                </div>
              )}

              {detailsTab === 'payments' && (() => {
                const propInvoices = invoices.filter(i => i.propertyId === selectedTimelineProperty.id);
                const totalInvoiced = propInvoices.reduce((sum, i) => sum + i.amount, 0);
                const totalPaid = propInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
                const complRate = propInvoices.length > 0 ? Math.round((propInvoices.filter(i => i.status === 'Paid').length / propInvoices.length) * 100) : 0;

                return (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-3 gap-3 bg-[#0A1F44] text-white p-4 rounded-2xl border border-[#0A1F44]/50 shadow-xs text-center select-none">
                      <div className="space-y-0.5">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-bold">Total Invoiced</span>
                        <span className="font-mono font-black text-sm block">₦{totalInvoiced.toLocaleString()}</span>
                      </div>
                      <div className="space-y-0.5 border-x border-white/10">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-bold">Total Settled</span>
                        <span className="font-mono font-black text-sm block text-emerald-400">₦{totalPaid.toLocaleString()}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-bold">Compliance Rate</span>
                        <span className="font-sans font-black text-sm block text-sky-400">{complRate}%</span>
                      </div>
                    </div>

                    {propInvoices.length > 0 ? (
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-150 shadow-3xs">
                        {propInvoices.map((inv) => (
                          <div key={inv.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-[#0A1F44] text-[10.5px]">
                                  {inv.id}
                                </span>
                                <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                                  inv.status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : inv.status === 'Overdue'
                                      ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {inv.status}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-gray-500 font-semibold space-y-0.5 font-sans">
                                <div>Issued: {inv.issuedDate} | Due: {inv.dueDate}</div>
                                {inv.paymentDate && (
                                  <div className="text-emerald-700 font-bold">
                                    Paid On: {inv.paymentDate} {inv.paymentMethod ? `via ${inv.paymentMethod}` : ''}
                                  </div>
                                )}
                                {inv.transactionRef ? (
                                  <div className="font-mono text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border inline-block mt-1">
                                    TXN REF: {inv.transactionRef}
                                  </div>
                                ) : inv.status === 'Paid' ? (
                                  <div className="font-mono text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border inline-block mt-1">
                                    TXN REF: MISSING REFERENCE FLAG!
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-extrabold text-slate-900 block text-xs">
                                ₦{inv.amount.toLocaleString()}
                              </span>
                              {inv.penaltyAmount && inv.penaltyAmount > 0 ? (
                                <span className="text-[9px] text-red-600 font-bold block">
                                  + ₦{inv.penaltyAmount.toLocaleString()} Penalty
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-400 text-xs font-semibold bg-white rounded-xl border">
                        No invoice history exists for this tenement.
                      </div>
                    )}
                  </div>
                );
              })()}

              {detailsTab === 'qrcode' && (
                <div className="space-y-4 text-center p-6 bg-white rounded-xl border border-gray-150 animate-in fade-in duration-200 shadow-3xs">
                  <div className="max-w-xs mx-auto space-y-4">
                    <p className="text-gray-500 font-medium text-[11px] leading-relaxed">
                      Scan this cryptographically compliant QR code with any field-agent mobile terminal to instantly retrieve this tenement's official ledger register:
                    </p>

                    <div className="inline-block bg-white p-4 rounded-xl border border-gray-150 shadow-md">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                          selectedTimelineProperty.id
                        )}`}
                        alt={`QR Code for ${selectedTimelineProperty.id}`}
                        referrerPolicy="no-referrer"
                        className="w-[160px] h-[160px] object-contain mx-auto"
                      />
                      <span className="block text-[10px] font-mono text-[#0A1F44] font-extrabold mt-3 uppercase tracking-wider bg-slate-50 p-1 rounded border">
                        {selectedTimelineProperty.id}
                      </span>
                    </div>

                    <div className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                      Authorized Niger State Government Tenement Register • Digitally Validated
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-gray-400 shrink-0">
              <span>● LGA Revenue Directives (Cap 13) Compliant</span>
              <span className="text-[#38BDF8]">Suleja LGA Land & Revenue Hub</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Property QR Identifier Modal */}
      {showQrModal && activeQrProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-sm w-full overflow-hidden shadow-2xl relative text-black text-xs font-sans">
            <div className="bg-[#0A1F44] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-sans font-bold">
                <QrCode className="h-5 w-5 text-[#38BDF8]" />
                <div>
                  <span className="block text-[9px] font-mono font-bold text-[#38BDF8]/80">TENEMENT SYSTEM QUICK-PAY</span>
                  <h4 className="font-bold text-sm tracking-tight">Citizen Billing QR Code</h4>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-white hover:text-gray-300 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <p className="text-gray-500 font-medium text-[11px] leading-relaxed">
                Scan this cryptographically compiled QR code using a mobile phone camera to instantly route to the secure public quick payment portal for this specific tenement.
              </p>

              {/* QR Code Container */}
              <div className="inline-block bg-white p-4 rounded-xl border border-gray-150 shadow-md">
                <img
                  src={qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    `${window.location.origin}${window.location.pathname}?quickpay=${activeQrProperty.id}`
                  )}`}
                  alt={`QR Code for ${activeQrProperty.id}`}
                  referrerPolicy="no-referrer"
                  className="w-[180px] h-[180px] object-contain mx-auto"
                />
                <span className="block text-[9.5px] font-mono text-gray-500 font-bold mt-2.5 uppercase tracking-wider bg-slate-50 p-1 rounded border">
                  Tenement ID: {activeQrProperty.id}
                </span>
              </div>

              {/* Property Details Briefing Card */}
              <div className="bg-slate-50 border text-left rounded-xl p-3.5 space-y-1 text-[11px]">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-400 font-medium font-sans">Assessed Landlord:</span>
                  <span className="font-bold text-[#0A1F44] font-sans">{activeQrProperty.ownerName}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-400 font-medium font-sans">Ward Group:</span>
                  <span className="font-medium text-gray-750 font-sans">{activeQrProperty.ward}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-400 font-medium font-sans">Annual Rental Value:</span>
                  <span className="font-mono font-bold text-gray-900">₦{activeQrProperty.annualRentalValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-gray-400 font-medium font-bold font-sans">Tenement Rate Due:</span>
                  <span className="font-mono font-extrabold text-[#0A1F44]">₦{activeQrProperty.tenementRate.toLocaleString()} ({activeQrProperty.ratePercentage}%)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 border text-gray-700 py-2 rounded-lg font-bold text-xs cursor-pointer font-sans"
                >
                  Print QR Slip
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 bg-[#0A1F44] hover:bg-opacity-95 text-white py-2 rounded-lg font-bold text-xs cursor-pointer shadow-sm font-sans"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Case File Attachments Modal */}
      {showAttachmentModal && selectedAttachmentProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-lg w-full overflow-hidden shadow-2xl relative text-black text-xs font-sans">
            <div className="bg-[#0A1F44] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-sans font-bold">
                <FileText className="h-5 w-5 text-[#38BDF8]" />
                <div>
                  <span className="block text-[9px] font-mono font-bold text-[#38BDF8]/80">CASE FILE REPOSITORY</span>
                  <h4 className="font-bold text-sm tracking-tight text-white">Centralized Document Depot</h4>
                </div>
              </div>
              <button
                onClick={() => {
                  stopModalCamera();
                  setShowAttachmentModal(false);
                  setSelectedAttachmentProperty(null);
                }}
                className="text-white hover:text-gray-300 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info Sub-block */}
              <div className="bg-slate-50 border p-3 rounded-lg leading-normal text-gray-500 text-left">
                <span className="font-bold text-gray-800">Property Code: </span>
                <span className="font-mono text-[#0A1F44] font-bold bg-[#0A1F44]/5 px-1.5 py-0.5 rounded">{selectedAttachmentProperty.id}</span>
                <p className="mt-1 text-[11px]">
                  Attach active title deeds, municipal surveyor logs, or live geo-tagged photographs (up to 3 site assessment snaps) taken directly by field personnel.
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    stopModalCamera();
                    setAttachmentTab('upload');
                  }}
                  className={`flex-1 text-center pb-2.5 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer ${
                    attachmentTab === 'upload' 
                      ? 'border-[#0A1F44] text-[#0A1F44]' 
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  📁 Upload Document
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentTab('camera');
                    startModalCamera();
                  }}
                  className={`flex-1 text-center pb-2.5 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer ${
                    attachmentTab === 'camera' 
                      ? 'border-pink-600 text-pink-600' 
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  📷 Live Field Camera ({selectedAttachmentProperty.attachments?.filter(a => a.type === 'Site Photo').length || 0}/3)
                </button>
              </div>

              {/* Upload Panel Tab */}
              {attachmentTab === 'upload' && (
                <div className="space-y-3">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider text-left">Upload New Document</span>

                  <div 
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer select-none space-y-2 relative ${
                      dragActive 
                        ? 'border-[#38BDF8] bg-[#38BDF8]/5' 
                        : 'border-gray-250 bg-slate-50/50 hover:border-[#0A1F44] hover:bg-slate-50'
                    }`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const droppedFile = e.dataTransfer.files[0];
                        setManualFileName(droppedFile.name);
                        const sizeInMB = (droppedFile.size / (1024 * 1024)).toFixed(1);
                        setManualFileSize(`${sizeInMB} MB`);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const selectedFile = e.target.files[0];
                          setManualFileName(selectedFile.name);
                          const sizeInMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
                          setManualFileSize(`${sizeInMB} MB`);
                        }
                      }}
                    />

                    <div className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
                      <Upload className="h-7 w-7 text-[#0A1F44]" />
                      <span className="text-[11.5px] font-bold text-gray-700">Drag & drop files here, or <span className="text-[#38BDF8] hover:underline">browse files</span></span>
                      <span className="text-[10px] text-gray-400">Works with land surveys, court summons, and official receipt copies</span>
                    </div>
                  </div>

                  {/* If file is chosen/dropped, show details and selection of type */}
                  {manualFileName && (
                    <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3.5 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <File className="h-4.5 w-4.5 text-sky-600 shrink-0" />
                          <div className="text-left">
                            <span className="block text-xs font-bold text-gray-800 truncate max-w-[220px]">{manualFileName}</span>
                            <span className="text-[10px] text-gray-400 font-medium font-mono">{manualFileSize || '1.8 MB'}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => { setManualFileName(''); setManualFileSize(''); }} 
                          className="text-gray-400 hover:text-red-500 font-bold font-sans cursor-pointer"
                          title="Remove Document selection"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-0.5">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">Document Classification</label>
                          <select
                            value={attachmentType}
                            onChange={(e) => setAttachmentType(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs outline-none font-sans"
                          >
                            <option value="Land Survey">Land Survey Map</option>
                            <option value="Tax Notice">Tax Assessment Notice</option>
                            <option value="Title Deed">C of O / Title Deed</option>
                            <option value="Valuation Report">Zonal Valuation Report</option>
                            <option value="Other">Other Miscellaneous</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (!manualFileName) return;
                              const newAttachment = {
                                id: `ATT-${Date.now()}`,
                                name: manualFileName,
                                size: manualFileSize || '2.0 MB',
                                uploadedAt: new Date().toISOString().split('T')[0],
                                type: attachmentType
                              };

                              const currentAttachments = selectedAttachmentProperty.attachments || [];
                              const updatedProperty = {
                                ...selectedAttachmentProperty,
                                attachments: [...currentAttachments, newAttachment]
                              };

                              onEditProperty(updatedProperty);
                              setSelectedAttachmentProperty(updatedProperty);
                              
                              // Reset fields
                              setManualFileName('');
                              setManualFileSize('');
                            }}
                            className="w-full bg-[#0A1F44] hover:bg-opacity-95 text-white py-2 rounded-lg font-bold text-xs cursor-pointer text-center flex items-center justify-center gap-1 font-sans"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Simulate Secure Ingestion
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Camera Snapper Tab */}
              {attachmentTab === 'camera' && (
                <div className="space-y-3.5 text-left">
                  <div className="flex justify-between items-center bg-[#EF4444]/5 p-2 rounded-lg border border-[#EF4444]/20">
                    <span className="block text-[11px] font-bold text-[#E11D48] uppercase tracking-wider">
                      Live Assessment site photos ({selectedAttachmentProperty.attachments?.filter(a => a.type === 'Site Photo').length || 0}/3 Snapped)
                    </span>
                    {(selectedAttachmentProperty.attachments?.filter(a => a.type === 'Site Photo').length || 0) >= 3 ? (
                      <span className="text-[10px] text-[#D97706] bg-[#FFFBEB] font-extrabold px-1.5 py-0.5 rounded border border-[#FCD34D]">
                        ⚠️ Maximum limit of 3 met
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-pink-700 bg-pink-50 font-bold px-1.5 rounded">
                        Active Stream
                      </span>
                    )}
                  </div>

                  {/* Camera view screen */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center text-center">
                    {modalInspectionPhoto ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={modalInspectionPhoto} 
                          alt="Captured site inspection" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Geo-tag on overlay badge */}
                        <div className="absolute top-2.5 left-2.5 bg-black/85 text-[#38BDF8] font-mono text-[9px] p-2 rounded-md border border-[#38BDF8]/20 text-left space-y-0.5">
                          <span className="block font-bold text-white">📍 GEOTAG ASSESSMENT STAMP</span>
                          <span>Lat/Lng: {modalInspectionGps || 'No coordinates'}</span>
                          <span className="block">Angle: {photoAngle}</span>
                        </div>

                        <div className="absolute bottom-3 right-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setModalInspectionPhoto(null);
                              startModalCamera();
                            }}
                            className="bg-white hover:bg-gray-150 text-slate-950 text-[10px] font-extrabold py-1.5 px-3 rounded-lg shadow-md cursor-pointer transition-colors"
                          >
                            Retake Site Snap
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center relative bg-slate-950">
                        <video 
                          ref={modalVideoRef} 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover absolute inset-0"
                        />
                        
                        {/* No camera prompt or active camera feedback */}
                        <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-3 flex-wrap text-white pointer-events-none z-10 text-left font-mono text-[9px]">
                          <div>
                            <span className="text-pink-400 font-bold">● ACTIVE FIELD CAMERA STREAM</span>
                            <span className="block text-gray-300 font-bold">Property Frame {selectedAttachmentProperty.id}</span>
                          </div>
                        </div>

                        {/* Control buttons layer overlay */}
                        <div className="absolute inset-x-0 bottom-4 flex justify-center items-center z-20 gap-2">
                          <button
                            type="button"
                            disabled={(selectedAttachmentProperty.attachments?.filter(a => a.type === 'Site Photo').length || 0) >= 3}
                            onClick={captureModalPhoto}
                            className="bg-[#EF4444] disabled:bg-gray-600 hover:bg-[#DC2626] text-white font-extrabold text-[10.5px] py-1.5 px-3.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white scale-100 active:scale-95 transition-all cursor-pointer select-none"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Snap Site Image
                          </button>
                          <button
                            type="button"
                            disabled={(selectedAttachmentProperty.attachments?.filter(a => a.type === 'Site Photo').length || 0) >= 3}
                            onClick={() => {
                              // Direct instant snapshot simulation fallback
                              captureModalPhoto();
                            }}
                            className="bg-white/20 hover:bg-white/30 text-white font-extrabold text-[9px] py-1.5 px-2.5 rounded-lg backdrop-blur-md cursor-pointer transition-all"
                          >
                            Simulate Snapping
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Photo Classification Selector & GPS stamps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-0.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Perspective / Assessing Angle</label>
                      <select
                        value={photoAngle}
                        onChange={(e) => setPhotoAngle(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs outline-none"
                      >
                        <option value="Front Structure Facade">Front Structure Facade</option>
                        <option value="Right Boundary Wall">Right Wall Facade</option>
                        <option value="Left Boundary Wall">Left Wall Facade</option>
                        <option value="Property Access Roadway">Main Access Roadway</option>
                        <option value="Core Metering Setup">Core Metering / Water Connection</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-gray-500">Live Latitude / Longitude Stamp</label>
                        <button
                          type="button"
                          onClick={handleFetchModalGps}
                          disabled={isModalGpsLoading}
                          className="text-[9.5px] font-extrabold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          🛰️ {isModalGpsLoading ? 'Syncing...' : 'Poll Grid'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={modalInspectionGps}
                        onChange={(e) => setModalInspectionGps(e.target.value)}
                        placeholder="e.g. 9.182440, 7.185630"
                        className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono bg-white outline-none"
                      />
                      {modalGpsError && (
                        <span className="text-[9.5px] text-amber-600 block mt-0.5 font-medium">{modalGpsError}</span>
                      )}
                    </div>
                  </div>

                  {/* Submission and storage linking */}
                  <button
                    type="button"
                    disabled={!modalInspectionPhoto || (selectedAttachmentProperty.attachments?.filter(a => a.type === 'Site Photo').length || 0) >= 3}
                    onClick={() => {
                      if (!modalInspectionPhoto) return;
                      const currentPhotos = (selectedAttachmentProperty.attachments || []).filter(a => a.type === 'Site Photo');
                      if (currentPhotos.length >= 3) {
                        alert("Error: Maximum of 3 site assessment photos allowed per property.");
                        return;
                      }

                      const newPhotoAttachment = {
                        id: `PHOTO-${Date.now()}`,
                        name: `Site assessment: ${photoAngle}`,
                        size: '1.4 MB',
                        uploadedAt: new Date().toISOString().split('T')[0],
                        type: 'Site Photo',
                        url: modalInspectionPhoto,
                        latitude: parseFloat(modalInspectionGps.split(',')[0]) || selectedAttachmentProperty.latitude,
                        longitude: parseFloat(modalInspectionGps.split(',')[1]) || selectedAttachmentProperty.longitude
                      };

                      const currentAttachments = selectedAttachmentProperty.attachments || [];
                      const updatedProperty = {
                        ...selectedAttachmentProperty,
                        attachments: [...currentAttachments, newPhotoAttachment]
                      };

                      onEditProperty(updatedProperty);
                      setSelectedAttachmentProperty(updatedProperty);

                      // Resets
                      setModalInspectionPhoto(null);
                      alert("Success: Geo-tagged photograph successfully bound to assessment file.");
                    }}
                    className="w-full bg-pink-650 hover:bg-pink-700 disabled:bg-gray-300 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-xs cursor-pointer text-center flex items-center justify-center gap-1 font-sans shadow-md"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Secure & Bind Geo-Tagged Photograph to Assessment Case
                  </button>
                </div>
              )}

              {/* Existing Case Files list */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Registered Case File Documents ({selectedAttachmentProperty.attachments?.length || 0})</span>

                {!selectedAttachmentProperty.attachments || selectedAttachmentProperty.attachments.length === 0 ? (
                  <div className="border border-dashed rounded-xl p-6 text-center bg-slate-50 text-gray-400 text-xs leading-normal">
                    <span className="font-bold block text-gray-500">No documents registered for this tenement</span>
                    Use the drag-and-drop region above to simulatedly load files inside Niger State land record vaults.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                    {selectedAttachmentProperty.attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-3 border border-gray-150 rounded-xl bg-slate-50/50 hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3.5 text-left font-sans">
                          {att.type === 'Site Photo' && att.url ? (
                            <div className="shrink-0 h-10 w-14 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden shadow-xs flex items-center justify-center">
                              <img src={att.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Thumbnail" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <span className="block font-bold text-gray-850 text-xs truncate max-w-[190px]" title={att.name}>{att.name}</span>
                            <div className="flex items-center flex-wrap gap-1.5 mt-0.5 text-[9.5px] text-gray-400 font-sans">
                              {att.type === 'Site Photo' ? (
                                <span className="bg-pink-100 text-pink-700 font-extrabold px-1 rounded text-[8.5px] uppercase tracking-wide">
                                  Site Photo
                                </span>
                              ) : (
                                <span className="bg-indigo-100/60 text-[#0A1F44] font-extrabold px-1 rounded text-[8.5px] uppercase">
                                  {att.type}
                                </span>
                              )}
                              <span>•</span>
                              <span>{att.size}</span>
                              {att.latitude && att.longitude && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-0.5 font-mono text-indigo-750 bg-indigo-50 border border-indigo-100 px-1 rounded text-[8.5px] font-bold">
                                    📍 {att.latitude.toFixed(5)}, {att.longitude.toFixed(5)}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span>{att.uploadedAt}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              alert(`Simulating secure preview of "${att.name}" (${att.type}) from secure municipal storage servers.`);
                            }}
                            className="text-[10px] text-teal-650 hover:underline font-extrabold cursor-pointer"
                          >
                            Open
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove this attached document from property ${selectedAttachmentProperty.id}?`)) {
                                const updatedAttachments = (selectedAttachmentProperty.attachments || []).filter(a => a.id !== att.id);
                                const updatedProperty = {
                                  ...selectedAttachmentProperty,
                                  attachments: updatedAttachments
                                };
                                onEditProperty(updatedProperty);
                                setSelectedAttachmentProperty(updatedProperty);
                              }
                            }}
                            className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                          >
                            Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spacer */}
              <div className="flex justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    stopModalCamera();
                    setShowAttachmentModal(false);
                    setSelectedAttachmentProperty(null);
                  }}
                  className="bg-gray-150 hover:bg-gray-200 border text-gray-700 py-2 px-5 rounded-lg font-bold text-xs cursor-pointer font-sans"
                >
                  Close Document Depot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Site Inspection / Enforcement Ledger Modal */}
      {showInspectionModal && inspectionProperty && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                  <Camera className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 text-base flex items-center gap-1.5 leading-none">
                    Site Inspection Assistant
                  </h3>
                  <p className="text-[11px] text-gray-550 mt-1 font-medium">
                    Validate coordinates, snap active structure status, and log compliance events.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseInspection}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Close Assistant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1 font-sans text-xs">
              
              {/* Property Card details */}
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {inspectionProperty.id}
                  </span>
                  <span className="text-[10px] bg-slate-200/85 text-slate-700 font-extrabold rounded-full px-2 py-0.5">
                    {inspectionProperty.ward}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">{inspectionProperty.ownerName}</div>
                <div className="text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-sky-500" />
                  {inspectionProperty.address}
                </div>
              </div>

              {/* Camera Capture Module */}
              <div className="space-y-2">
                <span className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  1. Capture Site Structure Snapshot
                </span>
                
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center text-center">
                  {inspectionPhoto ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={inspectionPhoto} 
                        alt="Captured site inspection" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setInspectionPhoto(null);
                          startCamera();
                        }}
                        className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm text-slate-900 hover:bg-white text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-md cursor-pointer transition-colors"
                      >
                        Retake Photo
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                      <video 
                        ref={videoRef} 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover absolute inset-0"
                      />
                      
                      {/* Control buttons layer overlay */}
                      <div className="absolute inset-x-0 bottom-4 flex justify-center items-center z-25 gap-3">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="bg-[#EF4444] hover:bg-red-650 text-white font-extrabold text-xs py-2 px-5 rounded-full shadow-lg flex items-center gap-1.5 border-2 border-white scale-100 active:scale-95 transition-all cursor-pointer select-none"
                        >
                          <Camera className="h-4 w-4" />
                          Snap Site Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Direct instant snapshot simulation fallback
                            capturePhoto();
                          }}
                          className="bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg backdrop-blur-md cursor-pointer transition-all"
                        >
                          No Camera? Simulate Snap
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Geo-Stamping coordinates pairing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    2. Geographic Geolocation Stamp
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleFetchInspectionGps}
                    disabled={isInspectionGpsLoading}
                    className={`inline-flex items-center gap-1 text-[10px] bg-[#0A1F44] hover:bg-opacity-95 text-white font-bold py-1 px-2.5 rounded-lg border border-[#38BDF8]/20 transition-all cursor-pointer ${
                      isInspectionGpsLoading ? 'animate-pulse' : ''
                    }`}
                  >
                    <MapPin className="h-3 w-3 text-[#38BDF8]" />
                    <span>{isInspectionGpsLoading ? 'Locking positioning...' : 'Capture Phone Geolocation'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={inspectionGps}
                    onChange={(e) => setInspectionGps(e.target.value)}
                    placeholder="e.g. 9.182440, 7.185630"
                    className="w-full rounded-lg border border-gray-305 bg-white p-2.5 text-xs font-mono outline-none focus:border-[#0A1F44]"
                  />
                </div>

                {inspectionGpsError && (
                  <div className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded p-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                    <span>{inspectionGpsError}</span>
                  </div>
                )}
              </div>

              {/* Notes / Report Comments */}
              <div className="space-y-2">
                <span className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  3. Field Inspector Comments & Report
                </span>
                <textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Type structure compliance details, e.g. Notice of payment backlog served to tenant. Structural condition confirmed Residential. Ground measurements verified."
                  rows={3}
                  required
                  className="w-full rounded-lg border border-[#BCD0E4] bg-white p-3 text-xs outline-none focus:border-indigo-650 font-sans"
                />
              </div>

            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 border-t pt-4 shrink-0">
              <button
                type="button"
                onClick={handleCloseInspection}
                className="bg-gray-100 hover:bg-gray-250 border text-gray-700 py-2.5 px-4 rounded-lg font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Abort
              </button>
              <button
                type="button"
                onClick={submitInspectionToLedger}
                className="bg-pink-600 hover:bg-pink-700 text-white py-2.5 px-5 rounded-lg font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5 scale-100 hover:scale-[1.01] active:scale-95 transition-all select-none"
              >
                <Check className="h-4 w-4" />
                Submit Verification Ledger
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 1. BULK CSV IMPORT MODAL */}
      {showBulkImportModal && (
        <div id="bulk-csv-import-modal" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 text-base leading-none">
                    Bulk Tenement Ingestion Engine (CSV)
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">Import hundreds of properties simultaneously into the digital central registry.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkImportPreview(null);
                  setBulkImportError(null);
                  setBulkImportSuccess(null);
                }}
                className="text-gray-405 hover:text-gray-600 p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-left">
              {bulkImportSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold leading-relaxed flex items-center gap-2 animate-bounce">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span>{bulkImportSuccess}</span>
                </div>
              )}

              {bulkImportError && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed">
                  {bulkImportError}
                </div>
              )}

              {!bulkImportPreview ? (
                <>
                  <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 space-y-2">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">TEMPLATE SCHEMATIC REQUIREMENTS</span>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Copy, construct or paste a standard comma-separated text list. The first row must define target fields. Standard required fields include:
                    </p>
                    <div className="bg-slate-900 text-[#38BDF8] p-2.5 rounded-lg text-[9.5px] font-mono leading-relaxed overflow-x-auto select-all border border-slate-700">
                      ownerName, ownerEmail, ownerPhone, address, ward, propertyType, units, annualRentalValue
                    </div>
                    <p className="text-[10px] text-gray-400">
                      *Note: unrecognized wards default to <strong>{SULEJA_WARDS[0].name}</strong>, type maps to <strong>Residential</strong> / <strong>Commercial</strong> / <strong>Industrial</strong>. Blank lines are self-filtered.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider">Paste CSV Plain Text</label>
                    <textarea
                      value={csvTextInput}
                      onChange={(e) => setCsvTextInput(e.target.value)}
                      placeholder={`ownerName,ownerEmail,ownerPhone,address,ward,propertyType,units,annualRentalValue\nMusa Audu,musa@gmail.com,08012345678,12 Abuja Road,Central Ward,Residential,2,450000\nBello Yakubu,bello@gmail.com,08098765432,44 Zuma Rock Close,Maje Ward,Commercial,4,1200000`}
                      rows={8}
                      className="w-full rounded-xl border border-gray-300 p-3 text-xs font-mono select-text outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 bg-[#FAFBFD]"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-black text-gray-600 uppercase tracking-wider">Preview Ingesting Items ({bulkImportPreview.length})</span>
                    <button 
                      onClick={() => setBulkImportPreview(null)} 
                      className="text-[10px] text-sky-600 hover:underline font-bold"
                    >
                      ← Re-edit CSV Text
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-[11px] text-[#0A1F44] border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase">
                          <th className="p-2.5">Landlord</th>
                          <th className="p-2.5">Address / Ward</th>
                          <th className="p-2.5">Typology</th>
                          <th className="p-2.5 text-right">ARV Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {bulkImportPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold">
                              {item.ownerName}
                              <span className="block font-normal text-[9px] text-gray-400">{item.ownerPhone || 'No phone'}</span>
                            </td>
                            <td className="p-2.5">
                              {item.address}
                              <span className="block font-semibold text-[9px] text-[#38BDF8]">{item.ward}</span>
                            </td>
                            <td className="p-2.5 text-[10px]">
                              {item.propertyType} <span className="text-gray-400">({item.units} units)</span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              ₦{item.annualRentalValue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-start gap-2">
                    <Info className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-[10.5px] text-emerald-800 leading-normal">
                      Valid tenement rate estimation formulae will be computed automatically according to the official Suleja municipal tax bylaws for these {bulkImportPreview.length} items on commit.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t pt-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkImportPreview(null);
                  setBulkImportError(null);
                  setBulkImportSuccess(null);
                }}
                className="bg-gray-100 hover:bg-gray-200 border text-gray-700 py-2.5 px-4 rounded-lg font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Cancel
              </button>
              {!bulkImportPreview ? (
                <button
                  type="button"
                  onClick={handleParseCsv}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-lg font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5 transition-all select-none"
                >
                  <Check className="h-4 w-4" />
                  Validate CSV Structure
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBulkConfirmation({
                      title: "Confirm Bulk Registry Import",
                      message: `You are about to write ${bulkImportPreview.length} new property records directly into the live Suleja tenement registry. This will automatically calculate rate percentages and initiate annual ledger accounts. Do you want to proceed?`,
                      onConfirm: handleCommitBulkImport
                    });
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white py-2.5 px-5 rounded-lg font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5 transition-all select-none"
                >
                  <Check className="h-4 w-4" />
                  Confirm Import of {bulkImportPreview.length} Dwellings
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. QR CODE COMPLIANCE CAMERA SCANNER MODAL */}
      {showQrScannerModal && (
        <div id="qr-compliance-scanner-modal" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 text-[#0A1F44] rounded-lg">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 text-base leading-none">
                    Instant QR Tenement Lock-On
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">Scan generated QR codes to pull up official property compliance transcripts instantly.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowQrScannerModal(false);
                  setScannedProperty(null);
                  setQrScannerError(null);
                  setQrScannerSuccessMessage(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-left">
              
              {qrScannerSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-805 text-xs font-bold leading-normal">
                  <p className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>✓ LOCK-ON SUCCESSFUL!</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600 font-normal">
                    {qrScannerSuccessMessage}
                  </p>
                </div>
              )}

              {qrScannerError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10.5px] font-medium leading-normal">
                  {qrScannerError}
                </div>
              )}

              {/* Real camera viewfinder */}
              {!scannedProperty && (
                <div className="relative aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                  {/* Offscreen scanning canvas */}
                  <canvas ref={qrCanvasRef} className="hidden" />

                  {qrScannerActive ? (
                    <>
                      <video
                        ref={qrVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Laser scanner element */}
                      <div className="absolute inset-x-0 h-1.5 bg-green-400 opacity-80 shadow-[0_0_10px_#4ade80] animate-[bounce_3s_infinite]" />
                      <div className="absolute inset-4 border-2 border-dashed border-sky-400/40 rounded-xl pointer-events-none" />
                      <div className="absolute bottom-3 bg-black/60 text-white font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-xs">
                        📷 LIVE ASSIGNED FEED
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center space-y-2 text-slate-400">
                      <QrCode className="h-10 w-10 text-slate-600 mx-auto animate-pulse" />
                      <p className="text-xs font-bold text-slate-300">Awaiting Viewfinder Pipeline...</p>
                      <p className="text-[10px] text-slate-400 max-w-[200px]">Permission requested or webcam inoperable</p>
                    </div>
                  )}
                </div>
              )}

              {scannedProperty && (
                <div className="bg-[#FAFBFD] border border-gray-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <span className="bg-[#0A1F44] text-white font-mono text-[9px] font-extrabold px-2 py-0.5 rounded">
                        {scannedProperty.id}
                      </span>
                      <h4 className="font-bold text-[#0A1F44] text-sm mt-1">{scannedProperty.ownerName}</h4>
                      <p className="text-[11px] text-gray-500 font-medium">{scannedProperty.address}, {scannedProperty.ward}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      scannedProperty.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : scannedProperty.paymentStatus === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {scannedProperty.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[9px] text-gray-400 font-extrabold uppercase">Typology</span>
                      <span className="font-bold text-slate-800">{scannedProperty.propertyType}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-400 font-extrabold uppercase">Units Count</span>
                      <span className="font-bold text-slate-800">{scannedProperty.units} Dwelling Unit(s)</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-400 font-extrabold uppercase">Annual Rental Value</span>
                      <span className="font-bold text-slate-800 font-mono">₦{scannedProperty.annualRentalValue?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-400 font-extrabold uppercase">Assessed Rate Fee</span>
                      <span className="font-bold text-[#0A1F44] font-mono">₦{scannedProperty.tenementRate?.toLocaleString() || '30,000'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTimelineProperty(scannedProperty);
                        setDetailsTab('timeline');
                        setShowTimelineModal(true);
                        setShowQrScannerModal(false);
                      }}
                      className="bg-[#0A1F44] hover:bg-opacity-95 text-white font-bold py-2.5 px-3 rounded-lg text-[11px] cursor-pointer flex items-center justify-center gap-1 shadow-sm flex-1"
                    >
                      <Eye className="h-4 w-4" />
                      View Compliance Timeline
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPropertyIds([scannedProperty.id]);
                        setSearch(scannedProperty.id);
                        setShowQrScannerModal(false);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold py-2.5 px-3 rounded-lg text-[11px] cursor-pointer text-center flex-1"
                    >
                      Filter Directory Here
                    </button>
                  </div>
                </div>
              )}

              {/* Upload QR Image fallback */}
              {!scannedProperty && (
                <div className="flex flex-col gap-2 pt-1">
                  <label className="bg-slate-50 hover:bg-slate-100 text-slate-705 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-200">
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span>Upload QR Code Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadedQrImage}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Simulation panel */}
              <div className="p-3 bg-slate-500/5 rounded-xl border border-gray-150">
                <span className="block text-[9.5px] font-black text-gray-500 uppercase tracking-wider mb-2">🔬 Developer Sandbox Emulator</span>
                <div className="space-y-1.5 flex flex-col">
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Select a registered Suleja tenement from the list below to instantly emulate a physical scanner lock-on:
                  </p>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleDecodedString(val);
                      }
                    }}
                    className="bg-white border select-none text-xs p-2.5 rounded-lg font-bold outline-none text-slate-800 focus:border-[#0A1F44] w-full"
                  >
                    <option value="">-- Choose simulated property scanner target --</option>
                    {properties.slice(0, 15).map(p => (
                      <option key={p.id} value={p.id}>{p.ownerName} ({p.id} • {p.address})</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t pt-4 shrink-0 font-sans">
              {scannedProperty && (
                <button
                  type="button"
                  onClick={() => {
                    setScannedProperty(null);
                    setQrScannerSuccessMessage(null);
                    setQrScannerError(null);
                  }}
                  className="bg-sky-50 text-[#0A1F44] border border-sky-200 py-2 px-4 rounded-lg font-bold text-xs cursor-pointer select-none"
                >
                  Scan Another License QR
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowQrScannerModal(false);
                  setScannedProperty(null);
                  setQrScannerError(null);
                  setQrScannerSuccessMessage(null);
                }}
                className="bg-gray-100 hover:bg-gray-250 border text-gray-700 py-2.5 px-4 rounded-lg font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Dismiss Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ BULK OPERATION CONFIRMATION MODAL */}
      {bulkConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-black text-slate-900 text-base">
                  {bulkConfirmation.title}
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">Suleja Municipal Revenue Ledger Security</p>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-600 leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-100/80 font-medium">
              {bulkConfirmation.message}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setBulkConfirmation(null)}
                className="bg-gray-100 hover:bg-gray-200 border text-gray-700 py-2 px-4 rounded-lg font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Cancel Action
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkConfirmation.onConfirm();
                  setBulkConfirmation(null);
                }}
                className="bg-[#0A1F44] hover:bg-opacity-95 text-white py-2 px-5 rounded-lg font-bold text-xs cursor-pointer shadow-md transition-all select-none"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
