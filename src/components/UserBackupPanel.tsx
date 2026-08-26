import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Upload, 
  HardDriveDownload, 
  ShieldCheck, 
  RotateCcw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  FileJson, 
  Clock, 
  Database, 
  Sparkles, 
  Layers, 
  RefreshCw, 
  ArrowRight,
  Info,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { Oitiva, UserProfile, CalendarSpecialDate, DataSnapshot, DeletedOitivaRecord, ImportValidationResult } from '../types/oitiva';
import { backupService } from '../services/backupService';
import { formatDateBR } from '../utils/formatters';

interface UserBackupPanelProps {
  user: UserProfile | null;
  oitivas: Oitiva[];
  specialDates?: CalendarSpecialDate[];
  onDataRestored?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserBackupPanel: React.FC<UserBackupPanelProps> = ({
  user,
  oitivas,
  specialDates = [],
  onDataRestored,
  showToast
}) => {
  const targetUid = user?.uid || 'guest_default';
  
  // Snapshots & Trash states
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>([]);
  const [trashRecords, setTrashRecords] = useState<DeletedOitivaRecord[]>([]);
  
  // Import States
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ percent: number; step: string }>({ percent: 0, step: '' });
  
  // Action confirmations
  const [snapshotToRestore, setSnapshotToRestore] = useState<DataSnapshot | null>(null);
  const [trashToRestore, setTrashToRestore] = useState<DeletedOitivaRecord | null>(null);
  const [confirmClearTrash, setConfirmClearTrash] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load snapshots & trash on mount or when targetUid changes
  const reloadSafetyData = () => {
    if (!targetUid) return;
    const snaps = backupService.getLocalSnapshots(targetUid);
    setSnapshots(snaps);
    const trash = backupService.getTrashRecords(targetUid);
    setTrashRecords(trash);
  };

  useEffect(() => {
    reloadSafetyData();
  }, [targetUid]);

  // Handle Export
  const handleExportBackup = () => {
    try {
      backupService.exportBackup(oitivas, user, specialDates);
      // Cria snapshot automático do momento do backup
      backupService.createLocalSnapshot(oitivas, 'Exportação Manual de Backup JSON', targetUid, specialDates);
      reloadSafetyData();
      showToast('Arquivo de backup JSON exportado com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao exportar backup.', 'error');
    }
  };

