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
  ScanLine,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, UserRole, Property } from '../types';
import { MOCK_USERS } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onBackToLanding: () => void;
  properties: Property[];
  users?: User[];
  initialLoginType?: 'staff' | 'taxpayer';
  hideTypeSelector?: boolean;
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

export default function LoginPage({ 
  onLoginSuccess, 
  onBackToLanding, 
  properties, 
  users = MOCK_USERS,
  initialLoginType = 'staff',
  hideTypeSelector = false
}: LoginPageProps) {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Navigation workflows
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Authentication mode: staff portal vs taxpayer portal
  const [loginType, setLoginType] = useState<'staff' | 'taxpayer'>(initialLoginType);

  useEffect(() => {
    setLoginType(initialLoginType);
  }, [initialLoginType]);

  // Advanced Sandbox Reset states
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const [customPasswords, setCustomPasswords] = useState<Record<string, string>>({});
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Hidden Super Admin Backdoor Lock & PIN State
  const [logoClicks, setLogoClicks] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinFailAttempts, setPinFailAttempts] = useState(() => {
    return Number(localStorage.getItem('super_admin_pin_failures') || '0');
  });
  const [lastPinAttemptTime, setLastPinAttemptTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('super_admin_pin_lockout');
    return saved ? Number(saved) : null;
  });

  const getSuperAdminPin = () => {
    return localStorage.getItem('super_admin_pin') || '363590';
  };

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const nextClicks = prev + 1;
      if (nextClicks >= 5) {
        setShowPinModal(true);
        setPinValue('');
        setPinError(null);
        addLedgerLog('AUDIT', 'Backdoor event: 5 consecutive logo clicks detected. Launching authentication dialog.');
        return 0; // reset counter
      }
      return nextClicks;
    });
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    // Lockout verification
    const now = Date.now();
    if (lastPinAttemptTime && pinFailAttempts >= 3) {
      const leftMs = lastPinAttemptTime + 30000 - now;
      if (leftMs > 0) {
        const seconds = Math.ceil(leftMs / 1000);
        setPinError(`Temporarily locked out of the security terminal. Retrying available in ${seconds} seconds.`);
        return;
      } else {
        // lockout expired
        setPinFailAttempts(0);
        localStorage.removeItem('super_admin_pin_failures');
        localStorage.removeItem('super_admin_pin_lockout');
      }
    }

    const currentPin = getSuperAdminPin();
    if (pinValue === currentPin) {
      // SUCCESS login
      setPinFailAttempts(0);
      localStorage.removeItem('super_admin_pin_failures');
      localStorage.removeItem('super_admin_pin_lockout');
      
      // log success
      addLedgerLog('SUCCESS', `Super Admin credentials verified. Terminal master override approved.`);
      
      // record attempt
      const attempts = JSON.parse(localStorage.getItem('super_admin_pin_attempts') || '[]');
      attempts.unshift({
        timestamp: new Date().toISOString(),
        success: true,
        ip: `192.168.10.${Math.floor(10 + Math.random() * 240)}`,
        device: navigator.userAgent || 'Chrome/Win10 Sandbox'
      });
      localStorage.setItem('super_admin_pin_attempts', JSON.stringify(attempts.slice(0, 50)));

      // Trigger standard Super Admin login directly!
      onLoginSuccess({
        id: 'SUPER_ADMIN_PIN_USER',
        name: 'Master Super Admin',
        email: 'admin@suleja.gov.ng',
        role: 'Super Admin',
        phone: '+234 803 635 9027',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        ward: 'Towns Ward'
      });
      setShowPinModal(false);
    } else {
      // FAILURE
      const nextFailures = pinFailAttempts + 1;
      setPinFailAttempts(nextFailures);
      localStorage.setItem('super_admin_pin_failures', String(nextFailures));
      
      // record failure
      const attempts = JSON.parse(localStorage.getItem('super_admin_pin_attempts') || '[]');
      attempts.unshift({
        timestamp: new Date().toISOString(),
        success: false,
        ip: `192.168.10.${Math.floor(10 + Math.random() * 240)}`,
        device: navigator.userAgent || 'Chrome/Win10 Sandbox'
      });
      localStorage.setItem('super_admin_pin_attempts', JSON.stringify(attempts.slice(0, 50)));

      addLedgerLog('WARN', `Unauthorized Super Admin PIN attempt. Sequence detected: ${nextFailures}/3.`);

      if (nextFailures >= 3) {
        const lockoutTime = Date.now();
        setLastPinAttemptTime(lockoutTime);
        localStorage.setItem('super_admin_pin_lockout', String(lockoutTime));
        setPinError("Too many failed attempts. Security lock initiated. Backdoor deactivated for 30s.");
      } else {
        setPinError(`Incorrect secure terminal PIN code. Access denied. (Attempts: ${nextFailures}/3)`);
      }
    }
  };

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
  const handleLoginTypeChange = (type: 'staff' | 'taxpayer') => {
    setLoginType(type);
    setEmail('');
    setPassword('');
    setError(null);
    setForgotError(null);
    setShowPassword(false);
    addLedgerLog('INFO', `Switched gateway channel authorization to: [${type.toUpperCase()}_PORTAL]`);
  };

  // Password assessment
  const passStrengthObj = checkPasswordStrength(newPassword);

  // Auto-fill credentials helper
  const handlePrefillSelect = (user: User) => {
    setEmail(user.email);
    const saved = customPasswords[user.email.toLowerCase().trim()];
    if (saved) {
      setPassword(saved);
    } else {
      let pass = 'RamZurat';
      if (user.role === 'Super Admin') pass = 'RamZurat';
      else if (user.role === 'LGA Admin') pass = 'SulejaLGA';
      else if (user.role === 'Tax Officer') pass = 'Taxation';
      else if (user.role === 'Field Agent') pass = 'Allagents'; // Though LGA admin generates, mock data still has this. Keep whatever for testing.
      else if (user.role === 'Accountant') pass = 'Fundsuleja';
      else if (user.role === 'Taxpayer') pass = 'reyapxats';
      setPassword(pass);
    }
    setError(null);
    addLedgerLog('INFO', `Prefilled sandbox test credentials for: [${user.name} - ${user.role}]`);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const identifier = email.trim();
    addLedgerLog('INFO', `Validating client credentials with centralized database provider for: ${identifier}...`);

    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      setLoading(false);
      setError("Network Handshake is slow or mismatched. Click 'Use Demo Credentials' or click Clear to retry.");
      addLedgerLog('WARN', `Security Gateway Handshake is slow or offline. Timeout watchdog tripped.`);
    }, 5500);

    try {
      // Execute authentications and role-based checks via centralized AuthContext
      const loggedInUser = await login(identifier, password);
      clearTimeout(timeoutId);
      if (didTimeout) return;

      addLedgerLog('SUCCESS', `Validated ${loginType} session with centralized Auth. Access Granted.`);
      onLoginSuccess(loggedInUser);
      setLoading(false);
      return;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (didTimeout) return;

      addLedgerLog('WARN', `Access Denied: ${err.message}`);
      let helpfulMessage = err.message || "Incorrect credentials or account status restriction.";
      if (loginType === 'staff') {
        helpfulMessage += " Use 'admin2026' as the staff password, or pick an identity from the directory below.";
      } else {
        helpfulMessage += " Verify your taxpayer PIN and pass code, or try another.";
      }
      setError(helpfulMessage);
      setLoading(false);
      return;
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!forgotEmail.trim()) return;

    setLoading(true);
    addLedgerLog('INFO', `Dispatching password reset link request for registrant: ${forgotEmail}`);
    try {
      await resetPassword(forgotEmail.trim());
      setForgotSuccess(true);
      addLedgerLog('SUCCESS', `Municipal recovery link dispatched securely to user email.`);
    } catch (err: any) {
      setForgotError(err.message || "Failed to dispatch reset link.");
      addLedgerLog('WARN', `Failed to dispatch reset link: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
            onClick={handleLogoClick}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-lg border border-white/10 shrink-0 cursor-pointer hover:bg-white/20 active:scale-95 transition-all"
            title="Suleja Municipal Security Gateway Logo"
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" 
              alt="Nigerian Coat of Arms Logo" 
              className="h-12 w-12 object-contain pointer-events-none"
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
          
          {/* Differentiated Login Pattern Selector Tabs (LGA Staff vs Taxpayer) */}
          {!showForgot && !hideTypeSelector && (
            <div className="mb-6 grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-gray-200">
              <button
                type="button"
                id="login-tab-staff"
                onClick={() => handleLoginTypeChange('staff')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                  loginType === 'staff' 
                    ? 'bg-[#0A1F44] text-white shadow-md border-b-2 border-sky-400' 
                    : 'text-gray-500 hover:text-[#0A1F44] hover:bg-white/60'
                }`}
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">LGA Staff Portal</span>
              </button>
              <button
                type="button"
                id="login-tab-taxpayer"
                onClick={() => handleLoginTypeChange('taxpayer')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                  loginType === 'taxpayer' 
                    ? 'bg-emerald-600 text-white shadow-md border-b-2 border-emerald-300' 
                    : 'text-gray-500 hover:text-emerald-600 hover:bg-white/60'
                }`}
              >
                <Landmark className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Taxpayer Portal</span>
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!showForgot ? (
              <motion.div
                key={loginType}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {/* Unified Differentiated Sign In Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  {error && (
                    <div className="relative rounded-lg bg-red-50 p-4 border border-red-200 flex flex-col gap-2.5 text-xs text-red-700 animate-in fade-in duration-200">
                      <button
                        type="button"
                        onClick={() => setError(null)}
                        className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors cursor-pointer"
                        title="Dismiss alert"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-start gap-2 pr-6">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-650" />
                        <span className="font-semibold leading-relaxed">{error}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 pl-6">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            // Auto trigger login with master credentials for staff fallback in offline mode
                            if (loginType === 'staff') {
                              setEmail('admin@suleja.gov.ng');
                              setPassword('admin2026');
                            } else {
                              setEmail('taxpayer@suleja.gov.ng');
                              setPassword('reyapxats');
                            }
                            addLedgerLog('INFO', 'Applied default sandbox credentials parameters.');
                          }}
                          className="bg-red-100 hover:bg-red-200 text-red-800 font-extrabold px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-all cursor-pointer border border-red-250"
                        >
                          Use Demo Credentials
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            addLedgerLog('INFO', 'Cleaned security logs and reset session lockdowns.');
                          }}
                          className="text-red-650 hover:underline text-[10px] font-bold cursor-pointer"
                        >
                          Clear & Retry
                        </button>
                      </div>
                    </div>
                  )}

                  {loginType === 'staff' ? (
                    /* LGA STAFF PORTAL */
                    <div className="space-y-4">
                      <div className="border-l-4 border-sky-500 pl-3 py-1">
                        <span className="block text-[10px] font-black uppercase text-sky-600 tracking-wider">Secured Administrative Vault Entrance</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">Please provide your authorized `@suleja.gov.ng` credential.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider mb-2">
                          Official Staff Email Address
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
                            placeholder="e.g. chairman@suleja.gov.ng"
                            className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0A1F44] focus:outline-none focus:ring-1 focus:ring-[#0A1F44]"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-[#0A1F44] uppercase tracking-wider">
                            Secured Staff Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgot(true);
                              setForgotSuccess(false);
                              setForgotEmail(email);
                            }}
                            className="text-xs font-semibold text-sky-600 hover:text-[#0A1F44] transition-colors cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <div className="relative rounded-md shadow-xs">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Lock className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0A1F44] focus:outline-none focus:ring-1 focus:ring-[#0A1F44]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-[#0A1F44] select-none cursor-pointer focus:outline-none"
                            title={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* TAXPAYER PORTAL */
                    <div className="space-y-4">
                      <div className="border-l-4 border-emerald-500 pl-3 py-1">
                        <span className="block text-[10px] font-black uppercase text-emerald-600 tracking-wider">Citizen Tenement Rate Portal</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">Access property tax reports, outstanding bills & instant settlements.</p>
                      </div>

                      {/* Taxpayer Portal Info */}

                      <div>
                        <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                          Property ID Code or Taxpayer Email
                        </label>
                        <div className="relative rounded-md shadow-xs">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Landmark className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. SLG-3052-0941 or resident@suleja.gov.ng"
                            className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider">
                            Secured Resident Key / Password
                          </label>
                        </div>
                        <div className="relative rounded-md shadow-xs">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Lock className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-emerald-600 select-none cursor-pointer focus:outline-none"
                            title={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className={`h-4 w-4 rounded border-gray-300 cursor-pointer ${
                          loginType === 'staff' 
                            ? 'text-[#0A1F44] focus:ring-[#0A1F44]' 
                            : 'text-emerald-500 focus:ring-emerald-500'
                        }`}
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-600 font-medium select-none cursor-pointer">
                        Remember session
                      </label>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                      <ShieldCheck className="h-3 w-3 text-green-500" strokeWidth={3} />
                      <span>TLS Secure SSL</span>
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <button
                      type="submit"
                      id="login-submit-button"
                      disabled={loading}
                      className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-black text-white transition-all disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        loginType === 'staff'
                          ? 'bg-[#0A1F44] hover:bg-[#112f62] focus:ring-[#0A1F44]'
                          : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-lg shadow-emerald-600/10'
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-white" />
                          Security handshaking...
                        </span>
                      ) : (
                        `Authenticate and Access ${loginType === 'staff' ? 'Staff Portal' : 'Taxpayer Portal'}`
                      )}
                    </button>
                  </motion.div>
                  

                </form>
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

      {/* Hidden Super Admin PIN Overlay Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Super Admin Portal Access</h3>
                  <span className="text-[10px] text-gray-500 font-mono text-left block">SECURE BYPASS TERMINAL</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setShowPinModal(false); setPinValue(''); setPinError(null); }}
                className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs font-mono font-bold"
              >
                CLOSE
              </button>
            </div>
            
            <form onSubmit={handlePinSubmit} className="p-5 space-y-4">
              {pinError ? (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-lg flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">⚠️</span>
                  <span>{pinError}</span>
                </div>
              ) : (
                <div className="bg-sky-500/5 border border-sky-500/10 text-sky-300 text-[11px] p-2.5 rounded-lg">
                  Enter the secure Super Admin PIN code to bypass standard authentication credentials and gain direct root system permissions.
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  SECURE SUPER ADMIN PIN
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    maxLength={10}
                    required
                    autoFocus
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-center sm:text-lg font-mono font-bold text-white tracking-[0.5em] placeholder-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[44px]"
              >
                Authenticate Bypass Key
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Real-time SSL Security Handshake Auditing ledger output console hidden per user request */}
    </div>
  );
}
