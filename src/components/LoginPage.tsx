/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Landmark, 
  ShieldCheck, 
  Mail, 
  Lock, 
  AlertCircle, 
  ArrowLeft, 
  RefreshCw, 
  KeyRound, 
  QrCode, 
  Fingerprint, 
  Check, 
  X, 
  Shield, 
  Terminal, 
  Sparkles, 
  Cpu, 
  Activity,
  CheckCircle2,
  ScanLine
} from 'lucide-react';
import { User, UserRole, Property } from '../types';
import { MOCK_USERS } from '../data';
import { motion, AnimatePresence } from 'motion/react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onBackToLanding: () => void;
  properties: Property[];
}

interface PasswordStrength {
  score: number; // 0 to 4
  feedback: string;
  color: string;
  checklist: {
    length: boolean;
    mixed: boolean;
    number: boolean;
    special: boolean;
  };
}

// Security strength validation calculator per Municipal Policy
const checkPasswordStrength = (pass: string): PasswordStrength => {
  const checklist = {
    length: pass.length >= 6,
    mixed: /[A-Z]/.test(pass) && /[a-z]/.test(pass),
    number: /[0-9]/.test(pass),
    special: /[^A-Za-z0-9]/.test(pass),
  };

  let score = 0;
  if (pass.length > 0) {
    score += 1;
    if (checklist.length) score += 1;
    if (checklist.mixed) score += 1;
    if (checklist.number || checklist.special) score += 1;
  }

  const finalScore = Math.min(score, 4);

  let feedback = 'Weak';
  let color = 'bg-red-500';
  if (finalScore === 1) {
    feedback = 'Extremely Weak';
    color = 'bg-red-500';
  } else if (finalScore === 2) {
    feedback = 'Weak (Non-Compliant)';
    color = 'bg-orange-500';
  } else if (finalScore === 3) {
    feedback = 'Medium (Suleja Policy OK)';
    color = 'bg-yellow-500';
  } else if (finalScore === 4) {
    feedback = 'Strong (Excellent Protections)';
    color = 'bg-emerald-500';
  }

  return { score: finalScore, feedback, color, checklist };
};