  // Handle File Selection & Validation
  const processUploadedFile = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showToast('Por favor, selecione um arquivo válido com extensão .json', 'error');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const validated = backupService.validateBackupFile(content, oitivas);
        setValidationResult(validated);
        if (!validated.isValid) {
          showToast(validated.errorMessage || 'Arquivo inválido.', 'error');
        } else {
          showToast(`${validated.totalFound} oitiva(s) detectada(s) no backup.`, 'info');
        }
      } catch (err: any) {
        showToast('Erro ao ler o arquivo selecionado.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!validationResult || !validationResult.isValid) return;

    setImporting(true);
    setImportProgress({ percent: 0, step: 'Iniciando importação...' });

    try {
      const result = await backupService.importBackup(
        validationResult,
        targetUid,
        importMode,
        oitivas,
        (percent, step) => {
          setImportProgress({ percent, step });
        },
        user
      );

      showToast(
        `Importação concluída! ${result.imported} novas, ${result.updated} atualizadas.`,
        'success'
      );

      // Limpa estado de importação e atualiza snapshots
      setSelectedFile(null);
      setValidationResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      reloadSafetyData();
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      showToast(err.message || 'Erro durante a importação do backup.', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Criar Snapshot Manual
  const handleCreateManualSnapshot = () => {
    if (oitivas.length === 0) {
      showToast('Não há oitivas cadastradas para criar ponto de restauração.', 'info');
      return;
    }

    const created = backupService.createLocalSnapshot(
      oitivas,
      'Ponto de Restauração Criado pelo Usuário',
      targetUid,
      specialDates
    );

    if (created) {
      reloadSafetyData();
      showToast('Ponto de restauração criado com sucesso!', 'success');
    }
  };

  // Restaurar Snapshot
  const handleRestoreSnapshotSubmit = async () => {
    if (!snapshotToRestore) return;
    setActionLoading(true);
    try {
      await backupService.restoreLocalSnapshot(snapshotToRestore.id, targetUid, oitivas);
      showToast(`Ponto de ${snapshotToRestore.dateStr} restaurado com sucesso!`, 'success');
      setSnapshotToRestore(null);
      reloadSafetyData();
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      showToast(err.message || 'Erro ao restaurar ponto de segurança.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Excluir Snapshot
  const handleDeleteSnapshot = (id: string) => {
    backupService.deleteLocalSnapshot(id, targetUid);
    reloadSafetyData();
    showToast('Ponto de restauração removido.', 'info');
  };

  // Restaurar da Lixeira
  const handleRestoreFromTrashSubmit = async () => {
    if (!trashToRestore) return;
    setActionLoading(true);
    try {
      await backupService.restoreFromTrash(trashToRestore.id, targetUid);
      showToast(`Oitiva de "${trashToRestore.oitiva.personName}" restaurada para a agenda!`, 'success');
      setTrashToRestore(null);
      reloadSafetyData();
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      showToast(err.message || 'Erro ao restaurar da lixeira.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Esvaziar Lixeira
  const handleClearTrashSubmit = () => {
    backupService.clearTrash(targetUid);
    reloadSafetyData();
    setConfirmClearTrash(false);
    showToast('Lixeira de segurança esvaziada.', 'info');
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      
      {/* Top Banner: Status de Proteção de Dados */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-[#151f28] to-purple-950/50 border-2 border-emerald-500/50 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/60 flex items-center justify-center text-emerald-300 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight">
                Prevenção Ativa de Perda de Dados
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                SISTEMA PROTEGIDO
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              Seus agendamentos contam com auto-save em tempo real, lixeira de recuperação e controle de snapshots locais rotativos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-black/40 px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
          <Database className="w-4 h-4 text-emerald-400" />
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Registros Ativos</p>
            <p className="text-sm font-black text-white font-mono">{oitivas.length} oitivas</p>
          </div>
        </div>
      </div>

      {/* Grid: Exportar & Importar Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CARD 1: EXPORTAR BACKUP */}
        <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Exportar Backup Completo (JSON)</h4>
                <p className="text-xs text-zinc-400">Gere uma cópia completa de segurança de toda a sua agenda.</p>
              </div>
            </div>

            <div className="bg-[#110d1e] p-3.5 rounded-xl border border-purple-900/30 space-y-2 text-xs text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total de Oitivas:</span>
                <span className="font-mono font-bold text-white">{oitivas.length} registros</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Feriados & Datas Especiais:</span>
                <span className="font-mono font-bold text-white">{specialDates.length} registros</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Formato do Arquivo:</span>
                <span className="font-mono font-bold text-purple-300">JSON Auditado v2.0</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-export-backup-json"
              type="button"
              onClick={handleExportBackup}
              disabled={oitivas.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-950 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo de Backup JSON</span>
            </button>
          </div>
        </div>

        {/* CARD 2: IMPORTAR BACKUP */}
        <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shadow">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Importar & Restaurar Backup (JSON)</h4>
                <p className="text-xs text-zinc-400">Carregue um arquivo JSON gerado anteriormente pelo sistema.</p>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
                isDragging 
                  ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]' 
                  : selectedFile 
                    ? 'border-emerald-500/80 bg-emerald-950/20' 
                    : 'border-purple-900/60 bg-[#110d1e] hover:border-purple-500/60 hover:bg-[#140f24]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <FileJson className="w-4 h-4" />
                    <span className="truncate max-w-[240px]">{selectedFile.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Clique para escolher outro arquivo
                  </p>
                </div>
              ) : (
                <>
                  <FileJson className="w-6 h-6 text-indigo-400/80" />
                  <p className="text-xs text-zinc-300 font-medium">
                    Arraste o arquivo JSON aqui ou <span className="text-indigo-400 underline font-bold">clique para selecionar</span>
                  </p>
                </>
              )}
            </div>

            {/* Validation Preview */}
            {validationResult && validationResult.isValid && (
              <div className="bg-[#110d1e] p-3 rounded-xl border border-indigo-900/40 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <span>Oitivas Encontradas:</span>
                  <span className="font-mono text-sm">{validationResult.totalFound}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Novos Registros: <strong>{validationResult.newCount}</strong></span>
                  <span>Atualizações: <strong>{validationResult.updateCount}</strong></span>
                </div>

                {/* Estratégia de Importação */}
                <div className="pt-2 border-t border-purple-900/30 space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-300">Modo de Importação:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`p-2 rounded-lg text-left text-[11px] border transition-all cursor-pointer ${
                        importMode === 'merge'
                          ? 'border-indigo-500 bg-indigo-950/60 text-white font-bold'
                          : 'border-purple-900/30 bg-[#151026] text-zinc-400'
                      }`}
                    >
                      <div className="font-bold text-indigo-300">Mesclar Dados</div>
                      <div className="text-[9px] text-zinc-400">Mantém existentes e adiciona novos</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`p-2 rounded-lg text-left text-[11px] border transition-all cursor-pointer ${
                        importMode === 'replace'
                          ? 'border-amber-500 bg-amber-950/60 text-white font-bold'
                          : 'border-purple-900/30 bg-[#151026] text-zinc-400'
                      }`}
                    >
                      <div className="font-bold text-amber-300">Substituição Total</div>
                      <div className="text-[9px] text-zinc-400">Restaura exatamente o arquivo</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Import Progress Bar */}
            {importing && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
                  <span>{importProgress.step}</span>
                  <span>{importProgress.percent}%</span>
                </div>
                <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-indigo-900/40">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${importProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              id="btn-confirm-import-backup"
              type="button"
              onClick={handleExecuteImport}
              disabled={!validationResult || !validationResult.isValid || importing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-950 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sincronizando Banco de Dados...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Confirmar & Executar Importação</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* SEÇÃO 3: PONTOS DE RESTAURAÇÃO LOCAIS (SNAPSHOTS) */}
      <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Pontos de Restauração Locais (Snapshots)</h4>
              <p className="text-xs text-zinc-400">
                Snapshots automáticos salvos no navegador. Restaure o estado da agenda com 1 clique caso ocorra um erro.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateManualSnapshot}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#251f38] hover:bg-purple-900/60 text-purple-200 border border-purple-700/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Criar Ponto Manual Agora</span>
          </button>
        </div>

        {/* Snapshots List */}
        {snapshots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {snapshots.map((snap) => (
              <div 
                key={snap.id}
                className="bg-[#110d1e] p-3.5 rounded-xl border border-purple-900/40 hover:border-purple-500/40 transition-all flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      {snap.dateStr}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded border border-purple-700/40">
                      {snap.oitivasCount} oitivas
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate" title={snap.reason}>
                    {snap.reason}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSnapshotToRestore(snap)}
                    className="px-2.5 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Restaurar este ponto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSnapshot(snap.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Excluir ponto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-[#110d1e] rounded-xl border border-purple-900/30 text-xs text-zinc-400">
            Nenhum ponto de restauração local gerado ainda. O sistema criará pontos automaticamente antes de alterações importantes.
          </div>
        )}
      </div>

      {/* SEÇÃO 4: LIXEIRA DE RECUPERAÇÃO SEGURA (SOFT DELETE) */}
      <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Lixeira de Recuperação Segura (30 Dias)</h4>
              <p className="text-xs text-zinc-400">
                Oitivas excluídas recentemente ficam armazenadas aqui temporariamente para recuperação imediata.
              </p>
            </div>
          </div>

          {trashRecords.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearTrash(true)}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              Esvaziar Lixeira
            </button>
          )}
        </div>

        {/* Trash List */}
        {trashRecords.length > 0 ? (
          <div className="space-y-2 pt-1 max-h-60 overflow-y-auto">
            {trashRecords.map((item) => (
              <div 
                key={item.id}
                className="bg-[#110d1e] p-3 rounded-xl border border-purple-900/30 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white truncate max-w-[200px]">
                      {item.oitiva.personName}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Data oitiva: {formatDateBR(item.oitiva.date)} às {item.oitiva.time || '--:--'}
                    </span>
                    {item.oitiva.procedureNumber && (
                      <span className="text-[10px] bg-black/50 px-1.5 py-0.2 rounded border border-white/10 font-mono text-zinc-300">
                        {item.oitiva.procedureNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Excluído em: {item.deletedDateStr} por {item.deletedBy || 'Operador'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTrashToRestore(item)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-[#110d1e] rounded-xl border border-purple-900/30 text-xs text-zinc-400">
            A lixeira está vazia. Nenhuma oitiva foi excluída recentemente.
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CONFIRMAÇÃO: RESTAURAR SNAPSHOT */}
      {/* ========================================================================= */}
      {snapshotToRestore && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#140f26] border-2 border-purple-500/60 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl shadow-purple-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/60 flex items-center justify-center text-purple-300">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirmar Restauração de Ponto</h3>
                <p className="text-xs text-zinc-400">Ponto de: {snapshotToRestore.dateStr}</p>
              </div>
            </div>

            <div className="bg-[#110d1e] p-3.5 rounded-xl border border-purple-900/40 text-xs text-zinc-300 space-y-1.5">
              <p>
                Esta ação carregará as <strong>{snapshotToRestore.oitivasCount} oitivas</strong> contidas neste snapshot para a agenda ativa.
              </p>
              <p className="text-purple-300 font-semibold">
                🛡️ Um ponto de segurança com os dados atuais será criado automaticamente antes da restauração.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setSnapshotToRestore(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRestoreSnapshotSubmit}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-950 cursor-pointer"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Sim, Restaurar Ponto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMAÇÃO: RESTAURAR DA LIXEIRA */}
      {/* ========================================================================= */}
      {trashToRestore && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#140f26] border-2 border-emerald-500/60 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-300">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Restaurar Oitiva da Lixeira</h3>
                <p className="text-xs text-zinc-400">{trashToRestore.oitiva.personName}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              A oitiva de <strong>{trashToRestore.oitiva.personName}</strong> agendada para <strong>{formatDateBR(trashToRestore.oitiva.date)} às {trashToRestore.oitiva.time || '--:--'}</strong> será reinserida no banco de dados e voltará a aparecer normalmente no calendário.
            </p>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setTrashToRestore(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRestoreFromTrashSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Restaurar para Agenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMAÇÃO: ESVAZIAR LIXEIRA */}
      {/* ========================================================================= */}
      {confirmClearTrash && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#140f26] border-2 border-rose-500/60 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/60 flex items-center justify-center text-rose-300">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Esvaziar Lixeira de Segurança</h3>
                <p className="text-xs text-zinc-400">Esta ação apagará os registros excluídos definitivamente.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Tem certeza de que deseja esvaziar os {trashRecords.length} itens da lixeira? Eles não poderão mais ser recuperados por este painel.
            </p>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearTrash(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearTrashSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Esvaziar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
