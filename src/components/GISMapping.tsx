/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import { 
  Building2, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Search, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Clock, 
  X,
  Mic,
  MicOff,
  Map,
  BadgeAlert,
  Home,
  Factory
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Property, TaxPaymentStatus } from '../types';
import { SULEJA_WARDS } from '../data';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

function MapRecenter({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);
  return null;
}

interface GISMappingProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onClearSelection?: () => void;
}

export default function GISMapping({ properties, selectedProperty, onClearSelection }: GISMappingProps) {
  
  const [mapMode, setMapMode] = useState<'interactive' | 'simulated'>(hasValidKey ? 'interactive' : 'simulated');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 9.1805, lng: 7.185 });
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [activeWardFilter, setActiveWardFilter] = useState<string>('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<TaxPaymentStatus | ''>('');
  const [gisSearchQuery, setGisSearchQuery] = useState<string>('');
  
  // Voice Search States for GIS module
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'en-NG'; // Nigeria English language localization
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      rec.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          const cleanedText = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
          setGisSearchQuery(cleanedText);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error in GIS mapping:", e);
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
        console.error("Failed to start voice search in GIS:", e);
      }
    }
  };
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true); // default to true so users see it immediately! Or we can toggle it. Let's start with true.
  const [heatmapType, setHeatmapType] = useState<'compliance' | 'delinquency'>('delinquency');
  const [hoveredProperty, setHoveredProperty] = useState<Property | null>(null);
  
  const [showWardBoundaries, setShowWardBoundaries] = useState<boolean>(true);
  const [showComplianceHotspots, setShowComplianceHotspots] = useState<boolean>(true);
  const [showPropertyPins, setShowPropertyPins] = useState<boolean>(true);

  // Geolocation States
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const projectedUserLocation = useMemo(() => {
    if (!userLocation) return null;
    const minLat = 9.15;
    const maxLat = 9.22;
    const minLng = 7.15;
    const maxLng = 7.24;
    
    // Scale user location into 100% SVG coordinates
    const x = ((userLocation.longitude - minLng) / (maxLng - minLng)) * 100;
    const y = 100 - (((userLocation.latitude - minLat) / (maxLat - minLat)) * 100);
    
    const isOut = userLocation.latitude < minLat || userLocation.latitude > maxLat || userLocation.longitude < minLng || userLocation.longitude > maxLng;
    
    return {
      x: Math.max(5, Math.min(x, 95)),
      y: Math.max(5, Math.min(y, 95)),
      isOut,
      lat: userLocation.latitude,
      lng: userLocation.longitude
    };
  }, [userLocation]);

  const handleLocateMe = () => {
    setIsLocating(true);
    setGeolocationError(null);
    if (!navigator.geolocation) {
      setGeolocationError("Geolocation is not supported by this browser.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setZoomScale(1.5);
        setPanX(0);
        setPanY(0);
      },
      (error) => {
        setIsLocating(false);
        console.warn("Geolocation query failed, placing centered demo agent coordinate.", error);
        // Fallback to a demo location inside Suleja so they can test the feature beautifully
        setUserLocation({
          latitude: 9.1804 + (Math.random() - 0.5) * 0.02,
          longitude: 7.1904 + (Math.random() - 0.5) * 0.02
        });
        setGeolocationError("Unable to retrieve GPS. Centering demo agent coordinates inside Suleja.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // Dynamic ward-level compliance rate calculations for heatmaps
  const wardComplianceStats = useMemo(() => {
    const minLat = 9.15;
    const maxLat = 9.22;
    const minLng = 7.15;
    const maxLng = 7.24;

    return SULEJA_WARDS.map((w) => {
      const wardProps = properties.filter(p => p.ward === w.name);
      const totalCount = wardProps.length;
      const paidCount = wardProps.filter(p => p.paymentStatus === 'Paid').length;
      const complianceRate = totalCount > 0 ? (paidCount / totalCount) * 100 : 50;

      const x = ((w.centerLng - minLng) / (maxLng - minLng)) * 100;
      const y = 100 - (((w.centerLat - minLat) / (maxLat - minLat)) * 100);

      return {
        name: w.name,
        x,
        y,
        totalCount,
        paidCount,
        complianceRate: Math.round(complianceRate)
      };
    });
  }, [properties]);

  // Dynamic ward-level delinquency density calculations for heatmaps
  const wardDelinquentStats = useMemo(() => {
    const minLat = 9.15;
    const maxLat = 9.22;
    const minLng = 7.15;
    const maxLng = 7.24;

    return SULEJA_WARDS.map((w) => {
      const wardProps = properties.filter(p => p.ward === w.name);
      const totalCount = wardProps.length;
      const delinquentProps = wardProps.filter(p => p.paymentStatus === 'Unpaid');
      const delinquentCount = delinquentProps.length;
      const delinquentRate = totalCount > 0 ? (delinquentCount / totalCount) * 100 : 0;
      const delinquentVolume = delinquentProps.reduce((sum, p) => sum + p.tenementRate, 0);

      const x = ((w.centerLng - minLng) / (maxLng - minLng)) * 100;
      const y = 100 - (((w.centerLat - minLat) / (maxLat - minLat)) * 100);

      return {
        name: w.name,
        x,
        y,
        totalCount,
        delinquentCount,
        delinquentRate: Math.round(delinquentRate),
        delinquentVolume
      };
    });
  }, [properties]);

  // Construct D3 color scale to interpolate the geographic delinquency heat gradient
  const d3ColorScale = useMemo(() => {
    return d3.scaleLinear<string>()
      .domain([0, 45, 70, 100])
      .range(['#ef4444', '#f59e0b', '#3b82f6', '#10b981']);
  }, []);

  // Construct D3 color scale to interpolate the geographic delinquency density gradient
  const d3DelinquencyColorScale = useMemo(() => {
    return d3.scaleLinear<string>()
      .domain([0, 15, 30, 50])
      .range(['#10b981', '#3b82f6', '#f59e0b', '#ef4444']);
  }, []);

  // Focus property clicked from external tab, or local click
  const [localFocusedProperty, setLocalFocusedProperty] = useState<Property | null>(null);

  // Synchronise if external selection occurred
  const activePropertyFocus = selectedProperty || localFocusedProperty;

  useEffect(() => {
    if (activePropertyFocus) {
      setMapCenter({ lat: activePropertyFocus.latitude, lng: activePropertyFocus.longitude });
      setMapZoom(16);
      
      // Center and zoom simulated map
      const minLat = 9.15;
      const maxLat = 9.22;
      const minLng = 7.15;
      const maxLng = 7.24;
      const x = ((activePropertyFocus.longitude - minLng) / (maxLng - minLng)) * 100;
      const y = 100 - (((activePropertyFocus.latitude - minLat) / (maxLat - minLat)) * 100);
      
      setZoomScale(1.8);
      setPanX(50 - x);
      setPanY(50 - y);
    } else if (activeWardFilter) {
      const selectedWard = SULEJA_WARDS.find(w => w.name === activeWardFilter);
      if (selectedWard) {
        setMapCenter({ lat: selectedWard.centerLat, lng: selectedWard.centerLng });
        setMapZoom(15);
        
        // Center simulated map on ward
        const minLat = 9.15;
        const maxLat = 9.22;
        const minLng = 7.15;
        const maxLng = 7.24;
        const x = ((selectedWard.centerLng - minLng) / (maxLng - minLng)) * 100;
        const y = 100 - (((selectedWard.centerLat - minLat) / (maxLat - minLat)) * 100);
        
        setZoomScale(1.4);
        setPanX(50 - x);
        setPanY(50 - y);
      }
    } else {
      setZoomScale(1);
      setPanX(0);
      setPanY(0);
    }
  }, [activePropertyFocus, activeWardFilter]);

  // Filter properties mapped onto our virtual GIS coordinates
  const filteredGISProps = useMemo(() => {
    return properties.filter((p) => {
      const matchWard = activeWardFilter ? p.ward === activeWardFilter : true;
      const matchStatus = activeStatusFilter ? p.paymentStatus === activeStatusFilter : true;
      const matchSearch = gisSearchQuery 
        ? p.id.toLowerCase().includes(gisSearchQuery.toLowerCase()) || p.ownerName.toLowerCase().includes(gisSearchQuery.toLowerCase())
        : true;
      return matchWard && matchStatus && matchSearch;
    });
  }, [properties, activeWardFilter, activeStatusFilter, gisSearchQuery]);

  // Project property geographic coordinates (lat 9.15 to 9.22, lng 7.15 to 7.24) and bind them deterministically into SVG viewBox percentage coords
  // Lat range: 9.15 (bottom) to 9.22 (top)
  // Lng range: 7.15 (left) to 7.24 (right)
  const mapCoordinates = useMemo(() => {
    const minLat = 9.15;
    const maxLat = 9.22;
    const minLng = 7.15;
    const maxLng = 7.24;

    return filteredGISProps.map((p) => {
      // Scale into X/Y coordinates bounded within SVG (0 to 100%)
      const x = ((p.longitude - minLng) / (maxLng - minLng)) * 100;
      // Latitude increases upwards, so we subtract from 100 to map onto screen coordinates
      const y = 100 - (((p.latitude - minLat) / (maxLat - minLat)) * 100);
      return {
        property: p,
        x: Math.max(2, Math.min(x, 98)), // keep within boundaries
        y: Math.max(2, Math.min(y, 98))
      };
    });
  }, [filteredGISProps]);

  // Ward outlines coordinates simulation relative to scale
  const simulatedWardOutlines = useMemo(() => {
    const minLat = 9.15;
    const maxLat = 9.22;
    const minLng = 7.15;
    const maxLng = 7.24;

    return SULEJA_WARDS.map((w) => {
      const x = ((w.centerLng - minLng) / (maxLng - minLng)) * 100;
      const y = 100 - (((w.centerLat - minLat) / (maxLat - minLat)) * 100);
      return {
        name: w.name,
        x,
        y
      };
    });
  }, []);

  const handleSelectPin = (p: Property) => {
    setLocalFocusedProperty(p);
  };

  const handleCloseFocusCard = () => {
    setLocalFocusedProperty(null);
    if (onClearSelection) onClearSelection();
  };

  const handleMapReset = () => {
    setZoomScale(1);
    setPanX(0);
    setPanY(0);
    handleCloseFocusCard();
  };

  // Stats summaries
  const statsPaid = useMemo(() => properties.filter(p => p.paymentStatus === 'Paid').length, [properties]);
  const statsUnpaid = useMemo(() => properties.filter(p => p.paymentStatus === 'Unpaid').length, [properties]);
  const statsPending = useMemo(() => properties.filter(p => p.paymentStatus === 'Pending').length, [properties]);

  return (
    <div className="space-y-6 fade-in select-none">
      
      {/* Page Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-[#0A1F44]">Suleja Municipal GIS Property Intelligence</h1>
        <p className="text-xs text-gray-500 font-medium">
          Interactive coordinate zoning mapping system plotting registered properties. Click pins to review active tax portfolios.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* GIS Interactive Command Console Map Viewer */}
        <div className="lg:col-span-8 bg-[#0a1424] text-white rounded-xl border border-gray-800 p-4 relative overflow-hidden flex flex-col justify-between min-h-[500px]">
          {/* Futuristic grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f1f3a_1px,transparent_1px),linear-gradient(to_bottom,#0f1f3a_1px,transparent_1px)] bg-[size:30px_30px] opacity-35" />
          
          {/* GIS Controls HUD */}
          <div className="relative z-10 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-[#38BDF8] animate-spin" style={{ animationDuration: '6s' }} />
              <div>
                <span className="block text-[10px] font-mono font-bold tracking-wider text-[#38BDF8]">SULEJA GEODESIC OVERLAY</span>
                <span className="text-xs font-semibold text-gray-300">Scale: {(zoomScale * 100).toFixed(0)}% • Plots Rendered: {filteredGISProps.length}</span>
              </div>
            </div>

            {/* Map Mode Selector */}
            <div className="flex flex-wrap gap-2 items-center mt-2 sm:mt-0">
              <div className="flex items-center bg-[#162F5D]/85 border border-white/10 rounded-lg p-0.5 text-[10px] font-extrabold shadow-md font-sans">
                <button
                  type="button"
                  onClick={() => setMapMode('interactive')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    mapMode === 'interactive' 
                      ? 'bg-sky-550 text-white shadow-xs' 
                      : 'text-sky-250 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🛰️ Interactive Map
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode('simulated')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    mapMode === 'simulated' 
                      ? 'bg-sky-550 text-white shadow-xs' 
                      : 'text-sky-250 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ⚡ Geodesic Overlay
                </button>
              </div>
            </div>

            {/* Scale operations buttons */}
              <div className="flex gap-1 items-center bg-[#162F5D] border border-white/5 rounded-lg p-0.5 shadow-md">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                title="Retrieve browser GPS location"
                className="p-1.5 hover:bg-white/10 rounded-md text-emerald-300 hover:text-emerald-200 cursor-pointer flex items-center gap-1 border-r border-white/10"
              >
                <MapPin className={`h-4 w-4 ${isLocating ? 'animate-bounce' : ''}`} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider pr-1">Locate Me</span>
              </button>

              <button
                onClick={() => setZoomScale(z => Math.min(z + 0.25, 3))}
                title="Increase Zoom Scale"
                className="p-1.5 hover:bg-white/10 rounded-md text-sky-200 cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomScale(z => Math.max(z - 0.25, 0.75))}
                title="Decrease Zoom Scale"
                className="p-1.5 hover:bg-white/10 rounded-md text-sky-200 cursor-pointer"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={handleMapReset}
                className="px-2 text-[10px] font-bold uppercase py-1 text-gray-300 hover:bg-white/10 rounded-md cursor-pointer"
              >
                Reset Spatial view
              </button>
            </div>
          </div>

          {/* Core Visual Geodesic SVG Map Area */}
          <div className="relative z-10 flex-1 my-4 flex items-center justify-center bg-[#060c15] border border-white/5 rounded-lg overflow-hidden min-h-[420px] h-[450px]">
            {mapMode === 'interactive' && hasValidKey && (
              <div className="w-full h-full absolute inset-0 text-slate-900 select-text">
                <APIProvider apiKey={API_KEY} version="weekly">
                  <GoogleMap
                    defaultCenter={mapCenter}
                    defaultZoom={mapZoom}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    mapTypeControl={true}
                  >
                    <MapRecenter center={mapCenter} zoom={mapZoom} />
                    
                    {/* Compliance Heatmap Overlay on Google Map */}
                    {showHeatmap && heatmapType === 'compliance' && wardComplianceStats.map((w) => {
                      const latLng = SULEJA_WARDS.find(sw => sw.name === w.name);
                      if (!latLng) return null;
                      const color = d3ColorScale(w.complianceRate) || '#ef4444';
                      return (
                        <AdvancedMarker
                          key={`interactive-heatmap-comp-${w.name}`}
                          position={{ lat: latLng.centerLat, lng: latLng.centerLng }}
                        >
                          <div 
                            style={{
                              backgroundColor: color,
                              width: `${70 + (Math.sqrt(w.totalCount || 1) * 20)}px`,
                              height: `${70 + (Math.sqrt(w.totalCount || 1) * 20)}px`,
                              borderRadius: '50%',
                              filter: 'blur(22px)',
                              opacity: 0.45,
                              transform: 'translate(-50%, -50%)',
                              pointerEvents: 'none',
                              zIndex: 1
                            }}
                          />
                        </AdvancedMarker>
                      );
                    })}

                    {/* Delinquency Heatmap Overlay on Google Map */}
                    {showHeatmap && heatmapType === 'delinquency' && wardDelinquentStats.map((w) => {
                      const latLng = SULEJA_WARDS.find(sw => sw.name === w.name);
                      if (!latLng) return null;
                      const color = d3DelinquencyColorScale(w.delinquentRate) || '#10b981';
                      return (
                        <AdvancedMarker
                          key={`interactive-heatmap-delinq-${w.name}`}
                          position={{ lat: latLng.centerLat, lng: latLng.centerLng }}
                        >
                          <div 
                            style={{
                              backgroundColor: color,
                              width: `${70 + (Math.sqrt(w.delinquentCount || 1) * 20)}px`,
                              height: `${70 + (Math.sqrt(w.delinquentCount || 1) * 20)}px`,
                              borderRadius: '50%',
                              filter: 'blur(22px)',
                              opacity: 0.45,
                              transform: 'translate(-50%, -50%)',
                              pointerEvents: 'none',
                              zIndex: 1
                            }}
                          />
                        </AdvancedMarker>
                      );
                    })}

                    {/* Custom Ward Label Badges on Google Map */}
                    {showWardBoundaries && SULEJA_WARDS.map((w) => {
                      const stats = wardComplianceStats.find(cs => cs.name === w.name);
                      const compliance = stats ? stats.complianceRate : 50;
                      const color = d3ColorScale(compliance) || '#ef4444';
                      return (
                        <AdvancedMarker
                          key={`interactive-ward-label-${w.name}`}
                          position={{ lat: w.centerLat, lng: w.centerLng }}
                        >
                          <div className="bg-slate-950/90 text-white border border-white/20 px-2.5 py-1.5 rounded-xl text-[10px] font-black font-mono shadow-2xl flex items-center gap-1.5 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 z-10 select-none pointer-events-auto">
                            <span className="h-2 w-2 rounded-full inline-block shrink-0 animate-pulse" style={{ backgroundColor: color }} />
                            <span>{w.name}: <b className="text-[#38BDF8]">{compliance}% Paid</b></span>
                          </div>
                        </AdvancedMarker>
                      );
                    })}

                    {/* Property Pins Layer */}
                    {showPropertyPins && filteredGISProps.map((p) => {
                      const statusColor = 
                        p.paymentStatus === 'Paid' ? '#10B981' : 
                        p.paymentStatus === 'Pending' ? '#F59E0B' : '#EF4444';
                      const isActive = activePropertyFocus?.id === p.id;
                      
                      return (
                        <AdvancedMarker
                          key={`gmarker-${p.id}`}
                          position={{ lat: p.latitude, lng: p.longitude }}
                          onClick={() => setLocalFocusedProperty(p)}
                        >
                          <div className={`relative transition-all duration-300 ${isActive ? 'scale-125 z-50' : 'scale-100 hover:scale-110 z-10'}`}>
                            <div className="flex flex-col items-center cursor-pointer">
                              {/* Pulse halo for active selected pin */}
                              {isActive && (
                                <span className="absolute -top-1.5 w-11 h-11 rounded-full bg-white/20 animate-ping pointer-events-none" />
                              )}
                              {/* Outer custom Pin wrap with payment status icon */}
                              <div 
                                className="flex items-center justify-center rounded-full w-9 h-9 shadow-lg border-2 transition-colors duration-200"
                                style={{
                                  backgroundColor: statusColor,
                                  borderColor: isActive ? '#FFFFFF' : '#060c15',
                                }}
                              >
                                {p.paymentStatus === 'Paid' && (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-white" />
                                )}
                                {p.paymentStatus === 'Pending' && (
                                  <Clock className="h-4.5 w-4.5 text-white animate-pulse" />
                                )}
                                {p.paymentStatus === 'Unpaid' && (
                                  <BadgeAlert className="h-4.5 w-4.5 text-white" />
                                )}
                              </div>
                              {/* Pin pointer tip */}
                              <div 
                                className="w-2.5 h-2.5 -mt-1.5 rotate-45 border-r border-b"
                                style={{
                                  backgroundColor: statusColor,
                                  borderColor: isActive ? '#FFFFFF' : '#060c15',
                                }}
                              />
                            </div>
                          </div>
                        </AdvancedMarker>
                      );
                    })}

                    {/* Compact Property InfoWindow directly on the map when clicked */}
                    {localFocusedProperty && (
                      <InfoWindow
                        position={{ lat: localFocusedProperty.latitude, lng: localFocusedProperty.longitude }}
                        onCloseClick={() => setLocalFocusedProperty(null)}
                      >
                        <div className="p-2.5 text-slate-900 min-w-[210px] font-sans">
                          <div className="flex items-center justify-between border-b border-gray-150 pb-1.5 mb-2 gap-2">
                            <span className="font-mono text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-gray-200">
                              {localFocusedProperty.id}
                            </span>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              localFocusedProperty.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                              localFocusedProperty.paymentStatus === 'Pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {localFocusedProperty.paymentStatus}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-left">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{localFocusedProperty.ownerName}</h4>
                            <p className="text-[10px] text-slate-500 truncate">{localFocusedProperty.address}</p>
                            <p className="text-[9px] text-slate-400 font-medium">{localFocusedProperty.ward} Ward</p>
                            
                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-1.5 rounded font-mono text-[10px] mt-2">
                              <span className="text-slate-500 font-sans text-[9px]">Rate Due:</span>
                              <span className="text-indigo-650 font-bold">₦{localFocusedProperty.tenementRate.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </APIProvider>

                {/* Standard focused card overlay on Google Map */}
                {activePropertyFocus && (
                  <div id="gisFocusOverlay" className="absolute bottom-4 left-4 right-4 md:left-auto md:w-80 bg-[#0c1b30] border border-white/10 rounded-xl p-4 shadow-2xl space-y-3 z-30 fade-in select-text">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block rounded bg-[#38BDF8]/10 text-[#38BDF8] px-1.5 py-0.5 text-[9px] font-mono font-bold text-left">
                          {activePropertyFocus.id}
                        </span>
                        <h4 className="font-display font-bold text-xs sm:text-sm text-white mt-1 truncate text-left">{activePropertyFocus.ownerName}</h4>
                      </div>
                      <button 
                        onClick={handleCloseFocusCard}
                        className="p-1 text-gray-400 hover:text-white rounded-md cursor-pointer shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-gray-300 font-sans text-left">
                      <div className="truncate"><b>Address:</b> {activePropertyFocus.address}</div>
                      <div><b>Ward Zone:</b> {activePropertyFocus.ward}</div>
                      <div><b>Assessed Rate:</b> <span className="font-mono text-[#38BDF8] font-bold">₦{activePropertyFocus.tenementRate.toLocaleString()}</span></div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] mt-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 font-bold uppercase ${
                        activePropertyFocus.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {activePropertyFocus.paymentStatus}
                      </span>
                      
                      <span className="text-[9px] font-mono text-gray-500">GPS: {activePropertyFocus.latitude.toFixed(4)}, {activePropertyFocus.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mapMode === 'interactive' && !hasValidKey && (
              <div className="flex flex-col items-center justify-center p-6 text-center w-full h-full bg-[#0c1b30] border border-sky-500/15 rounded-lg relative z-20">
                <MapPin className="h-10 w-10 text-sky-450 mb-3 animate-bounce" />
                <h3 className="font-display font-bold text-sm text-white mb-2">Google Maps Integration Required</h3>
                <p className="text-gray-300 text-[11px] max-w-sm leading-relaxed mb-4 font-sans">
                  To display Suleja property records on a live, drag-and-drop satellite street map with real-world topography overlays:
                </p>
                <div className="text-left bg-white/5 border border-white/10 rounded-lg p-3.5 space-y-2.5 max-w-sm text-[10.5px] text-gray-300 font-sans mb-4">
                  <div>
                    <span className="font-bold text-sky-300 block mb-0.5">1. Get a standard API Key:</span>
                    <a 
                      href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline font-semibold"
                    >
                      console.cloud.google.com/google/maps-apis
                    </a>
                  </div>
                  <div>
                    <span className="font-bold text-sky-300 block mb-0.5">2. Provide the key in AI Studio:</span>
                    <span className="text-gray-350">
                      Open <b>Settings</b> (⚙️ gear icon) → <b>Secrets</b> → add <code>GOOGLE_MAPS_PLATFORM_KEY</code> → paste key.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMapMode('simulated')}
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer transition font-sans"
                >
                  Use Simulated Geodesic Overlay
                </button>
              </div>
            )}

            {mapMode === 'simulated' && (
              <>
                {/* Geolocation Alerts Overlay */}
                {geolocationError && (
                  <div className="absolute top-3 left-3 right-3 z-30 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-amber-500/40 text-amber-300 font-sans text-[10.5px] font-semibold py-1.5 px-3 rounded-lg flex items-center justify-between shadow-lg gap-2 pointer-events-auto">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      📍 {geolocationError}
                    </span>
                    <button 
                      onClick={() => setGeolocationError(null)} 
                      className="font-extrabold text-white hover:text-amber-250 shrink-0 px-1 py-0.5 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                <div 
                  className="relative w-full max-w-lg aspect-square select-none transition-transform"
                  style={{
                    transform: `scale(${zoomScale}) translate(${panX}%, ${panY}%)`,
                    transformOrigin: 'center center'
                  }}
                >
              <svg 
                viewBox="0 0 100 100" 
                className="w-full h-full"
              >
                <defs>
                  <filter id="heatmap-blur">
                    <feGaussianBlur stdDeviation="3.2" />
                  </filter>
                  <filter id="heatmap-spot-blur">
                    <feGaussianBlur stdDeviation="1.6" />
                  </filter>
                </defs>

                {/* GIS Grid Radar Rings */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="#162f5d" strokeWidth="0.5" strokeDasharray="2 4" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="#162f5d" strokeWidth="0.5" strokeDasharray="2 4" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="#162f5d" strokeWidth="0.5" strokeDasharray="2 4" />

                {/* Geodesic Heatmap Overlays */}
                {showHeatmap && (
                  <>
                    {heatmapType === 'compliance' ? (
                      /* compliance density Heatmap layer */
                      <g id="heatmap-layer-compliance" filter="url(#heatmap-blur)">
                        {wardComplianceStats.map((w) => {
                          const color = d3ColorScale(w.complianceRate) || '#ef4444';
                          return (
                            <circle
                              key={`heatmap-compliance-${w.name}`}
                              cx={w.x}
                              cy={w.y}
                              r={6 + (Math.sqrt(w.totalCount || 1) * 1.5)} // size proportional to property count density
                              fill={color}
                              opacity={0.55}
                            />
                          );
                        })}
                      </g>
                    ) : (
                      /* Delinquency density Heatmap layer */
                      <g id="heatmap-layer-delinquency">
                        {/* 1. Macro Ward-level glow layers */}
                        <g filter="url(#heatmap-blur)" opacity={0.65}>
                          {wardDelinquentStats.map((w) => {
                            const color = d3DelinquencyColorScale(w.delinquentRate) || '#10b981';
                            // Radius proportional to absolute count of delinquent properties
                            const radius = 4 + (Math.sqrt(w.delinquentCount || 0) * 3);
                            return (
                              <circle
                                key={`heatmap-delinquency-ward-${w.name}`}
                                cx={w.x}
                                cy={w.y}
                                r={radius}
                                fill={color}
                              />
                            );
                          })}
                        </g>

                        {/* 2. Micro precise spot hotspot halo layers located at actual delinquent coordinates */}
                        <g filter="url(#heatmap-spot-blur)" opacity={0.75}>
                          {properties
                            .filter(p => p.paymentStatus === 'Unpaid')
                            .map((p) => {
                              const minLat = 9.15;
                              const maxLat = 9.22;
                              const minLng = 7.15;
                              const maxLng = 7.24;
                              const x = ((p.longitude - minLng) / (maxLng - minLng)) * 100;
                              const y = 100 - (((p.latitude - minLat) / (maxLat - minLat)) * 100);
                              
                              const boundedX = Math.max(2, Math.min(x, 98));
                              const boundedY = Math.max(2, Math.min(y, 98));
                              return (
                                <circle
                                  key={`heatmap-delinquency-spot-${p.id}`}
                                  cx={boundedX}
                                  cy={boundedY}
                                  r="2.8"
                                  fill="#ef4444"
                                />
                              );
                            })}
                        </g>
                      </g>
                    )}
                  </>
                )}

                {/* Compliance Hotspots Layer (glowing halo regions of fully paid properties) */}
                {showComplianceHotspots && (
                  <g id="heatmap-layer-compliance-hotspots" filter="url(#heatmap-blur)" opacity={0.6}>
                    {properties
                      .filter(p => p.paymentStatus === 'Paid')
                      .map((p, idx) => {
                        const minLat = 9.15;
                        const maxLat = 9.22;
                        const minLng = 7.15;
                        const maxLng = 7.24;
                        const x = ((p.longitude - minLng) / (maxLng - minLng)) * 100;
                        const y = 100 - (((p.latitude - minLat) / (maxLat - minLat)) * 100);
                        return (
                          <circle
                            key={`comp-hotspot-${p.id}-${idx}`}
                            cx={Math.max(2, Math.min(x, 98))}
                            cy={Math.max(2, Math.min(y, 98))}
                            r="5"
                            fill="#10b981"
                          />
                        );
                      })}
                  </g>
                )}

                {/* Simulated Ward Boundaries connectors */}
                {showWardBoundaries && simulatedWardOutlines.map((w, idx) => {
                  // Draw a polyline connecting adjacent centerpoints to mimic official zoning lines
                  const nextW = simulatedWardOutlines[(idx + 1) % simulatedWardOutlines.length];
                  return (
                    <line 
                      key={`line-${idx}`}
                      x1={w.x} y1={w.y} 
                      x2={nextW.x} y2={nextW.y} 
                      stroke="#4F46E5" strokeWidth="0.3" strokeDasharray="1 3"
                    />
                  );
                })}

                {/* Ward Labels */}
                {simulatedWardOutlines.map((w) => {
                  const compStats = wardComplianceStats.find(cs => cs.name === w.name);
                  const complianceRate = compStats ? compStats.complianceRate : 50;
                  const displayLabel = showHeatmap && heatmapType === 'compliance' 
                    ? `${w.name} (${complianceRate}%)`
                    : w.name;
                  return (
                    <text
                      key={`label-${w.name}`}
                      x={w.x}
                      y={w.y - 2.5}
                      fill="#ffffff"
                      opacity={0.45}
                      fontSize="2"
                      fontFamily="system-ui"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {displayLabel}
                    </text>
                  );
                })}

                {/* Plotted GIS Pin coordinates */}
                {showPropertyPins && mapCoordinates.map((node) => {
                  const isActive = activePropertyFocus?.id === node.property.id;
                  const statusColor = 
                    node.property.paymentStatus === 'Paid' ? '#10B981' : 
                    node.property.paymentStatus === 'Pending' ? '#F59E0B' : '#EF4444';

                  return (
                    <g 
                      key={`pin-${node.property.id}`}
                      onClick={() => handleSelectPin(node.property)}
                      onMouseEnter={() => setHoveredProperty(node.property)}
                      onMouseLeave={() => setHoveredProperty(null)}
                      className="cursor-pointer group"
                    >
                      {/* Pulsing ring on active selected */}
                      {isActive && (
                        <circle 
                          cx={node.x} cy={node.y} 
                          r="4" 
                          fill="none" 
                          stroke={statusColor} 
                          strokeWidth="0.4" 
                          className="animate-pulse"
                        />
                      )}

                      {/* Custom SVG Geodesic Pin Marker with Payment Status Icon inside */}
                      <g transform={`translate(${node.x}, ${node.y}) scale(${isActive ? 0.38 : 0.26})`}>
                        {/* Pin base background pointer */}
                        <path 
                          d="M 0,0 C -2,-2 -3,-4 -3,-6 C -3,-8 -1.5,-9.5 0,-9.5 C 1.5,-9.5 3,-8 3,-6 C 3,-4 2,-2 0,0 Z"
                          fill={statusColor}
                          stroke="#060c15"
                          strokeWidth="0.5"
                        />
                        {/* Inner icon (white) based on payment status */}
                        {node.property.paymentStatus === 'Paid' && (
                          <path 
                            d="M -1.2, -6.3 L -0.3, -5.3 L 1.2, -7.3" 
                            fill="none" 
                            stroke="#ffffff" 
                            strokeWidth="0.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        )}
                        {node.property.paymentStatus === 'Pending' && (
                          <g fill="none" stroke="#ffffff" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="0" cy="-6" r="1.5" />
                            <path d="M 0, -6.9 V -6 H 0.6" />
                          </g>
                        )}
                        {node.property.paymentStatus === 'Unpaid' && (
                          <g stroke="#ffffff" strokeLinecap="round">
                            <path d="M 0, -7.3 V -5.5" strokeWidth="0.5" />
                            <circle cx="0" cy="-4.3" r="0.25" fill="#ffffff" stroke="none" />
                          </g>
                        )}
                      </g>

                      {/* Simple node HUD on hover */}
                      <title>{`${node.property.id}: ${node.property.ownerName} (${node.property.ward})`}</title>
                    </g>
                  );
                })}

                {/* Geolocation 'Your Location' Marker with pulsing blue halo */}
                {projectedUserLocation && (
                  <g className="cursor-pointer">
                    {/* Ring ripple */}
                    <circle 
                      cx={projectedUserLocation.x} 
                      cy={projectedUserLocation.y} 
                      r="4.2" 
                      fill="none" 
                      stroke="#38BDF8" 
                      strokeWidth="0.8" 
                      className="animate-ping"
                      style={{ transformOrigin: `${projectedUserLocation.x}px ${projectedUserLocation.y}px` }}
                    />
                    {/* Solid outer cursor halo */}
                    <circle 
                      cx={projectedUserLocation.x} 
                      cy={projectedUserLocation.y} 
                      r="2.2" 
                      fill="#38BDF8" 
                      stroke="#ffffff" 
                      strokeWidth="0.5"
                    />
                    {/* Inner core */}
                    <circle 
                      cx={projectedUserLocation.x} 
                      cy={projectedUserLocation.y} 
                      r="1" 
                      fill="#4F46E5" 
                    />
                    <title>{`Your Location: ${projectedUserLocation.lat.toFixed(6)}, ${projectedUserLocation.lng.toFixed(6)}`}</title>
                  </g>
                )}
              </svg>

              {/* Interactive Tooltip on Hover */}
              {hoveredProperty && (
                (() => {
                  const node = mapCoordinates.find(n => n.property.id === hoveredProperty.id);
                  if (!node) return null;
                  return (
                    <div 
                      className="absolute bg-[#0c1b30]/95 border border-[#38BDF8]/40 rounded-xl p-3 shadow-xl text-left text-white select-text pointer-events-none z-50 transition-all duration-150 py-2 max-w-[200px] font-sans"
                      style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        transform: 'translate(-50%, -112%)',
                      }}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5 gap-2.5">
                        <span className="font-mono text-[8px] font-extrabold text-[#38BDF8]">{hoveredProperty.id}</span>
                        <span className={`text-[8px] font-black uppercase px-1 rounded-sm ${
                          hoveredProperty.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {hoveredProperty.paymentStatus}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-[10px]">
                        <div className="font-bold truncate text-white">{hoveredProperty.ownerName}</div>
                        <div className="text-gray-300 font-medium truncate">{hoveredProperty.address}</div>
                        <div className="text-gray-300 flex justify-between items-center bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-[9px] font-mono font-bold mt-1">
                          <span className="text-gray-400 font-sans">Rate Due:</span>
                          <span className="text-emerald-400 font-bold">₦{hoveredProperty.tenementRate.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Compact Property InfoWindow popover directly on the simulated map when clicked */}
              {localFocusedProperty && (
                (() => {
                  const node = mapCoordinates.find(n => n.property.id === localFocusedProperty.id);
                  if (!node) return null;
                  return (
                    <div 
                      className="absolute bg-slate-900/95 border border-white/20 rounded-lg p-2.5 shadow-xl text-white select-text z-50 font-sans text-left text-[10px] w-48 transition-all pointer-events-auto"
                      style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        transform: 'translate(-50%, calc(-100% - 12px))',
                      }}
                    >
                      {/* Triangle pointer indicator */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900/95" />
                      
                      <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5 gap-1.5">
                        <span className="font-mono text-[8px] font-bold bg-white/10 text-gray-300 px-1 py-0.5 rounded">
                          {localFocusedProperty.id}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${
                          localFocusedProperty.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' :
                          localFocusedProperty.paymentStatus === 'Pending' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {localFocusedProperty.paymentStatus}
                        </span>
                      </div>
                      
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-[10px] truncate text-white">{localFocusedProperty.ownerName}</h4>
                        <p className="text-[9px] text-gray-400 truncate">{localFocusedProperty.address}</p>
                        <p className="text-[8px] text-gray-500">{localFocusedProperty.ward} Ward</p>
                        
                        <div className="flex justify-between items-center bg-white/5 p-1 rounded font-mono text-[9px] mt-1.5">
                          <span className="text-gray-400 text-[8px]">Due:</span>
                          <span className="text-[#38BDF8] font-bold">₦{localFocusedProperty.tenementRate.toLocaleString()}</span>
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocalFocusedProperty(null);
                        }}
                        className="absolute -top-1 -right-1 p-0.5 bg-slate-800 hover:bg-slate-750 text-gray-400 hover:text-white rounded-full cursor-pointer flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Live Property Focus Detail Card Overlay inside index Map */}
            {activePropertyFocus && (
              <div id="gisFocusOverlay" className="absolute bottom-4 left-4 right-4 md:left-auto md:w-80 bg-[#0c1b30] border border-white/10 rounded-xl p-4 shadow-2xl space-y-3 z-30 fade-in select-text">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded bg-[#38BDF8]/10 text-[#38BDF8] px-1.5 py-0.5 text-[9px] font-mono font-bold">
                      {activePropertyFocus.id}
                    </span>
                    <h4 className="font-display font-bold text-xs sm:text-sm text-white mt-1 truncate">{activePropertyFocus.ownerName}</h4>
                  </div>
                  <button 
                    onClick={handleCloseFocusCard}
                    className="p-1 text-gray-400 hover:text-white rounded-md cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px] text-gray-300 font-sans">
                  <div className="truncate"><b>Address:</b> {activePropertyFocus.address}</div>
                  <div><b>Ward Zone:</b> {activePropertyFocus.ward}</div>
                  <div><b>Assessed Rate:</b> <span className="font-mono text-[#38BDF8] font-bold">₦{activePropertyFocus.tenementRate.toLocaleString()}</span></div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] mt-2">
                  <span className={`inline-flex rounded px-1.5 py-0.5 font-bold uppercase ${
                    activePropertyFocus.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {activePropertyFocus.paymentStatus}
                  </span>
                  
                  <span className="text-[9px] font-mono text-gray-500">GPS: {activePropertyFocus.latitude.toFixed(4)}, {activePropertyFocus.longitude.toFixed(4)}</span>
                </div>
              </div>
            )}
            </>)}
          </div>

          {/* Status Color coding Legends */}
          <div className="relative z-10 p-2 bg-white/5 border border-white/5 rounded-lg flex justify-around flex-wrap gap-2 text-xs">
            <button
              id="gis-legend-paid"
              type="button"
              onClick={() => setActiveStatusFilter(activeStatusFilter === 'Paid' ? '' : 'Paid')}
              className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                activeStatusFilter === 'Paid'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-sm shadow-emerald-500/20'
                  : activeStatusFilter === ''
                  ? 'bg-transparent border-transparent hover:bg-white/5 text-gray-300'
                  : 'bg-transparent border-transparent opacity-30 hover:opacity-70 text-gray-400'
              }`}
              title="Filter by Paid Status"
            >
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full" />
              <span>Settle Paid ({statsPaid})</span>
            </button>
            <button
              id="gis-legend-unpaid"
              type="button"
              onClick={() => setActiveStatusFilter(activeStatusFilter === 'Unpaid' ? '' : 'Unpaid')}
              className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                activeStatusFilter === 'Unpaid'
                  ? 'bg-red-500/20 border-red-500 text-red-450 font-bold shadow-sm shadow-red-500/20'
                  : activeStatusFilter === ''
                  ? 'bg-transparent border-transparent hover:bg-white/5 text-gray-300'
                  : 'bg-transparent border-transparent opacity-30 hover:opacity-70 text-gray-400'
              }`}
              title="Filter by Outstanding Arrears"
            >
              <span className="h-2.5 w-2.5 bg-red-500 rounded-full" />
              <span>Outstanding Arrears ({statsUnpaid})</span>
            </button>
            <button
              id="gis-legend-pending"
              type="button"
              onClick={() => setActiveStatusFilter(activeStatusFilter === 'Pending' ? '' : 'Pending')}
              className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                activeStatusFilter === 'Pending'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-sm shadow-amber-500/20'
                  : activeStatusFilter === ''
                  ? 'bg-transparent border-transparent hover:bg-white/5 text-gray-300'
                  : 'bg-transparent border-transparent opacity-30 hover:opacity-70 text-gray-400'
              }`}
              title="Filter by Pending Verifications"
            >
              <span className="h-2.5 w-2.5 bg-amber-500 rounded-full" />
              <span>Verify Pending ({statsPending})</span>
            </button>
          </div>
        </div>

        {/* GIS Sidebar Filter/Zoning Controller */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-150 p-5 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#38BDF8]" />
              <h3 className="font-display font-bold text-[#0A1F44] text-sm">GIS Spatial Controls</h3>
            </div>

            {/* Smart GIS Query search */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center justify-between">
                <span>GIS Quick Query</span>
                {isListening && <span className="text-red-500 font-extrabold animate-pulse">● Mic Active</span>}
              </label>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ID or landlord name query..."
                  value={gisSearchQuery}
                  onChange={(e) => setGisSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-16 text-xs outline-none focus:border-[#0A1F44]"
                />
                <div className="absolute right-1 top-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleToggleVoiceSearch}
                    className={`p-1 rounded-md transition-all relative cursor-pointer ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'text-gray-455 hover:text-[#0A1F44] hover:bg-slate-100'
                    }`}
                    title={isListening ? "Listening... click to stop" : "Speak to search"}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  {gisSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGisSearchQuery('')}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-md cursor-pointer"
                      title="Clear query"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {voiceError && (
                <div className="text-[9px] text-amber-600 font-bold mt-1 flex items-center justify-between bg-amber-50 p-1 rounded border border-amber-200">
                  <span>⚠️ {voiceError}</span>
                  <button onClick={() => setVoiceError(null)} className="text-gray-400 underline hover:text-gray-600">dismiss</button>
                </div>
              )}
            </div>

            {/* Ward select filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Zoning Ward Layer</label>
              <select
                value={activeWardFilter}
                onChange={(e) => setActiveWardFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs outline-none"
              >
                <option value="">All Suleja Wards ({SULEJA_WARDS.length})</option>
                {SULEJA_WARDS.map(w => (
                  <option key={w.name} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Status select filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Dues Status Layer</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Paid', 'Unpaid', 'Pending'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveStatusFilter(activeStatusFilter === s ? '' : s)}
                    className={`rounded-lg py-1.5 text-xs font-bold border transition-colors ${
                      activeStatusFilter === s 
                        ? 'bg-[#0A1F44] border-[#0A1F44] text-white' 
                        : 'bg-[#F2F4F7] border-gray-300 text-gray-650'
                    }`}
                  >
                    {s} Mode
                  </button>
                ))}
              </div>
            </div>

            {/* GIS Layers Overlay Selection */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-[#38BDF8]" />
                Active Map Layers
              </label>
              <div className="space-y-2.5 bg-slate-50 border border-gray-205 rounded-lg p-3">
                <label className="flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-gray-700">
                  <span>Ward Boundaries</span>
                  <input
                    type="checkbox"
                    checked={showWardBoundaries}
                    onChange={(e) => setShowWardBoundaries(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#0A1F44] focus:ring-[#0A1F44] cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-gray-700">
                  <span>Compliance Hotspots</span>
                  <input
                    type="checkbox"
                    checked={showComplianceHotspots}
                    onChange={(e) => setShowComplianceHotspots(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-gray-700">
                  <span>Property Pins</span>
                  <input
                    type="checkbox"
                    checked={showPropertyPins}
                    onChange={(e) => setShowPropertyPins(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#0A1F44] focus:ring-[#0A1F44] cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* compliance density Heatmap Strategic Layer */}
            <div className="border-t border-gray-150 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400">Strategic Heatmap Overlay</span>
                  <span className="text-[11px] font-semibold text-gray-600">Geospatial density layers</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    showHeatmap 
                      ? 'bg-indigo-950 hover:bg-opacity-95 text-[#38BDF8] border border-indigo-900 shadow-xs animate-pulse' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-250 border border-gray-200'
                  }`}
                >
                  {showHeatmap ? 'Layer: ACTIVE' : 'Layer: INACTIVE'}
                </button>
              </div>

              {showHeatmap && (
                <div className="space-y-3.5">
                  {/* Heatmap Mode selection selectors */}
                  <div className="bg-slate-50 p-1 border border-gray-205 rounded-lg grid grid-cols-2 gap-1 text-[10px] sm:text-xs">
                    <button
                      type="button"
                      onClick={() => setHeatmapType('delinquency')}
                      className={`py-1 px-2 rounded-md font-bold transition-all text-center cursor-pointer ${
                        heatmapType === 'delinquency'
                          ? 'bg-[#0A1F44] text-[#38BDF8] shadow-xs'
                          : 'text-gray-500 hover:text-[#0A1F44] hover:bg-gray-100'
                      }`}
                    >
                      🛑 Unpaid Delinquents
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeatmapType('compliance')}
                      className={`py-1 px-2 rounded-md font-bold transition-all text-center cursor-pointer ${
                        heatmapType === 'compliance'
                          ? 'bg-[#0A1F44] text-[#38BDF8] shadow-xs'
                          : 'text-gray-500 hover:text-[#0A1F44] hover:bg-gray-100'
                      }`}
                    >
                      ✓ Tax Compliance
                    </button>
                  </div>

                  {heatmapType === 'delinquency' ? (
                    /* Delinquency Density Layer Legend */
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-2 text-[10px] sm:text-xs">
                      <div className="flex items-center justify-between">
                        <span className="block text-red-950 font-bold text-[11px]">Unpaid Delinquent Density:</span>
                        <span className="bg-red-200/50 text-red-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Live Map</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 font-medium text-gray-605">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#ef4444]/80 rounded-full inline-block animate-pulse" />
                          <span>Critical Delinquency clusters (&gt;= 40% unpaid)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#f59e0b]/80 rounded-full inline-block" />
                          <span>Moderate Outstanding dues (20% - 39% unpaid)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#3b82f6]/80 rounded-full inline-block" />
                          <span>Developing / Scattered dues (1% - 19% unpaid)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#10b981]/80 rounded-full inline-block" />
                          <span>Fully Compliant (0% unpaid)</span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 pt-1.5 border-t border-red-120 font-medium">
                        Plots deep glowing red indicators representing precise coordinate positions of unpaid delinquent properties, coupled with macro ward-level area coverage.
                      </p>
                    </div>
                  ) : (
                    /* Compliance Density Layer Legend */
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2 text-[10px] sm:text-xs">
                      <span className="block text-emerald-950 font-bold text-[11px]">Compliance Metrics:</span>
                      <div className="grid grid-cols-1 gap-1.5 font-medium text-gray-500">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#10b981]/80 rounded-full inline-block" />
                          <span>Stable Zone (&gt;= 70% paid)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#f59e0b]/80 rounded-full inline-block" />
                          <span>Moderate Arrears risk (45% - 69% paid)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#ef4444]/80 rounded-full inline-block" />
                          <span>Critical Collection Alert (&lt; 45% paid)</span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 pt-1.5 border-t border-emerald-120 font-medium">
                        Focuses on macroeconomic revenue penetration showing wards sorted by total payment settlement counts.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick analysis diagnostic */}
          <div className="p-4 bg-slate-50 border rounded-lg space-y-2 text-xs">
            <span className="block text-[#0A1F44] font-bold">GIS Diagnostics summary</span>
            <div className="flex justify-between font-semibold text-gray-500">
              <span>Total GIS database plots:</span>
              <span className="text-[#0A1F44] font-bold font-mono">{properties.length}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-500">
              <span>Filtered Layer Count:</span>
              <span className="text-[#38BDF8] font-bold font-mono">{filteredGISProps.length}</span>
            </div>
            <div className="text-[10px] text-gray-405 leading-normal leading-relaxed text-gray-550 border-t pt-1.5 mt-1.5 font-medium">
              Geospatial indexes calibrated against Niger State geographic coordinates maps datum WGS 84 / UTM.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
