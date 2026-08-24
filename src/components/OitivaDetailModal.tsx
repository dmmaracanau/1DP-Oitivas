import React from 'react';
import { 
  X, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Shield, 
  Video, 
  Printer, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Share2,
  Check,
  HardDrive,
  CalendarCheck,
  ExternalLink
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { formatDateBR, getRoleBadgeClasses, getStatusBadgeClasses, generateWhatsAppReminder } from '../utils/formatters';

interface OitivaDetailModalProps {
  oitiva: Oitiva | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (oitiva: Oitiva) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: HearingStatus) => void;
  onOpenPrint: () => void;
  onOpenPrintIntimacao?: () => void;
  onSyncCalendar?: (oitiva: Oitiva) => void;
  onSendGmail?: (oitiva: Oitiva) => void;
  onSaveDrive?: (oitiva: Oitiva) => void;
}

export const OitivaDetailModal: React.FC<OitivaDetailModalProps> = ({
  oitiva,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenPrint,
  onOpenPrintIntimacao,
  onSyncCalendar,
  onSendGmail,
  onSaveDrive
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen, oitiva?.id]);

  if (!isOpen || !oitiva) return null;

  const statuses: HearingStatus[] = ['Agendada', 'Realizada', 'Remarcada', 'Não Compareceu', 'Cancelada'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="bg-[#120f1e] border border-purple-900/50 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl shadow-purple-950/60 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-purple-900/40 bg-[#161226]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeClasses(oitiva.role)}`}>
                {oitiva.role || 'Oitiva'}
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {oitiva.personName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-purple-950/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          
          {/* Status Switcher Bar */}
          <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/30">
            <p className="text-[11px] font-semibold text-zinc-400 mb-2">Alterar Status da Oitiva:</p>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((st) => {
                const isActive = oitiva.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => onStatusChange(oitiva.id, st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? `${getStatusBadgeClasses(st)} shadow-sm`
                        : 'bg-[#100d1c] border-purple-900/30 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isActive && <Check className="w-3 h-3" />}
                    <span>{st}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Google Workspace Quick Actions Banner */}
          <div className="bg-gradient-to-r from-purple-950/50 via-[#18122c] to-[#140e24] p-3.5 rounded-2xl border border-purple-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Google Workspace (Agenda • Gmail • Drive)
              </span>
              {oitiva.googleCalendarEventId && (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Agenda Ativa
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Google Calendar Action */}
              <button
                id="modal-sync-calendar-btn"
                type="button"
                onClick={() => onSyncCalendar && onSyncCalendar(oitiva)}
                className="px-2.5 py-2 bg-[#120d22] hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>{oitiva.googleCalendarEventId ? 'Atualizar Agenda' : 'Add ao Calendar'}</span>
              </button>

              {/* Gmail Action */}
              <button
                id="modal-send-gmail-btn"
                type="button"
                onClick={() => onSendGmail && onSendGmail(oitiva)}
                className="px-2.5 py-2 bg-[#120d22] hover:bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                <span>Intimar por Gmail</span>
              </button>

              {/* Google Drive Action */}
              <button
                id="modal-save-drive-btn"
                type="button"
                onClick={() => onSaveDrive && onSaveDrive(oitiva)}
                className="px-2.5 py-2 bg-[#120d22] hover:bg-amber-950/40 text-amber-200 border border-amber-500/30 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Salvar no Drive</span>
              </button>
            </div>

            {/* Links if already saved */}
            {(oitiva.googleDriveDocUrl || oitiva.lastGmailSentAt) && (
              <div className="flex items-center gap-3 pt-1 text-[10px] text-zinc-400 border-t border-purple-900/30">
                {oitiva.googleDriveDocUrl && (
                  <a
                    href={oitiva.googleDriveDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
                  >
                    <span>Abrir Termo no Google Drive</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {oitiva.lastGmailSentAt && (
                  <span className="text-zinc-400">
                    Última notificação por e-mail: {new Date(oitiva.lastGmailSentAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            
            {/* Data & Hora */}
            <div className="bg-[#171326] p-3 rounded-xl border border-purple-900/30">
              <span className="text-[10px] text-zinc-400 block mb-1">Data e Horário</span>
              <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>{formatDateBR(oitiva.date)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-300 font-mono font-bold mt-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{oitiva.time || 'Horário a definir'}</span>
              </div>
            </div>

            {/* Procedimento */}
            <div className="bg-[#171326] p-3 rounded-xl border border-purple-900/30">
              <span className="text-[10px] text-zinc-400 block mb-1">Procedimento</span>
              <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>{oitiva.procedureNumber || 'Não vinculado'}</span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate mt-1">
                {oitiva.procedureType || 'Inquérito Policial'}
              </div>
            </div>

          </div>

          {/* Local / Sala / Videoconferência */}
          <div className="bg-[#171326] p-3.5 rounded-xl border border-purple-900/30 text-xs">
            <span className="text-[10px] text-zinc-400 block mb-1">Formato e Local</span>
            <div className="flex items-center gap-2">
              {oitiva.modality === 'Videoconferência' ? (
                <div className="flex items-center gap-2 text-blue-300">
                  <Video className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold">Videoconferência</span>
                  {oitiva.locationOrLink && (
                    <a 
                      href={oitiva.locationOrLink.startsWith('http') ? oitiva.locationOrLink : `https://${oitiva.locationOrLink}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-purple-400 underline truncate max-w-[200px]"
                    >
                      {oitiva.locationOrLink}
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-200">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold">{oitiva.modality || 'Presencial'}:</span>
                  <span>{oitiva.locationOrLink || 'Sala de Oitivas / Cartório'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Personal Data Section */}
          <div className="bg-[#171326] p-4 rounded-xl border border-purple-900/30 space-y-2 text-xs">
            <span className="text-[11px] font-bold text-purple-300 block border-b border-purple-900/30 pb-1.5">
              Dados Pessoais do Depoente
            </span>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-zinc-500 block">CPF:</span>
                <span className="font-mono text-zinc-200">{oitiva.cpf || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">RG / Órgão:</span>
                <span className="text-zinc-200">{oitiva.rg || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Telefone / WhatsApp:</span>
                <span className="text-zinc-200 font-mono">{oitiva.phone || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">E-mail:</span>
                <span className="text-zinc-200 truncate block">{oitiva.email || 'Não informado'}</span>
              </div>
            </div>

            {/* Address */}
            {(oitiva.address || oitiva.neighborhood || oitiva.city) && (
              <div className="pt-2 border-t border-purple-900/20">
                <span className="text-[10px] text-zinc-500 block">Endereço:</span>
                <p className="text-zinc-300">
                  {[oitiva.address, oitiva.neighborhood, oitiva.city].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Authorities / Officers */}
          {(oitiva.officerName || oitiva.clerkName) && (
            <div className="bg-[#171326] p-3.5 rounded-xl border border-purple-900/30 text-xs space-y-1.5">
              <span className="text-[10px] text-zinc-400 block">Responsáveis</span>
              {oitiva.officerName && (
                <p className="text-zinc-200">
                  <span className="text-zinc-500">Autoridade Policial:</span> {oitiva.officerName}
                </p>
              )}
              {oitiva.clerkName && (
                <p className="text-zinc-200">
                  <span className="text-zinc-500">Escrivão(ã):</span> {oitiva.clerkName}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {oitiva.notes && (
            <div className="bg-[#171326] p-3.5 rounded-xl border border-purple-900/30 text-xs">
              <span className="text-[10px] text-zinc-400 block mb-1">Observações & Anotações</span>
              <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {oitiva.notes}
              </p>
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-purple-900/40 bg-[#161226] flex items-center justify-between gap-2 flex-wrap">
          
          {/* Notification & Print Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {oitiva.phone && (
              <a
                href={generateWhatsAppReminder(oitiva)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-colors"
                title="Enviar notificação por WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Notificar WhatsApp</span>
              </a>
            )}

            {onOpenPrintIntimacao && (
              <button
                id="btn-print-intimacao-detail"
                type="button"
                onClick={onOpenPrintIntimacao}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-900/40 transition-colors"
                title="Imprimir Mandado de Intimação (PDF Oficial)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Intimação</span>
              </button>
            )}

            <button
              onClick={onOpenPrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1d182e] hover:bg-[#27203d] text-zinc-300 hover:text-white border border-purple-900/40 rounded-xl text-xs font-medium transition-colors"
              title="Imprimir Ficha Completa da Oitiva"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Ficha</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 bg-rose-950/80 p-1.5 rounded-xl border border-rose-500/50 animate-in fade-in">
                <span className="text-[11px] font-semibold text-rose-200 px-1">Excluir oitiva?</span>
                <button
                  id="confirm-delete-btn"
                  type="button"
                  onClick={() => {
                    onDelete(oitiva.id);
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Sim, excluir
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onEdit(oitiva);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                  title="Excluir Oitiva"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

