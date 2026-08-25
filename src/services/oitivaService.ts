import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { 
  ref as rtdbRef, 
  set as rtdbSet, 
  update as rtdbUpdate, 
  remove as rtdbRemove, 
  get as rtdbGet,
  onValue as rtdbOnValue,
  Unsubscribe as RTDBUnsubscribe
} from 'firebase/database';
import { db, rtdb, auth, handleFirestoreError, OperationType } from '../firebase';
import { Oitiva } from '../types/oitiva';

// Sanitiza payload para evitar valores undefined no Firestore
function sanitizePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Helpers de cache local isolados por UID do usuário
function getLocalCache(uid: string): Oitiva[] {
  try {
    const raw = localStorage.getItem(`oitivas_user_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCache(uid: string, data: Oitiva[]) {
  try {
    localStorage.setItem(`oitivas_user_${uid}`, JSON.stringify(data));
  } catch (err) {
    console.warn("Falha ao salvar cache local isolado:", err);
  }
}

function sortOitivas(items: Oitiva[]): Oitiva[] {
  return items.sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return (a.time || '00:00').localeCompare(b.time || '00:00');
  });
}

export const oitivaService = {
  /**
   * Assinatura em tempo real estritamente isolada por usuário (UID).
   * O calendário do Usuário A é 100% independente do Usuário B.
   */
  subscribe(
    uid: string,
    onData: (oitivas: Oitiva[]) => void,
    onError?: (err: Error) => void,
    onStatusChange?: (status: 'connected' | 'syncing' | 'offline') => void
  ): () => void {
    const targetUid = uid || auth.currentUser?.uid || 'guest_default';

    if (onStatusChange) onStatusChange('syncing');

    // 1. Carrega cache local instantaneamente para este usuário específico
    const cached = getLocalCache(targetUid);
    if (cached.length > 0) {
      onData(sortOitivas(cached));
    } else {
      onData([]);
    }

    let unsubFirestore: Unsubscribe | null = null;
    let unsubRTDB: RTDBUnsubscribe | null = null;

    // 2. Listener do Firestore isolado na subcoleção do usuário: /users/{uid}/oitivas
    try {
      const userOitivasCol = collection(db, 'users', targetUid, 'oitivas');
      unsubFirestore = onSnapshot(
        userOitivasCol,
        (snapshot) => {
          if (onStatusChange) onStatusChange('connected');
          const itemsMap = new Map<string, Oitiva>();

          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            itemsMap.set(docSnap.id, {
              id: docSnap.id,
              uid: targetUid,
              personName: d.personName || 'Sem nome',
              date: d.date || '',
              time: d.time || '',
              procedureNumber: d.procedureNumber || '',
              procedureType: d.procedureType || '',
              role: d.role || 'Testemunha',
              cpf: d.cpf || '',
              rg: d.rg || '',
              phone: d.phone || '',
              email: d.email || '',
              address: d.address || '',
              neighborhood: d.neighborhood || '',
              city: d.city || '',
              officerName: d.officerName || '',
              clerkName: d.clerkName || '',
              modality: d.modality || 'Presencial',
              locationOrLink: d.locationOrLink || '',
              status: d.status || 'Agendada',
              notes: d.notes || '',
              intimationSent: Boolean(d.intimationSent),
              googleCalendarEventId: d.googleCalendarEventId || '',
              googleDriveDocId: d.googleDriveDocId || '',
              googleDriveDocUrl: d.googleDriveDocUrl || '',
              lastGmailSentAt: d.lastGmailSentAt || undefined,
              createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
              updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
              createdBy: d.createdBy || ''
            });
          });

          const sortedList = sortOitivas(Array.from(itemsMap.values()));
          setLocalCache(targetUid, sortedList);
          onData(sortedList);
        },
        (firestoreErr) => {
          console.warn("Firestore snapshot notice:", firestoreErr);
          if (onStatusChange) onStatusChange('offline');
          const cachedItems = getLocalCache(targetUid);
          if (cachedItems.length > 0) {
            onData(sortOitivas(cachedItems));
          }
          handleFirestoreError(firestoreErr, OperationType.LIST, `users/${targetUid}/oitivas`);
          if (onError) onError(firestoreErr);
        }
      );
    } catch (err: any) {
      console.warn("Erro ao iniciar listener do Firestore:", err);
      if (onStatusChange) onStatusChange('offline');
      const cachedItems = getLocalCache(targetUid);
      if (cachedItems.length > 0) {
        onData(sortOitivas(cachedItems));
      }
      handleFirestoreError(err, OperationType.LIST, `users/${targetUid}/oitivas`);
      if (onError) onError(err);
    }

    // 3. Listener do Realtime Database isolado para este usuário: /users/{uid}/oitivas
    try {
      if (rtdb) {
        const userRTDBRef = rtdbRef(rtdb, `users/${targetUid}/oitivas`);
        unsubRTDB = rtdbOnValue(userRTDBRef, (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const rtdbItems: Oitiva[] = [];
            
            if (typeof val === 'object' && val !== null) {
              for (const [id, item] of Object.entries(val)) {
                if (item && typeof item === 'object') {
                  rtdbItems.push({
                    ...(item as any),
                    id,
                    uid: targetUid
                  });
                }
              }
            }

            if (rtdbItems.length > 0) {
              if (onStatusChange) onStatusChange('connected');
              const sorted = sortOitivas(rtdbItems);
              setLocalCache(targetUid, sorted);
              onData(sorted);
            }
          }
        }, (rtdbErr) => {
          console.warn("RTDB listener notice:", rtdbErr);
        });
      }
    } catch (rtdbErr) {
      console.warn("Aviso no listener RTDB:", rtdbErr);
    }

    return () => {
      if (unsubFirestore) unsubFirestore();
      if (unsubRTDB) unsubRTDB();
    };
  },

  /**
   * Cria nova oitiva estritamente isolada no ambiente do usuário
   */
  async create(data: Omit<Oitiva, 'id' | 'createdAt' | 'updatedAt'>, currentUid?: string): Promise<string> {
    const targetUid = currentUid || data.uid || auth.currentUser?.uid || 'guest_default';
    const now = Date.now();
    
    // Gera ID único no subdiretório do usuário
    const newDocRef = doc(collection(db, 'users', targetUid, 'oitivas'));
    const newId = newDocRef.id;

    const payload: Oitiva = {
      ...data,
      id: newId,
      uid: targetUid,
      personName: (data.personName || '').trim(),
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '10:00',
      status: data.status || 'Agendada',
      intimationSent: Boolean(data.intimationSent),
      createdAt: now,
      updatedAt: now
    };

    const sanitized = sanitizePayload(payload);

    // 1. Atualização no cache local deste usuário
    const current = getLocalCache(targetUid);
    const newItems = sortOitivas([payload, ...current.filter(x => x.id !== newId)]);
    setLocalCache(targetUid, newItems);

    // 2. Gravação no Firestore em /users/{uid}/oitivas/{id}
    try {
      await setDoc(newDocRef, sanitized);
    } catch (err: any) {
      console.warn("Erro ao salvar oitiva no Firestore:", err);
      handleFirestoreError(err, OperationType.CREATE, `users/${targetUid}/oitivas/${newId}`);
    }

    // 3. Gravação no Realtime Database em /users/{uid}/oitivas/{id}
    try {
      if (rtdb) {
        const itemRef = rtdbRef(rtdb, `users/${targetUid}/oitivas/${newId}`);
        await rtdbSet(itemRef, sanitized);
      }
    } catch (rtdbErr) {
      console.warn("Erro ao salvar oitiva no RTDB:", rtdbErr);
    }

    return newId;
  },

  /**
   * Atualiza oitiva isolada do usuário
   */
  async update(id: string, data: Partial<Omit<Oitiva, 'id'>>, currentUid?: string): Promise<void> {
    const targetUid = currentUid || data.uid || auth.currentUser?.uid || 'guest_default';
    const updatePayload = sanitizePayload({
      ...data,
      uid: targetUid,
      updatedAt: Date.now()
    });

    // 1. Atualização no cache local
    const current = getLocalCache(targetUid);
    const updated = current.map(item => item.id === id ? { ...item, ...updatePayload } : item);
    setLocalCache(targetUid, sortOitivas(updated));

    // 2. Gravação no Firestore
    try {
      const docRef = doc(db, 'users', targetUid, 'oitivas', id);
      await setDoc(docRef, updatePayload, { merge: true });
    } catch (err: any) {
      console.warn("Erro ao atualizar oitiva no Firestore:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}/oitivas/${id}`);
    }

    // 3. Gravação no Realtime Database
    try {
      if (rtdb) {
        const itemRef = rtdbRef(rtdb, `users/${targetUid}/oitivas/${id}`);
        await rtdbUpdate(itemRef, updatePayload);
      }
    } catch (rtdbErr) {
      console.warn("Erro ao atualizar oitiva no RTDB:", rtdbErr);
    }
  },

  /**
   * Exclui oitiva isolada do usuário
   */
  async delete(id: string, currentUid?: string): Promise<void> {
    const targetUid = currentUid || auth.currentUser?.uid || 'guest_default';

    // 1. Atualização no cache local
    const current = getLocalCache(targetUid);
    const updated = current.filter(item => item.id !== id);
    setLocalCache(targetUid, updated);

    // 2. Exclusão no Firestore
    try {
      const docRef = doc(db, 'users', targetUid, 'oitivas', id);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.warn("Erro ao excluir do Firestore:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}/oitivas/${id}`);
    }

    // 3. Exclusão no Realtime Database
    try {
      if (rtdb) {
        const itemRef = rtdbRef(rtdb, `users/${targetUid}/oitivas/${id}`);
        await rtdbRemove(itemRef);
      }
    } catch (rtdbErr) {
      console.warn("Erro ao excluir do RTDB:", rtdbErr);
    }
  },

  /**
   * Carrega lista isolada do usuário
   */
  async getAll(currentUid?: string): Promise<Oitiva[]> {
    const targetUid = currentUid || auth.currentUser?.uid || 'guest_default';

    try {
      const snapshot = await getDocs(collection(db, 'users', targetUid, 'oitivas'));
      if (!snapshot.empty) {
        const items: Oitiva[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          items.push({
            id: docSnap.id,
            uid: targetUid,
            personName: d.personName || 'Sem nome',
            date: d.date || '',
            time: d.time || '',
            procedureNumber: d.procedureNumber || '',
            procedureType: d.procedureType || '',
            role: d.role || 'Testemunha',
            cpf: d.cpf || '',
            rg: d.rg || '',
            phone: d.phone || '',
            email: d.email || '',
            address: d.address || '',
            neighborhood: d.neighborhood || '',
            city: d.city || '',
            officerName: d.officerName || '',
            clerkName: d.clerkName || '',
            modality: d.modality || 'Presencial',
            locationOrLink: d.locationOrLink || '',
            status: d.status || 'Agendada',
            notes: d.notes || '',
            intimationSent: Boolean(d.intimationSent),
            googleCalendarEventId: d.googleCalendarEventId || '',
            googleDriveDocId: d.googleDriveDocId || '',
            googleDriveDocUrl: d.googleDriveDocUrl || '',
            lastGmailSentAt: d.lastGmailSentAt || undefined,
            createdAt: d.createdAt || Date.now(),
            updatedAt: d.updatedAt || Date.now(),
            createdBy: d.createdBy || ''
          });
        });
        const sorted = sortOitivas(items);
        setLocalCache(targetUid, sorted);
        return sorted;
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, `users/${targetUid}/oitivas`);
    }

    // Fallback RTDB
    try {
      if (rtdb) {
        const snap = await rtdbGet(rtdbRef(rtdb, `users/${targetUid}/oitivas`));
        if (snap.exists()) {
          const val = snap.val();
          const items: Oitiva[] = Object.entries(val).map(([id, data]: any) => ({
            ...data,
            id,
            uid: targetUid
          }));
          const sorted = sortOitivas(items);
          setLocalCache(targetUid, sorted);
          return sorted;
        }
      }
    } catch {}

    return getLocalCache(targetUid);
  }
};
