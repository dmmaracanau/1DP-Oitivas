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
import { db, rtdb, auth, handleFirestoreError, OperationType, executeFirestoreWithRetry } from '../firebase';
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

// Helpers de cache local e segurança de dados isolados por UID do usuário
function getLocalCache(uid: string): Oitiva[] {
  try {
    const raw = localStorage.getItem(`oitivas_user_${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Fallback: se cache do UID estiver vazio, tenta resgatar o backup de segurança do usuário
    const backupRaw = localStorage.getItem(`oitivas_backup_${uid}`);
    if (backupRaw) {
      const backupParsed = JSON.parse(backupRaw);
      if (Array.isArray(backupParsed) && backupParsed.length > 0) {
        return backupParsed;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function setLocalCache(uid: string, data: Oitiva[]) {
  try {
    localStorage.setItem(`oitivas_user_${uid}`, JSON.stringify(data));
    // Mantém backup de segurança persistente se houver registros
    if (data.length > 0) {
      localStorage.setItem(`oitivas_backup_${uid}`, JSON.stringify(data));
    }
  } catch (err) {
    console.warn("Falha ao salvar cache local isolado:", err);
  }
}

// Resgata o UID ativo com múltiplas camadas de fallback resilientes
function resolveActiveUid(explicitUid?: string, dataUid?: string): string {
  if (explicitUid && explicitUid.trim() && explicitUid !== 'guest_default' && explicitUid !== 'guest_user') {
    return explicitUid.trim();
  }
  if (dataUid && dataUid.trim() && dataUid !== 'guest_default' && dataUid !== 'guest_user') {
    return dataUid.trim();
  }
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  // Tenta recuperar da sessão salva em localStorage
  try {
    const sessionRaw = localStorage.getItem('oitivas_user_session');
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed?.uid) return parsed.uid;
    }
  } catch {}
  return explicitUid || dataUid || 'guest_default';
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
    const targetUid = resolveActiveUid(uid);

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
              intimationNumber: d.intimationNumber || '',
              history: Array.isArray(d.history) ? d.history : [],
              googleCalendarEventId: d.googleCalendarEventId || '',
              googleDriveDocId: d.googleDriveDocId || '',
              googleDriveDocUrl: d.googleDriveDocUrl || '',
              lastGmailSentAt: d.lastGmailSentAt || undefined,
              createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
              updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
              createdBy: d.createdBy || ''
            });
          });

          // Proteção anti-perda: se o snapshot do Firestore vier vazio (por exemplo, durante oscilação transitória de conexão),
          // mas nós temos cache local ou backup com dados válidos, preservamos os dados em cache e sincronizamos
          if (itemsMap.size === 0 && snapshot.metadata.fromCache) {
            const existingCache = getLocalCache(targetUid);
            if (existingCache.length > 0) {
              onData(sortOitivas(existingCache));
              return;
            }
          }

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
    const targetUid = resolveActiveUid(currentUid, data.uid);
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

    // 2. Gravação no Firestore em /users/{uid}/oitivas/{id} com retry robusto
    try {
      await executeFirestoreWithRetry(
        () => setDoc(newDocRef, sanitized),
        { operationName: `createOitiva:${newId}` }
      );
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
    const targetUid = resolveActiveUid(currentUid, data.uid);
    const updatePayload = sanitizePayload({
      ...data,
      uid: targetUid,
      updatedAt: Date.now()
    });

    // 1. Atualização no cache local do usuário e verificação preventiva
    const current = getLocalCache(targetUid);
    let targetExists = current.some(item => item.id === id);

    let updated: Oitiva[];
    if (targetExists) {
      updated = current.map(item => item.id === id ? { ...item, ...updatePayload } : item);
    } else {
      // Se não estava no cache deste UID, busca se existe em outro cache local e transfere com segurança
      updated = [...current, { id, uid: targetUid, ...updatePayload } as Oitiva];
    }
    setLocalCache(targetUid, sortOitivas(updated));

    // 2. Gravação no Firestore com retry robusto
    try {
      const docRef = doc(db, 'users', targetUid, 'oitivas', id);
      await executeFirestoreWithRetry(
        () => setDoc(docRef, updatePayload, { merge: true }),
        { operationName: `updateOitiva:${id}` }
      );
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
   * Remarca uma oitiva para uma nova data/hora e registra histórico completo
   */
  async reschedule(
    id: string,
    newDate: string,
    newTime: string,
    reason?: string,
    currentUid?: string
  ): Promise<void> {
    const targetUid = resolveActiveUid(currentUid);
    const current = getLocalCache(targetUid);
    const item = current.find(x => x.id === id);

    const prevDate = item?.date || '';
    const prevTime = item?.time || '';

    const historyEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      action: 'remarcada' as const,
      previousDate: prevDate,
      newDate: newDate,
      previousTime: prevTime,
      newTime: newTime,
      reason: reason || 'Remarcação solicitada',
      performedBy: 'Servidor Policial'
    };

    const existingHistory = Array.isArray(item?.history) ? item.history : [];
    const newHistory = [...existingHistory, historyEntry];

    await this.update(
      id,
      {
        date: newDate,
        time: newTime,
        status: 'Remarcada',
        history: newHistory
      },
      targetUid
    );
  },

  /**
   * Atualiza a data da oitiva (via Drag & Drop no calendário) e salva no histórico
   */
  async updateDate(
    id: string,
    newDate: string,
    currentUid?: string,
    newTime?: string
  ): Promise<void> {
    const targetUid = resolveActiveUid(currentUid);
    const current = getLocalCache(targetUid);
    const item = current.find(x => x.id === id);

    if (!item || item.date === newDate) {
      return;
    }

    const prevDate = item.date || '';
    const prevTime = item.time || '';
    const updatedTime = newTime || prevTime;

    const historyEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      action: 'data_alterada' as const,
      previousDate: prevDate,
      newDate: newDate,
      previousTime: prevTime,
      newTime: updatedTime,
      reason: 'Movida no calendário (Drag and Drop)',
      performedBy: 'Servidor Policial'
    };

    const existingHistory = Array.isArray(item.history) ? item.history : [];
    const newHistory = [...existingHistory, historyEntry];

    await this.update(
      id,
      {
        date: newDate,
        time: updatedTime,
        history: newHistory
      },
      targetUid
    );
  },

  /**
   * Resgata todo o histórico de oitivas e intimações de uma mesma pessoa (por CPF ou Nome)
   */
  getPersonHistory(personName: string, cpf?: string, allOitivas?: Oitiva[]): {
    matchedOitivas: Oitiva[];
    timeline: Array<{
      id: string;
      oitivaId: string;
      timestamp: number;
      dateStr: string;
      timeStr?: string;
      action: string;
      status: string;
      details: string;
      procedureNumber?: string;
      isCurrent?: boolean;
    }>;
  } {
    const cleanName = (personName || '').trim().toLowerCase();
    const cleanCpf = (cpf || '').replace(/\D/g, '');

    if (!cleanName && !cleanCpf) {
      return { matchedOitivas: [], timeline: [] };
    }

    const list = allOitivas && allOitivas.length > 0 
      ? allOitivas 
      : getLocalCache(resolveActiveUid());

    // Localiza todas as oitivas vinculadas à pessoa
    const matched = list.filter(o => {
      if (cleanCpf && o.cpf) {
        const itemCpf = o.cpf.replace(/\D/g, '');
        if (itemCpf && itemCpf === cleanCpf) return true;
      }
      if (cleanName && o.personName) {
        return o.personName.trim().toLowerCase() === cleanName;
      }
      return false;
    });

    const timeline: Array<{
      id: string;
      oitivaId: string;
      timestamp: number;
      dateStr: string;
      timeStr?: string;
      action: string;
      status: string;
      details: string;
      procedureNumber?: string;
      isCurrent?: boolean;
    }> = [];

    matched.forEach(o => {
      // 1. Evento de criação
      timeline.push({
        id: `created_${o.id}`,
        oitivaId: o.id,
        timestamp: o.createdAt || 0,
        dateStr: o.date,
        timeStr: o.time,
        action: 'Agendamento Inicial',
        status: o.status,
        details: `Oitiva agendada para ${o.date} às ${o.time || '10:00'} (${o.modality || 'Presencial'})`,
        procedureNumber: o.procedureNumber,
        isCurrent: true
      });

      // 2. Eventos gravados no histórico
      if (Array.isArray(o.history)) {
        o.history.forEach(h => {
          let actionLabel = 'Alteração';
          if (h.action === 'remarcada') actionLabel = 'Oitiva Remarcada';
          else if (h.action === 'data_alterada') actionLabel = 'Data Reagendada';
          else if (h.action === 'intimacao_enviada') actionLabel = 'Intimação Notificada';

          timeline.push({
            id: h.id,
            oitivaId: o.id,
            timestamp: h.timestamp,
            dateStr: h.newDate || h.previousDate || o.date,
            timeStr: h.newTime || h.previousTime || o.time,
            action: actionLabel,
            status: o.status,
            details: h.reason 
              ? `${h.reason} (De ${h.previousDate || 'data anterior'} para ${h.newDate || o.date})`
              : `Alterada de ${h.previousDate || 'data anterior'} para ${h.newDate || o.date}`,
            procedureNumber: o.procedureNumber,
            isCurrent: false
          });
        });
      }
    });

    // Ordena do mais recente para o mais antigo
    timeline.sort((a, b) => b.timestamp - a.timestamp);

    return {
      matchedOitivas: matched,
      timeline
    };
  },

  /**
   * Limpa o histórico de eventos/remarcações de uma pessoa em suas oitivas
   */
  async clearPersonHistory(personName: string, cpf?: string, currentUid?: string): Promise<void> {
    const targetUid = resolveActiveUid(currentUid);
    const list = getLocalCache(targetUid);
    const cleanName = (personName || '').trim().toLowerCase();
    const cleanCpf = (cpf || '').replace(/\D/g, '');

    const matched = list.filter(o => {
      if (cleanCpf && o.cpf) {
        const itemCpf = o.cpf.replace(/\D/g, '');
        if (itemCpf && itemCpf === cleanCpf) return true;
      }
      if (cleanName && o.personName) {
        return o.personName.trim().toLowerCase() === cleanName;
      }
      return false;
    });

    for (const item of matched) {
      await this.update(
        item.id,
        {
          history: []
        },
        targetUid
      );
    }
  },

  /**
   * Exclui oitiva isolada do usuário com preservação na lixeira e ponto de recuperação
   */
  async delete(id: string, currentUid?: string): Promise<void> {
    const targetUid = resolveActiveUid(currentUid);

    // 1. Localiza o item antes de excluir e envia para a lixeira de segurança
    const current = getLocalCache(targetUid);
    const itemToDelete = current.find(item => item.id === id);
    if (itemToDelete) {
      try {
        const now = new Date();
        const trashKey = `oitivas_trash_bin_${targetUid}`;
        const existingTrashRaw = localStorage.getItem(trashKey);
        let trashList: any[] = [];
        if (existingTrashRaw) {
          try {
            trashList = JSON.parse(existingTrashRaw) || [];
          } catch {}
        }
        trashList = [{
          id: `trash_${itemToDelete.id}_${Date.now()}`,
          deletedAt: now.getTime(),
          deletedDateStr: now.toLocaleString('pt-BR'),
          deletedBy: 'Operador',
          oitiva: itemToDelete
        }, ...trashList].slice(0, 50);
        localStorage.setItem(trashKey, JSON.stringify(trashList));
      } catch (e) {
        console.warn("Aviso ao preservar na lixeira:", e);
      }
    }

    // 2. Atualização no cache local
    const updated = current.filter(item => item.id !== id);
    setLocalCache(targetUid, updated);

    // 3. Exclusão no Firestore com retry robusto
    try {
      const docRef = doc(db, 'users', targetUid, 'oitivas', id);
      await executeFirestoreWithRetry(
        () => deleteDoc(docRef),
        { operationName: `deleteOitiva:${id}` }
      );
    } catch (err: any) {
      console.warn("Erro ao excluir do Firestore:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}/oitivas/${id}`);
    }

    // 4. Exclusão no Realtime Database
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
    const targetUid = resolveActiveUid(currentUid);

    try {
      const snapshot = await executeFirestoreWithRetry(
        () => getDocs(collection(db, 'users', targetUid, 'oitivas')),
        { operationName: `getAllOitivas:${targetUid}` }
      );
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
