import { useState, useEffect } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";
import { User, Property, Invoice, EnforcementAction, ActivityLog, SystemSettings } from "../types";

export const useFirestoreData = <T>(collectionName: string) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      setData(docs);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const addDocument = async (item: T & { id?: string }) => {
    try {
      const docRef = doc(collection(db, collectionName), (item as any).id || Date.now().toString());
      await setDoc(docRef, item);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const updateDocument = async (id: string, updates: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, updates as any);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };

  return { data, setData, addDocument, updateDocument, deleteDocument, loading };
};
