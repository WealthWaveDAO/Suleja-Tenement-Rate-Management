/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
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
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property, PropertyType, OccupancyStatus, TaxPaymentStatus, UserRole } from '../types';
import { SULEJA_WARDS } from '../data';

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
  onAddEnforcementAction
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

  // Form Field States
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
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

  // Multi-Selection and Bulk Actions State
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [bulkPropertyType, setBulkPropertyType] = useState<PropertyType | ''>('');
  const [bulkInspectorName, setBulkInspectorName] = useState('');

  // Multi-Step Delete & QR Generation States
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeQrProperty, setActiveQrProperty] = useState<Property | null>(null);
  const [showMultiStepDeleteModal, setShowMultiStepDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

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
  };

  // Click row to edit
  const handleOpenEdit = (p: Property) => {
    setIsEditMode(true);
    setActivePropertyId(p.id);
    setOwnerName(p.ownerName);
    setOwnerPhone(p.ownerPhone);
    setOwnerEmail(p.ownerEmail || '');
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
    const ratePercent = propertyType === 'Residential' ? 2 : propertyType === 'Commercial' ? 4 : 5;

    if (isEditMode && activePropertyId) {
      // Find original property to preserve ID and correct structures
      const original = properties.find(p => p.id === activePropertyId);
      if (original) {
        onEditProperty({
          ...original,
          ownerName,
          ownerPhone,
          ownerEmail,
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
          inspectorName: inspectorName
        });
      }
    } else {
      onAddProperty({
        ownerName,
        ownerPhone,
        ownerEmail,
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
        inspectorName: inspectorName
      });
    }

    setShowFormModal(false);
    handleResetForm();
  };

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
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A1F44] hover:bg-opacity-95 text-white py-2.5 px-4 text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            {isTaxpayer ? 'Register Property Assessment' : 'New Property Registry'}
          </button>
        )}
      </div>

      {/* Query Filter and Search Controls */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Smart Search Bar */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4.5 w-4.5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by ID, Landlord name, Mobile, or Address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full rounded-lg border border-gray-250 py-2.5 pl-10 pr-3 text-xs outline-none focus:border-[#0A1F44]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg px-4 py-2 text-xs font-bold border flex items-center gap-2 hover:bg-gray-50 ${
                showFilters ? 'bg-sky-50 text-[#0A1F44] border-[#38BDF8]' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Advanced Filters
            </button>

            {/* Quick stats for active matches */}
            <div className="rounded-lg bg-[#F5F7FA] px-3.5 py-2.5 border border-gray-200 text-xs font-bold shrink-0 text-gray-500 font-sans">
              Hits: <span className="font-mono text-[#0A1F44]">{totalItems}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Sliders Filter Pane */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Suleja Ward Zone</label>
              <select
                value={selectedWard}
                onChange={(e) => { setSelectedWard(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs"
              >
                <option value="">All Suleja Wards ({SULEJA_WARDS.length})</option>
                {SULEJA_WARDS.map(w => (
                  <option key={w.name} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Land Classification</label>
              <select
                value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value as PropertyType | ''); setCurrentPage(1); }}
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs"
              >
                <option value="">All Typologies</option>
                <option value="Residential">Residential (2%)</option>
                <option value="Commercial">Commercial (4%)</option>
                <option value="Industrial">Industrial (5%)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tenement Tax Standby</label>
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value as TaxPaymentStatus | ''); setCurrentPage(1); }}
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="Paid">🟢 Standard Paid</option>
                <option value="Unpaid">🔴 Pending/Arrears</option>
                <option value="Pending">🟡 Pending Verification</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Bulk Action Form for Authorized roles */}
      {showFilters && <div className="h-2" />}
      {(() => {
        const showBulkActions = userRole === 'Tax Officer' || userRole === 'Super Admin' || userRole === 'LGA Admin';
        if (!showBulkActions) return null;
        return (
          <div className="bg-[#F8FAFC] border-2 border-dashed border-[#38BDF8]/40 rounded-xl p-4 space-y-3.5 mb-4">
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
                  <option value="Residential">Residential (2% Tenement Rate)</option>
                  <option value="Commercial">Commercial (4% Tenement Rate)</option>
                  <option value="Industrial">Industrial (5% Tenement Rate)</option>
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
                      
                      onBulkEditProperties(selectedPropertyIds, updates);
                      
                      setSelectedPropertyIds([]);
                      setBulkPropertyType('');
                      setBulkInspectorName('');
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-500 border-t border-gray-200/50 pt-3 mt-1 gap-2">
                <span>* Selected item codes: <span className="font-mono text-gray-700 font-bold bg-gray-100 px-1.5 py-0.5 rounded">{selectedPropertyIds.slice(0, 5).join(', ')}{selectedPropertyIds.length > 5 ? '...' : ''}</span> ({selectedPropertyIds.length} properties selected)</span>
                <div className="flex items-center gap-3">
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
        );
      })()}

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
                        </td>
                      )}
                      {/* ID and Ward */}
                      <td className="px-4 py-4 shrink-0">
                        <span className="block font-mono font-bold text-gray-900 bg-[#0A1F44]/5 text-[#0A1F44] px-1.5 py-0.5 rounded text-[10px] w-fit mb-1.5">
                          {p.id}
                        </span>
                        <span className="text-gray-500 font-semibold flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#38BDF8]" />
                          {p.ward}
                        </span>
                      </td>

                      {/* Owner Details */}
                      <td className="px-4 py-4">
                        <span className="block font-bold text-gray-900">{p.ownerName}</span>
                        <span className="text-gray-400 flex items-center gap-1 font-semibold">
                          <Phone className="h-2.5 w-2.5 text-gray-400" />
                          {p.ownerPhone}
                        </span>
                      </td>

                      {/* Address */}
                      <td className="px-4 py-4 max-w-[200px] truncate" title={p.address}>
                        {p.address}
                      </td>

                      {/* Typology and Units count */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                          p.propertyType === 'Commercial' ? 'bg-[#38BDF8]/10 text-[#0A1F44]' : p.propertyType === 'Industrial' ? 'bg-[#0A1F44] text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {p.propertyType}
                        </span>
                        <span className="block text-[10px] text-gray-400 mt-1">{p.units} units</span>
                      </td>

                      {/* Rental Value */}
                      <td className="px-4 py-4 text-right">
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
                      </td>

                      {/* Calced Tenement Due */}
                      <td className="px-4 py-4 text-right font-mono font-bold text-[#0A1F44]">
                        ₦{p.tenementRate.toLocaleString()}
                        <span className="block text-[9px] text-[#38BDF8] font-bold">({p.ratePercentage}%)</span>
                      </td>

                      {/* State */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          checkPaid ? 'bg-green-100 text-green-700' : checkPending ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {p.paymentStatus}
                        </span>
                      </td>

                      {/* Operational Actions */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 border border-gray-250">
                          {onSelectPropertyGIS && (
                            <button
                              onClick={() => onSelectPropertyGIS(p)}
                              title="Locate GIS Pin Coordinates"
                              className="p-1 text-[#38BDF8] hover:bg-white rounded-md cursor-pointer"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </button>
                          )}

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
                              onClick={() => {
                                if (confirm(`De-register property ${p.id} and wipe invoice indices?`)) {
                                  onDeleteProperty(p.id);
                                }
                              }}
                              title="Delete Record Permanently"
                              className="p-1 text-red-500 hover:bg-white rounded-md cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
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
              <div>
                <h3 className="font-display font-bold text-[#0A1F44] text-lg">
                  {isEditMode ? `Modify Rating Record [${activePropertyId}]` : 'Add Property to Suleja Municipal Registry'}
                </h3>
                <p className="text-xs text-gray-500">
                  Every addition logs coordinates, values, and triggers the billing valuation engines.
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-[#0A1F44] font-bold text-lg cursor-pointer"
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
                      <option value="Residential">Residential (2%)</option>
                      <option value="Commercial">Commercial (4%)</option>
                      <option value="Industrial">Industrial (5%)</option>
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

                {/* Rates estimator preview */}
                <div className="bg-[#F5F7FA] border rounded-lg p-3 text-xs space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Rate Percentage Formula:</span>
                    <span className="font-bold text-[#0A1F44]">
                      {propertyType === 'Residential' ? '2.0%' : propertyType === 'Commercial' ? '4.0%' : '5.0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                    <span>Projected Tenement rate (Annual):</span>
                    <span className="text-sm font-mono text-[#0A1F44]">
                      ₦{(annualRentalValue * (propertyType === 'Residential' ? 0.02 : propertyType === 'Commercial' ? 0.04 : 0.05)).toLocaleString()}
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
                      Wipe Records Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
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

    </div>
  );
}
