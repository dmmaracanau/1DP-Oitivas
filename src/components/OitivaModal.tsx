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
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto no-print"
      >
        <div className="bg-[#120f1e] border-2 border-purple-600/70 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl shadow-purple-950/90 my-auto flex flex-col">
          
          {/* Header Superior Fixo */}
          <div className="p-4 sm:p-5 border-b-2 border-purple-900/50 bg-[#161226] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 border-2 border-purple-400/60 flex items-center justify-center text-purple-200 shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {initialData ? 'Editar Agendamento de Oitiva' : 'Nova Marcação de Oitiva'}
                  </h2>
                  <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/50 uppercase tracking-wider">
                    Formulário Unificado
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Preencha todas as informações do depoente, agendamento e procedimento na mesma tela
                </p>
              </div>
            </div>

            {/* Ações do Header: Auto-Save, Botão Salvar e Botão Fechar */}
            <div className="flex items-center gap-2.5">
              {lastAutoSavedTime && (
                <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-300 font-semibold bg-emerald-950/70 border border-emerald-400/50 px-2.5 py-1 rounded-lg shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
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
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-400/80 rounded-xl text-xs font-bold shadow-md shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                title="Salvar Oitiva Imediatamente"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Salvar Oitiva')}</span>
              </button>

              <button
                id="btn-close-oitiva-modal"
                type="button"
                onClick={onClose}
                className="p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-purple-950/60 border border-purple-900/40 hover:border-purple-500/50 transition-colors cursor-pointer"
                title="Fechar Janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick-Jump Section Navigator (Atalhos Rápidos de Rolagem) */}
          <div className="px-4 sm:px-6 py-2.5 bg-[#140f23] border-b border-purple-900/40 flex items-center justify-between gap-2 overflow-x-auto shrink-0 scrollbar-none">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1 hidden sm:flex">
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>Seções:</span>
              </span>

              {/* Botão Atalho Seção 1 - Roxo */}
              <button
                type="button"
                onClick={() => scrollToSection(depoenteSectionRef)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1d1633] hover:bg-purple-950/90 text-purple-200 hover:text-white border border-purple-500/50 hover:border-purple-400 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
                <User className="w-3.5 h-3.5 text-purple-300" />
                <span>1. Depoente / Pessoa</span>
              </button>

              {/* Botão Atalho Seção 2 - Verde Esmeralda */}
              <button
                type="button"
                onClick={() => scrollToSection(agendamentoSectionRef)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#11241f] hover:bg-emerald-950/90 text-emerald-200 hover:text-white border border-emerald-500/50 hover:border-emerald-400 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-300" />
                <span>2. Data & Local</span>
              </button>

              {/* Botão Atalho Seção 3 - Âmbar */}
              <button
                type="button"
                onClick={() => scrollToSection(procedimentoSectionRef)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#261d11] hover:bg-amber-950/90 text-amber-200 hover:text-white border border-amber-500/50 hover:border-amber-400 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                <span>3. Procedimento & DPC</span>
              </button>
            </div>

            <div className="text-[11px] text-zinc-400 hidden md:block">
              * Apenas o <span className="text-purple-300 font-bold">Nome Completo</span> é obrigatório
            </div>
          </div>

          {/* Draft Recovery Notification Banner */}
          {hasRecoveredDraft && (
            <div className="mx-4 sm:mx-6 mt-3 px-3.5 py-2 bg-[#201538] border-2 border-purple-500/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-purple-200 shadow-md">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-300 shrink-0" />
                <span>
                  <strong>Rascunho recuperado automaticamente</strong> {draftSavedAt ? `(salvo às ${draftSavedAt})` : ''}. Seus dados digitados foram preservados.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-2.5 py-1 bg-purple-900/90 hover:bg-rose-900 text-purple-200 hover:text-white border border-purple-400/60 hover:border-rose-400 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 shadow-sm"
                title="Descartar rascunho e recarregar dados originais"
              >
                Descartar Rascunho
              </button>
            </div>
          )}

          {/* Validation Error Alert */}
          {validationError && (
            <div className="mx-4 sm:mx-6 mt-3 p-3 bg-red-950/90 border-2 border-red-500/70 rounded-xl flex items-center gap-2 text-xs text-red-200 shadow-lg shadow-red-950/50">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
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
              className="bg-[#15102a]/85 border-2 border-purple-500/60 rounded-2xl p-4 sm:p-5 shadow-xl shadow-purple-950/50 space-y-4 transition-all duration-200 hover:border-purple-400/80 relative"
            >
              {/* Header do Bloco 1 */}
              <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>1. Dados da Pessoa / Depoente</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-400/40 normal-case tracking-normal">
                        Obrigatório: Nome
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-300">
                      Qualificação civil, condição processual e dados de contato para notificação
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[11px] font-semibold text-purple-300/80 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/40">
                    Bloco Depoente
                  </span>
                </div>
              </div>

              {/* Nome Completo (Destaque Principal) */}
              <div>
                <label className="block text-xs font-bold text-zinc-100 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>Nome Completo da Pessoa a ser Ouvida</span>
                    <span className="text-rose-400 font-black">*</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
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
                    className="w-full bg-[#0d091d] border-2 border-purple-500/70 focus:border-purple-300 focus:ring-4 focus:ring-purple-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none font-semibold shadow-inner transition-all"
                  />
                </div>
              </div>

              {/* Condição / Papel no Procedimento */}
              <div>
                <label className="block text-xs font-semibold text-zinc-200 mb-2">
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
                          ? 'bg-purple-600 text-white border-purple-300 shadow-md shadow-purple-900/60 scale-[1.02]'
                          : 'bg-[#100b22] text-zinc-300 border-purple-900/50 hover:text-white hover:bg-purple-950/60 hover:border-purple-600/60'
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
                  <label className="block text-[11px] font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>CPF (Opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className="w-full bg-[#0d091d] border border-purple-900/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono shadow-inner transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>RG / Órgão Emissor</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2008010203 SSP/CE"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    className="w-full bg-[#0d091d] border border-purple-900/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-purple-400" />
                    <span>Telefone / WhatsApp</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="(85) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="w-full bg-[#0d091d] border border-purple-900/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono shadow-inner transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    <span>E-mail</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="depoente@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0d091d] border border-purple-900/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço Residencial, Bairro e Cidade */}
              <div className="pt-3 border-t border-purple-900/40 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6">
                  <label className="block text-[11px] font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>Endereço Residencial (Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número, complemento"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#0d091d] border border-purple-900/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner transition-all"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-semibold text-zinc-200 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Jereissati"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full bg-[#0d091d] border border-purple-900/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner transition-all"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-semibold text-zinc-200 mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maracanaú/CE"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#0d091d] border border-purple-900/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================
                BLOCO 2: DATA, HORA & LOCALIZAÇÃO (TEMA ESMERALDA / TEAL)
               ======================================================== */}
            <div 
              ref={agendamentoSectionRef}
              className="bg-[#0c1e19]/85 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-5 shadow-xl shadow-emerald-950/50 space-y-4 transition-all duration-200 hover:border-emerald-400/80 relative"
            >
              {/* Header do Bloco 2 */}
              <div className="flex items-center justify-between pb-3 border-b border-emerald-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-md">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>2. Agendamento & Logística da Oitiva</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-400/40 normal-case tracking-normal">
                        Data, Horário & Local
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-300">
                      Defina a data prevista, horário de designação, modalidade presencial/online e status
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[11px] font-semibold text-emerald-300/80 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                    Bloco Agendamento
                  </span>
                </div>
              </div>

              {/* Data, Horário, Modalidade e Status (Grid 4 colunas) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200 mb-1 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Data da Oitiva</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#081512] border-2 border-emerald-700/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark] shadow-inner font-semibold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-200 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Horário Designado</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-[#081512] border-2 border-emerald-700/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono [color-scheme:dark] shadow-inner font-semibold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-200 mb-1 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
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
                    className="w-full bg-[#081512] border border-emerald-800/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none shadow-inner font-medium transition-all"
                  >
                    <option value="Presencial">Presencial (Delegacia)</option>
                    <option value="Videoconferência">Videoconferência (Online)</option>
                    <option value="Híbrida">Híbrida</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Status Inicial</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as HearingStatus)}
                    className="w-full bg-[#081512] border border-emerald-800/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none shadow-inner font-medium transition-all"
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
              <div className="pt-3 border-t border-emerald-900/40 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                <div className="md:col-span-7">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{modality === 'Videoconferência' ? 'Link da Videoconferência' : 'Sala / Cartório / Local Físico'}</span>
                    </label>
                    {user?.department && modality !== 'Videoconferência' && (
                      <span className="text-[10px] text-emerald-300 font-medium bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-800/40">
                        Setor: {user.department}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={modality === 'Videoconferência' ? 'https://meet.google.com/...' : 'Ex: Cartório 01 / Sala de Oitivas'}
                    value={locationOrLink}
                    onChange={(e) => setLocationOrLink(e.target.value)}
                    className="w-full bg-[#081512] border border-emerald-800/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner font-medium transition-all"
                  />
                </div>

                <div className="md:col-span-5 pt-1 md:pt-0">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-200 bg-[#081512] p-2.5 rounded-xl border border-emerald-800/50 hover:border-emerald-500/60 transition-all shadow-inner">
                    <input
                      type="checkbox"
                      checked={intimationSent}
                      onChange={(e) => setIntimationSent(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-800 bg-zinc-900 cursor-pointer accent-emerald-500"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-[11px] text-white">Intimação expedida / entregue</span>
                      <span className="text-[10px] text-zinc-400">Marque se o intimando já foi devidamente notificado</span>
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
              className="bg-[#1f170b]/85 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 shadow-xl shadow-amber-950/50 space-y-4 transition-all duration-200 hover:border-amber-400/80 relative"
            >
              {/* Header do Bloco 3 */}
              <div className="flex items-center justify-between pb-3 border-b border-amber-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-md">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>3. Procedimento Policial & Autoridade (DPC)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-400/40 normal-case tracking-normal">
                        Autos & Presidência
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-300">
                      Vínculo aos autos do inquérito/procedimento, delegado presidente e escrivão responsável
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[11px] font-semibold text-amber-300/80 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/40">
                    Bloco Procedimento
                  </span>
                </div>
              </div>

              {/* Tipo de Procedimento, Número e Escrivão (Grid 3 colunas) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-200 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tipo de Procedimento</span>
                  </label>
                  <select
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value)}
                    className="w-full bg-[#130e06] border border-amber-800/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none shadow-inner font-medium transition-all"
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
                  <label className="block text-[11px] font-semibold text-amber-200 mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Número do Procedimento (Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: IP 123/2026, TCO 045/2026"
                    value={procedureNumber}
                    onChange={(e) => setProcedureNumber(e.target.value)}
                    className="w-full bg-[#130e06] border border-amber-800/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner font-medium transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-amber-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Escrivão(ã) / Cartório</span>
                    </label>
                    {user && (
                      <span className="text-[10px] text-amber-300 font-medium bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-700/50">
                        Iniciais: <strong className="text-white">{getUserInitials(user) || 'M.S'}</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: M.V.S ou Escrivão Fulano"
                    value={clerkName}
                    onChange={(e) => setClerkName(e.target.value)}
                    className="w-full bg-[#130e06] border border-amber-800/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner font-medium transition-all"
                  />
                </div>
              </div>

              {/* Delegado / Autoridade Policial (DPC) com Seletor Rápido */}
              <div className="pt-3 border-t border-amber-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-[11px] font-semibold text-amber-200 flex items-center gap-1.5">
                    <FileBadge className="w-4 h-4 text-amber-400" />
                    <span>Autoridade Policial / Delegado(a) de Polícia Civil (DPC)</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsDelegadoModalOpen(true)}
                    className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                    title="Abrir catálogo completo de Delegados da Unidade"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-300" />
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
                    className="w-full bg-[#130e06] border border-amber-800/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none shadow-inner font-medium transition-all"
                  />
                </div>
              </div>

              {/* Observações / Anotações Complementares */}
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-amber-200 mb-1">
                  Observações / Anotações Complementares
                </label>
                <textarea
                  rows={2}
                  placeholder="Instruções para a oitiva, necessidade de advogado, documentos a apresentar, etc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#130e06] border border-amber-800/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none shadow-inner font-medium transition-all"
                />
              </div>
            </div>

            {/* Rodapé Interno do Formulário com Ações Finais */}
            <div className="pt-4 border-t-2 border-purple-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Todos os blocos são salvos simultaneamente em tempo real.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-2 border-zinc-600/70 hover:border-zinc-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  id="btn-save-oitiva-footer"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white border-2 border-emerald-400/80 rounded-xl text-xs font-bold shadow-xl shadow-emerald-950/70 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-95"
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
