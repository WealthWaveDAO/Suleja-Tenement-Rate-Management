import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, RefreshCw, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  updateProfilePicture: (id: string, avatarUrl: string) => Promise<void>;
}

export const ProfileCameraModal: React.FC<ProfileCameraModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  updateProfilePicture
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize device camera stream when modal is opened
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      resetState();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      // First stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 480 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Camera streaming request failed or blocked:", err);
      setCameraError(
        "Could not access your device camera. This might be due to security permissions or iframe restrictions. Please upload an image file instead."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const resetState = () => {
    setCameraError(null);
    setCapturedImage(null);
    setIsSaving(false);
    setSaveSuccess(false);
  };

  // Capture frame from video feed
  const handleCapture = () => {
    if (!videoRef.current) return;

    setIsCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      
      const width = video.videoWidth || 400;
      const height = video.videoHeight || 400;
      
      // We want a perfect square profile pic
      const size = Math.min(width, height);
      const startX = (width - size) / 2;
      const startY = (height - size) / 2;

      canvas.width = 300;
      canvas.height = 300;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw cropped square image from center of stream
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    } catch (err) {
      console.error("Frame capture error:", err);
      setCameraError("Failed to snap picture. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle local image file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCapturedImage(event.target.result as string);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit and update user avatar in Firestore and Auth context
  const handleSave = async () => {
    if (!capturedImage) return;

    setIsSaving(true);
    try {
      await updateProfilePicture(userId, capturedImage);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Profile picture update error:", err);
      setCameraError(err.message || "Failed to update profile photo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="profile-camera-modal" 
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col text-left"
        >
          {/* Header */}
          <div className="p-4 bg-[#0A1F44] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-sky-400" />
              <div>
                <h3 className="text-sm font-black tracking-tight">Agent Camera Control</h3>
                <p className="text-[10px] text-sky-200">Capture or update profile photograph</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col items-center">
            {/* Viewfinder or Preview Area */}
            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-dashed border-[#38BDF8] dark:border-[#1E2E4A] bg-slate-150 dark:bg-slate-950 flex items-center justify-center shadow-inner mb-4 group/camera-frame">
              {saveSuccess ? (
                <div className="absolute inset-0 bg-emerald-500/10 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 p-4 text-center animate-fadeIn">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2 animate-bounce" />
                  <span className="font-bold text-xs uppercase tracking-wider font-sans">Sovereign Photo Synced</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Profile updated successfully</p>
                </div>
              ) : capturedImage ? (
                /* Captured / Loaded Preview */
                <img 
                  src={capturedImage} 
                  className="w-full h-full object-cover" 
                  alt="Captured Profile Preview" 
                  referrerPolicy="no-referrer"
                />
              ) : stream ? (
                /* Live Video Viewfinder */
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                /* Camera Fallback / State placeholder */
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <Camera className="h-10 w-10 text-gray-400 mb-2 animate-pulse" />
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Camera Offline</span>
                </div>
              )}

              {/* Loader overlay */}
              {isCapturing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>

            {/* Error notifications */}
            {cameraError && (
              <div className="w-full mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-2.5 text-red-700 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <p className="leading-relaxed text-[11px] font-medium">{cameraError}</p>
              </div>
            )}

            {/* Actions panel */}
            <div className="w-full space-y-3">
              {capturedImage ? (
                /* Captured Image Save/Reset Panel */
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={isSaving}
                    className="w-full border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || saveSuccess}
                    className="w-full bg-[#0A1F44] hover:bg-[#1E2E4A] dark:bg-[#38BDF8] dark:hover:bg-[#0EA5E9] dark:text-[#0A1F44] text-white py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] disabled:opacity-50 shadow-md uppercase tracking-wider"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Apply Photo'
                    )}
                  </button>
                </div>
              ) : (
                /* Live Camera Capture controls */
                <div className="flex flex-col gap-2">
                  {stream && (
                    <button
                      type="button"
                      onClick={handleCapture}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] shadow-sm uppercase tracking-wider"
                    >
                      <Camera className="h-4 w-4" />
                      Capture Photograph
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 border border-dashed border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/40 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
                    >
                      <Upload className="h-3.5 w-3.5 text-gray-400" />
                      Browse File Fallback
                    </button>
                    {!stream && (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry Camera
                      </button>
                    )}
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Footer informational */}
          <div className="p-3 bg-gray-50 dark:bg-black/20 text-[9.5px] text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-slate-800">
            Secure biometric synchronization with Suleja Local Government directory database.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
