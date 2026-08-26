import { Oitiva, UserProfile, CalendarSpecialDate, BackupFilePayload, DataSnapshot, DeletedOitivaRecord, ImportValidationResult } from '../types/oitiva';
import { oitivaService } from './oitivaService';
import { specialDateService } from './specialDateService';

const SNAPSHOTS_KEY_PREFIX = 'oitivas_auto_snapshots_';
const TRASH_KEY_PREFIX = 'oitivas_trash_bin_';
const MAX_SNAPSHOTS = 10;
const MAX_TRASH_DAYS = 30;

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
  // SNAPSHOTS AUTOMÁTICOS & PONTOS DE RESTAURAÇÃO LOCAIS (DLP)
  // =========================================================================

  /**
   * Salva um snapshot local rotativo de segurança
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
      const updated = [snapshot, ...list].slice(0, MAX_SNAPSHOTS);
      localStorage.setItem(key, JSON.stringify(updated));
      return snapshot;
    } catch (err) {
      console.warn("Aviso ao gerar snapshot local:", err);
      return null;
    }
  },

  /**
   * Retorna os snapshots disponíveis para o usuário ativo
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
   * Restaura um snapshot específico no sistema
   */
  async restoreLocalSnapshot(
    snapshotId: string,
    targetUid: string,
    currentOitivas: Oitiva[]
  ): Promise<Oitiva[]> {
    const snapshots = backupService.getLocalSnapshots(targetUid);
    const target = snapshots.find(s => s.id === snapshotId);
    if (!target) {
      throw new Error('Ponto de restauração não encontrado.');
    }

    // Cria um snapshot preventivo do estado imediatamente anterior à restauração
    backupService.createLocalSnapshot(
      currentOitivas,
      `Pré-Restauração do Ponto (${target.dateStr})`,
      targetUid
    );

    // Salva todas as oitivas do snapshot no Firestore
    for (const item of target.oitivas) {
      await oitivaService.update(item.id, { ...item, uid: targetUid }, targetUid);
    }

    return target.oitivas;
  },

  /**
   * Remove um snapshot
   */
  deleteLocalSnapshot(snapshotId: string, targetUid: string): void {
    try {
      const key = `${SNAPSHOTS_KEY_PREFIX}${targetUid}`;
      const snapshots = backupService.getLocalSnapshots(targetUid);
      const filtered = snapshots.filter(s => s.id !== snapshotId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {}
  },

  // =========================================================================
  // LIXEIRA DE RECUPERAÇÃO SEGURA (SOFT DELETE / TRASH BIN)
  // =========================================================================

  /**
   * Adiciona um item excluído na lixeira de segurança
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
    } catch (err) {
      console.warn("Aviso ao salvar na lixeira de segurança:", err);
    }
  },

  /**
   * Retorna os registros da lixeira
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
   * Restaura uma oitiva da lixeira de volta para a agenda ativa
   */
  async restoreFromTrash(recordId: string, targetUid: string): Promise<Oitiva | null> {
    const records = backupService.getTrashRecords(targetUid);
    const target = records.find(r => r.id === recordId);
    if (!target || !target.oitiva) {
      throw new Error('Registro excluído não encontrado na lixeira.');
    }

    const oitivaToRestore = {
      ...target.oitiva,
      uid: targetUid,
      updatedAt: Date.now()
    };

    // Recria no Firestore
    await oitivaService.update(oitivaToRestore.id, oitivaToRestore, targetUid);

    // Remove da lixeira
    backupService.deleteTrashRecord(recordId, targetUid);

    return oitivaToRestore;
  },

  /**
   * Remove registro individual da lixeira permanentemente
   */
  deleteTrashRecord(recordId: string, targetUid: string): void {
    try {
      const key = `${TRASH_KEY_PREFIX}${targetUid}`;
      const records = backupService.getTrashRecords(targetUid);
      const filtered = records.filter(r => r.id !== recordId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {}
  },

  /**
   * Esvazia toda a lixeira
   */
  clearTrash(targetUid: string): void {
    try {
      const key = `${TRASH_KEY_PREFIX}${targetUid}`;
      localStorage.removeItem(key);
    } catch {}
  }
};