export default function LoginPage({ onLoginSuccess, onBackToLanding, properties }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Navigation workflows
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Authentication mode: standard credentials vs QR agent code vs fingerprint biometric
  const [authMethod, setAuthMethod] = useState<'standard' | 'qr' | 'fingerprint'>('standard');

  // Advanced Sandbox Reset states
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const [customPasswords, setCustomPasswords] = useState<Record<string, string>>({});
  const [forgotError, setForgotError] = useState<string | null>(null);

  // QR Simulator state
  const [qrScanning, setQrScanning] = useState(false);
  const [qrSelectedAgent, setQrSelectedAgent] = useState<string>('');
  const [qrScanSuccess, setQrScanSuccess] = useState<User | null>(null);
  const [qrProgress, setQrProgress] = useState(0);

  // Biometric state
  const [isPressingFinger, setIsPressingFinger] = useState(false);
  const [fingerProgress, setFingerProgress] = useState(0);
  const [biometricSelectedUser, setBiometricSelectedUser] = useState<string>('USR-002'); // Defaults to LGA Admin
  const [bioSuccess, setBioSuccess] = useState<User | null>(null);

  // Audited Security Ledger lists
  const [ledgerLogs, setLedgerLogs] = useState<string[]>(() => [
    `[${new Date().toLocaleTimeString()}] [SECURE INITIALIZE] Cryptographic security gateway initialized.`,
    `[${new Date().toLocaleTimeString()}] [SECURE INITIALIZE] TLS 1.3 tunnels online. Sandbox integrity verification green.`,
  ]);

  const addLedgerLog = (level: 'INFO' | 'SUCCESS' | 'WARN' | 'AUDIT', action: string) => {
    const time = new Date().toLocaleTimeString();
    setLedgerLogs(prev => [`[${time}] [${level}] ${action}`, ...prev].slice(0, 16));
  };

  // Synchronise form switches
  const handleAuthMethodChange = (method: 'standard' | 'qr' | 'fingerprint') => {
    setAuthMethod(method);
    setError(null);
    setForgotError(null);
    setQrScanning(false);
    setQrProgress(0);
    setIsPressingFinger(false);
    setFingerProgress(0);
    addLedgerLog('INFO', `Switched default gateway channel authentication input pattern to: [${method.toUpperCase()}]`);
  };

  // Password assessment
  const passStrengthObj = checkPasswordStrength(newPassword);

  // Fingerprint Pressing Loop simulator
  useEffect(() => {
    let interval: any;
    if (isPressingFinger && fingerProgress < 100) {
      interval = setInterval(() => {
        setFingerProgress(prev => {
          const next = prev + 8;
          if (next >= 100) {
            clearInterval(interval);
            handleFingerprintAuthenticationComplete();
            return 100;
          }
          // Log intermittent scanning steps
          if (next % 24 === 0) {
            addLedgerLog('INFO', `Capacitive biometric sensor mapping ridge patterns: ${next}%...`);
          }
          return next;
        });
      }, 100);
    } else if (!isPressingFinger) {
      setFingerProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPressingFinger]);

  // QR Code alignment loop simulator
  useEffect(() => {
    let timer: any;
    if (qrScanning && qrProgress < 100) {
      timer = setInterval(() => {
        setQrProgress(prev => {
          const next = prev + 12;
          if (next >= 100) {
            clearInterval(timer);
            handleQrScanComplete();
            return 100;
          }
          return next;
        });
      }, 150);
    }
    return () => clearInterval(timer);
  }, [qrScanning]);

  const handleFingerprintAuthenticationComplete = () => {
    const userToLogin = MOCK_USERS.find(u => u.id === biometricSelectedUser);
    if (!userToLogin) return;

    addLedgerLog('SUCCESS', `Biometric match found! Ridges correspond to ID ${userToLogin.id} (${userToLogin.name} / ${userToLogin.role})`);
    addLedgerLog('AUDIT', `Event [BIOMETRIC-AUTH]: Secure session opened directly via hardware authentication. Status: Secure.`);
    
    setBioSuccess(userToLogin);
    
    setTimeout(() => {
      onLoginSuccess(userToLogin);
    }, 1200);
  };

  const handleQrScanComplete = () => {
    const selectedUserId = qrSelectedAgent || 'USR-004'; // Default to field agent Umar Sani
    const userToLogin = MOCK_USERS.find(u => u.id === selectedUserId);
    if (!userToLogin) return;

    addLedgerLog('SUCCESS', `Matrix signature decoded: ID ${userToLogin.id} (${userToLogin.name} • ${userToLogin.role})`);
    addLedgerLog('AUDIT', `Event [QR-CARD-AUTH]: Pre-issued Agent ID decrypted. Access token dispatched safely.`);

    setQrScanSuccess(userToLogin);
    setQrScanning(false);

    setTimeout(() => {
      onLoginSuccess(userToLogin);
    }, 1200);
  };

  const startQrScannerSimulator = (agentId: string) => {
    setQrSelectedAgent(agentId);
    setQrProgress(0);
    setQrScanSuccess(null);
    setQrScanning(true);
    addLedgerLog('INFO', `QR Camera stream requested. Simulating focus reticle alignment for ID card of ${MOCK_USERS.find(u => u.id === agentId)?.name}...`);
  };

  // Auto-fill credentials helper
  const handlePrefillSelect = (user: User) => {
    setEmail(user.email);
    const saved = customPasswords[user.email.toLowerCase().trim()];
    if (saved) {
      setPassword(saved);
    } else {
      let pass = 'Ramzurat';
      if (user.role === 'Super Admin') pass = 'Ramzurat';
      else if (user.role === 'LGA Admin') pass = 'Suleja';
      else if (user.role === 'Tax Officer') pass = 'Taxation';
      else if (user.role === 'Field Agent') pass = 'Allagents';
      else if (user.role === 'Accountant') pass = 'Money';
      else if (user.role === 'Taxpayer') pass = 'reyapxats';
      setPassword(pass);
    }
    setError(null);
    addLedgerLog('INFO', `Prefilled sandbox test credentials for: [${user.name} - ${user.role}]`);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const identifier = email.trim();
    addLedgerLog('INFO', `Validating client credentials for: ${identifier}...`);

    setTimeout(() => {
      // 1. Check if the input matches a Property ID/Code in the properties array
      const matchedProperty = properties.find(
        p => p.id.toLowerCase().trim() === identifier.toLowerCase()
      );

      if (matchedProperty) {
        // If password is the default "reyapxats" or "demo"
        if (password === 'reyapxats' || password === 'demo') {
          const taxpayerUser: User = {
            id: matchedProperty.id,
            name: matchedProperty.ownerName,
            email: matchedProperty.ownerEmail || `${matchedProperty.id.toLowerCase()}@suleja.gov.ng`,
            role: 'Taxpayer',
            phone: matchedProperty.ownerPhone,
            ward: matchedProperty.ward
          };
          addLedgerLog('SUCCESS', `Validated taxpayer session using Property Code: ${matchedProperty.id}. Access Granted.`);
          setLoading(false);
          onLoginSuccess(taxpayerUser);
          return;
        } else {
          setError('Incorrect password. The default password for taxpayers is "reyapxats".');
          addLedgerLog('WARN', `Access Denied - Incorrect taxpayer password pattern entered for Property: ${matchedProperty.id}`);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to standard check for MOCK_USERS
      const foundUser = MOCK_USERS.find(
        u => u.email.toLowerCase().trim() === identifier.toLowerCase()
      );

      if (!foundUser) {
        setError('Invalid Email, Property Code, or Password.');
        addLedgerLog('WARN', `Access Denied - Recipient email or property ID not found in database.`);
        setLoading(false);
        return;
      }

      const savedPass = customPasswords[foundUser.email.toLowerCase().trim()];
      let correctPass = savedPass || 'Ramzurat';
      if (!savedPass) {
        if (foundUser.role === 'Super Admin') correctPass = 'Ramzurat';
        else if (foundUser.role === 'LGA Admin') correctPass = 'Suleja';
        else if (foundUser.role === 'Tax Officer') correctPass = 'Taxation';
        else if (foundUser.role === 'Field Agent') correctPass = 'Allagents';
        else if (foundUser.role === 'Accountant') correctPass = 'Money';
        else if (foundUser.role === 'Taxpayer') correctPass = 'reyapxats';
      }

      if (password !== correctPass && password !== 'demo' && !(foundUser.role === 'Taxpayer' && password === 'reyapxats')) {
        setError('Incorrect password for this user. You can also type "demo" to bypass.');
        addLedgerLog('WARN', `Access Denied - Incorrect administrative password entered for user account ID: ${foundUser.id}`);
        setLoading(false);
        return;
      }

      addLedgerLog('AUDIT', `Event [STANDARD-CREDENTIAL-AUTH]: Validated credentials for account ${foundUser.email}. Access Granted.`);
      setLoading(false);
      onLoginSuccess(foundUser);
    }, 800);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!forgotEmail.trim()) return;

    setLoading(true);
    addLedgerLog('INFO', `Dispatching password reset link request for registrant: ${forgotEmail}`);
    setTimeout(() => {
      setForgotSuccess(true);
      setLoading(false);
      addLedgerLog('SUCCESS', `Municipal recovery token intercepted and displayed inside the secure sandbox stream.`);
    }, 800);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    // Apply strict security strength score policies
    if (passStrengthObj.score < 3) {
      setForgotError('Security policy fail: Please build a stronger password meeting the Municipal policy requirements below.');
      addLedgerLog('WARN', `Credential reset canceled: password fails Suleja security policy requirements.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Verification check failed: Passwords do not match.');
      addLedgerLog('WARN', `Credential validation mismatch: passwords entered do not align.`);
      return;
    }

    setLoading(true);
    addLedgerLog('INFO', `Applying new cryptographic hash values to database registry user...`);
    setTimeout(() => {
      setCustomPasswords(prev => ({
        ...prev,
        [forgotEmail.toLowerCase().trim()]: newPassword
      }));
      setResetComplete(true);
      setLoading(false);
      addLedgerLog('AUDIT', `Event [CREDENTIAL-OVERRIDE]: Updated security access code in local session databases for ${forgotEmail}`);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0A1F44] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative font-sans">
      {/* Visual background rings */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08),transparent_50%)]" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.button 
          onClick={onBackToLanding}
          whileHover={{ x: -4 }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#38BDF8] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Citizen Portal
        </motion.button>

        <div className="flex justify-center mb-4">
          <motion.div 
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-lg border border-white/10 shrink-0"
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" 
              alt="Nigerian Coat of Arms Logo" 
              className="h-12 w-12 object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
        <h2 className="text-center text-2xl font-extrabold text-white tracking-tight font-display">
          Suleja Local Government
        </h2>
        <p className="mt-1.5 text-center text-xs font-bold text-[#38BDF8] tracking-widest uppercase mb-1">
          Digital Revenue Platform
        </p>
        <p className="text-center text-xs text-gray-400">
          Secure Administrative & Taxpayer Gateway
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-gray-100">
          
          {/* Method Selector Tabs if forgot is not open */}
          {!showForgot && (
            <div className="mb-6 grid grid-cols-3 gap-2 bg-[#0A1F44]/5 p-1.5 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => handleAuthMethodChange('standard')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  authMethod === 'standard' 
                    ? 'bg-[#0A1F44] text-white shadow-sm' 
                    : 'text-gray-600 hover:text-[#0A1F44] hover:bg-gray-100'
                }`}
              >
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Key Account</span>
              </button>
              <button
                type="button"
                onClick={() => handleAuthMethodChange('qr')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  authMethod === 'qr' 
                    ? 'bg-[#0A1F44] text-white shadow-sm' 
                    : 'text-gray-600 hover:text-[#0A1F44] hover:bg-gray-100'
                }`}
              >
                <QrCode className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Agent QR Scan</span>
              </button>
              <button
                type="button"
                onClick={() => handleAuthMethodChange('fingerprint')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  authMethod === 'fingerprint' 
                    ? 'bg-[#0A1F44] text-white shadow-sm' 
                    : 'text-gray-600 hover:text-[#0A1F44] hover:bg-gray-100'
                }`}
              >
                <Fingerprint className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Biometrics</span>
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!showForgot ? (
              <motion.div
                key={authMethod}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {authMethod === 'standard' && (
                  /* Standard Password Access Card */
                  <form onSubmit={handleLoginSubmit} className="space-y-6">
                    {error && (
                      <div className="rounded-lg bg-red-50 p-3 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider mb-2">
                        Email Address or Property Code (Taxpayers)
                      </label>
                      <div className="relative rounded-md shadow-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="officer@suleja.gov.ng or SLG-2026-00001"
                          className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0A1F44] focus:outline-none focus:ring-1 focus:ring-[#0A1F44]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider">
                          Secured Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgot(true);
                            setForgotSuccess(false);
                            setForgotEmail(email);
                          }}
                          className="text-xs font-semibold text-[#38BDF8] hover:text-[#0A1F44] transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative rounded-md shadow-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0A1F44] focus:outline-none focus:ring-1 focus:ring-[#0A1F44]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-[#0A1F44] focus:ring-[#0A1F44]"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-600 font-medium select-none">
                          Remember session
                        </label>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                        <ShieldCheck className="h-3 w-3 text-green-500" />
                        <span>TLS Certified</span>
                      </div>
                    </div>

                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#0A1F44] hover:bg-opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A1F44] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Security handshaking...
                          </span>
                        ) : (
                          'Authenticate and Access'
                        )}
                      </button>
                    </motion.div>
                  </form>
                )}

                {authMethod === 'qr' && (
                  /* QR ID Code Scanner Simulator */
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <QrCode className="h-8 w-8 text-[#38BDF8] mx-auto" />
                      <h3 className="font-display font-bold text-sm text-gray-900 uppercase">Agent Card QR Scanner</h3>
                      <p className="text-xs text-gray-500">Scan pre-issued field agent identity cards to initiate secure portal routing.</p>
                    </div>

                    {/* Camera Scanner Simulator Screen Box */}
                    <div className="relative h-60 w-full rounded-2xl bg-black overflow-hidden border-2 border-gray-700 flex flex-col items-center justify-center text-center p-4">
                      {/* Live Neon Green Laser Grid Overlay */}
                      <div className="absolute inset-x-6 inset-y-6 border border-emerald-400/40 rounded-lg pointer-events-none">
                        {/* Interactive corners */}
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                      </div>

                      {qrScanning ? (
                        <div className="space-y-4 w-full px-6 relative z-10">
                          {/* Sizzling vertical laser sweep animation */}
                          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent top-0 animate-[shimmer_1.8s_infinite] shadow-[0_0_8px_1px_rgba(52,211,153,0.8)]" />
                          
                          <ScanLine className="h-10 w-10 text-emerald-400 mx-auto animate-pulse" />
                          <div className="space-y-1">
                            <span className="block text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">Scanning Agent Card...</span>
                            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-emerald-400 h-1.5 transition-all duration-150" style={{ width: `${qrProgress}%` }} />
                            </div>
                            <span className="block text-[10px] text-gray-400 font-mono">HASH CHECKPOINT INTEGRITY OK</span>
                          </div>
                        </div>
                      ) : qrScanSuccess ? (
                        <div className="space-y-3 relative z-10 animate-scaleUp">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500">
                            <Check className="h-6 w-6 stroke-[3px]" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">Access Clearance Approved!</span>
                            <span className="block text-sm font-bold text-white mt-1">{qrScanSuccess.name}</span>
                            <span className="inline-block mt-1 items-center gap-1.5 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 rounded border border-emerald-500/30 uppercase font-mono">
                              {qrScanSuccess.role}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 relative z-10 max-w-sm px-4">
                          <QrCode className="h-12 w-12 text-gray-500 mx-auto" />
                          <span className="block text-xs font-medium text-gray-400 leading-relaxed">
                            Position the QR key stamped on the physical ID card badge directly before the console receiver lens.
                          </span>
                          <span className="inline-block px-2.5 py-1 text-[9px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 rounded border border-[#38BDF8]/20">
                            WAITING FOR HANDSHAKE...
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick simulated scan options */}
                    {!qrScanSuccess && (
                      <div className="space-y-2.5">
                        <span className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider">
                          🎁 Simulate Physical Agent ID Scan
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={qrScanning}
                            onClick={() => startQrScannerSimulator('USR-004')}
                            className="p-2.5 bg-sky-50 border border-sky-100 rounded-xl hover:border-[#38BDF8] hover:bg-sky-100/50 transition-all text-left flex items-start gap-2 disabled:opacity-50"
                          >
                            <div className="bg-[#0A1F44] text-white p-1 rounded">
                              <QrCode className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[11px] font-bold text-gray-900 truncate">Umar Sani</span>
                              <span className="block text-[9px] text-gray-500 truncate">Field Agent Card</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            disabled={qrScanning}
                            onClick={() => startQrScannerSimulator('USR-003')}
                            className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl hover:border-emerald-400 hover:bg-emerald-100/40 transition-all text-left flex items-start gap-2 disabled:opacity-50"
                          >
                            <div className="bg-emerald-950 text-emerald-300 p-1 rounded">
                              <QrCode className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[11px] font-bold text-gray-900 truncate">Abdulrahman M.</span>
                              <span className="block text-[9px] text-gray-500 truncate">Tax Officer Card</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {authMethod === 'fingerprint' && (
                  /* Biometric Fingerprint Auth Simulator */
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <Fingerprint className="h-8 w-8 text-[#38BDF8] mx-auto" />
                      <h3 className="font-display font-bold text-sm text-gray-900 uppercase">Capacitive Biometric Scan</h3>
                      <p className="text-xs text-gray-500">Provide direct biometric finger pressure alignment against terminal sensor plate.</p>
                    </div>

                    {/* Sensor Touch Interface Panel */}
                    <div className="flex flex-col items-center justify-center pb-4 pt-1">
                      
                      {bioSuccess ? (
                        <div className="text-center space-y-3 py-6 bg-emerald-50 border border-emerald-200 rounded-2xl w-full p-4 animate-scaleUp">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <ShieldCheck className="h-7 w-7 animate-bounce" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-widest block font-mono">Biometric Approved</span>
                            <p className="text-[13px] font-bold text-gray-900 mt-1">LGA Administrative Terminal Cleared</p>
                            <span className="inline-block mt-1 font-mono text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                              {bioSuccess.name} • {bioSuccess.role}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-4 w-full">
                          
                          {/* Circular Capacitive Button Component */}
                          <div className="relative mx-auto flex items-center justify-center h-32 w-32">
                            {/* Pulse background effects */}
                            <div className="absolute inset-0 rounded-full bg-[#38BDF8]/10 animate-ping" />
                            {isPressingFinger && (
                              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-pulse" />
                            )}

                            {/* SVG Circle progress bar */}
                            <svg className="absolute inset-0 transform -rotate-90 w-full h-full">
                              <circle 
                                cx="64" 
                                cy="64" 
                                r="56" 
                                stroke="#F3F4F6" 
                                strokeWidth="6" 
                                fill="transparent" 
                              />
                              <circle 
                                cx="64" 
                                cy="64" 
                                r="56" 
                                stroke={isPressingFinger ? "#34D399" : "#38BDF8"} 
                                strokeWidth="6" 
                                fill="transparent" 
                                strokeDasharray={351.8}
                                strokeDashoffset={351.8 - (351.8 * fingerProgress) / 100}
                                className="transition-all duration-100"
                              />
                            </svg>

                            <button
                              onMouseDown={() => {
                                setIsPressingFinger(true);
                                addLedgerLog('INFO', `Capacitive scan initiated on node sensor plate. Maintain pressure...`);
                              }}
                              onMouseUp={() => {
                                setIsPressingFinger(false);
                                addLedgerLog('WARN', `Sensor check aborted: finger lifted prior to 100% resolution.`);
                              }}
                              onMouseLeave={() => {
                                if (isPressingFinger) {
                                  setIsPressingFinger(false);
                                  addLedgerLog('WARN', `Sensor check aborted: scan boundaries slipped.`);
                                }
                              }}
                              onTouchStart={() => {
                                setIsPressingFinger(true);
                                addLedgerLog('INFO', `Capacitive scan initiated on node sensor plate. Maintain pressure...`);
                              }}
                              onTouchEnd={() => {
                                setIsPressingFinger(false);
                                addLedgerLog('WARN', `Sensor check aborted: finger lifted prior to 100% resolution.`);
                              }}
                              className={`h-24 w-24 rounded-full flex items-center justify-center absolute focus:outline-none transition-all cursor-pointer ${
                                isPressingFinger 
                                  ? 'bg-[#10B981] text-white shadow-emerald-400/50 shadow-lg scale-95' 
                                  : 'bg-[#0A1F44] text-[#38BDF8] shadow-lg hover:bg-opacity-95'
                              }`}
                            >
                              <Fingerprint className={`h-12 w-12 ${isPressingFinger ? 'animate-pulse' : ''}`} />
                            </button>
                          </div>

                          <div className="space-y-1">
                            <span className="block text-xs font-bold text-gray-700 uppercase tracking-widest font-mono">
                              {isPressingFinger ? `Scanning: ${fingerProgress}%` : 'PRESS AND HOLD SENSOR BUTTON'}
                            </span>
                            <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                              Capacitive recognition simulates a physical verification request securely in real-time.
                            </p>
                          </div>

                          {/* Profile Select for simulation */}
                          <div className="bg-[#0A1F44]/5 rounded-xl p-3 border border-gray-150 text-left">
                            <label className="block text-[10px] font-bold text-[#0A1F44] uppercase tracking-wider mb-2">
                              🧬 Configured Local Biometric Profile Profile
                            </label>
                            <select
                              value={biometricSelectedUser}
                              onChange={(e) => {
                                setBiometricSelectedUser(e.target.value);
                                addLedgerLog('INFO', `Repatched biometric module database signature links to profile index: ${e.target.value}`);
                              }}
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-medium focus:outline-none focus:border-[#0A1F44]"
                            >
                              <option value="USR-002">Muhammad Zubairu (LGA Chairman / Admin)</option>
                              <option value="USR-003">Abdulrahman Muhammad (Tax Officer)</option>
                              <option value="USR-004">Umar Sani (Field Agent)</option>
                              <option value="USR-005">Salma Salihu (Accountant)</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Forgot Password / Recovery Workflow */
              <motion.div
                key="forgot"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {resetComplete ? (
                  <div className="rounded-xl bg-emerald-50/50 p-5 border border-emerald-200 text-center space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                      <ShieldCheck className="h-6 w-6 text-emerald-600 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-sm font-bold text-gray-900">
                        Security Code Updated
                      </span>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Your secured password for <span className="font-mono text-[#0A1F44] font-bold">{forgotEmail}</span> has been updated successfully inside this session.
                      </p>
                    </div>
                    <div className="bg-emerald-100/50 rounded-lg p-2.5 text-[11px] text-emerald-800 font-medium text-left">
                      🔑 <b>Updated Secret:</b> <span className="font-mono">{newPassword}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(forgotEmail);
                        setPassword(newPassword);
                        setShowForgot(false);
                        setShowResetForm(false);
                        setResetComplete(false);
                        setForgotSuccess(false);
                        setError(null);
                      }}
                      className="w-full rounded-lg bg-[#0A1F44] text-white py-2.5 px-4 text-xs font-bold hover:bg-opacity-95 shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Authenticate and Login Now</span>
                      <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                    </button>
                  </div>
                ) : showResetForm ? (
                  <form onSubmit={handleResetSubmit} className="space-y-6">
                    <div className="text-center space-y-1.5">
                      <KeyRound className="h-10 w-10 text-[#38BDF8] mx-auto animate-pulse" />
                      <h3 className="font-display font-bold text-sm text-gray-900 uppercase">Set New Password</h3>
                      <p className="text-xs text-gray-500">
                        Assign a secure password for account <span className="font-mono font-bold text-gray-700">{forgotEmail}</span>.
                      </p>
                    </div>

                    {forgotError && (
                      <div className="rounded-lg bg-red-50 p-3 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider mb-2">
                        New Security Code
                      </label>
                      <div className="relative rounded-md shadow-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setForgotError(null);
                          }}
                          placeholder="At least 6 characters"
                          className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-[#0A1F44] focus:outline-none focus:ring-1 focus:ring-[#0A1F44]"
                        />
                      </div>

                      {/* PASSWORD STRENGTH COMPLEXITY METER */}
                      {newPassword.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Strength Security Assessment:</span>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md text-white ${passStrengthObj.color}`}>
                              {passStrengthObj.feedback}
                            </span>
                          </div>
                          
                          {/* Visual progress strength indicators */}
                          <div className="h-2 w-full bg-gray-100 rounded-full flex gap-1">
                            <div className={`h-full rounded-l-full transition-all duration-300 ${passStrengthObj.score >= 1 ? passStrengthObj.color : 'bg-gray-200'}`} style={{ width: '25%' }} />
                            <div className={`h-full transition-all duration-300 ${passStrengthObj.score >= 2 ? passStrengthObj.color : 'bg-gray-200'}`} style={{ width: '25%' }} />
                            <div className={`h-full transition-all duration-300 ${passStrengthObj.score >= 3 ? passStrengthObj.color : 'bg-gray-200'}`} style={{ width: '25%' }} />
                            <div className={`h-full rounded-r-full transition-all duration-300 ${passStrengthObj.score >= 4 ? passStrengthObj.color : 'bg-gray-200'}`} style={{ width: '25%' }} />
                          </div>

                          {/* Requirements checks checklist */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-[#0A1F44]/5 p-2.5 rounded-lg border border-gray-150">
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {passStrengthObj.checklist.length ? (
                                <Check className="h-3 w-3 text-emerald-500 stroke-[3px]" />
                              ) : (
                                <X className="h-3 w-3 text-red-400 stroke-[3px]" />
                              )}
                              <span className={passStrengthObj.checklist.length ? 'text-gray-700 font-bold' : 'text-gray-400'}>6+ Characters</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {passStrengthObj.checklist.mixed ? (
                                <Check className="h-3 w-3 text-emerald-500 stroke-[3px]" />
                              ) : (
                                <X className="h-3 w-3 text-red-400 stroke-[3px]" />
                              )}
                              <span className={passStrengthObj.checklist.mixed ? 'text-gray-700 font-bold' : 'text-gray-400'}>Upper & Lower</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {passStrengthObj.checklist.number ? (
                                <Check className="h-3 w-3 text-emerald-500 stroke-[3px]" />
                              ) : (
                                <X className="h-3 w-3 text-red-400 stroke-[3px]" />
                              )}
                              <span className={passStrengthObj.checklist.number ? 'text-gray-700 font-bold' : 'text-gray-400'}>Contains Digits</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {passStrengthObj.checklist.special ? (
                                <Check className="h-3 w-3 text-emerald-500 stroke-[3px]" />
                              ) : (
                                <X className="h-3 w-3 text-red-400 stroke-[3px]" />
                              )}
                              <span className={passStrengthObj.checklist.special ? 'text-gray-700 font-bold' : 'text-gray-400'}>Special Sign</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider mb-2">
                        Verify New Security Code
                      </label>
                      <div className="relative rounded-md shadow-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat security code"
                          className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-[#0A1F44] focus:outline-none focus:ring-1 focus:ring-[#0A1F44]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetForm(false);
                          setNewPassword('');
                          setConfirmPassword('');
                          setForgotError(null);
                        }}
                        className="flex-1 text-center py-2 px-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-[#0A1F44] text-white py-2 px-3 rounded-lg text-xs font-bold hover:bg-opacity-95 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </div>
                  </form>
                ) : forgotSuccess ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-1.5">
                      <KeyRound className="h-10 w-10 text-emerald-500 mx-auto" />
                      <h3 className="font-display font-medium text-lg text-gray-900">Link Generated</h3>
                      <p className="text-xs text-gray-500">Security verification instructions dispatched to sandbox stream.</p>
                    </div>

                    <div className="rounded-xl bg-sky-50 border border-sky-100 p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-sky-200/60 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] uppercase font-bold text-sky-800 tracking-wider">Sandbox Email Interceptor</span>
                        </div>
                        <span className="text-[9px] text-sky-600 font-mono font-medium">Port 25 (Direct Stream)</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase font-semibold">Recipient Inbox:</span>
                          <span className="font-semibold text-gray-800 font-mono">{forgotEmail}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase font-semibold">Subject:</span>
                          <span className="text-gray-800 font-medium">🔐 Security Reset Hook - Suleja Digital Revenue Service</span>
                        </div>
                        <div className="bg-white/85 p-3 rounded-lg border border-sky-100/80 text-[11px] text-gray-700 leading-relaxed font-semibold shadow-xs">
                          <p className="mb-2">A password recovery event was triggered for your Suleja LGA staff or taxpayer credential profile.</p>
                          <p className="mb-3">To proceed, click the secure system recovery link below to assign your new password:</p>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setShowResetForm(true);
                              setForgotError(null);
                            }}
                            className="w-full py-2 bg-gradient-to-r from-sky-500 to-[#0A1F44] text-white rounded-lg text-center font-bold text-xs hover:opacity-95 shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>👉 CLICK TO RESET NEW PASSWORD</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotSuccess(false);
                          setForgotEmail('');
                          setForgotError(null);
                        }}
                        className="flex-1 text-center py-2.5 px-4 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Retry Different Email
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgot(false);
                          setForgotSuccess(false);
                          setForgotError(null);
                        }}
                        className="flex-1 bg-gray-100 text-gray-800 py-2.5 px-4 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        Return to Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-6">
                    <div className="text-center space-y-1.5">
                      <KeyRound className="h-8 w-8 text-[#38BDF8] mx-auto" />
                      <h3 className="font-display font-bold text-lg text-gray-900 uppercase">Reset Security Code</h3>
                      <p className="text-xs text-gray-500">Provide your official Suleja Gov or registered email address to receive secure reset verification details.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider mb-2">
                        Email Address
                      </label>
                      <div className="relative rounded-md shadow-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="officer@suleja.gov.ng"
                          className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0A1F44] focus:outline-none focus:ring-1 focus:ring-[#0A1F44]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowForgot(false)}
                        className="flex-1 text-center py-2.5 px-4 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-[#0A1F44] text-white py-2.5 px-4 rounded-lg text-xs font-bold hover:bg-opacity-95 shadow-md flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Simulating Link...
                          </>
                        ) : (
                          'Send Reset Link'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>



        </div>
      </div>

      {/* Real-time SSL Security Handshake Auditing ledger output console */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#38BDF8]" />
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#38BDF8]">
                Municipal Security Gateway Ledger
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Auditing: Active</span>
            </div>
          </div>

          <div className="space-y-1 max-h-36 overflow-y-auto pr-1 font-mono text-[10px] leading-relaxed scrollbar-thin">
            {ledgerLogs.map((log, idx) => {
              // Highlight based on log type
              let color = 'text-gray-400';
              if (log.includes('[SUCCESS]')) color = 'text-emerald-400 font-bold';
              else if (log.includes('[WARN]')) color = 'text-amber-400 font-semibold';
              else if (log.includes('[AUDIT]')) color = 'text-sky-300 font-extrabold';
              else if (idx === 0) color = 'text-white';
              
              return (
                <div key={idx} className={`${color} break-all`}>
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
