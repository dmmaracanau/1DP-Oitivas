import { 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { 
  ref as rtdbRef, 
  set as rtdbSet, 
  update as rtdbUpdate, 
  remove as rtdbRemove, 
  get as rtdbGet
} from 'firebase/database';
import { db, rtdb, auth, handleFirestoreError, OperationType } from '../firebase';
import { Oitiva } from '../types/oitiva';

const COLLECTION_NAME = 'oitivas';
const LOCAL_STORAGE_BASE_KEY = 'oitivas_agenda_data_v3';

// Remove propriedades undefined para evitar rejeição no Firebase
function sanitizePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Helpers de cache local isolados por usuário (uid)
function getCacheKey(uid?: string): string {
  return `${LOCAL_STORAGE_BASE_KEY}_${uid || 'anon'}`;
}

function getLocalCache(uid?: string): Oitiva[] {
  try {
    const raw = localStorage.getItem(getCacheKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCache(data: Oitiva[], uid?: string) {
  try {
    localStorage.setItem(getCacheKey(uid), JSON.stringify(data));
  } catch (err) {
    console.warn("Falha ao atualizar cache local:", err);
  }
}

// Sincroniza em background com o Firebase Realtime Database isolado por uid
async function syncToRealtimeDatabase(oitivas: Oitiva[], uid?: string) {
  try {
    if (!rtdb || !uid) return;
    const dbRef = rtdbRef(rtdb, `user_oitivas/${uid}`);
    if (oitivas.length === 0) {
      await rtdbSet(dbRef, null);
      return;
    }
    const rtdbMap: Record<string, any> = {};
    for (const item of oitivas) {
      rtdbMap[item.id] = sanitizePayload(item);
    }
    await rtdbSet(dbRef, rtdbMap);
  } catch (err) {
    console.warn("Sincronização com Realtime Database (rtdb):", err);
  }
}

export const oitivaService = {
  /**
   * Assinatura em tempo real com filtro estrito por 'uid'
   * Garante isolamento total: apenas oitivas do usuário autenticado são recuperadas
   */
  subscribe(
    uidOrOnData: string | undefined | ((oitivas: Oitiva[]) => void), 
    onDataOrError?: ((oitivas: Oitiva[]) => void) | ((err: Error) => void),
    onErrorOrStatus?: ((err: Error) => void) | ((status: 'connected' | 'syncing' | 'offline') => void),
    onStatusChangeCallback?: (status: 'connected' | 'syncing' | 'offline') => void
  ) {
    let targetUid: string | undefined;
    let onData: (oitivas: Oitiva[]) => void;
    let onError: ((err: Error) => void) | undefined;
    let onStatusChange: ((status: 'connected' | 'syncing' | 'offline') => void) | undefined;

    if (typeof uidOrOnData === 'function') {
      targetUid = auth.currentUser?.uid;
      onData = uidOrOnData;
      onError = typeof onDataOrError === 'function' ? onDataOrError as (err: Error) => void : undefined;
      onStatusChange = typeof onErrorOrStatus === 'function' ? onErrorOrStatus as (status: 'connected' | 'syncing' | 'offline') => void : undefined;
    } else {
      targetUid = uidOrOnData || auth.currentUser?.uid;
      onData = onDataOrError as (oitivas: Oitiva[]) => void;
      onError = onErrorOrStatus as ((err: Error) => void) | undefined;
      onStatusChange = onStatusChangeCallback;
    }

    if (onStatusChange) onStatusChange('syncing');

    // Se não houver usuário autenticado ainda, emite lista vazia e aguarda
    if (!targetUid) {
      if (onData) onData([]);
      if (onStatusChange) onStatusChange('connected');
      return () => {};
    }

    // Emite o cache local exclusivo deste usuário imediatamente para renderização rápida
    const cached = getLocalCache(targetUid);
    if (cached.length > 0 && onData) {
      onData(cached);
    }

    try {
      // Query com constraint estrito por UID do usuário autenticado
      const q = query(
        collection(db, COLLECTION_NAME),
        where('uid', '==', targetUid),
        orderBy('date', 'asc')
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          if (onStatusChange) onStatusChange('connected');

          if (snapshot.empty) {
            setLocalCache([], targetUid);
            if (onData) onData([]);
            syncToRealtimeDatabase([], targetUid);
            return;
          }

          const items: Oitiva[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            items.push({
              id: docSnap.id,
              uid: d.uid || targetUid,
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

          // Ordenação secundária por horário
          items.sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return (a.time || '00:00').localeCompare(b.time || '00:00');
          });

          setLocalCache(items, targetUid);
          if (onData) onData(items);

          // Sincroniza em tempo real com o Realtime Database no nó do usuário
          syncToRealtimeDatabase(items, targetUid);
        },
        (firestoreErr) => {
          handleFirestoreError(firestoreErr, OperationType.LIST, COLLECTION_NAME);
          if (onStatusChange) onStatusChange('offline');
          if (onError) onError(firestoreErr);

          // Tenta ler do Realtime Database como fallback
          try {
            if (rtdb && targetUid) {
              const rRef = rtdbRef(rtdb, `user_oitivas/${targetUid}`);
              rtdbGet(rRef).then((snap) => {
                if (snap.exists()) {
                  const val = snap.val();
                  const rtdbItems: Oitiva[] = Object.values(val);
                  setLocalCache(rtdbItems, targetUid);
                  if (onData) onData(rtdbItems);
                  if (onStatusChange) onStatusChange('connected');
                }
              }).catch(() => {});
            }
          } catch {
            // Ignora
          }

          // Fallback para cache local deste usuário
          const localItems = getLocalCache(targetUid);
          if (onData) onData(localItems);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
      if (onStatusChange) onStatusChange('offline');
      if (onError) onError(err);
      return () => {};
    }
  },

  /**
   * Criação de oitiva incluindo obrigatoriamente o campo 'uid' do Firebase Auth
   */
  async create(data: Omit<Oitiva, 'id' | 'createdAt' | 'updatedAt'>, currentUid?: string): Promise<string> {
    const effectiveUid = data.uid || currentUid || auth.currentUser?.uid || '';
    
    const payload: Omit<Oitiva, 'id'> = {
      ...data,
      uid: effectiveUid,
      personName: data.personName.trim(),
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || '10:00',
      status: data.status || 'Agendada',
      intimationSent: Boolean(data.intimationSent),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const sanitized = sanitizePayload(payload);

    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), sanitized);
      const newId = docRef.id;

      // Grava no Realtime Database isolado por usuário
      try {
        if (rtdb && effectiveUid) {
          const itemRef = rtdbRef(rtdb, `user_oitivas/${effectiveUid}/${newId}`);
          await rtdbSet(itemRef, { ...sanitized, id: newId });
        }
      } catch (rtdbErr) {
        console.warn("RTDB create sync:", rtdbErr);
      }

      return newId;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, COLLECTION_NAME);
      
      const localId = `local_${Date.now()}`;
      const current = getLocalCache(effectiveUid);
      const newItems = [{ ...payload, id: localId }, ...current];
      setLocalCache(newItems, effectiveUid);

      try {
        if (rtdb && effectiveUid) {
          const itemRef = rtdbRef(rtdb, `user_oitivas/${effectiveUid}/${localId}`);
          await rtdbSet(itemRef, { ...sanitized, id: localId });
        }
      } catch {}

      return localId;
    }
  },

  /**
   * Atualiza oitiva existente mantendo o uid original
   */
  async update(id: string, data: Partial<Omit<Oitiva, 'id'>>, currentUid?: string): Promise<void> {
    const effectiveUid = data.uid || currentUid || auth.currentUser?.uid;
    const updatePayload = sanitizePayload({
      ...data,
      ...(effectiveUid ? { uid: effectiveUid } : {}),
      updatedAt: Date.now()
    });

    // Atualização otimista no cache local do usuário
    const current = getLocalCache(effectiveUid);
    const updated = current.map(item => item.id === id ? { ...item, ...updatePayload } : item);
    setLocalCache(updated, effectiveUid);

    // Atualiza no Realtime Database do usuário
    try {
      if (rtdb && effectiveUid) {
        const itemRef = rtdbRef(rtdb, `user_oitivas/${effectiveUid}/${id}`);
        await rtdbUpdate(itemRef, updatePayload);
      }
    } catch (rtdbErr) {
      console.warn("RTDB update sync:", rtdbErr);
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await setDoc(docRef, updatePayload, { merge: true });
    } catch (err: any) {
      console.warn("Firestore update notice:", err);
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  /**
   * Exclui oitiva do Firestore e Realtime Database
   */
  async delete(id: string, currentUid?: string): Promise<void> {
    const effectiveUid = currentUid || auth.currentUser?.uid;
    
    // Atualização otimista imediata no cache local
    const current = getLocalCache(effectiveUid);
    const updated = current.filter(item => item.id !== id);
    setLocalCache(updated, effectiveUid);

    // Exclui do Realtime Database
    try {
      if (rtdb && effectiveUid) {
        const itemRef = rtdbRef(rtdb, `user_oitivas/${effectiveUid}/${id}`);
        await rtdbRemove(itemRef);
      }
    } catch (rtdbErr) {
      console.warn("RTDB delete sync:", rtdbErr);
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.warn("Firestore delete notice:", err);
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  },

  /**
   * Carrega os dados filtrados por uid
   */
  async getAll(currentUid?: string): Promise<Oitiva[]> {
    const targetUid = currentUid || auth.currentUser?.uid;
    if (!targetUid) return [];

    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where('uid', '==', targetUid), 
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(q);
      const items: Oitiva[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          uid: d.uid || targetUid,
          personName: d.personName || '',
          date: d.date || '',
          time: d.time || '',
          procedureNumber: d.procedureNumber || '',
          procedureType: d.procedureType || '',
          role: d.role || '',
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
      setLocalCache(items, targetUid);
      syncToRealtimeDatabase(items, targetUid);
      return items;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, COLLECTION_NAME);
      return getLocalCache(targetUid);
    }
  }
};
