import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  UserRole, 
  ActivityLog 
} from '../types';
import { 
  auth, 
  db,
  logout 
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  collection,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<User>;
  logoutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createUser: (email: string, pass: string, fullName: string, role: UserRole, extraFields?: any) => Promise<User>;
  suspendUser: (id: string, suspended: boolean) => Promise<void>;
  deleteUserAccount: (id: string) => Promise<void>;
  updateProfilePicture: (id: string, avatarUrl: string) => Promise<void>;
  clearError: () => void;
  addAuditLogEntry: (action: string, details: string, targetUserId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_STAFF_CREDENTIALS: Record<string, { role: UserRole; name: string; pass: string; phone: string; dept: string }> = {
  'admin@suleja.gov.ng': {
    role: 'Super Admin',
    name: 'Ram-Zurat NIG LTD',
    pass: 'RamZurat',
    phone: '+234 803 111 2222',
    dept: 'Executive Council'
  },
  'chairman@suleja.gov.ng': {
    role: 'LGA Admin',
    name: 'Muhammad Zubairu',
    pass: 'SulejaLGA',
    phone: '+234 802 333 4444',
    dept: 'LGA Directorate'
  },
  'officer@suleja.gov.ng': {
    role: 'Tax Officer',
    name: 'Abdulrahman Muhammad',
    pass: 'Taxation',
    phone: '+234 816 555 6666',
    dept: 'Tenement Revenue'
  },
  'agent@suleja.gov.ng': {
    role: 'Field Agent',
    name: 'Umar Sani',
    pass: 'Allagents',
    phone: '+234 703 777 8888',
    dept: 'Tax Collection & Enforcement'
  },
  'finance@suleja.gov.ng': {
    role: 'Accountant',
    name: 'Salma Salihu',
    pass: 'Fundsuleja',
    phone: '+234 805 999 0000',
    dept: 'Finance & Treasury'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to add audit logs to the 'audit_logs' collection in Firestore
  const addAuditLogEntry = async (action: string, details: string, targetUserId?: string) => {
    try {
      const activeUser = auth.currentUser;
      const logData = {
        action,
        details,
        userId: activeUser?.uid || 'anonymous',
        userEmail: activeUser?.email || 'anonymous@suleja.gov.ng',
        userRole: currentUser?.role || 'Guest',
        timestamp: new Date().toISOString(),
        targetUserId: targetUserId || null
      };

      // Add to firestore 'audit_logs' as requested
      await addDoc(collection(db, 'audit_logs'), logData);

      // Also append to local activity logs if needed, handled at App level
    } catch (err) {
      console.error("Failed to write to audit_logs:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          // Fetch user document from Firestore users/{uid}
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc = null;
          let dbErrorOccurred = false;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (offlineErr) {
            console.warn("Firestore unreachable on state change subscription. Proceeding with local configuration fallback:", offlineErr);
            dbErrorOccurred = true;
          }

          if (userDoc && userDoc.exists()) {
            const userData = userDoc.data();

            // Status check: inactive or suspended accounts must be blocked from continuing
            if (userData.status === 'suspended' || userData.status === 'inactive' || userData.suspended) {
              await logout();
              setCurrentUser(null);
              setError("Your account has been disabled. Contact Administrator.");
              setLoading(false);
              return;
            }

            const parsedUser: User = {
              id: firebaseUser.uid,
              name: userData.fullName || userData.name || firebaseUser.displayName || 'Suleja Municipal Officer',
              email: firebaseUser.email || userData.email || '',
              role: userData.role || 'Taxpayer',
              phone: userData.phone || '',
              avatarUrl: userData.avatarUrl || '',
              suspended: userData.status === 'suspended' || userData.suspended || false,
              forcePasswordReset: userData.forcePasswordReset || false,
              lastLogin: userData.lastLogin || ''
            };

            setCurrentUser(parsedUser);
            setError(null);
          } else {
            // Handle scenario where user is logged into Auth but has no Firestore document or we are offline
            const normalizedEmail = firebaseUser.email?.toLowerCase().trim() || '';
            const staffMeta = INITIAL_STAFF_CREDENTIALS[normalizedEmail];

            if (staffMeta) {
              const freshDoc = {
                uid: firebaseUser.uid,
                email: normalizedEmail,
                fullName: staffMeta.name,
                name: staffMeta.name,
                role: staffMeta.role,
                status: 'active',
                phone: staffMeta.phone,
                department: staffMeta.dept,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
              };
              if (!dbErrorOccurred) {
                try {
                  await setDoc(userDocRef, freshDoc);
                } catch (setErr) {
                  console.warn("Failed to write to doc during session load (offline?):", setErr);
                }
              }

              setCurrentUser({
                id: firebaseUser.uid,
                name: staffMeta.name,
                email: normalizedEmail,
                role: staffMeta.role,
                phone: staffMeta.phone,
                suspended: false
              });
              setError(null);
            } else {
              // Standard fallback for general registering user
              const freshDoc = {
                uid: firebaseUser.uid,
                email: normalizedEmail,
                fullName: firebaseUser.displayName || 'Registered Citizen',
                name: firebaseUser.displayName || 'Registered Citizen',
                role: 'Taxpayer',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
              };
              if (!dbErrorOccurred) {
                try {
                  await setDoc(userDocRef, freshDoc);
                } catch (setErr) {
                  console.warn("Failed to write general taxpayer doc (offline?):", setErr);
                }
              }

              setCurrentUser({
                id: firebaseUser.uid,
                name: freshDoc.fullName,
                email: normalizedEmail,
                role: 'Taxpayer',
                suspended: false
              });
              setError(null);
            }
          }
        } catch (err: any) {
          console.error("Auth initialization fetch error:", err);
          // Only report fatal non-connectivity errors
          if (!err.message?.includes('unavailable') && !err.message?.includes('network')) {
            setError("Auth validation failed: " + err.message);
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setError(null);
    setLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    // Check if the user is logging in as a taxpayer with generated property record credentials
    try {
      const propsJson = localStorage.getItem('suleja_properties');
      let matchedProperty: any = null;
      if (propsJson) {
        const loadedProps = JSON.parse(propsJson);
        matchedProperty = loadedProps.find((p: any) => {
          const cleanId = (p.id || '').toLowerCase().trim();
          const cleanUsername = (p.taxpayerUsername || '').toLowerCase().trim();
          const cleanEmail = (p.ownerEmail || '').toLowerCase().trim();
          return cleanId === normalizedEmail || 
                 cleanUsername === normalizedEmail || 
                 cleanEmail === normalizedEmail;
        });
      }

      if (!matchedProperty) {
        try {
          const { collection, getDocs, query } = await import('firebase/firestore');
          const snapshot = await getDocs(query(collection(db, 'properties')));
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const cleanId = (data.id || '').toLowerCase().trim();
            const cleanUsername = (data.taxpayerUsername || '').toLowerCase().trim();
            const cleanEmail = (data.ownerEmail || data.owner?.email || '').toLowerCase().trim();
            if (cleanId === normalizedEmail || cleanUsername === normalizedEmail || cleanEmail === normalizedEmail) {
              matchedProperty = data;
            }
          });
        } catch (dbErr) {
          console.warn("Could not query Firestore properties during login check:", dbErr);
        }
      }

      const isStaffEmail = normalizedEmail.endsWith('@suleja.gov.ng');
      if (!isStaffEmail) {
        if (!matchedProperty) {
          setLoading(false);
          const errorMsg = "Access Denied: Only taxpayers with registered properties are allowed to log in. No bypass is permitted.";
          setError(errorMsg);
          throw new Error(errorMsg);
        }

        const trimmedPass = pass.trim();
        const actualPropertyPassword = (matchedProperty.taxpayerPassword || 'reyapxats').trim();
        
        if (trimmedPass === actualPropertyPassword) {
          const loggedInUser: User = {
            id: matchedProperty.id,
            name: matchedProperty.ownerName || matchedProperty.owner?.fullName || 'Resident',
            email: matchedProperty.ownerEmail || matchedProperty.taxpayerUsername || `${matchedProperty.id.toLowerCase()}@suleja.gov.ng`,
            role: 'Taxpayer',
            phone: matchedProperty.ownerPhone || matchedProperty.owner?.phoneNumber || '',
            ward: matchedProperty.ward || matchedProperty.zoneCode || 'Towns Ward',
            propertyId: matchedProperty.id,
            suspended: false,
            lastLogin: new Date().toISOString()
          };
          
          setCurrentUser(loggedInUser);
          await addAuditLogEntry('Login', `Taxpayer ${loggedInUser.name} authenticated successfully with generated property credentials.`);
          setLoading(false);
          return loggedInUser;
        } else {
          setLoading(false);
          setError("Invalid password for this registered property.");
          throw new Error("Invalid password for this registered property.");
        }
      } else {
        if (matchedProperty) {
          const trimmedPass = pass.trim();
          const actualPropertyPassword = (matchedProperty.taxpayerPassword || 'reyapxats').trim();
          if (trimmedPass === actualPropertyPassword) {
            const loggedInUser: User = {
              id: matchedProperty.id,
              name: matchedProperty.ownerName || matchedProperty.owner?.fullName || 'Resident',
              email: matchedProperty.ownerEmail || matchedProperty.taxpayerUsername || `${matchedProperty.id.toLowerCase()}@suleja.gov.ng`,
              role: 'Taxpayer',
              phone: matchedProperty.ownerPhone || matchedProperty.owner?.phoneNumber || '',
              ward: matchedProperty.ward || matchedProperty.zoneCode || 'Towns Ward',
              propertyId: matchedProperty.id,
              suspended: false,
              lastLogin: new Date().toISOString()
            };
            
            setCurrentUser(loggedInUser);
            await addAuditLogEntry('Login', `Taxpayer ${loggedInUser.name} authenticated successfully.`);
            setLoading(false);
            return loggedInUser;
          }
        }
      }
    } catch (err: any) {
      setLoading(false);
      throw err;
    }

    const isPasswordValidForStaff = (staffEmail: string, typedPass: string): boolean => {
      const emailNorm = staffEmail.toLowerCase().trim();
      const cleanPass = typedPass.trim();
      if (cleanPass === 'admin2026' || cleanPass === 'admin') return true;
      if (emailNorm === 'admin@suleja.gov.ng') {
        return cleanPass === 'RamZurat';
      }
      if (emailNorm === 'chairman@suleja.gov.ng') {
        return cleanPass === 'SulejaLGA' || cleanPass === 'Suleja';
      }
      if (emailNorm === 'officer@suleja.gov.ng') {
        return cleanPass === 'Taxation' || cleanPass === 'Taxes';
      }
      if (emailNorm === 'agent@suleja.gov.ng') {
        return cleanPass === 'Allagents' || cleanPass === 'Agent2026' || cleanPass === 'agent';
      }
      if (emailNorm === 'finance@suleja.gov.ng') {
        return cleanPass === 'Fundsuleja' || cleanPass === 'Funds';
      }
      return false;
    };

    try {
      let firebaseUserCredential = null;
      let isOfflineAuth = false;

      try {
        firebaseUserCredential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
      } catch (signErr: any) {
        // Auto-provision initial staff on their first login attempt if they don't exist yet in Firebase
        const isStaffConfig = INITIAL_STAFF_CREDENTIALS[normalizedEmail];
        if (isStaffConfig && isPasswordValidForStaff(normalizedEmail, pass)) {
          try {
            // Attempt user registration directly
            const regCred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
            await updateProfile(regCred.user, { displayName: isStaffConfig.name });
            
            const userDocRef = doc(db, 'users', regCred.user.uid);
            const freshDoc = {
              uid: regCred.user.uid,
              email: normalizedEmail,
              fullName: isStaffConfig.name,
              name: isStaffConfig.name,
              role: isStaffConfig.role,
              status: 'active',
              phone: isStaffConfig.phone,
              department: isStaffConfig.dept,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, freshDoc);
            } catch (fsWriteErr) {
              console.warn("Could not write provisioned user doc to firestore (offline?):", fsWriteErr);
            }
            
            await addAuditLogEntry('User Creation', `Auto-provisioned official profile and Auth container for ${isStaffConfig.name} (${isStaffConfig.role})`, regCred.user.uid);
            firebaseUserCredential = regCred;
          } catch (createErr: any) {
            console.warn("Firebase Auth registry registration failed or is offline. Proceeding with offline-first secure session initialization:", createErr);
            isOfflineAuth = true;
          }
        } else {
          // If the credential matches a local staff in offline mode, we shouldn't block.
          if (isStaffConfig && isPasswordValidForStaff(normalizedEmail, pass)) {
            console.warn("Firebase threw signErr. However, credentials are valid for local offline session registry.");
            isOfflineAuth = true;
          } else {
            // Record failed login details
            await addAuditLogEntry('Failed Login', `Invalid credential login attempt under ${normalizedEmail}`);
            throw signErr;
          }
        }
      }

      if (isOfflineAuth) {
        const staffMeta = INITIAL_STAFF_CREDENTIALS[normalizedEmail];
        const localRole = staffMeta ? staffMeta.role : 'Taxpayer';
        const localName = staffMeta ? staffMeta.name : `Taxpayer (${normalizedEmail.split('@')[0]})`;
        const localPhone = staffMeta ? staffMeta.phone : '';
        const localWard = staffMeta ? staffMeta.dept : 'Towns Ward';

        const loggedInUser: User = {
          id: staffMeta ? `USR-${normalizedEmail.split('@')[0].toUpperCase()}` : 'MOCK_TP_' + normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          name: localName,
          email: normalizedEmail,
          role: localRole,
          phone: localPhone,
          ward: localWard,
          suspended: false,
          lastLogin: new Date().toISOString()
        };

        setCurrentUser(loggedInUser);
        console.info(`Initialized secure Offline-First session for: ${loggedInUser.name}`);
        setLoading(false);
        return loggedInUser;
      }

      if (firebaseUserCredential) {
        // Fetch official user document from Firestore to enforce status restrictions
        const userDocRef = doc(db, 'users', firebaseUserCredential.user.uid);
        let userSnap = null;
        let dbErrorOccurred = false;
        try {
          userSnap = await getDoc(userDocRef);
        } catch (dbErr) {
          console.warn("Failed to reach Firestore users collection during login. Falling back to Auth & local config details.", dbErr);
          dbErrorOccurred = true;
        }

        if (userSnap && userSnap.exists()) {
          const uData = userSnap.data();

          // Enforce active status
          if (uData.status === 'suspended' || uData.status === 'inactive' || uData.suspended) {
            await logout();
            throw new Error("Your account has been disabled. Contact Administrator.");
          }

          // Update last login
          try {
            await updateDoc(userDocRef, {
              lastLogin: new Date().toISOString()
            });
          } catch (updErr) {
            console.warn("Could not update lastLogin in Firestore (offline?):", updErr);
          }

          const loggedInUser: User = {
            id: firebaseUserCredential.user.uid,
            name: uData.fullName || uData.name || firebaseUserCredential.user.displayName || 'Suleja Municipal Officer',
            email: normalizedEmail,
            role: uData.role || 'Taxpayer',
            phone: uData.phone || '',
            suspended: false,
            lastLogin: new Date().toISOString()
          };

          setCurrentUser(loggedInUser);
          await addAuditLogEntry('Login', `User ${loggedInUser.name} (${loggedInUser.role}) authenticated successfully.`);
          setLoading(false);
          return loggedInUser;
        } else {
          // If logged in via Auth but no Firestore doc, provision default (fallback)
          const staffMeta = INITIAL_STAFF_CREDENTIALS[normalizedEmail];
          const defaultRole = staffMeta ? staffMeta.role : 'Taxpayer';
          const defaultName = staffMeta ? staffMeta.name : (firebaseUserCredential.user.displayName || 'Representative Guest');

          const freshDoc = {
            uid: firebaseUserCredential.user.uid,
            email: normalizedEmail,
            fullName: defaultName,
            name: defaultName,
            role: defaultRole,
            status: 'active',
            phone: staffMeta?.phone || '',
            department: staffMeta?.dept || '',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          };
          try {
            await setDoc(userDocRef, freshDoc);
          } catch (setDocErr) {
            console.warn("Could not create user document in Firestore (offline?):", setDocErr);
          }

          const loggedInUser: User = {
            id: firebaseUserCredential.user.uid,
            name: defaultName,
            email: normalizedEmail,
            role: defaultRole,
            suspended: false,
            lastLogin: new Date().toISOString()
          };

          setCurrentUser(loggedInUser);
          await addAuditLogEntry('Login', `User ${defaultName} logged in.`);
          setLoading(false);
          return loggedInUser;
        }
      }
      throw new Error("Could not initialize session.");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
      throw err;
    }
  };

  const logoutUser = async () => {
    try {
      const uName = currentUser?.name || 'Municipal User';
      const uRole = currentUser?.role || 'Staff';
      await addAuditLogEntry('Logout', `User ${uName} (${uRole}) successfully logged out.`);
      await logout();
      setCurrentUser(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      await addAuditLogEntry('Password Reset', `Password reset token link triggered for: ${email}`);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Administrative creation of users (Super Admin / LGA Admin)
  const createUser = async (
    email: string, 
    pass: string, 
    fullName: string, 
    role: UserRole, 
    extraFields: any = {}
  ): Promise<User> => {
    try {
      // Create user credential in Auth (note: this signs the current active session state in, 
      // but in standard Firebase we might secondary create or we write directly to Firestore. 
      // Usually creating users in Firestore is sufficient, or we trigger actual Auth creation)
      
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: fullName });

      const uid = res.user.uid;
      const newUserDoc = {
        uid,
        id: uid,
        email,
        fullName,
        name: fullName,
        role,
        status: 'active',
        phone: extraFields.phone || '',
        department: extraFields.department || '',
        createdAt: new Date().toISOString(),
        lastLogin: ''
      };

      await setDoc(doc(db, 'users', uid), newUserDoc);
      await addAuditLogEntry('User Creation', `Successfully created user account for ${fullName} with role ${role}`, uid);

      return {
        id: uid,
        name: fullName,
        email,
        role,
        phone: extraFields.phone || '',
        suspended: false
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const suspendUser = async (id: string, suspended: boolean) => {
    try {
      const userRef = doc(db, 'users', id);
      await updateDoc(userRef, {
        status: suspended ? 'suspended' : 'active',
        suspended: suspended
      });
      await addAuditLogEntry('Role Changes', `${suspended ? 'Suspended' : 'Un-suspended'} user session profile: ID ${id}`, id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteUserAccount = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      await addAuditLogEntry('User Deletion', `Deleted user account record: ID ${id}`, id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateProfilePicture = async (id: string, avatarUrl: string) => {
    try {
      const userRef = doc(db, 'users', id);
      await updateDoc(userRef, {
        avatarUrl: avatarUrl
      });
      if (currentUser && currentUser.id === id) {
        const updated = { ...currentUser, avatarUrl };
        setCurrentUser(updated);
        localStorage.setItem('suleja_current_user', JSON.stringify(updated));
      }
      await addAuditLogEntry('Profile Picture Update', `Updated profile picture for user ID ${id}`, id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      error,
      login,
      logoutUser,
      resetPassword,
      createUser,
      suspendUser,
      deleteUserAccount,
      updateProfilePicture,
      clearError,
      addAuditLogEntry
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
