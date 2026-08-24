import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Mail, HardDrive, CheckCircle2, AlertCircle, 
  ExternalLink, Send, FileText, Trash2,
  CalendarCheck, Clock, User
} from 'lucide-react';
import { Oitiva } from '../types/oitiva';
import { authService } from '../services/authService';
import { calendarService, GoogleCalendarEvent } from '../services/calendarService';
import { gmailService } from '../services/gmailService';
import { driveService, GoogleDriveFile } from '../services/driveService';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitivas: Oitiva[];
  currentDate: Date;
  onUpdateOitiva: (id: string, updates: Partial<Oitiva>) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  initialTab?: 'calendar' | 'gmail' | 'drive';
  selectedOitivaForAction?: Oitiva | null;
}

export const GoogleWorkspaceModal = ({
  isOpen,
  onClose,
  oitivas,
  currentDate,
  onUpdateOitiva,
  onShowToast,
  initialTab = 'calendar',
  selectedOitivaForAction
}: GoogleWorkspaceModalProps) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'gmail' | 'drive'>(initialTab);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Calendar tab state
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Gmail tab state
  const [recipientEmail, setRecipientEmail] = useState<string>(selectedOitivaForAction?.email || '');
  const [selectedOitivaIdForEmail, setSelectedOitivaIdForEmail] = useState<string>(selectedOitivaForAction?.id || (oitivas[0]?.id || ''));
  const [customIntro, setCustomIntro] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState<boolean>(false);

  // Drive tab state
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState<boolean>(false);
  const [exportingDrive, setExportingDrive] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);

  // Check auth state on mount / open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const token = authService.getAccessToken();
      setHasToken(!!token);
      if (selectedOitivaForAction) {
        setSelectedOitivaIdForEmail(selectedOitivaForAction.id);
        if (selectedOitivaForAction.email) {
          setRecipientEmail(selectedOitivaForAction.email);
        }
      }
      if (token) {
        if (initialTab === 'calendar') loadCalendar(token);
        if (initialTab === 'drive') loadDriveFiles(token);
      }
    }
  }, [isOpen, initialTab, selectedOitivaForAction]);

  const handleConnectWorkspace = async () => {
    setIsConnecting(true);
    try {
      const token = await authService.connectGoogleWorkspace();
      if (token) {
        setHasToken(true);
        onShowToast('Google Workspace conectado com sucesso!', 'success');
        if (activeTab === 'calendar') loadCalendar(token);
        if (activeTab === 'drive') loadDriveFiles(token);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao autorizar Google Workspace.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Calendar Handlers
  const loadCalendar = async (token?: string) => {
    const t = token || authService.getAccessToken();
    if (!t) return;
    setLoadingCalendar(true);
    try {
      const events = await calendarService.listEvents(t, 15);
      setCalendarEvents(events);
    } catch (err: any) {
      console.warn("Erro ao listar eventos do Calendar:", err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleSyncSingleOitiva = async (oitiva: Oitiva) => {
    const token = authService.getAccessToken();
    if (!token) {
      onShowToast('Conecte o Google Workspace primeiro.', 'info');
      return;
    }
    setSyncingId(oitiva.id);
    try {
      if (oitiva.googleCalendarEventId) {
        // Atualiza evento
        await calendarService.updateEvent(token, oitiva.googleCalendarEventId, oitiva);
        onShowToast(`Evento de "${oitiva.personName}" atualizado no Google Calendar!`);
      } else {
        // Cria novo evento
        const created = await calendarService.createEvent(token, oitiva);
        onUpdateOitiva(oitiva.id, { googleCalendarEventId: created.id });
        onShowToast(`Oitiva de "${oitiva.personName}" adicionada ao Google Calendar!`);
      }
      loadCalendar(token);
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao sincronizar com Google Calendar.', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAllToday = async () => {
    const token = authService.getAccessToken();
    if (!token) {
      onShowToast('Conecte o Google Workspace primeiro.', 'info');
      return;
    }
    const todayStr = currentDate.toISOString().split('T')[0];
    const todayOitivas = oitivas.filter(o => o.date === todayStr);

    if (todayOitivas.length === 0) {
      onShowToast('Nenhuma oitiva nesta data para sincronizar.', 'info');
      return;
    }

    setLoadingCalendar(true);
    let count = 0;
    try {
      for (const o of todayOitivas) {
        if (!o.googleCalendarEventId) {
          const created = await calendarService.createEvent(token, o);
          onUpdateOitiva(o.id, { googleCalendarEventId: created.id });
          count++;
        }
      }
      onShowToast(`${count} oitiva(s) sincronizada(s) com a Google Agenda!`);
      loadCalendar(token);
    } catch (err: any) {
      onShowToast(err.message || 'Erro na sincronização.', 'error');
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Gmail Handlers
  const handleInitiateEmailSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) {
      onShowToast('Informe o e-mail do destinatário.', 'error');
      return;
    }
    // Workspace guidelines mandate confirmation before sending email
    setShowEmailConfirm(true);
  };

  const handleConfirmSendEmail = async () => {
    setShowEmailConfirm(false);
    const token = authService.getAccessToken();
    if (!token) {
      onShowToast('Conecte o Google Workspace para enviar e-mails.', 'info');
      return;
    }

    const targetOitiva = oitivas.find(o => o.id === selectedOitivaIdForEmail);
    if (!targetOitiva) {
      onShowToast('Selecione uma oitiva válida.', 'error');
      return;
    }

    setSendingEmail(true);
    try {
      await gmailService.sendHearingSummons(token, recipientEmail, targetOitiva, customIntro);
      onUpdateOitiva(targetOitiva.id, {
        intimationSent: true,
        lastGmailSentAt: Date.now(),
        email: recipientEmail
      });
      onShowToast(`Notificação oficial enviada com sucesso para ${recipientEmail}!`);
      setCustomIntro('');
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao enviar e-mail pelo Gmail.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  // Drive Handlers
  const loadDriveFiles = async (token?: string) => {
    const t = token || authService.getAccessToken();
    if (!t) return;
    setLoadingDrive(true);
    try {
      const files = await driveService.listAppFiles(t);
      setDriveFiles(files);
    } catch (err: any) {
      console.warn("Erro ao listar arquivos do Drive:", err);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleExportOitivaTermToDrive = async (oitiva: Oitiva) => {
    const token = authService.getAccessToken();
    if (!token) {
      onShowToast('Conecte o Google Workspace primeiro.', 'info');
      return;
    }
    setExportingDrive(true);
    try {
      const file = await driveService.saveOitivaTermToDrive(token, oitiva);
      onUpdateOitiva(oitiva.id, {
        googleDriveDocId: file.id,
        googleDriveDocUrl: file.webViewLink
      });
      onShowToast(`Termo de "${oitiva.personName}" salvo no Google Drive!`);
      loadDriveFiles(token);
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao salvar no Google Drive.', 'error');
    } finally {
      setExportingDrive(false);
    }
  };

  const handleExportPautaToDrive = async () => {
    const token = authService.getAccessToken();
    if (!token) {
      onShowToast('Conecte o Google Workspace primeiro.', 'info');
      return;
    }
    setExportingDrive(true);
    const dateStr = currentDate.toISOString().split('T')[0];
    try {
      await driveService.savePautaToDrive(token, dateStr, oitivas);
      onShowToast(`Pauta do dia ${dateStr.split('-').reverse().join('/')} salva no Google Drive!`);
      loadDriveFiles(token);
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao salvar pauta no Google Drive.', 'error');
    } finally {
      setExportingDrive(false);
    }
  };

  const handleConfirmDeleteDriveFile = async () => {
    if (!fileToDelete) return;
    const token = authService.getAccessToken();
    if (!token) return;

    try {
      await driveService.deleteFile(token, fileToDelete.id);
      onShowToast(`Arquivo "${fileToDelete.name}" excluído do Google Drive.`, 'info');
      setFileToDelete(null);
      loadDriveFiles(token);
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao excluir arquivo.', 'error');
    }
  };

  if (!isOpen) return null;

  const currentOitivaForEmail = oitivas.find(o => o.id === selectedOitivaIdForEmail);
  const selectedDateStr = currentDate.toISOString().split('T')[0];

  return (
    <div id="google-workspace-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div id="google-workspace-modal-card" className="bg-[#100D1B] border border-purple-900/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl shadow-purple-950/80 my-8 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-purple-900/40 bg-[#151124] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
              {activeTab === 'calendar' && <Calendar className="w-5 h-5" />}
              {activeTab === 'gmail' && <Mail className="w-5 h-5" />}
              {activeTab === 'drive' && <HardDrive className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Google Workspace
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-900/50 text-purple-300 border border-purple-500/30">
                  Drive • Gmail • Agenda
                </span>
              </div>
              <p className="text-xs text-purple-300/70">
                Integração oficial da Delegacia de Maracanaú
              </p>
            </div>
          </div>

          <button
            id="close-google-workspace-modal-btn"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl transition-colors hover:bg-purple-950/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Connection Banner if not connected */}
        {!hasToken && (
          <div className="p-4 bg-gradient-to-r from-purple-950/60 via-[#18112b] to-[#120e20] border-b border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-zinc-200">Google Workspace não conectado</p>
                <p className="text-zinc-400 text-[11px]">Conecte para sincronizar com Google Agenda, enviar intimações pelo Gmail e arquivar termos no Drive.</p>
              </div>
            </div>
            <button
              id="connect-workspace-btn"
              onClick={handleConnectWorkspace}
              disabled={isConnecting}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-950 shrink-0 flex items-center gap-2"
            >
              {isConnecting ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Conectando...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-purple-200" />
                  <span>Conectar Workspace</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-purple-900/30 bg-[#0c0915] px-4">
          <button
            id="tab-calendar-btn"
            onClick={() => {
              setActiveTab('calendar');
              if (hasToken) loadCalendar();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>Google Agenda (Calendar)</span>
          </button>

          <button
            id="tab-gmail-btn"
            onClick={() => setActiveTab('gmail')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'gmail'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-4 h-4 text-rose-400" />
            <span>Gmail (Intimações & Pautas)</span>
          </button>

          <button
            id="tab-drive-btn"
            onClick={() => {
              setActiveTab('drive');
              if (hasToken) loadDriveFiles();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'drive'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>Google Drive (Arquivamento)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: GOOGLE CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#141024] border border-purple-900/40 rounded-2xl">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-purple-400" />
                    Sincronização com Google Agenda
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Os agendamentos são vinculados à sua agenda principal com lembretes automáticos de 30 e 120 minutos.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="sync-all-today-calendar-btn"
                    onClick={handleSyncAllToday}
                    disabled={!hasToken || loadingCalendar}
                    className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 text-purple-200 rounded-xl text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Sincronizar Oitivas de Hoje</span>
                  </button>

                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#1a142e] hover:bg-purple-900/40 text-zinc-300 border border-purple-900/40 rounded-xl text-xs font-medium transition-all flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir Google Agenda</span>
                  </a>
                </div>
              </div>

              {/* List of oitivas for current date to sync */}
              <div>
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Oitivas da Data Atual ({selectedDateStr.split('-').reverse().join('/')})</span>
                  <span className="text-[11px] text-purple-400 font-normal">
                    {oitivas.filter(o => o.date === selectedDateStr).length} registro(s)
                  </span>
                </h4>

                <div className="space-y-2">
                  {oitivas.filter(o => o.date === selectedDateStr).length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-purple-900/30 rounded-2xl text-xs text-zinc-500">
                      Nenhuma oitiva cadastrada para {selectedDateStr.split('-').reverse().join('/')}.
                    </div>
                  ) : (
                    oitivas.filter(o => o.date === selectedDateStr).map(item => (
                      <div
                        key={item.id}
                        className="p-3 bg-[#140f23] border border-purple-900/30 rounded-xl flex items-center justify-between gap-3 hover:border-purple-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-mono font-bold">
                            {item.time || '09:00'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{item.personName}</p>
                            <p className="text-[11px] text-zinc-400">
                              {item.role || 'Depoente'} • Proc: {item.procedureNumber || 'S/N'} ({item.procedureType || 'IP'})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.googleCalendarEventId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-[10px] font-semibold text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Sincronizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] font-semibold text-zinc-400">
                              Não sincronizado
                            </span>
                          )}

                          <button
                            id={`sync-oitiva-${item.id}-btn`}
                            onClick={() => handleSyncSingleOitiva(item)}
                            disabled={!hasToken || syncingId === item.id}
                            className="px-2.5 py-1 bg-purple-900/50 hover:bg-purple-800 border border-purple-500/30 text-purple-200 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            {syncingId === item.id ? (
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                              <Calendar className="w-3 h-3" />
                            )}
                            <span>{item.googleCalendarEventId ? 'Atualizar' : 'Sincronizar'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming Google Calendar Events */}
              {hasToken && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Eventos Próximos na Google Agenda
                    </h4>
                    <button
                      onClick={() => loadCalendar()}
                      className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                    >
                      Atualizar lista
                    </button>
                  </div>

                  {loadingCalendar ? (
                    <div className="p-6 text-center text-xs text-purple-300">Carregando eventos da agenda...</div>
                  ) : calendarEvents.length === 0 ? (
                    <div className="p-4 bg-[#140f23] rounded-xl text-xs text-zinc-500 text-center">
                      Nenhum evento futuro encontrado na Google Agenda.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {calendarEvents.map(ev => (
                        <div
                          key={ev.id}
                          className="p-2.5 bg-[#151026] border border-purple-900/30 rounded-xl text-xs flex items-center justify-between"
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold text-purple-200">{ev.summary}</span>
                            <p className="text-[10px] text-zinc-400">
                              {ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleString('pt-BR') : ev.start.date}
                            </p>
                          </div>
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-400 hover:text-purple-200 p-1"
                              title="Ver na Google Agenda"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GMAIL */}
          {activeTab === 'gmail' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#141024] border border-purple-900/40 rounded-2xl">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-rose-400" />
                  Expedição de Intimações e Notificações por E-mail
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Gere e envie comunicações oficiais padronizadas da Delegacia Metropolitana de Maracanaú diretamente pelo Gmail.
                </p>
              </div>

              <form onSubmit={handleInitiateEmailSend} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Selecionar Oitiva / Depoente *
                    </label>
                    <select
                      id="gmail-oitiva-select"
                      value={selectedOitivaIdForEmail}
                      onChange={(e) => {
                        setSelectedOitivaIdForEmail(e.target.value);
                        const sel = oitivas.find(o => o.id === e.target.value);
                        if (sel?.email) setRecipientEmail(sel.email);
                      }}
                      className="w-full bg-[#151026] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      {oitivas.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.personName} - {o.date.split('-').reverse().join('/')} ({o.time || '09:00'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      E-mail do Destinatário *
                    </label>
                    <input
                      id="gmail-recipient-input"
                      type="email"
                      required
                      placeholder="Ex: depoente@email.com / advogado@oab.org"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full bg-[#151026] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Mensagem Introdutória / Observações adicionais (opcional)
                  </label>
                  <textarea
                    id="gmail-custom-intro"
                    rows={2}
                    placeholder="Ex: Prezado Senhor, conforme contato telefônico anterior..."
                    value={customIntro}
                    onChange={(e) => setCustomIntro(e.target.value)}
                    className="w-full bg-[#151026] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-zinc-500"
                  />
                </div>

                {/* Email Preview */}
                {currentOitivaForEmail && (
                  <div className="p-3 bg-[#0d0a17] border border-purple-900/30 rounded-xl space-y-1">
                    <p className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Prévia da Notificação Policial:
                    </p>
                    <div className="text-[10px] text-zinc-400 font-mono bg-black/40 p-2.5 rounded-lg whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {`ASSUNTO: [POLÍCIA CIVIL] Notificação de Oitiva - Procedimento: ${currentOitivaForEmail.procedureNumber || 'S/N'}\n\nPrezado(a) Senhor(a) ${currentOitivaForEmail.personName},\nPor meio deste expediente eletrônico oficial, NOTIFICAMOS Vossa Senhoria a comparecer para prestar depoimento na condição de ${currentOitivaForEmail.role || 'Depoente'}.\n\nData: ${currentOitivaForEmail.date.split('-').reverse().join('/')} às ${currentOitivaForEmail.time || '09:00'} horas\nLocal: Delegacia Metropolitana de Maracanaú`}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    id="submit-send-gmail-btn"
                    type="submit"
                    disabled={!hasToken || sendingEmail || !recipientEmail}
                    className="px-4 py-2 bg-gradient-to-r from-rose-700 to-purple-800 hover:from-rose-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingEmail ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Enviando...
                      </span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Intimação via Gmail</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#141024] border border-purple-900/40 rounded-2xl">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    Arquivamento Digital no Google Drive
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Salva automaticamente termos de oitiva e pautas do dia na pasta <strong className="text-purple-300">"Oitivas - DP Maracanaú"</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="save-pauta-drive-btn"
                    onClick={handleExportPautaToDrive}
                    disabled={!hasToken || exportingDrive}
                    className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Salvar Pauta de Hoje no Drive</span>
                  </button>

                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#1a142e] hover:bg-purple-900/40 text-zinc-300 border border-purple-900/40 rounded-xl text-xs font-medium transition-all flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir Google Drive</span>
                  </a>
                </div>
              </div>

              {/* Oitivas Quick Term Upload */}
              <div>
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Gerar e Salvar Termo de Oitiva no Drive
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {oitivas.filter(o => o.date === selectedDateStr).map(item => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-[#140f23] border border-purple-900/30 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="text-xs font-bold text-white">{item.personName}</span>
                        <span className="text-[11px] text-zinc-400 ml-2">({item.role || 'Depoente'})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.googleDriveDocUrl && (
                          <a
                            href={item.googleDriveDocUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-purple-400 hover:text-purple-300 underline flex items-center gap-0.5"
                          >
                            <span>Ver Termo</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        <button
                          id={`export-drive-term-${item.id}-btn`}
                          onClick={() => handleExportOitivaTermToDrive(item)}
                          disabled={!hasToken || exportingDrive}
                          className="px-2.5 py-1 bg-[#1d1633] hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 rounded-lg text-[10px] font-medium transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <HardDrive className="w-3 h-3 text-amber-400" />
                          <span>Salvar Termo</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Files in Google Drive Folder */}
              {hasToken && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Arquivos Salvos na Pasta da Delegacia
                    </h4>
                    <button
                      onClick={() => loadDriveFiles()}
                      className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                    >
                      Recarregar lista
                    </button>
                  </div>

                  {loadingDrive ? (
                    <div className="p-6 text-center text-xs text-purple-300">Carregando arquivos do Google Drive...</div>
                  ) : driveFiles.length === 0 ? (
                    <div className="p-4 bg-[#140f23] rounded-xl text-xs text-zinc-500 text-center">
                      Nenhum arquivo gerado nesta pasta do Google Drive ainda.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {driveFiles.map(file => (
                        <div
                          key={file.id}
                          className="p-2.5 bg-[#151026] border border-purple-900/30 rounded-xl text-xs flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                            <span className="font-medium text-zinc-200 truncate">{file.name}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-purple-300 hover:text-white"
                                title="Abrir no Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              id={`delete-drive-file-${file.id}-btn`}
                              onClick={() => setFileToDelete(file)}
                              className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Excluir arquivo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-purple-900/40 bg-[#120e20] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasToken ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span>{hasToken ? 'Google Workspace Autenticado' : 'Modo Offline / Sem Token'}</span>
          </div>

          <button
            id="close-bottom-workspace-modal-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1c1630] hover:bg-purple-950 text-zinc-300 rounded-xl font-medium transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* Confirmation Dialog: Send Email (Workspace skill mandatory requirement) */}
      {showEmailConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-[#171229] border border-purple-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <Mail className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-white">Confirmar Envio de Intimação</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Deseja enviar a notificação oficial da oitiva de <strong className="text-purple-300">{currentOitivaForEmail?.personName}</strong> para o e-mail <strong className="text-purple-300">{recipientEmail}</strong> via Gmail?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEmailConfirm(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSendEmail}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950"
              >
                Sim, Enviar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Drive File (Workspace skill mandatory requirement) */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-[#171229] border border-rose-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-white">Excluir Arquivo do Drive</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Tem certeza que deseja excluir o arquivo <strong className="text-white font-mono">{fileToDelete.name}</strong> do Google Drive? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteDriveFile}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-950"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
