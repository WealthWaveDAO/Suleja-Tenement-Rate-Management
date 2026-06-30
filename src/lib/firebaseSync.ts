import { collection, doc, writeBatch, onSnapshot, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, ensureUIFields, ensureDbFields } from "./firebase";
import { Property, Invoice, EnforcementAction, ActivityLog } from "../types";


export const initializeFirebaseSync = async (
  setProperties: (d: any) => void,
  setInvoices: (d: any) => void,
  setEnforcement: (d: any) => void,
  setActivityLogs: (d: any) => void,
  setSettings: (d: any) => void,
  userRole?: string,
  userId?: string
) => {
  const isStaff = userRole && ['Super Admin', 'LGA Admin', 'Tax Officer', 'Accountant', 'Field Agent'].includes(userRole);
  const propertiesRefCollection = (!isStaff && userId) 
    ? collection(db, "users", userId, "properties") 
    : collection(db, "properties");

  // Setup real-time listeners for all core collections
  const unsubscribers = [
    onSnapshot(
      propertiesRefCollection, 
      (snapshot) => {
        setProperties(snapshot.docs.map(doc => ensureUIFields(doc.data())));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "properties");
      }
    ),
    onSnapshot(
      collection(db, "invoices"), 
      (snapshot) => {
        setInvoices(snapshot.docs.map(doc => doc.data() as Invoice));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "invoices");
      }
    ),
    onSnapshot(
      collection(db, "enforcement"), 
      (snapshot) => {
        setEnforcement(snapshot.docs.map(doc => doc.data() as EnforcementAction));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "enforcement");
      }
    )
  ];

  if (isStaff) {
    unsubscribers.push(
      onSnapshot(
        collection(db, "activityLogs"), 
        (snapshot) => {
          setActivityLogs(snapshot.docs.map(doc => doc.data() as ActivityLog));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "activityLogs");
        }
      )
    );
  }

  return () => {
    unsubscribers.forEach(u => u());
  };
};

export const persistToFirebase = async (
  properties: Property[],
  invoices: Invoice[],
  enforcement: EnforcementAction[],
  logs: ActivityLog[]
) => {
  try {
    const operations: Array<{ ref: any, data: any }> = [];

    // Fetch active users mapping to sync properties to taxpayer subcollections
    let emailToUid: Record<string, string> = {};
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach(d => {
        const uData = d.data();
        if (uData.email) {
          emailToUid[uData.email.toLowerCase().trim()] = d.id;
        }
      });
    } catch (fetchUsersErr) {
      console.warn("Could not retrieve users list during sync (offline?):", fetchUsersErr);
    }

    properties.forEach(p => {
      const dbProp = ensureDbFields(p);
      const ref = doc(db, "properties", p.id);
      operations.push({ ref, data: dbProp });

      // Save under user subcollection if matching user document is found
      const taxpayerEmail = p.taxpayerUsername || p.ownerEmail;
      if (taxpayerEmail) {
        const cleanEmail = taxpayerEmail.toLowerCase().trim();
        const matchingUid = emailToUid[cleanEmail];
        if (matchingUid) {
          const userSubcollectionRef = doc(db, "users", matchingUid, "properties", p.id);
          operations.push({ ref: userSubcollectionRef, data: dbProp });
        }
      }
    });

    invoices.forEach(i => {
      const ref = doc(db, "invoices", i.id);
      operations.push({ ref, data: i });
    });

    enforcement.forEach(e => {
      const ref = doc(db, "enforcement", e.id);
      operations.push({ ref, data: e });
    });

    logs.forEach(l => {
      const ref = doc(db, "activityLogs", l.id);
      operations.push({ ref, data: l });
    });

    const chunkSize = 400;
    for (let i = 0; i < operations.length; i += chunkSize) {
      const chunk = operations.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(op => {
        batch.set(op.ref, op.data, { merge: true });
      });
      try {
        await batch.commit();
      } catch (commitError) {
        handleFirestoreError(commitError, OperationType.WRITE, `bulk-ledger-write-batch-chunk-${i}`);
      }
    }
  } catch (error) {
    console.error("Firebase sync error:", error);
  }
};
