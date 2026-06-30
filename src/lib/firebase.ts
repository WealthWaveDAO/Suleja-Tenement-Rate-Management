import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  collection 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Property } from '../types';

import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Explicitly configure local persistence so sessions survive browser refreshes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Error setting persistent auth session:", err);
});

// Force HTTP Long-Polling to resolve connectivity blocks/unavailability in iframe-based sandbox containers, using the provisioned Firestore Database ID
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId || "(default)");

export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
          })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ensureUIFields = (data: any): Property => {
  const annualRentalValue = data.annualRentalValue !== undefined 
    ? data.annualRentalValue 
    : (data.annualRateValue || 0);

  const ratePercentage = data.ratePercentage || 4;
  const tenementRate = data.tenementRate || (annualRentalValue * ratePercentage / 100);

  return {
    id: data.id || '',
    ownerName: data.ownerName || data.owner?.fullName || 'Unknown Owner',
    ownerPhone: data.ownerPhone || data.owner?.phoneNumber || '08000000000',
    ownerEmail: data.ownerEmail || data.owner?.email || '',
    ninOrTin: data.ninOrTin || data.owner?.ninOrTin || '',
    address: data.address || data.propertyAddress || 'Suleja',
    ward: data.ward || data.zoneCode || 'Towns Ward',
    propertyType: data.propertyType || 'Residential',
    units: data.units || 1,
    latitude: data.latitude || data.geoCoordinates?.[0] || 9.1804,
    longitude: data.longitude || data.geoCoordinates?.[1] || 7.1904,
    annualRentalValue,
    ratePercentage,
    tenementRate,
    occupancyStatus: data.occupancyStatus || data.status || 'Occupied',
    paymentStatus: data.paymentStatus || data.status || 'Unpaid',
    imageUrl: data.imageUrl || '',
    valuationDate: data.valuationDate || new Date().toISOString().split('T')[0],
    lastBilledDate: data.lastBilledDate || new Date().toISOString().split('T')[0],
    inspectorName: data.inspectorName || 'SULEJA AUTOMATED SYSTEM',
    attachments: data.attachments || [],
    taxpayerUsername: data.taxpayerUsername || '',
    taxpayerPassword: data.taxpayerPassword || ''
  };
};

export const ensureDbFields = (p: Property): Property => {
  const propIdNum = p.id.split('-').pop() || '00000';
  const defaultNinOrTin = `NIN-2026-${propIdNum}`;
  const actualNinOrTin = p.ninOrTin || defaultNinOrTin;
  
  return {
    ...p,
    // Add required database schema properties for 'isValidProperty' rule:
    owner: {
      fullName: p.ownerName || 'Unknown Owner',
      phoneNumber: p.ownerPhone || '08000000000',
      ninOrTin: actualNinOrTin,
      email: p.ownerEmail || `resident-${p.id.toLowerCase()}@suleja.gov.ng`,
      alternateContact: ''
    },
    propertyAddress: p.address || 'Suleja',
    zoneCode: p.ward || 'Towns Ward',
    annualRateValue: p.annualRentalValue || 0,
    geoCoordinates: [p.latitude || 9.1804, p.longitude || 7.1904],
    status: p.paymentStatus || 'Unpaid'
  } as any;
};

/**
 * Save property details for a given userId into the subcollection /users/{userId}/properties/{propertyId}
 */
export const saveUserProperty = async (userId: string, property: Property): Promise<void> => {
  const path = `users/${userId}/properties/${property.id}`;
  try {
    const dbProp = ensureDbFields(property);
    await setDoc(doc(db, "users", userId, "properties", property.id), dbProp);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

/**
 * Fetch a single property detail for a given userId from /users/{userId}/properties/{propertyId}
 */
export const fetchUserProperty = async (userId: string, propertyId: string): Promise<Property | null> => {
  const path = `users/${userId}/properties/${propertyId}`;
  try {
    const snap = await getDoc(doc(db, "users", userId, "properties", propertyId));
    if (snap.exists()) {
      return ensureUIFields(snap.data());
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

/**
 * Fetch all properties for a user from `/users/{userId}/properties`
 */
export const fetchUserProperties = async (userId: string): Promise<Property[]> => {
  const path = `users/${userId}/properties`;
  try {
    const snap = await getDocs(collection(db, "users", userId, "properties"));
    return snap.docs.map(d => ensureUIFields(d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

/**
 * Delete a user property from `/users/{userId}/properties/{propertyId}`
 */
export const deleteUserProperty = async (userId: string, propertyId: string): Promise<void> => {
  const path = `users/${userId}/properties/${propertyId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "properties", propertyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const registerWithEmail = async (email: string, pass: string, displayName: string, role: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(result.user, { displayName });
  
  // also create the user document
  try {
    await setDoc(doc(db, "users", result.user.uid), {
      id: result.user.uid,
      name: displayName,
      email: email,
      role: role
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${result.user.uid}`);
  }

  return result.user;
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
