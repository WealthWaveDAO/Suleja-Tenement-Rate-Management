import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, QrCode } from 'lucide-react';

interface QrScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function QrScannerModal({ onScanSuccess, onClose }: QrScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
        onScanSuccess(decodedText);
      },
      (error) => {
        // Just parsing ignore
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50">
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-indigo-600" />
              Scan Physical Property Tag
            </h3>
            <span className="text-[10px] text-gray-500 font-medium">Position the QR code within the frame</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-200 hover:bg-rose-100 text-gray-600 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 bg-black relative">
          <div id="qr-reader" className="w-full text-white mx-auto overflow-hidden rounded-lg"></div>
        </div>
        <div className="p-4 bg-slate-50 text-center border-t text-xs font-semibold text-slate-500">
          Point camera at standard SLG property QR code tags
        </div>
      </div>
    </div>
  );
}
