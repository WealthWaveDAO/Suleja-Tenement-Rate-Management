import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, RefreshCw, Check, X, Upload, Trash2 } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (capturedDataUrl: string) => void;
  onClear?: () => void;
  initialImageUrl?: string;
  label?: string;
}

export default function CameraCapture({ onCapture, onClear, initialImageUrl, label }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    
    // Stop any existing tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setStream(null);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Verify browser or system permissions.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera/imaging device was found on this hardware.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to access video stream'}`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isCameraActive) {
      // Re-trigger camera stream with the new facingMode
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current frame of the video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewUrl(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    } catch (err: any) {
      console.error('Failed to capture frame:', err);
      setCameraError('Failed to capture visual frame from video channel.');
    }
  };

  // Fallback: Handle standard local file upload from system
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image files are permitted.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setPreviewUrl(base64);
      onCapture(base64);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPreviewUrl(null);
    if (onClear) onClear();
  };

  return (
    <div className="space-y-3.5 Premium-Camera-Container">
      {label && (
        <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">{label}</span>
      )}

      {/* Main Preview Screen */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex flex-col items-center justify-center">
        {previewUrl ? (
          /* Captured Preview */
          <>
            <img 
              src={previewUrl} 
              alt="Evidence Cap" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={clearPhoto}
                className="bg-black/70 hover:bg-red-650 text-white p-2 rounded-lg backdrop-blur-xs transition-all cursor-pointer hover:scale-105"
                title="Discard photo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute bottom-2 left-2 bg-black/60 text-[9px] font-mono font-bold text-white px-2 py-1 rounded backdrop-blur-xs">
              ✓ PROPERTY PHOTO ATTACHED
            </div>
          </>
        ) : isCameraActive ? (
          /* Live Stream */
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            
            {/* Live Camera Controls overlay */}
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={switchCamera}
                className="bg-white/95 text-slate-800 p-2 rounded-full hover:bg-sky-50 shadow-md active:scale-95 transition-all cursor-pointer"
                title="Switch Camera facing direction"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={takePhoto}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full border-4 border-white shadow-lg active:scale-90 transition-all cursor-pointer"
                title="Capture instant snapshot"
              >
                <Camera className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="bg-white/95 text-slate-800 p-2 rounded-full hover:bg-slate-200 shadow-md active:scale-95 transition-all cursor-pointer"
                title="Cancel camera feed"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          /* Empty / Trigger State */
          <div className="text-center p-6 space-y-3">
            <Camera className="h-8 w-8 text-slate-500 mx-auto animate-pulse" />
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-300">No Photo Captured</p>
              <p className="text-[10px] text-slate-400 max-w-[240px]">Stream live field inspection photography or pick a photo from files.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1.5">
              <button
                type="button"
                onClick={startCamera}
                className="bg-[#0A1F44] hover:bg-[#38BDF8] text-white hover:text-[#0A1F44] py-1.5 px-3.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Start Device Camera</span>
              </button>
              
              <label className="bg-slate-850 hover:bg-slate-800 text-slate-200 py-1.5 px-3.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700 hover:border-slate-500">
                <Upload className="h-3.5 w-3.5" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-medium leading-relaxed">
          {cameraError}
        </div>
      )}
    </div>
  );
}
