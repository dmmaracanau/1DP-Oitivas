import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  FileText, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Shield, 
  Video, 
  AlertCircle, 
  Save, 
  CheckSquare,
  Sparkles,
  FileBadge,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  Building2,
  Compass
} from 'lucide-react';
import { Oitiva, HearingStatus, HearingRole, ProcedureType, HearingModality, UserProfile } from '../types/oitiva';
import { formatCPF, formatPhone, getUserInitials } from '../utils/formatters';
import { DelegadoSelectorModal } from './DelegadoSelectorModal';
import { DelegadoInfo, delegadoService } from '../services/delegadoService';
import { useTheme } from '../context/ThemeContext';

interface OitivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Oitiva, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: Oitiva | null;
  defaultDate?: string;
  user?: UserProfile | null;
}

export const OitivaModal: React.FC<OitivaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  user
}) => {
  const { isDark } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDelegadoModalOpen, setIsDelegadoModalOpen] = useState(false);

  // Section Refs for Quick-Scroll navigation
  const depoenteSectionRef = useRef<HTMLDivElement>(null);
  const agendamentoSectionRef = useRef<HTMLDivElement>(null);
  const procedimentoSectionRef = useRef<HTMLDivElement>(null);

  // Auto-Save Draft States
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // Form states
  const [personName, setPersonName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [procedureNumber, setProcedureNumber] = useState('');
  const [procedureType, setProcedureType] = useState<string>('Inquérito Policial (IP)');
  const [role, setRole] = useState<HearingRole>('Testemunha');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Maracanaú/CE');
  const [officerName, setOfficerName] = useState('');
  const [clerkName, setClerkName] = useState('');
  const [modality, setModality] = useState<HearingModality>('Presencial');
  const [locationOrLink, setLocationOrLink] = useState('Sala de Oitivas 01');
  const [status, setStatus] = useState<HearingStatus>('Agendada');
  const [notes, setNotes] = useState('');
  const [intimationSent, setIntimationSent] = useState(false);

  const getDraftKey = () => {
    const uid = user?.uid || 'guest';
    const targetId = initialData?.id ? `edit_${initialData.id}` : 'new';
    return `oitivas_modal_draft_${uid}_${targetId}`;
  };

  const clearCurrentDraft = () => {
    try {
      const key = getDraftKey();
      localStorage.removeItem(key);
      setHasRecoveredDraft(false);
      setDraftSavedAt(null);
    } catch {}
  };

  const handleDiscardDraft = () => {
    clearCurrentDraft();
    // Restaura valores originais
    if (initialData) {
      setPersonName(initialData.personName || '');
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setTime(initialData.time || '09:30');
      setProcedureNumber(initialData.procedureNumber || '');
      setProcedureType(initialData.procedureType || 'Inquérito Policial (IP)');
      setRole((initialData.role as HearingRole) || 'Testemunha');
      setCpf(initialData.cpf || '');
      setRg(initialData.rg || '');
      setPhone(initialData.phone || '');
      setEmail(initialData.email || '');
      setAddress(initialData.address || '');
      setNeighborhood(initialData.neighborhood || '');
      setCity(initialData.city || 'Maracanaú/CE');
      setOfficerName(initialData.officerName || delegadoService.getLastSelectedDelegado());
      setClerkName(initialData.clerkName || getUserInitials(user));
      setModality(initialData.modality || 'Presencial');
      setLocationOrLink(initialData.locationOrLink || (user?.department && user.department.trim()) || 'Sala de Oitivas 01');
      setStatus(initialData.status || 'Agendada');
      setNotes(initialData.notes || '');
      setIntimationSent(Boolean(initialData.intimationSent));
    } else {
      setPersonName('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime('09:30');
      setProcedureNumber('');
      setProcedureType('Inquérito Policial (IP)');
      setRole('Testemunha');
      setCpf('');
      setRg('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNeighborhood('');
      setCity('Maracanaú/CE');
      setOfficerName(delegadoService.getLastSelectedDelegado());
      setClerkName(getUserInitials(user));
      setModality('Presencial');
      setLocationOrLink((user?.department && user.department.trim()) || 'Sala de Oitivas 01');
      setStatus('Agendada');
      setNotes('');
      setIntimationSent(false);
    }
  };

  // Reset or populate on open with auto-recovery of draft
  useEffect(() => {
    if (isOpen) {
      isInitialLoadRef.current = true;
      const key = getDraftKey();
      let restored = false;

      try {
        const savedDraftRaw = localStorage.getItem(key);
        if (savedDraftRaw) {
          const draft = JSON.parse(savedDraftRaw);
          // Verifica se o rascunho possui dados preenchidos
          if (draft && (draft.personName || draft.procedureNumber || draft.cpf || draft.notes || draft.address)) {
            setPersonName(draft.personName || '');
            setDate(draft.date || defaultDate || new Date().toISOString().split('T')[0]);
            setTime(draft.time || '09:30');
            setProcedureNumber(draft.procedureNumber || '');
            setProcedureType(draft.procedureType || 'Inquérito Policial (IP)');
            setRole((draft.role as HearingRole) || 'Testemunha');
            setCpf(draft.cpf || '');
            setRg(draft.rg || '');
            setPhone(draft.phone || '');
            setEmail(draft.email || '');
            setAddress(draft.address || '');
            setNeighborhood(draft.neighborhood || '');
            setCity(draft.city || 'Maracanaú/CE');
            setOfficerName(draft.officerName || delegadoService.getLastSelectedDelegado());
            setClerkName(draft.clerkName || getUserInitials(user));
            setModality(draft.modality || 'Presencial');
            setLocationOrLink(draft.locationOrLink || (user?.department && user.department.trim()) || 'Sala de Oitivas 01');
            setStatus(draft.status || 'Agendada');
            setNotes(draft.notes || '');
            setIntimationSent(Boolean(draft.intimationSent));

            setHasRecoveredDraft(true);
            const savedTime = draft.savedAt ? new Date(draft.savedAt).toLocaleTimeString('pt-BR') : 'recente';
            setDraftSavedAt(savedTime);
            setLastAutoSavedTime(savedTime);
            restored = true;
          }
        }
      } catch (err) {
        console.warn('Erro ao restaurar rascunho:', err);
      }

      if (!restored) {
        setHasRecoveredDraft(false);
        setDraftSavedAt(null);
        if (initialData) {
          setPersonName(initialData.personName || '');
          setDate(initialData.date || new Date().toISOString().split('T')[0]);
          setTime(initialData.time || '09:30');
          setProcedureNumber(initialData.procedureNumber || '');
          setProcedureType(initialData.procedureType || 'Inquérito Policial (IP)');
          setRole((initialData.role as HearingRole) || 'Testemunha');
          setCpf(initialData.cpf || '');
          setRg(initialData.rg || '');
          setPhone(initialData.phone || '');
          setEmail(initialData.email || '');
          setAddress(initialData.address || '');
          setNeighborhood(initialData.neighborhood || '');
          setCity(initialData.city || 'Maracanaú/CE');
          setOfficerName(initialData.officerName || delegadoService.getLastSelectedDelegado());
          setClerkName(initialData.clerkName || getUserInitials(user));
          setModality(initialData.modality || 'Presencial');
          setLocationOrLink(initialData.locationOrLink || (user?.department && user.department.trim()) || 'Sala de Oitivas 01');
          setStatus(initialData.status || 'Agendada');
          setNotes(initialData.notes || '');
          setIntimationSent(Boolean(initialData.intimationSent));
        } else {
          setPersonName('');
          setDate(defaultDate || new Date().toISOString().split('T')[0]);
          setTime('09:30');
          setProcedureNumber('');
          setProcedureType('Inquérito Policial (IP)');
          setRole('Testemunha');
          setCpf('');
          setRg('');
          setPhone('');
          setEmail('');
          setAddress('');
          setNeighborhood('');
          setCity('Maracanaú/CE');
          
          const lastDelegado = delegadoService.getLastSelectedDelegado();
          setOfficerName(lastDelegado);
          
          const initials = getUserInitials(user);
          setClerkName(initials);
          
          setModality('Presencial');
          const defaultLocation = (user?.department && user.department.trim()) ? user.department.trim() : 'Sala de Oitivas 01';
          setLocationOrLink(defaultLocation);
          
          setStatus('Agendada');
          setNotes('');
          setIntimationSent(false);
        }
      }

      setValidationError(null);

      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData, defaultDate, user]);

  // Auto-Save Effect: salva rascunho no localStorage a cada alteração
  useEffect(() => {
    if (!isOpen || isInitialLoadRef.current || isSubmitting) return;

    // Só salva se houver pelo menos algum caractere inserido
    const hasContent = personName || procedureNumber || cpf || phone || address || notes;
    if (!hasContent && !initialData) return;

    const draftKey = getDraftKey();
    const draftPayload = {
      personName,
      date,
      time,
      procedureNumber,
      procedureType,
      role,
      cpf,
      rg,
      phone,
      email,
      address,
      neighborhood,
      city,
      officerName,
      clerkName,
      modality,
      locationOrLink,
      status,
      notes,
      intimationSent,
      savedAt: Date.now()
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draftPayload));
      const nowStr = new Date().toLocaleTimeString('pt-BR');
      setLastAutoSavedTime(nowStr);
    } catch (err) {
      console.warn('Erro ao salvar rascunho automático:', err);
    }
  }, [
    isOpen,
    isSubmitting,
    personName,
    date,
    time,
    procedureNumber,
    procedureType,
    role,
    cpf,
    rg,
    phone,
    email,
    address,
    neighborhood,
    city,
    officerName,
    clerkName,
    modality,
    locationOrLink,
    status,
    notes,
    intimationSent
  ]);

  if (!isOpen) return null;

  const handleSelectDelegado = (delegado: DelegadoInfo) => {
    setOfficerName(delegado.nome);
    delegadoService.setLastSelectedDelegado(delegado.nome);
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Regra explícita: Nenhum campo além do nome é obrigatório!
    if (!personName.trim()) {
      setValidationError('O nome completo da pessoa a ser ouvida é obrigatório.');
      scrollToSection(depoenteSectionRef);
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    // Lembra o delegado escolhido para próximas inserções
    if (officerName.trim()) {
      delegadoService.setLastSelectedDelegado(officerName.trim());
    }

    try {
      await onSave({
        personName: personName.trim(),
        date: date || new Date().toISOString().split('T')[0],
        time: time || '09:00',
        procedureNumber: procedureNumber.trim(),
        procedureType,
        role,
        cpf: cpf.trim(),
        rg: rg.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        officerName: officerName.trim() || delegadoService.getLastSelectedDelegado(),
        clerkName: clerkName.trim(),
        modality,
        locationOrLink: locationOrLink.trim(),
        status,
        notes: notes.trim(),
        intimationSent
      });
      // Limpa rascunho ao salvar com sucesso
      clearCurrentDraft();
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Erro ao salvar oitiva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print"
      >
        <div className={`border-2 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl flex flex-col my-auto transition-colors ${
          isDark
            ? 'bg-[#120f1e] border-purple-600/70 shadow-purple-950/90'
            : 'bg-white border-slate-300 shadow-2xl'
        }`}>
          
          {/* Header Superior Fixo */}
          <div className={`p-4 sm:p-5 border-b-2 flex items-center justify-between shrink-0 transition-colors ${
            isDark
              ? 'bg-[#161226] border-purple-900/50'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-md transition-colors ${
                isDark
                  ? 'bg-gradient-to-br from-purple-600 to-purple-950 border-purple-400/60 text-purple-200'
                  : 'bg-purple-100 border-purple-300 text-purple-950'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {initialData ? 'Editar Agendamento de Oitiva' : 'Nova Marcação de Oitiva'}
                  </h2>
                  <span className={`hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    isDark
                      ? 'bg-purple-950/80 text-purple-300 border-purple-700/50'
                      : 'bg-purple-100 text-purple-950 border-purple-300 font-bold'
                  }`}>
                    Formulário Unificado
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                  Preencha todas as informações do depoente, agendamento e procedimento na mesma tela
                </p>
              </div>
            </div>

            {/* Ações do Header: Auto-Save, Botão Salvar e Botão Fechar */}
            <div className="flex items-center gap-2.5">
              {lastAutoSavedTime && (
                <div className={`hidden lg:flex items-center gap-1.5 text-[11px] font-semibold border px-2.5 py-1 rounded-lg shadow-sm ${
                  isDark
                    ? 'text-emerald-300 bg-emerald-950/70 border-emerald-400/50'
                    : 'text-emerald-950 bg-emerald-100 border-emerald-300 font-bold'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`}></span>
                  <span>Auto-Save {lastAutoSavedTime}</span>
                </div>
              )}

              <button
                id="btn-save-oitiva-header"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e as any);
                }}
                disabled={isSubmitting}
                className={`flex items-center gap-1.5 px-4 py-2 border-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-95 ${
                  isDark
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/80 shadow-md shadow-emerald-950/60'
                    : 'bg-emerald-200 hover:bg-emerald-300 text-emerald-950 border-emerald-500 shadow-sm font-black'
                }`}
                title="Salvar Oitiva Imediatamente"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Salvar Oitiva')}</span>
              </button>

              <button
                id="btn-close-oitiva-modal"
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'text-zinc-300 hover:text-white rounded-xl hover:bg-purple-950/60 border-purple-900/40 hover:border-purple-500/50'
                    : 'text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 border-slate-300'
                }`}
                title="Fechar Janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick-Jump Section Navigator (Atalhos Rápidos de Rolagem) */}
          <div className={`px-4 sm:px-6 py-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto shrink-0 scrollbar-none transition-colors ${
            isDark
              ? 'bg-[#140f23] border-purple-900/40'
              : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1 hidden sm:flex ${
                isDark ? 'text-zinc-400' : 'text-slate-700'
              }`}>
                <Compass className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                <span>Seções:</span>
              </span>

              {/* Botão Atalho Seção 1 - Roxo */}
              <button
                type="button"
                onClick={() => scrollToSection(depoenteSectionRef)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 shadow-sm ${
                  isDark
                    ? 'bg-[#1d1633] hover:bg-purple-950/90 text-purple-200 hover:text-white border-purple-500/50 hover:border-purple-400'
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <User className={`w-3.5 h-3.5 ${isDark ? 'text-purple-300' : 'text-purple-800'}`} />
                <span>1. Depoente / Pessoa</span>
              </button>

              {/* Botão Atalho Seção 2 - Verde Esmeralda */}
              <button
                type="button"
                onClick={() => scrollToSection(agendamentoSectionRef)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 shadow-sm ${
                  isDark
                    ? 'bg-[#11241f] hover:bg-emerald-950/90 text-emerald-200 hover:text-white border-emerald-500/50 hover:border-emerald-400'
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <CalendarIcon className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`} />
                <span>2. Data & Local</span>
              </button>

              {/* Botão Atalho Seção 3 - Âmbar */}
              <button
                type="button"
                onClick={() => scrollToSection(procedimentoSectionRef)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 shadow-sm ${
                  isDark
                    ? 'bg-[#261d11] hover:bg-amber-950/90 text-amber-200 hover:text-white border-amber-500/50 hover:border-amber-400'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <Shield className={`w-3.5 h-3.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`} />
                <span>3. Procedimento & DPC</span>
              </button>
            </div>

            <div className={`text-[11px] hidden md:block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              * Apenas o <span className={`font-bold ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>Nome Completo</span> é obrigatório
            </div>
          </div>

          {/* Draft Recovery Notification Banner */}
          {hasRecoveredDraft && (
            <div className={`mx-4 sm:mx-6 mt-3 px-3.5 py-2 border-2 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-md ${
              isDark
                ? 'bg-[#201538] border-purple-500/80 text-purple-200'
                : 'bg-purple-50 border-purple-300 text-purple-950'
            }`}>
              <div className="flex items-center gap-2">
                <RotateCcw className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-300' : 'text-purple-700'}`} />
                <span>
                  <strong>Rascunho recuperado automaticamente</strong> {draftSavedAt ? `(salvo às ${draftSavedAt})` : ''}. Seus dados digitados foram preservados.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 shadow-sm border ${
                  isDark
                    ? 'bg-purple-900/90 hover:bg-rose-900 text-purple-200 hover:text-white border-purple-400/60 hover:border-rose-400'
                    : 'bg-purple-100 hover:bg-rose-100 text-purple-950 hover:text-rose-950 border-purple-300 hover:border-rose-300'
                }`}
                title="Descartar rascunho e recarregar dados originais"
              >
                Descartar Rascunho
              </button>
            </div>
          )}

          {/* Validation Error Alert */}
          {validationError && (
            <div className={`mx-4 sm:mx-6 mt-3 p-3 border-2 rounded-xl flex items-center gap-2 text-xs shadow-lg ${
              isDark
                ? 'bg-red-950/90 border-red-500/70 text-red-200 shadow-red-950/50'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-semibold">{validationError}</span>
            </div>
          )}

          {/* Form Body - Visualização Unificada de Todas as Informações */}
          <form 
            onSubmit={handleSubmit} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                e.preventDefault();
              }
            }}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
          >
            
            {/* ========================================================
                BLOCO 1: DADOS DO DEPOENTE / PESSOA (TEMA ROXO / VIOLETA)
               ======================================================== */}
            <div 
              ref={depoenteSectionRef}
              id="oitiva-modal-bloco-depoente"
              className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 transition-all duration-200 relative ${
                isDark
                  ? 'bg-[#15102a]/85 border-purple-500/60 shadow-purple-950/50 hover:border-purple-400/80'
                  : 'bg-[#faf5ff] border-purple-300 shadow-purple-100 hover:border-purple-400'
              }`}
            >
              {/* Header do Bloco 1 */}
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-purple-800/40' : 'border-purple-200'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-md ${
                    isDark
                      ? 'bg-purple-600/30 border-purple-400/50 text-purple-300'
                      : 'bg-purple-100 border-purple-300 text-purple-900'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span>1. Dados da Pessoa / Depoente</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border normal-case tracking-normal ${
                        isDark
                          ? 'bg-purple-950 text-purple-300 border-purple-400/40'
                          : 'bg-purple-100 text-purple-950 border-purple-300'
                      }`}>
                        Obrigatório: Nome
                      </span>
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      Qualificação civil, condição processual e dados de contato para notificação
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? 'text-purple-300/80 bg-purple-950/60 border-purple-800/40'
                      : 'text-purple-950 bg-purple-100 border-purple-300'
                  }`}>
                    Bloco Depoente
                  </span>
                </div>
              </div>

              {/* Nome Completo (Destaque Principal) */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 flex items-center justify-between ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  <span className="flex items-center gap-1.5">
                    <User className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    <span>Nome Completo da Pessoa a ser Ouvida</span>
                    <span className="text-rose-500 font-black">*</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isDark
                      ? 'text-purple-300 bg-purple-950/80 border-purple-500/40'
                      : 'text-purple-950 bg-purple-100 border-purple-300'
                  }`}>
                    Único Campo Obrigatório
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva Santos"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none font-semibold shadow-inner transition-all border-2 ${
                      isDark
                        ? 'bg-[#0d091d] border-purple-500/70 text-white placeholder-zinc-500 focus:border-purple-300 focus:ring-4 focus:ring-purple-500/30'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:ring-4 focus:ring-purple-100'
                    }`}
                  />
                </div>
              </div>

              {/* Condição / Papel no Procedimento */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                  Condição da Pessoa no Procedimento (Opcional):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {(['Testemunha', 'Vítima', 'Investigado', 'Declarante', 'Representante Legal', 'Informante', 'Perito', 'Outro'] as HearingRole[]).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      title={r}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer truncate text-center shadow-sm ${
                        role === r
                          ? (isDark
                              ? 'bg-purple-600 text-white border-purple-300 shadow-md shadow-purple-900/60 scale-[1.02]'
                              : 'bg-purple-200 text-purple-950 border-purple-600 shadow-md scale-[1.02] font-black')
                          : (isDark
                              ? 'bg-[#100b22] text-zinc-300 border-purple-900/50 hover:text-white hover:bg-purple-950/60 hover:border-purple-600/60'
                              : 'bg-white text-slate-800 border-slate-300 hover:bg-purple-50 hover:text-purple-950 hover:border-purple-400')
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Documentos e Contatos (Grid de 4 Colunas) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    <span>CPF (Opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none font-mono shadow-inner transition-all border ${
                        isDark
                          ? 'bg-[#0d091d] border-purple-900/60 text-white placeholder-zinc-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    <Shield className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    <span>RG / Órgão Emissor</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2008010203 SSP/CE"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner transition-all border ${
                      isDark
                        ? 'bg-[#0d091d] border-purple-900/60 text-white placeholder-zinc-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    <Phone className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    <span>Telefone / WhatsApp</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="(85) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none font-mono shadow-inner transition-all border ${
                        isDark
                          ? 'bg-[#0d091d] border-purple-900/60 text-white placeholder-zinc-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    <Mail className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    <span>E-mail</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="depoente@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner transition-all border ${
                        isDark
                          ? 'bg-[#0d091d] border-purple-900/60 text-white placeholder-zinc-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Endereço Residencial, Bairro e Cidade */}
              <div className={`pt-3 border-t grid grid-cols-1 md:grid-cols-12 gap-3 ${isDark ? 'border-purple-900/40' : 'border-purple-200'}`}>
                <div className="md:col-span-6">
                  <label className={`block text-[11px] font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    <MapPin className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    <span>Endereço Residencial (Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número, complemento"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner transition-all border ${
                      isDark
                        ? 'bg-[#0d091d] border-purple-900/60 text-white placeholder-zinc-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                    }`}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    Bairro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Jereissati"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner transition-all border ${
                      isDark
                        ? 'bg-[#0d091d] border-purple-900/60 text-white placeholder-zinc-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                    }`}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maracanaú/CE"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner transition-all border ${
                      isDark
                        ? 'bg-[#0d091d] border-purple-900/60 text-white placeholder-zinc-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* ========================================================
                BLOCO 2: DATA, HORA & LOCALIZAÇÃO (TEMA ESMERALDA / TEAL)
               ======================================================== */}
            <div 
              ref={agendamentoSectionRef}
              id="oitiva-modal-bloco-agendamento"
              className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 transition-all duration-200 relative ${
                isDark
                  ? 'bg-[#0c1e19]/85 border-emerald-500/60 shadow-emerald-950/50 hover:border-emerald-400/80'
                  : 'bg-[#f0fdf4] border-emerald-300 shadow-emerald-100 hover:border-emerald-400'
              }`}
            >
              {/* Header do Bloco 2 */}
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-emerald-800/40' : 'border-emerald-200'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-md ${
                    isDark
                      ? 'bg-emerald-600/30 border-emerald-400/50 text-emerald-300'
                      : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  }`}>
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span>2. Agendamento & Logística da Oitiva</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border normal-case tracking-normal ${
                        isDark
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-400/40'
                          : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      }`}>
                        Data, Horário & Local
                      </span>
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      Defina a data prevista, horário de designação, modalidade presencial/online e status
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? 'text-emerald-300/80 bg-emerald-950/60 border-emerald-800/40'
                      : 'text-emerald-950 bg-emerald-100 border-emerald-300'
                  }`}>
                    Bloco Agendamento
                  </span>
                </div>
              </div>

              {/* Data, Horário, Modalidade e Status (Grid 4 colunas) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className={`block text-[11px] font-bold mb-1 flex items-center gap-1.5 ${isDark ? 'text-emerald-200' : 'text-slate-900'}`}>
                    <CalendarIcon className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                    <span>Data da Oitiva</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner font-semibold transition-all border-2 ${
                        isDark
                          ? 'bg-[#081512] border-emerald-700/60 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 [color-scheme:dark]'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 [color-scheme:light]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 flex items-center gap-1.5 ${isDark ? 'text-emerald-200' : 'text-slate-900'}`}>
                    <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                    <span>Horário Designado</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none font-mono shadow-inner font-semibold transition-all border-2 ${
                        isDark
                          ? 'bg-[#081512] border-emerald-700/60 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 [color-scheme:dark]'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 [color-scheme:light]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-emerald-200' : 'text-slate-900'}`}>
                    <Video className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                    <span>Modalidade</span>
                  </label>
                  <select
                    value={modality}
                    onChange={(e) => {
                      const mod = e.target.value as HearingModality;
                      setModality(mod);
                      if (mod === 'Videoconferência' && !locationOrLink.includes('http')) {
                        setLocationOrLink('https://meet.google.com/');
                      } else if (mod === 'Presencial' && locationOrLink.includes('http')) {
                        const defaultLoc = (user?.department && user.department.trim()) ? user.department.trim() : 'Sala de Oitivas 01';
                        setLocationOrLink(defaultLoc);
                      }
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner font-medium transition-all border ${
                      isDark
                        ? 'bg-[#081512] border-emerald-800/60 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    }`}
                  >
                    <option value="Presencial">Presencial (Delegacia)</option>
                    <option value="Videoconferência">Videoconferência (Online)</option>
                    <option value="Híbrida">Híbrida</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-emerald-200' : 'text-slate-900'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                    <span>Status Inicial</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as HearingStatus)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner font-medium transition-all border ${
                      isDark
                        ? 'bg-[#081512] border-emerald-800/60 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    }`}
                  >
                    <option value="Agendada">Agendada</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Remarcada">Remarcada</option>
                    <option value="Não Compareceu">Não Compareceu</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Local Físico / Link de Videoconferência & Checkbox de Intimação */}
              <div className={`pt-3 border-t grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center ${isDark ? 'border-emerald-900/40' : 'border-emerald-200'}`}>
                <div className="md:col-span-7">
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[11px] font-semibold flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                      <MapPin className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                      <span>{modality === 'Videoconferência' ? 'Link da Videoconferência' : 'Sala / Cartório / Local Físico'}</span>
                    </label>
                    {user?.department && modality !== 'Videoconferência' && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                        isDark
                          ? 'text-emerald-300 bg-emerald-950/70 border-emerald-800/40'
                          : 'text-emerald-950 bg-emerald-100 border-emerald-300'
                      }`}>
                        Setor: {user.department}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={modality === 'Videoconferência' ? 'https://meet.google.com/...' : 'Ex: Cartório 01 / Sala de Oitivas'}
                    value={locationOrLink}
                    onChange={(e) => setLocationOrLink(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner font-medium transition-all border ${
                      isDark
                        ? 'bg-[#081512] border-emerald-800/60 text-white placeholder-zinc-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    }`}
                  />
                </div>

                <div className="md:col-span-5 pt-1 md:pt-0">
                  <label className={`flex items-center gap-2.5 cursor-pointer text-xs p-2.5 rounded-xl border transition-all shadow-inner ${
                    isDark
                      ? 'bg-[#081512] text-zinc-200 border-emerald-800/50 hover:border-emerald-500/60'
                      : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={intimationSent}
                      onChange={(e) => setIntimationSent(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-800 bg-white cursor-pointer accent-emerald-500"
                    />
                    <div className="flex flex-col">
                      <span className={`font-bold text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>Intimação expedida / entregue</span>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Marque se o intimando já foi devidamente notificado</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* ========================================================
                BLOCO 3: PROCEDIMENTO POLICIAL & DPC (TEMA ÂMBAR / DOURADO)
               ======================================================== */}
            <div 
              ref={procedimentoSectionRef}
              id="oitiva-modal-bloco-procedimento"
              className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 transition-all duration-200 relative ${
                isDark
                  ? 'bg-[#1f170b]/85 border-amber-500/60 shadow-amber-950/50 hover:border-amber-400/80'
                  : 'bg-[#fffbeb] border-amber-300 shadow-amber-100 hover:border-amber-400'
              }`}
            >
              {/* Header do Bloco 3 */}
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-amber-800/40' : 'border-amber-200'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-md ${
                    isDark
                      ? 'bg-amber-600/30 border-amber-400/50 text-amber-300'
                      : 'bg-amber-100 border-amber-300 text-amber-900'
                  }`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <span>3. Procedimento Policial & Autoridade (DPC)</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border normal-case tracking-normal ${
                        isDark
                          ? 'bg-amber-950 text-amber-300 border-amber-400/40'
                          : 'bg-amber-100 text-amber-950 border-amber-300'
                      }`}>
                        Autos & Presidência
                      </span>
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      Vínculo aos autos do inquérito/procedimento, delegado presidente e escrivão responsável
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? 'text-amber-300/80 bg-amber-950/60 border-amber-800/40'
                      : 'text-amber-950 bg-amber-100 border-amber-300'
                  }`}>
                    Bloco Procedimento
                  </span>
                </div>
              </div>

              {/* Tipo de Procedimento, Número e Escrivão (Grid 3 colunas) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className={`block text-[11px] font-bold mb-1 flex items-center gap-1.5 ${isDark ? 'text-amber-200' : 'text-slate-900'}`}>
                    <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                    <span>Tipo de Procedimento</span>
                  </label>
                  <select
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner font-medium transition-all border ${
                      isDark
                        ? 'bg-[#130e06] border-amber-800/60 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    }`}
                  >
                    <option value="Inquérito Policial (IP)">Inquérito Policial (IP)</option>
                    <option value="Termo Circunstanciado de Ocorrência (TCO)">Termo Circunstanciado (TCO)</option>
                    <option value="Auto de Prisão em Flagrante (APF)">Auto de Prisão em Flagrante (APF)</option>
                    <option value="Boletim de Ocorrência (BO)">Boletim de Ocorrência (BO)</option>
                    <option value="Procedimento Administrativo">Procedimento Administrativo</option>
                    <option value="Carta Precatória">Carta Precatória</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 flex items-center gap-1.5 ${isDark ? 'text-amber-200' : 'text-slate-900'}`}>
                    <Shield className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                    <span>Número do Procedimento (Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: IP 123/2026, TCO 045/2026"
                    value={procedureNumber}
                    onChange={(e) => setProcedureNumber(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner font-medium transition-all border ${
                      isDark
                        ? 'bg-[#130e06] border-amber-800/60 text-white placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-200' : 'text-slate-900'}`}>
                      <Building2 className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                      <span>Escrivão(ã) / Cartório</span>
                    </label>
                    {user && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                        isDark
                          ? 'text-amber-300 bg-amber-950/70 border-amber-700/50'
                          : 'text-amber-950 bg-amber-100 border-amber-300'
                      }`}>
                        Iniciais: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{getUserInitials(user) || 'M.S'}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: M.V.S ou Escrivão Fulano"
                    value={clerkName}
                    onChange={(e) => setClerkName(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none shadow-inner font-medium transition-all border ${
                      isDark
                        ? 'bg-[#130e06] border-amber-800/60 text-white placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    }`}
                  />
                </div>
              </div>

              {/* Delegado / Autoridade Policial (DPC) com Seletor Rápido */}
              <div className={`pt-3 border-t ${isDark ? 'border-amber-900/40' : 'border-amber-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-200' : 'text-slate-900'}`}>
                    <FileBadge className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                    <span>Autoridade Policial / Delegado(a) de Polícia Civil (DPC)</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsDelegadoModalOpen(true)}
                    className={`text-[11px] font-bold flex items-center gap-1.5 border px-3 py-1 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                      isDark
                        ? 'text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50'
                        : 'text-amber-950 hover:bg-amber-200 bg-amber-100 border-amber-400 font-bold'
                    }`}
                    title="Abrir catálogo completo de Delegados da Unidade"
                  >
                    <UserCheck className={`w-3.5 h-3.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`} />
                    <span>Selecionar no Catálogo de Delegados</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: Fernando Moretto Nachtigall"
                    value={officerName}
                    onChange={(e) => {
                      setOfficerName(e.target.value);
                      if (e.target.value.trim()) {
                        delegadoService.setLastSelectedDelegado(e.target.value.trim());
                      }
                    }}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none shadow-inner font-medium transition-all border ${
                      isDark
                        ? 'bg-[#130e06] border-amber-800/60 text-white placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    }`}
                  />
                </div>
              </div>

              {/* Observações / Anotações Complementares */}
              <div className="pt-2">
                <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-amber-200' : 'text-slate-900'}`}>
                  Observações / Anotações Complementares
                </label>
                <textarea
                  rows={2}
                  placeholder="Instruções para a oitiva, necessidade de advogado, documentos a apresentar, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full rounded-xl p-3 text-xs focus:outline-none resize-none shadow-inner font-medium transition-all border ${
                    isDark
                      ? 'bg-[#130e06] border-amber-800/60 text-white placeholder-zinc-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  }`}
                />
              </div>
            </div>

            {/* Rodapé Interno do Formulário com Ações Finais */}
            <div className={`pt-4 border-t-2 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
              isDark ? 'border-purple-900/50' : 'border-slate-200'
            }`}>
              <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                <Sparkles className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                <span>Todos os blocos são salvos simultaneamente em tempo real.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-2 ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600/70 hover:border-zinc-500'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  Cancelar
                </button>

                <button
                  id="btn-save-oitiva-footer"
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-95 border-2 ${
                    isDark
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white border-emerald-400/80 shadow-xl shadow-emerald-950/70'
                      : 'bg-emerald-200 hover:bg-emerald-300 text-emerald-950 border-emerald-500 shadow-md font-black'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Salvar Oitiva')}</span>
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>

      {/* Modal Seletor de Delegados */}
      <DelegadoSelectorModal
        isOpen={isDelegadoModalOpen}
        onClose={() => setIsDelegadoModalOpen(false)}
        onSelectDelegado={handleSelectDelegado}
        currentSelectedNome={officerName}
        user={user}
      />
    </>
  );
};
