import { Oitiva, UserProfile, CalendarSpecialDate, BackupFilePayload, DataSnapshot, DeletedOitivaRecord, ImportValidationResult } from '../types/oitiva';
import { oitivaService } from './oitivaService';
import { specialDateService } from './specialDateService';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Unsubscribe 
} from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, remove as rtdbRemove } from 'firebase/database';
import { db, rtdb, executeFirestoreWithRetry, handleFirestoreError, OperationType } from '../firebase';

const SNAPSHOTS_KEY_PREFIX = 'oitivas_auto_snapshots_';
const TRASH_KEY_PREFIX = 'oitivas_trash_bin_';
const MAX_SNAPSHOTS = 10;
const MAX_TRASH_DAYS = 30;

function sanitizePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined && obj[key] !== null) {
      result[key] = obj[key];
    }
  }
  return result;
}

export const backupService = {
  /**
   * Exporta os dados completos em formato JSON com metadados de auditoria e integridade
   */
  exportBackup(
    oitivas: Oitiva[],
    user?: UserProfile | null,
    specialDates: CalendarSpecialDate[] = []
  ): void {
    const now = new Date();
    const isoDate = now.toISOString();
    const dateFileStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const payload: BackupFilePayload = {
      version: '2.0',
      exportedAt: isoDate,
      exportedTimestamp: now.getTime(),
      exportedBy: user ? {
        uid: user.uid,
        displayName: user.displayName || user.username || 'Operador',
        email: user.email || user.institutionalEmail || '',
        cargo: user.cargo || '',
        unitName: user.unitName || ''
      } : undefined,
      system: 'SISTEMA DE AGENDAMENTO DE OITIVAS - POLÍCIA CIVIL DO CEARÁ',
      counts: {
        oitivas: oitivas.length,
        specialDates: specialDates.length
      },
      oitivas: oitivas,
      specialDates: specialDates,
      checksum: `PCCE-${oitivas.length}-${now.getTime()}`
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_oitivas_cartorio_${dateFileStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Valida o conteúdo de um arquivo JSON de backup carregado pelo usuário
   */
  validateBackupFile(fileContent: string, currentOitivas: Oitiva[]): ImportValidationResult {
    try {
      if (!fileContent || !fileContent.trim()) {
        return {
          isValid: false,
          errorMessage: 'O arquivo JSON está vazio.',
          totalFound: 0,
          newCount: 0,
          updateCount: 0,
          oitivas: []
        };
      }

      const parsed = JSON.parse(fileContent);
      let rawOitivas: any[] = [];
      let specialDates: CalendarSpecialDate[] = [];
      let version = '1.0';
      let exportedAt: string | undefined = undefined;

      // Suporta formato estruturado (v2.0) ou array direto de oitivas (v1.0)
      if (Array.isArray(parsed)) {
        rawOitivas = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.oitivas)) {
          rawOitivas = parsed.oitivas;
        }
        if (Array.isArray(parsed.specialDates)) {
          specialDates = parsed.specialDates;
        }
        version = parsed.version || '2.0';
        exportedAt = parsed.exportedAt;
      } else {
        return {
          isValid: false,
          errorMessage: 'Estrutura do arquivo inválida. Esperava-se um arquivo JSON de backup do sistema.',
          totalFound: 0,
          newCount: 0,
          updateCount: 0,
          oitivas: []
        };
      }

      if (rawOitivas.length === 0) {
        return {
          isValid: false,
          errorMessage: 'Nenhum registro de oitiva foi encontrado no arquivo selecionado.',
          totalFound: 0,
          newCount: 0,
          updateCount: 0,
          oitivas: []
        };
      }

      // Validar e sanitizar cada oitiva
      const validOitivas: Oitiva[] = [];
      const currentIds = new Set(currentOitivas.map(o => o.id));

      for (let i = 0; i < rawOitivas.length; i++) {
        const item = rawOitivas[i];
        if (!item || typeof item !== 'object') continue;

        // Se não tiver personName ou date, descarta ou cria fallback seguro
        const personName = (item.personName || item.nome || '').trim();
        const date = (item.date || item.data || '').trim();

        if (!personName) continue;

        const id = (item.id && typeof item.id === 'string' && item.id.trim()) 
          ? item.id.trim() 
          : `oitiva_imported_${Date.now()}_${i}`;

        validOitivas.push({
          id,
          uid: item.uid || '',
          personName,
          date: date || new Date().toISOString().split('T')[0],
          time: (item.time || item.hora || '10:00').trim(),
          procedureNumber: (item.procedureNumber || item.procedimento || '').trim(),
          procedureType: (item.procedureType || '').trim(),
          role: item.role || 'Testemunha',
          cpf: (item.cpf || '').trim(),
          rg: (item.rg || '').trim(),
          phone: (item.phone || item.telefone || '').trim(),
          email: (item.email || '').trim(),
          address: (item.address || item.endereco || '').trim(),
          neighborhood: (item.neighborhood || item.bairro || '').trim(),
          city: (item.city || item.cidade || '').trim(),
          officerName: (item.officerName || item.delegado || '').trim(),
          clerkName: (item.clerkName || item.escrivao || '').trim(),
          modality: item.modality || 'Presencial',
          locationOrLink: (item.locationOrLink || item.local || '').trim(),
          status: item.status || 'Agendada',
          notes: (item.notes || item.observacoes || '').trim(),
          intimationSent: Boolean(item.intimationSent),
          googleCalendarEventId: item.googleCalendarEventId || '',
          googleDriveDocId: item.googleDriveDocId || '',
          googleDriveDocUrl: item.googleDriveDocUrl || '',
          lastGmailSentAt: item.lastGmailSentAt || undefined,
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
          updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
          createdBy: item.createdBy || ''
        });
      }

      if (validOitivas.length === 0) {
        return {
          isValid: false,
          errorMessage: 'Nenhum registro válido de oitiva pôde ser extraído do arquivo.',
          totalFound: 0,
          newCount: 0,
          updateCount: 0,
          oitivas: []
        };
      }

      // Calcular novas vs atualizações
      let newCount = 0;
      let updateCount = 0;

      validOitivas.forEach(oitiva => {
        if (currentIds.has(oitiva.id)) {
          updateCount++;
        } else {
          newCount++;
        }
      });

      return {
        isValid: true,
        version,
        exportedAt,
        totalFound: validOitivas.length,
        newCount,
        updateCount,
        oitivas: validOitivas,
        specialDates
      };
    } catch (err: any) {
      return {
        isValid: false,
        errorMessage: `Erro ao processar arquivo JSON: ${err.message || 'Formato inválido'}`,
        totalFound: 0,
        newCount: 0,
        updateCount: 0,
        oitivas: []
      };
    }
  },

  /**
   * Executa a importação dos dados no Firestore e cache local
   */
  async importBackup(
    validated: ImportValidationResult,
    targetUid: string,
    mode: 'merge' | 'replace',
    currentOitivas: Oitiva[],
    onProgress?: (percent: number, step: string) => void,
    user?: UserProfile | null
  ): Promise<{ imported: number; updated: number; replaced: number }> {
    if (!validated.isValid || validated.oitivas.length === 0) {
      throw new Error('Nenhuma oitiva válida para importar.');
    }

    if (onProgress) onProgress(5, 'Criando ponto de restauração de segurança preventivo...');
    // Salva snapshot preventivo antes de qualquer alteração
    backupService.createLocalSnapshot(
      currentOitivas,
      `Pré-Importação Backup (${mode === 'replace' ? 'Substituição Total' : 'Mesclagem'})`,
      targetUid
    );

    let replacedCount = 0;
    let importedCount = 0;
    let updatedCount = 0;

    const itemsToSave: Oitiva[] = [];

    if (mode === 'replace') {
      if (onProgress) onProgress(15, 'Preparando restauração completa...');
      // Na substituição, as oitivas do arquivo se tornam a lista principal
      for (const item of validated.oitivas) {
        itemsToSave.push({
          ...item,
          uid: targetUid,
          updatedAt: Date.now()
        });
        importedCount++;
      }
      replacedCount = currentOitivas.length;
    } else {
      // No merge, mantém as oitivas atuais e insere/atualiza as novas
      if (onProgress) onProgress(15, 'Mesclando registros com os dados existentes...');
      const existingMap = new Map<string, Oitiva>();
      currentOitivas.forEach(o => existingMap.set(o.id, o));

      for (const item of validated.oitivas) {
        const itemWithUid = {
          ...item,
          uid: targetUid,
          updatedAt: Date.now()
        };

        if (existingMap.has(item.id)) {
          updatedCount++;
        } else {
          importedCount++;
        }
        existingMap.set(item.id, itemWithUid);
      }

      itemsToSave.push(...Array.from(existingMap.values()));
    }

    // Persistir em lotes para o Firestore com callback de progresso
    const total = itemsToSave.length;
    for (let i = 0; i < total; i++) {
      const item = itemsToSave[i];
      const percent = Math.round(20 + ((i + 1) / total) * 75);
      if (onProgress && (i % 5 === 0 || i === total - 1)) {
        onProgress(percent, `Salvando oitiva ${i + 1} de ${total}: ${item.personName.slice(0, 20)}...`);
      }

      await oitivaService.update(item.id, item, targetUid);
    }

    // Se houver feriados/datas especiais no backup, importa também
    if (validated.specialDates && validated.specialDates.length > 0) {
      if (onProgress) onProgress(98, 'Sincronizando datas especiais e feriados...');
      for (const sp of validated.specialDates) {
        try {
          await specialDateService.save(sp, user);
        } catch {}
      }
    }

    if (onProgress) onProgress(100, 'Importação e sincronização concluídas com sucesso!');

    return {
      imported: importedCount,
      updated: updatedCount,
      replaced: replacedCount
    };
  },

  // =========================================================================
  // SNAPSHOTS AUTOMÁTICOS & PONTOS DE RESTAURAÇÃO (DLP MULTI-DISPOSITIVO)
  // =========================================================================

  /**
   * Limpa snapshots antigos na nuvem para manter apenas os mais recentes
   */
  async cleanOldCloudSnapshots(targetUid: string): Promise<void> {
    if (!targetUid) return;
    try {
      const snapCol = collection(db, 'users', targetUid, 'snapshots');
      const snapDocs = await getDocs(snapCol);
      if (snapDocs.size > MAX_SNAPSHOTS) {
        const sorted = snapDocs.docs
          .map(d => ({ id: d.id, timestamp: d.data().timestamp || 0 }))
          .sort((a, b) => b.timestamp - a.timestamp);
        
        const toDelete = sorted.slice(MAX_SNAPSHOTS);
        for (const item of toDelete) {
          await deleteDoc(doc(db, 'users', targetUid, 'snapshots', item.id)).catch(() => {});
          if (rtdb) {
            await rtdbRemove(rtdbRef(rtdb, `users/${targetUid}/snapshots/${item.id}`)).catch(() => {});
          }
        }
      }
    } catch {}
  },

  /**
   * Salva um snapshot rotativo de segurança com sincronização na Nuvem e cache local
   * Garante disponibilidade imediata em qualquer dispositivo
   */
  createLocalSnapshot(
    oitivas: Oitiva[],
    reason: string,
    targetUid: string,
    specialDates: CalendarSpecialDate[] = []
  ): DataSnapshot | null {
    if (!targetUid || oitivas.length === 0) return null;

    try {
      const now = new Date();
      const snapshot: DataSnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: now.getTime(),
        dateStr: now.toLocaleString('pt-BR'),
        reason,
        oitivasCount: oitivas.length,
        oitivas: oitivas,
        specialDates
      };

      // 1. Salva no cache local do dispositivo
      const key = `${SNAPSHOTS_KEY_PREFIX}${targetUid}`;
      const existingRaw = localStorage.getItem(key);
      let list: DataSnapshot[] = [];

      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }

      // Adiciona no início e limita a MAX_SNAPSHOTS
      const updated = [snapshot, ...list.filter(s => s.id !== snapshot.id)].slice(0, MAX_SNAPSHOTS);
      localStorage.setItem(key, JSON.stringify(updated));

      // 2. Sincroniza diretamente na Nuvem (Cloud Firestore + RTDB) para estar disponível em todos os dispositivos
      const sanitized = sanitizePayload(snapshot);
      const snapDocRef = doc(db, 'users', targetUid, 'snapshots', snapshot.id);
      
      executeFirestoreWithRetry(
        () => setDoc(snapDocRef, sanitized),
        { operationName: `saveCloudSnapshot:${snapshot.id}` }
      ).then(() => {
        this.cleanOldCloudSnapshots(targetUid);
      }).catch(err => {
        console.warn("[AntiDataLoss] Aviso ao sincronizar snapshot na nuvem:", err);
      });

      if (rtdb) {
        rtdbSet(rtdbRef(rtdb, `users/${targetUid}/snapshots/${snapshot.id}`), sanitized).catch(() => {});
      }

      return snapshot;
    } catch (err) {
      console.warn("Aviso ao gerar snapshot:", err);
      return null;
    }
  },

  /**
   * Retorna os snapshots disponíveis localmente para o usuário ativo
   */
  getLocalSnapshots(targetUid: string): DataSnapshot[] {
    if (!targetUid) return [];
    try {
      const key = `${SNAPSHOTS_KEY_PREFIX}${targetUid}`;
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Carrega snapshots da Nuvem e mescla com os snapshots locais
   */
  async fetchCloudSnapshots(targetUid: string): Promise<DataSnapshot[]> {
    if (!targetUid) return [];
    const localSnaps = this.getLocalSnapshots(targetUid);
    const snapsMap = new Map<string, DataSnapshot>();
    localSnaps.forEach(s => snapsMap.set(s.id, s));

    try {
      const snapDocs = await getDocs(collection(db, 'users', targetUid, 'snapshots'));
      snapDocs.forEach(d => {
        const data = d.data() as DataSnapshot;
        snapsMap.set(d.id, { ...data, id: d.id });
      });

      const merged = Array.from(snapsMap.values())
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, MAX_SNAPSHOTS);

      const key = `${SNAPSHOTS_KEY_PREFIX}${targetUid}`;
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.warn("[AntiDataLoss] Aviso ao buscar snapshots da nuvem:", err);
      return localSnaps;
    }
  },

  /**
   * Escuta em tempo real os snapshots na Nuvem sincronizados entre todos os dispositivos
   */
  subscribeSnapshots(
    targetUid: string,
    callback: (snapshots: DataSnapshot[]) => void
  ): () => void {
    if (!targetUid) {
      callback([]);
      return () => {};
    }

    // Emite os locais imediatamente
    const initialLocal = this.getLocalSnapshots(targetUid);
    callback(initialLocal);

    try {
      const snapCol = collection(db, 'users', targetUid, 'snapshots');
      const unsub = onSnapshot(snapCol, (snapshot) => {
        const cloudItems: DataSnapshot[] = [];
        snapshot.forEach(docSnap => {
          cloudItems.push({
            ...(docSnap.data() as DataSnapshot),
            id: docSnap.id
          });
        });

        // Mescla com o local
        const snapsMap = new Map<string, DataSnapshot>();
        this.getLocalSnapshots(targetUid).forEach(s => snapsMap.set(s.id, s));
        cloudItems.forEach(s => snapsMap.set(s.id, s));

        const merged = Array.from(snapsMap.values())
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, MAX_SNAPSHOTS);

        const key = `${SNAPSHOTS_KEY_PREFIX}${targetUid}`;
        try {
          localStorage.setItem(key, JSON.stringify(merged));
        } catch {}

        callback(merged);
      }, (err) => {
        console.warn("[AntiDataLoss] Snapshot listener notice:", err);
        callback(this.getLocalSnapshots(targetUid));
      });

      return unsub;
    } catch {
      return () => {};
    }
  },

  /**
   * Restaura um snapshot específico no sistema e sincroniza com todos os dispositivos
   */
  async restoreLocalSnapshot(
    snapshotId: string,
    targetUid: string,
    currentOitivas: Oitiva[]
  ): Promise<Oitiva[]> {
    // Busca dos locais ou da nuvem
    let snapshots = backupService.getLocalSnapshots(targetUid);
    let target = snapshots.find(s => s.id === snapshotId);
    
    if (!target) {
      const cloudSnaps = await this.fetchCloudSnapshots(targetUid);
      target = cloudSnaps.find(s => s.id === snapshotId);
    }

    if (!target) {
      throw new Error('Ponto de restauração não encontrado.');
    }

    // Cria um snapshot preventivo do estado imediatamente anterior à restauração
    backupService.createLocalSnapshot(
      currentOitivas,
      `Pré-Restauração do Ponto (${target.dateStr})`,
      targetUid
    );

    // Salva todas as oitivas do snapshot no Firestore e RTDB (refletirá em tempo real em todos os computadores/celulares)
    for (const item of target.oitivas) {
      await oitivaService.update(item.id, { ...item, uid: targetUid }, targetUid);
    }

    return target.oitivas;
  },

  /**
   * Remove um snapshot local e da nuvem
   */
  async deleteLocalSnapshot(snapshotId: string, targetUid: string): Promise<void> {
    try {
      const key = `${SNAPSHOTS_KEY_PREFIX}${targetUid}`;
      const snapshots = backupService.getLocalSnapshots(targetUid);
      const filtered = snapshots.filter(s => s.id !== snapshotId);
      localStorage.setItem(key, JSON.stringify(filtered));

      await deleteDoc(doc(db, 'users', targetUid, 'snapshots', snapshotId)).catch(() => {});
      if (rtdb) {
        await rtdbRemove(rtdbRef(rtdb, `users/${targetUid}/snapshots/${snapshotId}`)).catch(() => {});
      }
    } catch (e) {
      console.warn("Aviso ao remover snapshot:", e);
    }
  },

  // =========================================================================
  // LIXEIRA DE RECUPERAÇÃO SEGURA (SOFT DELETE / TRASH BIN MULTI-DISPOSITIVO)
  // =========================================================================

  /**
   * Adiciona um item excluído na lixeira de segurança com persistência na Nuvem e local
   */
  saveToTrash(oitiva: Oitiva, targetUid: string, deletedBy?: string): void {
    if (!targetUid || !oitiva) return;

    try {
      const now = new Date();
      const record: DeletedOitivaRecord = {
        id: `trash_${oitiva.id}_${Date.now()}`,
        deletedAt: now.getTime(),
        deletedDateStr: now.toLocaleString('pt-BR'),
        deletedBy: deletedBy || 'Operador',
        oitiva
      };

      // 1. Salva localmente
      const key = `${TRASH_KEY_PREFIX}${targetUid}`;
      const existingRaw = localStorage.getItem(key);
      let list: DeletedOitivaRecord[] = [];

      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }

      // Limpar itens com mais de MAX_TRASH_DAYS
      const cutoff = now.getTime() - (MAX_TRASH_DAYS * 24 * 60 * 60 * 1000);
      const filtered = list.filter(item => item.deletedAt >= cutoff);

      const updated = [record, ...filtered].slice(0, 50); // Mantém até 50 itens excluídos
      localStorage.setItem(key, JSON.stringify(updated));

      // 2. Salva na Nuvem (Firestore + RTDB) para restauração de qualquer dispositivo
      const sanitized = sanitizePayload(record);
      setDoc(doc(db, 'users', targetUid, 'trash', record.id), sanitized).catch(() => {});
      if (rtdb) {
        rtdbSet(rtdbRef(rtdb, `users/${targetUid}/trash/${record.id}`), sanitized).catch(() => {});
      }
    } catch (err) {
      console.warn("Aviso ao salvar na lixeira de segurança:", err);
    }
  },

  /**
   * Retorna os registros da lixeira local
   */
  getTrashRecords(targetUid: string): DeletedOitivaRecord[] {
    if (!targetUid) return [];
    try {
      const key = `${TRASH_KEY_PREFIX}${targetUid}`;
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Busca registros da lixeira na Nuvem e mescla com os registros locais
   */
  async fetchCloudTrash(targetUid: string): Promise<DeletedOitivaRecord[]> {
    if (!targetUid) return [];
    const local = this.getTrashRecords(targetUid);
    const trashMap = new Map<string, DeletedOitivaRecord>();
    local.forEach(r => trashMap.set(r.id, r));

    try {
      const snapDocs = await getDocs(collection(db, 'users', targetUid, 'trash'));
      snapDocs.forEach(d => {
        const data = d.data() as DeletedOitivaRecord;
        trashMap.set(d.id, { ...data, id: d.id });
      });

      const merged = Array.from(trashMap.values())
        .sort((a, b) => b.deletedAt - a.deletedAt)
        .slice(0, 50);

      const key = `${TRASH_KEY_PREFIX}${targetUid}`;
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    } catch {
      return local;
    }
  },

  /**
   * Escuta em tempo real a lixeira na Nuvem compartilhada entre dispositivos
   */
  subscribeTrash(
    targetUid: string,
    callback: (records: DeletedOitivaRecord[]) => void
  ): () => void {
    if (!targetUid) {
      callback([]);
      return () => {};
    }

    callback(this.getTrashRecords(targetUid));

    try {
      const trashCol = collection(db, 'users', targetUid, 'trash');
      const unsub = onSnapshot(trashCol, (snapshot) => {
        const cloudRecords: DeletedOitivaRecord[] = [];
        snapshot.forEach(docSnap => {
          cloudRecords.push({
            ...(docSnap.data() as DeletedOitivaRecord),
            id: docSnap.id
          });
        });

        const trashMap = new Map<string, DeletedOitivaRecord>();
        this.getTrashRecords(targetUid).forEach(r => trashMap.set(r.id, r));
        cloudRecords.forEach(r => trashMap.set(r.id, r));

        const merged = Array.from(trashMap.values())
          .sort((a, b) => b.deletedAt - a.deletedAt)
          .slice(0, 50);

        const key = `${TRASH_KEY_PREFIX}${targetUid}`;
        try {
          localStorage.setItem(key, JSON.stringify(merged));
        } catch {}

        callback(merged);
      }, () => {
        callback(this.getTrashRecords(targetUid));
      });

      return unsub;
    } catch {
      return () => {};
    }
  },

  /**
   * Restaura uma oitiva da lixeira de volta para a agenda ativa e remove da lixeira
   */
  async restoreFromTrash(recordId: string, targetUid: string): Promise<Oitiva | null> {
    let records = backupService.getTrashRecords(targetUid);
    let target = records.find(r => r.id === recordId);
    
    if (!target) {
      const cloudTrash = await this.fetchCloudTrash(targetUid);
      target = cloudTrash.find(r => r.id === recordId);
    }

    if (!target || !target.oitiva) {
      throw new Error('Registro excluído não encontrado na lixeira.');
    }

    const oitivaToRestore = {
      ...target.oitiva,
      uid: targetUid,
      updatedAt: Date.now()
    };

    // Recria no Firestore e RTDB
    await oitivaService.update(oitivaToRestore.id, oitivaToRestore, targetUid);

    // Remove da lixeira local e da Nuvem
    await backupService.deleteTrashRecord(recordId, targetUid);

    return oitivaToRestore;
  },

  /**
   * Remove registro individual da lixeira permanentemente
   */
  async deleteTrashRecord(recordId: string, targetUid: string): Promise<void> {
    try {
      const key = `${TRASH_KEY_PREFIX}${targetUid}`;
      const records = backupService.getTrashRecords(targetUid);
      const filtered = records.filter(r => r.id !== recordId);
      localStorage.setItem(key, JSON.stringify(filtered));

      await deleteDoc(doc(db, 'users', targetUid, 'trash', recordId)).catch(() => {});
      if (rtdb) {
        await rtdbRemove(rtdbRef(rtdb, `users/${targetUid}/trash/${recordId}`)).catch(() => {});
      }
    } catch {}
  },

  /**
   * Esvazia toda a lixeira
   */
  async clearTrash(targetUid: string): Promise<void> {
    try {
      const key = `${TRASH_KEY_PREFIX}${targetUid}`;
      localStorage.removeItem(key);

      const trashDocs = await getDocs(collection(db, 'users', targetUid, 'trash'));
      for (const d of trashDocs.docs) {
        await deleteDoc(doc(db, 'users', targetUid, 'trash', d.id)).catch(() => {});
      }
      if (rtdb) {
        await rtdbRemove(rtdbRef(rtdb, `users/${targetUid}/trash`)).catch(() => {});
      }
    } catch {}
  }
};
