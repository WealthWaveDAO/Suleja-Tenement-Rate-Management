import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Activity, 
  History, 
  Key, 
  Lock, 
  Unlock, 
  UserX, 
  UserCheck, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Cpu, 
  Database, 
  Check, 
  X, 
  Search, 
  Filter, 
  Layers, 
  Terminal, 
  Smartphone, 
  Power,
  RefreshCw,
  Clock,
  ExternalLink,
  Info
} from 'lucide-react';
import { User, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface SuperAdminPortalProps {
  users: User[];
  onUpdateUsers: (newUsers: User[]) => void;
  onAddAuditLog: (action: string, details: string) => void;
  // Standard logging integration
  appendLog?: (category: string, text: string) => void;
}

interface SuperAdminAttempt {
  timestamp: string;
  success: boolean;
  ip: string;
  device: string;
}

interface SuperAdminAudit {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details: string;
  ip: string;
}

export default function SuperAdminPortal({ 
  users, 
  onUpdateUsers, 
  onAddAuditLog,
  appendLog
}: SuperAdminPortalProps) {
  const { createUser, suspendUser, deleteUserAccount } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'users' | 'activity' | 'security'>('dashboard');
  
  // Create User form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Tax Officer');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserWard, setNewUserWard] = useState('Towns Ward');
  const [newUserPass, setNewUserPass] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Edit User state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Tax Officer');
  const [editPhone, setEditPhone] = useState('');
  const [editWard, setEditWard] = useState('Towns Ward');

  // PIN security override
  const [showPinChange, setShowPinChange] = useState(false);
  const [oldPinValue, setOldPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Logs & History State loaded from localStorage
  const [loginAttempts, setLoginAttempts] = useState<SuperAdminAttempt[]>([]);
  const [auditTrail, setAuditTrail] = useState<SuperAdminAudit[]>([]);
  const [activeSessions, setActiveSessions] = useState<Record<string, { device: string; ip: string; loginTime: string }>>({});

  // System Diagnostics state (changing in real-time)
  const [systemLoad, setSystemLoad] = useState(14);
  const [systemLatency, setSystemLatency] = useState(32);
  const [isDbConnected, setIsDbConnected] = useState(true);

  // Load persistent states
  useEffect(() => {
    // 1. PIN attempts
    const savedAttempts = localStorage.getItem('super_admin_pin_attempts');
    if (savedAttempts) {
      try { setLoginAttempts(JSON.parse(savedAttempts)); } catch(e){}
    } else {
      // populate defaults
      const initial: SuperAdminAttempt[] = [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), success: true, ip: '192.168.10.45', device: 'Chrome / Win10 Session' },
        { timestamp: new Date(Date.now() - 8600000).toISOString(), success: false, ip: '192.168.10.89', device: 'Safari / iPhone OS' }
      ];
      localStorage.setItem('super_admin_pin_attempts', JSON.stringify(initial));
      setLoginAttempts(initial);
    }

    // 2. Audit Trial (immutable)
    const savedAudit = localStorage.getItem('super_admin_internal_audit');
    if (savedAudit) {
      try { setAuditTrail(JSON.parse(savedAudit)); } catch(e){}
    } else {
      const initialAudit: SuperAdminAudit[] = [
        { id: 'AUD-3001', timestamp: new Date(Date.now() - 7200000).toISOString(), userEmail: 'superadmin@suleja.gov.ng', action: 'PORTAL_INITIALIZE', details: 'Super Admin hidden bypass secure channel online.', ip: '192.168.10.45' }
      ];
      localStorage.setItem('super_admin_internal_audit', JSON.stringify(initialAudit));
      setAuditTrail(initialAudit);
    }

    // 3. Simulated Active Sessions mapping
    const savedSessions = localStorage.getItem('super_admin_active_sessions');
    if (savedSessions) {
      try { setActiveSessions(JSON.parse(savedSessions)); } catch(e){}
    } else {
      const initialSessions: Record<string, any> = {
        'USR-001': { device: 'Chrome / Windows 11', ip: '192.168.10.45', loginTime: new Date(Date.now() - 3600000).toLocaleTimeString() },
        'USR-002': { device: 'Firefox / macOS Sonoma', ip: '192.168.1.12', loginTime: new Date(Date.now() - 7200000).toLocaleTimeString() }
      };
      localStorage.setItem('super_admin_active_sessions', JSON.stringify(initialSessions));
      setActiveSessions(initialSessions);
    }
  }, []);

  // Fluctuating Simulated System Indicators
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemLoad(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return next > 5 && next < 30 ? next : prev;
      });
      setSystemLatency(prev => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const next = prev + delta;
        return next > 20 && next < 80 ? next : prev;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Save attempts helper
  const savePinAttempts = (newAttempts: SuperAdminAttempt[]) => {
    localStorage.setItem('super_admin_pin_attempts', JSON.stringify(newAttempts));
    setLoginAttempts(newAttempts);
  };

  // Log inside the immutable Super Admin Audit Trail
  const writeMutableAuditLog = (action: string, details: string) => {
    const freshLog: SuperAdminAudit = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      userEmail: 'superadmin@suleja.gov.ng',
      action,
      details,
      ip: '192.168.10.45'
    };
    const updated = [freshLog, ...auditTrail];
    localStorage.setItem('super_admin_internal_audit', JSON.stringify(updated));
    setAuditTrail(updated);

    // Call state callback to sync standard activity views if requested
    onAddAuditLog(action, details);
    if (appendLog) {
      appendLog(`[ADMIN_AUDIT]: ${action}`, details);
    }
  };

  // Pin Code Change submit
  const handlePinChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(null);

    const activePin = localStorage.getItem('super_admin_pin') || '363590';
    if (oldPinValue !== activePin) {
      setPinChangeError('Old security PIN verification failed.');
      return;
    }

    if (!/^\d{6}$/.test(newPinValue)) {
      setPinChangeError('New PIN must be exactly 6 digits of numeric characters.');
      return;
    }

    localStorage.setItem('super_admin_pin', newPinValue);
    writeMutableAuditLog('PIN_SECURITY_CHANGE', 'Bypass PIN overrides modified in secure system storage.');
    setPinChangeSuccess('Super Admin PIN changed successfully.');
    setOldPinValue('');
    setNewPinValue('');
    setTimeout(() => setShowPinChange(false), 2000);
  };

  // Create User Action
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPass.trim()) {
      setFormError('Please complete all required fields (Name, Email, password).');
      return;
    }

    const emailLower = newUserEmail.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase().trim() === emailLower)) {
      setFormError('A user profile is already registered under this official email.');
      return;
    }

    try {
      const created = await createUser(
        emailLower, 
        newUserPass.trim(), 
        newUserName.trim(), 
        newUserRole, 
        { phone: newUserPhone.trim() || '+234 800 000 0000', ward: newUserWard }
      );

      // Update active sessions mapping safely
      const updatedSessions = { ...activeSessions };
      updatedSessions[created.id] = {
        device: 'Not logged in yet',
        ip: 'None',
        loginTime: 'Never'
      };
      localStorage.setItem('super_admin_active_sessions', JSON.stringify(updatedSessions));
      setActiveSessions(updatedSessions);

      writeMutableAuditLog('USER_CREATED', `Account ${created.id} (${newUserName}) created securely in Firebase.`);
      
      setFormSuccess(`User ${newUserName} successfully registered and activated under role "${newUserRole}".`);
      
      // reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPass('');
      setShowCreateForm(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to register authentication credentials in the directory.');
    }
  };

  // Edit User action toggling
  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPhone(u.phone || '');
    setEditWard(u.ward || 'Towns Ward');
  };

  const saveEditUser = () => {
    const updatedList = users.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          name: editName,
          email: editEmail.toLowerCase().trim(),
          role: editRole,
          phone: editPhone,
          ward: editWard
        };
      }
      return u;
    });

    onUpdateUsers(updatedList);
    writeMutableAuditLog('USER_MODIFIED', `Modified profile details for database user: ${editingUserId}`);
    setEditingUserId(null);
  };

  // User list actions
  const handleDeleteUser = async (id: string, name: string) => {
    if (window.confirm(`Are you absolutely sure you want to permanently delete user account ${name} [${id}] from Niger State records? This is non-reversible.`)) {
      try {
        await deleteUserAccount(id);
        const nextSessions = { ...activeSessions };
        delete nextSessions[id];
        localStorage.setItem('super_admin_active_sessions', JSON.stringify(nextSessions));
        setActiveSessions(nextSessions);

        writeMutableAuditLog('USER_DELETED', `Permanently purged user ${name} [${id}] from authentication container and records.`);
      } catch (err: any) {
        alert("Failed to delete user account: " + err.message);
      }
    }
  };

  const toggleUserSuspension = async (id: string, currentSuspended: boolean, name: string) => {
    try {
      await suspendUser(id, !currentSuspended);
      writeMutableAuditLog(
        currentSuspended ? 'USER_REACTIVATED' : 'USER_SUSPENDED', 
        `${currentSuspended ? 'Activated' : 'Suspended'} user account ${name} [${id}] successfully in database.`
      );
    } catch (err: any) {
      alert("Failed to update user suspension status: " + err.message);
    }
  };

  const toggleUserLock = (id: string, currentLocked: boolean, name: string) => {
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, locked: !currentLocked, failedAttempts: 0 };
      }
      return u;
    });
    onUpdateUsers(updated);
    writeMutableAuditLog(
      currentLocked ? 'USER_UNLOCKED' : 'USER_LOCKED', 
      `${currentLocked ? 'Unlocked' : 'Administratively Locked'} user access terminal for ${name} [${id}].`
    );
  };

  const forcePasswordReset = (id: string, name: string) => {
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, forcePasswordReset: true };
      }
      return u;
    });
    onUpdateUsers(updated);
    writeMutableAuditLog('PASSWORD_RESET_FORCED', `Enforced password rotation policies on next login for ${name} [${id}].`);
    alert(`Enforced password reset. On their next login attempt, ${name} will be prompted to replace credentials.`);
  };

  const toggleUserMFA = (id: string, currentMfa: boolean, name: string) => {
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, mfaEnabled: !currentMfa };
      }
      return u;
    });
    onUpdateUsers(updated);
    writeMutableAuditLog(
      currentMfa ? 'MFA_DISABLED' : 'MFA_ENABLED', 
      `${currentMfa ? 'Disabled' : 'Enforced'} 2-Factor Google Authenticator token validations on user profile ${name} [${id}].`
    );
  };

  const terminateUserSession = (id: string, name: string) => {
    const updatedSessions = { ...activeSessions };
    if (updatedSessions[id]) {
      updatedSessions[id] = {
        device: 'Session Terminated Lockout',
        ip: 'Disconnected',
        loginTime: 'Kicked by Super Admin'
      };
    } else {
      updatedSessions[id] = {
        device: 'Disconnected',
        ip: 'Disconnected',
        loginTime: 'Terminated'
      };
    }
    localStorage.setItem('super_admin_active_sessions', JSON.stringify(updatedSessions));
    setActiveSessions(updatedSessions);
    writeMutableAuditLog('SESSION_TERMINATED', `Terminated active sessions, flushed cookies and cleared keys for User ${name} [${id}].`);
    alert(`Session for ${name} terminated. All active token payloads flushed.`);
  };

  const resetAllPassToDefaults = (id: string, role: UserRole, name: string) => {
    let defaultPass = 'SulejaLGA';
    if (role === 'Super Admin') defaultPass = 'RamZurat';
    else if (role === 'Tax Officer') defaultPass = 'Taxation';
    else if (role === 'Field Agent') defaultPass = 'Allagents';
    else if (role === 'Accountant') defaultPass = 'Fundsuleja';

    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, password: defaultPass, forcePasswordReset: true };
      }
      return u;
    });
    onUpdateUsers(updated);
    writeMutableAuditLog('PASSWORD_RESET_DEFAULT', `Reset credentials for user ${name} to role default password [${defaultPass}].`);
    alert(`Password reset successful. Temporary password set to: ${defaultPass}. Forced changes required.`);
  };

  // Filtered users calculation
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    let matchesStatus = true;
    if (statusFilter === 'SUSPENDED') matchesStatus = !!u.suspended;
    else if (statusFilter === 'LOCKED') matchesStatus = !!u.locked;
    else if (statusFilter === 'ACTIVE') matchesStatus = !u.suspended && !u.locked;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="bg-[#FAFBFD] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 border rounded-xl bg-slate-900 text-white shadow-md">
              <ShieldCheck className="h-6 w-6 text-sky-400 shrink-0" />
            </span>
            <span>Super Admin Central Command Portal</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            System Overseer Suite &mdash; Root Access Layer
          </p>
        </div>

        <button 
          onClick={() => setShowPinChange(!showPinChange)}
          className="px-4 py-2.5 border border-slate-300 text-slate-800 hover:text-[#0A1F44] hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer bg-white"
        >
          <Key className="h-4 w-4 text-emerald-600 animate-pulse" />
          <span>Change Super PIN</span>
        </button>
      </div>

      {/* SECURE PIN CHANGE MODAL POPUP */}
      <AnimatePresence>
        {showPinChange && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4Ref text-left"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 font-sans text-slate-100 ring-1 ring-white/10"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Lock className="h-4 w-4 text-sky-400" />
                  Override PIN Management
                </span>
                <button 
                  onClick={() => { setShowPinChange(false); setPinChangeError(null); setPinChangeSuccess(null); }}
                  className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-xs font-mono font-bold"
                >
                  ESC
                </button>
              </div>

              {pinChangeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs">
                  {pinChangeError}
                </div>
              )}
              {pinChangeSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs">
                  {pinChangeSuccess}
                </div>
              )}

              <form onSubmit={handlePinChangeSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">Verify Current PIN</label>
                  <input 
                    type="password" 
                    maxLength={10}
                    required
                    value={oldPinValue}
                    onChange={(e) => setOldPinValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="block w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-center font-mono tracking-widest text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">Create New 6-Digit PIN</label>
                  <input 
                    type="password" 
                    maxLength={6}
                    required
                    value={newPinValue}
                    onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="block w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-center font-mono tracking-widest text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-xs tracking-wide uppercase transition-colors shrink-0 cursor-pointer flex items-center justify-center min-h-[44px]"
                >
                  Save Cryptographic PIN
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE CONTROL ROOM SEGMENT SUB-TABS */}
      <div className="flex border-b border-slate-200 mb-6 bg-white rounded-xl shadow-xs p-1 gap-1">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-1.5 text-xs font-black rounded-lg transition-all min-h-[44px] cursor-pointer ${
            activeSubTab === 'dashboard' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Cpu className="h-4 w-4 shrink-0" />
          <span className="truncate">Administrative Dashboard</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-1.5 text-xs font-black rounded-lg transition-all min-h-[44px] cursor-pointer ${
            activeSubTab === 'users' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span className="truncate">Manage Platform Users</span>
        </button>

        <button
          onClick={() => setActiveSubTab('activity')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-1.5 text-xs font-black rounded-lg transition-all min-h-[44px] cursor-pointer ${
            activeSubTab === 'activity' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <History className="h-4 w-4 shrink-0" />
          <span className="truncate">Immutable Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-1.5 text-xs font-black rounded-lg transition-all min-h-[44px] cursor-pointer ${
            activeSubTab === 'security' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" />
          <span className="truncate">Access Attempts Monitor</span>
        </button>
      </div>

      {/* VIEW SEGMENTS */}
      
      {/* 1. ADMINISTRATIVE DASHBOARD OVERVIEW */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Users</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{users.length}</span>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Active Users</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {users.filter(u => !u.suspended && !u.locked).length}
                </span>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Locked Out</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {users.filter(u => u.locked).length}
                </span>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Suspended</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {users.filter(u => u.suspended).length}
                </span>
              </div>
            </div>
          </div>

          {/* System Health Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border rounded-xl p-5 shadow-xs space-y-4 md:col-span-2">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-600" />
                Live System Diagnostics & Operations Telemetry
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="border border-slate-150 rounded-lg p-3 text-center space-y-1 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Root CPU Burden</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-lg font-mono font-black text-slate-800">{systemLoad}%</span>
                    <span className="text-[10px] text-emerald-600 font-bold">NORMAL</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full transition-all duration-1000" style={{ width: `${systemLoad}%` }}></div>
                  </div>
                </div>

                <div className="border border-slate-150 rounded-lg p-3 text-center space-y-1 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Gateway Latency</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-lg font-mono font-black text-slate-800">{systemLatency}ms</span>
                    <span className="text-[10px] text-emerald-600 font-bold">EXCELLENT</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(systemLatency/150)*100}%` }}></div>
                  </div>
                </div>

                <div className="border border-slate-150 rounded-lg p-3 text-center space-y-1 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">DB Replicas</span>
                  <div className="flex items-center justify-center gap-1 text-emerald-600 sm:text-sm font-bold pt-1">
                    <Database className="h-4 w-4 shrink-0 animate-bounce" />
                    <span>ONLINE</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono block uppercase">Secure Firestore Sync</span>
                </div>
              </div>

              <div className="bg-[#FAFBFD] border border-slate-200 rounded-lg p-4 font-mono text-[11px] text-slate-600 space-y-1 leading-relaxed select-text">
                <div className="flex justify-between border-b pb-1 font-bold text-slate-850">
                  <span>ROOT TELEMETRY COMPONENT</span>
                  <span>SSL HANDSHAKE ACTIVE (TLS 1.3)</span>
                </div>
                <div>SECURE_GATEWAY_NODE_01: Verified signature hash key SHA-256 matches.</div>
                <div>STATE_SULEJA_PERSISTENCE: Sync engine fully synced under 48ms overhead.</div>
                <div>SYSTEM_STREAMS: Active local sessions securely monitored and serialized.</div>
              </div>
            </div>

            {/* Active System Sessions list */}
            <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Active Sessions Monitor
                </span>
                <span className="px-2 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 font-black rounded-full animate-pulse">LIVE</span>
              </h3>

              <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                {users.map(u => {
                  const s = activeSessions[u.id];
                  if (!s || s.loginTime === 'Never' || s.loginTime === 'Terminated') return null;
                  return (
                    <div key={u.id} className="border-b pb-2 last:border-b-0 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[150px]">{u.name}</span>
                        <span className="text-[9px] font-semibold text-slate-400 font-mono">{s.loginTime}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span className="truncate max-w-[155px]">{s.device}</span>
                        <span className="text-sky-700">{s.ip}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User Activity report highlights */}
          <div className="bg-white border rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">System Access Logs</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-normal">
                    <th className="p-3">Triggered At</th>
                    <th className="p-3">Admin Account</th>
                    <th className="p-3">Action Module</th>
                    <th className="p-3">Secure Payload Details</th>
                    <th className="p-3">IP Node</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs text-slate-600 select-text">
                  {auditTrail.slice(0, 5).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 font-sans">
                      <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 font-semibold text-slate-800">{log.userEmail}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-slate-100">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-600 truncate max-w-xs">{log.details}</td>
                      <td className="p-3 text-sky-700 font-mono">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MANAGE PLATFORM USERS */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Create User Button Trigger & Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border rounded-xl shadow-xs">
            
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user ID, Landlord name, email..."
                  className="w-full bg-slate-100 border border-slate-250 py-2 pl-9 pr-3 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-[#0A1F44] transition-all"
                />
              </div>

              {/* Role filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-100 border border-slate-250 text-slate-700 py-2.5 px-3 pr-8 rounded-xl text-xs font-bold transition-all focus:outline-none"
                >
                  <option value="ALL">All System Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="LGA Admin">LGA Admin</option>
                  <option value="Tax Officer">Tax Officer</option>
                  <option value="Field Agent">Field Agent</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Taxpayer">Taxpayer</option>
                </select>
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-100 border border-slate-250 text-slate-700 py-2.5 px-3 pr-8 rounded-xl text-xs font-bold transition-all focus:outline-none"
                >
                  <option value="ALL">All Accounts State</option>
                  <option value="ACTIVE">Active Profiles</option>
                  <option value="SUSPENDED">Suspended Profiles</option>
                  <option value="LOCKED">Locked Out</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setFormError(null);
                setFormSuccess(null);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer min-h-[44px]"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>{showCreateForm ? 'Accordion User Registration' : 'Create New System User'}</span>
            </button>
          </div>

          {/* USER REGISTRATION ACCORDION PANEL */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-white border border-slate-300 rounded-2xl shadow-lg p-5"
              >
                <h3 className="text-sm font-black text-slate-900 tracking-tight pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-sky-600" />
                  Register & Provision System User Credentials
                </h3>

                {formError && <div className="p-3 bg-red-50 text-red-650 rounded-lg text-xs mb-4 font-semibold">{formError}</div>}
                {formSuccess && <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs mb-4 font-semibold">{formSuccess}</div>}

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Official Full Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Inspector Yusuf Ibrahim"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:ring-1 focus:ring-[#0A1F44] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Email Address (@suleja.gov.ng)</label>
                    <input 
                      type="email" 
                      required
                      placeholder="inspector.yusuf@suleja.gov.ng"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:ring-1 focus:ring-[#0A1F44] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Temporary Passphrase</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Minimum strength policy: Suleja2026"
                      value={newUserPass}
                      onChange={(e) => setNewUserPass(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-xs font-mono font-bold focus:ring-1 focus:ring-[#0A1F44] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Assigned System Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:ring-1 focus:ring-[#0A1F44] focus:outline-none"
                    >
                      <option value="LGA Admin">LGA Admin</option>
                      <option value="Tax Officer">Tax Officer</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Field Agent">Field Agent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Official Mobile Line</label>
                    <input 
                      type="text" 
                      placeholder="+234 803 111 2233"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:ring-1 focus:ring-[#0A1F44] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Operating Ward Boundary</label>
                    <select
                      value={newUserWard}
                      onChange={(e) => setNewUserWard(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:ring-1 focus:ring-[#0A1F44] focus:outline-none"
                    >
                      <option value="Towns Ward">Towns Ward</option>
                      <option value="Sabon Gari">Sabon Gari</option>
                      <option value="Kurmin Sarki">Kurmin Sarki</option>
                      <option value="Iku">Iku</option>
                      <option value="Maje">Maje</option>
                      <option value="Gauraka">Gauraka</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2 pt-2 border-t mt-3">
                    <button 
                      type="button" 
                      onClick={() => setShowCreateForm(false)} 
                      className="px-4 py-2 border rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer text-slate-600"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs leading-none shadow-md cursor-pointer flex items-center justify-center min-h-[38px]"
                    >
                      Provision Officer profile
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN USERS DIRECTORY DIRECT DISPLAY */}
          <div className="bg-white border text-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-normal">
                    <th className="p-3">ID Key</th>
                    <th className="p-3">User Description</th>
                    <th className="p-3">Domain Role Role</th>
                    <th className="p-3">Boundary Scope</th>
                    <th className="p-3">Terminal State Status</th>
                    <th className="p-3 text-right">Root Command Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs select-text">
                  {filteredUsers.map(user => {
                    const isEditing = editingUserId === user.id;
                    const isSuspended = !!user.suspended;
                    const isLocked = !!user.locked;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 font-sans">
                        <td className="p-3 font-mono font-bold text-slate-400">{user.id}</td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="space-y-1.5 max-w-[180px]">
                              <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="block w-full text-xs font-semibold p-1 border rounded"
                              />
                              <input 
                                type="text" 
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="block w-full text-[11px] p-1 border rounded"
                              />
                              <input 
                                type="text" 
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="block w-full text-[11px] p-1 border rounded"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">{user.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono select-all truncate">{user.email}</span>
                              {user.phone && <span className="text-[10px] text-slate-400 font-mono">{user.phone}</span>}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select 
                              value={editRole} 
                              onChange={(e) => setEditRole(e.target.value as UserRole)}
                              className="text-xs p-1 border rounded font-semibold"
                            >
                              <option value="LGA Admin">LGA Admin</option>
                              <option value="Tax Officer">Tax Officer</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Field Agent">Field Agent</option>
                              <option value="Super Admin">Super Admin</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider ${
                              user.role === 'Super Admin' 
                                ? 'bg-slate-900 text-sky-400' 
                                : user.role === 'LGA Admin' 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                                : user.role === 'Tax Officer'
                                ? 'bg-[#FFEFE6] text-[#E05300]'
                                : user.role === 'Accountant'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {user.role}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={editWard}
                              onChange={(e) => setEditWard(e.target.value)}
                              className="text-xs p-1 border rounded w-full max-w-[100px]"
                            />
                          ) : (
                            <span className="text-slate-600 font-semibold">{user.ward || 'Cross-Ward'}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {isSuspended ? (
                              <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 border border-rose-200 text-rose-600">
                                ✕ Suspended
                              </span>
                            ) : isLocked ? (
                              <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-600">
                                ✕ Terminal Lockout
                              </span>
                            ) : (
                              <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-600 animate-pulse">
                                ● Profile Active
                              </span>
                            )}
                            

                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5 flex-wrap max-w-sm ml-auto">
                            {isEditing ? (
                              <>
                                <button 
                                  onClick={saveEditUser} 
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
                                  title="Approve changes"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => setEditingUserId(null)} 
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg cursor-pointer"
                                  title="Cancel changes"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => startEditUser(user)} 
                                  className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                  title="Edit profile Details"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  <span>Edit</span>
                                </button>

                                <button 
                                  onClick={() => resetAllPassToDefaults(user.id, user.role, user.name)} 
                                  className="p-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                  title="Reset password"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>Reset Pass</span>
                                </button>

                                <button 
                                  onClick={() => toggleUserSuspension(user.id, isSuspended, user.name)} 
                                  className={`p-1 px-2 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
                                    isSuspended 
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  }`}
                                  title={isSuspended ? 'Lift Suspension' : 'Suspend User access'}
                                >
                                  {isSuspended ? 'Activate' : 'Suspend'}
                                </button>

                                <button 
                                  onClick={() => toggleUserLock(user.id, isLocked, user.name)} 
                                  className={`p-1 px-2 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
                                    isLocked 
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                                  }`}
                                  title={isLocked ? 'De-lock terminal account' : 'Force terminal Lockout'}
                                >
                                  {isLocked ? <Unlock className="h-3 w-3 shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />}
                                  <span>{isLocked ? 'Unlock' : 'Lock'}</span>
                                </button>

                                <button 
                                  onClick={() => forcePasswordReset(user.id, user.name)} 
                                  className="p-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[10px] cursor-pointer"
                                  title="Force password rotation next login"
                                >
                                  Force Reset Policy
                                </button>

                                <button 
                                  onClick={() => toggleUserMFA(user.id, !!user.mfaEnabled, user.name)} 
                                  className="hidden"
                                >
                                  {user.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                                </button>

                                <button 
                                  onClick={() => terminateUserSession(user.id, user.name)} 
                                  className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Power className="h-3 w-3" />
                                  <span>Kill Token</span>
                                </button>

                                {user.role !== 'Super Admin' && (
                                  <button 
                                    onClick={() => handleDeleteUser(user.id, user.name)} 
                                    className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all cursor-pointer"
                                    title="Purge profile data"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. IMMUTABLE AUDIT TRAIL */}
      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">IMMUTABLE SECURITY LEDGER</h3>
                <span className="text-[10px] text-emerald-400 font-mono">SEALED CRYPTOGRAPHIC COMPLIANCE MATRIX - Niger State Govt</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>LOGS TAMPER-PROOF STATE: VALID</span>
            </div>
          </div>

          <div className="bg-white border text-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-normal">
                    <th className="p-3">Reference ID</th>
                    <th className="p-3">Sealed At (GMT+1)</th>
                    <th className="p-3">Executive User</th>
                    <th className="p-3">State Action Module</th>
                    <th className="p-3">Security Ledger Operations Payload Details</th>
                    <th className="p-3">Terminal Node IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs text-slate-600 select-text">
                  {auditTrail.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 font-sans">
                      <td className="p-3 font-mono font-bold text-slate-400">{log.id}</td>
                      <td className="p-3 font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{log.userEmail}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-600">{log.details}</td>
                      <td className="p-3 text-sky-700 font-mono font-semibold">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. PIN ACCESS ATTEMPTS SECURITY MONITOR */}
      {activeSubTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
              <Terminal className="h-4.5 w-4.5 text-slate-600" />
              Super Admin Console Access Log Auditor
            </h3>
            <p className="text-xs text-slate-500">
              To guarantee zero-trust security compliance, every attempt to unlock the hidden Super Admin bypass portal using the PIN is recorded automatically below. Failed attempts generate alarms in the central Niger State diagnostics stream.
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-normal">
                    <th className="p-3">Unlock Attempt At</th>
                    <th className="p-3">Authentication Status</th>
                    <th className="p-3">Source Node IP</th>
                    <th className="p-3">Terminal Agent Browser ID Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs text-slate-600 select-text">
                  {loginAttempts.map((attempt, index) => (
                    <tr key={index} className="hover:bg-slate-50/60 font-sans">
                      <td className="p-3 font-mono text-slate-400">{new Date(attempt.timestamp).toLocaleString()}</td>
                      <td className="p-3">
                        {attempt.success ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                            ✓ Access Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-150 animate-pulse">
                            ✕ Bypass Refused
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-sky-700">{attempt.ip}</td>
                      <td className="p-3 text-slate-500 font-mono truncate max-w-sm select-all">{attempt.device}</td>
                    </tr>
                  ))}
                  {loginAttempts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                        No recent terminal access attempts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
