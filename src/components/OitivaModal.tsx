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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2
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
  const [activeTab, setActiveTab] = useState<'depoente' | 'procedimento' | 'agendamento'>('depoente');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDelegadoModalOpen, setIsDelegadoModalOpen] = useState(false);

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
      setActiveTab('depoente');

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

  const handleGoNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTab === 'depoente') {
      setActiveTab('agendamento');
    } else if (activeTab === 'agendamento') {
      setActiveTab('procedimento');
    }
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTab === 'procedimento') {
      setActiveTab('agendamento');
    } else if (activeTab === 'agendamento') {
      setActiveTab('depoente');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Regra explícita: Nenhum campo além do nome é obrigatório!
    if (!personName.trim()) {
      setValidationError('O nome completo da pessoa a ser ouvida é obrigatório.');
      setActiveTab('depoente');
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
        // Note: Backdrop click close removed per explicit user requirement - closes only via X or button
      >
        <div className="bg-[#120f1e] border-2 border-purple-600/60 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl shadow-purple-950/90 my-auto flex flex-col">
          
          {/* Header */}
          <div className="p-5 border-b-2 border-purple-900/50 bg-[#161226] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 border-2 border-purple-400/60 flex items-center justify-center text-purple-200 shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {initialData ? 'Editar Agendamento de Oitiva' : 'Nova Marcação de Oitiva'}
                </h2>
                <p className="text-xs text-zinc-300">
                  Cadastre ou atualize os dados da oitiva policial e intime com facilidade
                </p>
              </div>
            </div>

            {/* Ações do Header: Botão Salvar sempre visível ao lado do botão Fechar (X) */}
            <div className="flex items-center gap-2.5">
              {lastAutoSavedTime && (
                <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-300 font-semibold bg-emerald-950/70 border border-emerald-400/50 px-2.5 py-1 rounded-lg shadow-sm">
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
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-400/80 rounded-xl text-xs font-bold shadow-md shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50"
                title="Salvar Oitiva (Acesso Imediato)"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Salvar Oitiva')}</span>
              </button>

              <button
                id="btn-close-oitiva-modal"
                type="button"
                onClick={onClose}
                className="p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-purple-950/60 border border-purple-900/40 hover:border-purple-500/50 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Draft Recovery Notification Banner */}
          {hasRecoveredDraft && (
            <div className="mx-6 mt-3 px-3.5 py-2 bg-[#201538] border-2 border-purple-500/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-purple-200 shadow-md">
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
            <div className="mx-6 mt-4 p-3 bg-red-950/80 border-2 border-red-500/60 rounded-xl flex items-center gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="px-6 pt-4 pb-2 border-b border-purple-900/40 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('depoente')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                activeTab === 'depoente'
                  ? 'bg-purple-600 text-white border-purple-300 shadow-md shadow-purple-900/60'
                  : 'bg-[#171326] text-zinc-300 hover:text-white border-purple-900/60 hover:border-purple-600/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Pessoa / Depoente *</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('agendamento')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                activeTab === 'agendamento'
                  ? 'bg-purple-600 text-white border-purple-300 shadow-md shadow-purple-900/60'
                  : 'bg-[#171326] text-zinc-300 hover:text-white border-purple-900/60 hover:border-purple-600/60'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-purple-300" />
              <span>2. Data, Hora & Local</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('procedimento')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                activeTab === 'procedimento'
                  ? 'bg-purple-600 text-white border-purple-300 shadow-md shadow-purple-900/60'
                  : 'bg-[#171326] text-zinc-300 hover:text-white border-purple-900/60 hover:border-purple-600/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>3. Procedimento & DPC</span>
            </button>
          </div>

          {/* Form Body */}
          <form 
            onSubmit={handleSubmit} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                e.preventDefault();
              }
            }}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            
            {/* TAB 1: DEPOENTE (PESSOA) */}
            {activeTab === 'depoente' && (
              <div className="space-y-4">
                
                {/* Nome Completo (Único Obrigatório) */}
                <div>
                  <label className="block text-xs font-bold text-zinc-200 mb-1">
                    Nome Completo da Pessoa a ser Ouvida <span className="text-purple-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva Santos"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none ring-0 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    * Este é o único campo obrigatório para salvar a marcação.
                  </p>
                </div>

                {/* Qualificação / Papel - COMPACTO */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Condição da Pessoa no Procedimento (Opcional)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
                    {(['Testemunha', 'Vítima', 'Investigado', 'Declarante', 'Representante Legal', 'Informante', 'Perito', 'Outro'] as HearingRole[]).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        title={r}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer truncate text-center ${
                          role === r
                            ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-900/50'
                            : 'bg-[#171326] text-zinc-400 border-purple-900/40 hover:text-zinc-200 hover:border-purple-700/50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CPF, RG, Telefone, E-mail em grid de 4 colunas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      CPF (Opcional)
                    </label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      RG / Órgão Emissor (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 2008010203 SSP/CE"
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Telefone / WhatsApp (Opcional)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="(85) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      E-mail (Opcional)
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        placeholder="depoente@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço & Bairro & Cidade */}
                <div className="pt-2 border-t border-purple-900/20 grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Endereço Residencial (Opcional)
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Rua, número, complemento"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Jereissati"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Cidade / UF
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Maracanaú/CE"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: AGENDAMENTO (DATA & LOCAL) */}
            {activeTab === 'agendamento' && (
              <div className="space-y-3.5">
                
                {/* Data, Horário, Modalidade e Status em grid de 4 colunas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-200 mb-1 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-purple-300" />
                      <span>Data da Oitiva</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-purple-950/80 border border-purple-800/40 text-purple-300 pointer-events-none flex items-center justify-center">
                        <CalendarIcon className="w-3 h-3 text-purple-300" />
                      </div>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-2.5 py-2 text-xs text-white focus:outline-none [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-200 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-300" />
                      <span>Horário</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-purple-950/80 border border-purple-800/40 text-purple-300 pointer-events-none flex items-center justify-center">
                        <Clock className="w-3 h-3 text-purple-300" />
                      </div>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-2.5 py-2 text-xs text-white focus:outline-none font-mono [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Modalidade
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
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Videoconferência">Videoconferência</option>
                      <option value="Híbrida">Híbrida</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Status Inicial
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as HearingStatus)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="Agendada">Agendada</option>
                      <option value="Realizada">Realizada</option>
                      <option value="Remarcada">Remarcada</option>
                      <option value="Não Compareceu">Não Compareceu</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                {/* Sala / Link & Checkbox */}
                <div className="pt-2 border-t border-purple-900/20 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-7">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        <span>{modality === 'Videoconferência' ? 'Link da Videoconferência' : 'Sala / Local Físico'}</span>
                      </label>
                      {user?.department && modality !== 'Videoconferência' && (
                        <span className="text-[10px] text-purple-300 font-medium bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-800/40">
                          Setor: {user.department}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={modality === 'Videoconferência' ? 'https://meet.google.com/...' : 'Ex: Cartório 01 / Sala de Oitivas'}
                      value={locationOrLink}
                      onChange={(e) => setLocationOrLink(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-5 pt-4 md:pt-0">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 bg-[#171326] p-2.5 rounded-xl border border-purple-900/30 hover:border-purple-500/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={intimationSent}
                        onChange={(e) => setIntimationSent(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-purple-900 bg-zinc-900 cursor-pointer"
                      />
                      <span className="font-medium text-[11px]">Intimação já expedida / entregue</span>
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: PROCEDIMENTO & NOTAS */}
            {activeTab === 'procedimento' && (
              <div className="space-y-3.5">
                
                {/* Número do Procedimento & Tipo & Escrivão */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Tipo de Procedimento
                    </label>
                    <select
                      value={procedureType}
                      onChange={(e) => setProcedureType(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
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
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Número do Procedimento (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: IP 123/2026, TCO 045/2026"
                      value={procedureNumber}
                      onChange={(e) => setProcedureNumber(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-zinc-300">
                        Escrivão(ã) / Cartório
                      </label>
                      {user && (
                        <span className="text-[10px] text-purple-300 font-medium">
                          Iniciais: <strong className="text-white">{getUserInitials(user) || 'M.S'}</strong>
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: M.V.S ou Escrivão Fulano"
                      value={clerkName}
                      onChange={(e) => setClerkName(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Delegado (com Seletor Modal DPC) */}
                <div className="pt-2 border-t border-purple-900/20">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                      <FileBadge className="w-3.5 h-3.5 text-amber-400" />
                      <span>Autoridade Policial / Delegado(a) (DPC)</span>
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => setIsDelegadoModalOpen(true)}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Abrir catálogo de Delegados da Unidade"
                    >
                      <UserCheck className="w-3 h-3" />
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
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Observações / Notas */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Observações / Anotações Complementares
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instruções para a oitiva, necessidade de advogado, documentos a apresentar, etc..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
                  />
                </div>

              </div>
            )}

            {/* Form Actions */}
            <div className="pt-4 border-t-2 border-purple-900/50 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-2 border-zinc-600/70 hover:border-zinc-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                {/* Botão Retornar (navega para a aba anterior) */}
                <button
                  id="btn-tab-retornar"
                  type="button"
                  onClick={handleGoBack}
                  disabled={activeTab === 'depoente'}
                  className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                    activeTab === 'depoente'
                      ? 'bg-zinc-900/40 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-40'
                      : 'bg-[#171326] hover:bg-purple-950 text-purple-200 hover:text-white border-purple-600/70 hover:border-purple-400 cursor-pointer shadow-sm'
                  }`}
                  title="Retornar para a aba anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Retornar</span>
                </button>

                {/* Botão Avançar (navega para a próxima aba) */}
                {activeTab !== 'procedimento' ? (
                  <button
                    id="btn-tab-avancar"
                    type="button"
                    onClick={handleGoNext}
                    className="flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white border-2 border-purple-300 rounded-xl text-xs font-bold shadow-md shadow-purple-900/60 hover:shadow-lg transition-all cursor-pointer"
                    title="Avançar para a próxima aba"
                  >
                    <span>Avançar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="btn-save-oitiva-footer"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 via-purple-600 to-purple-700 hover:from-emerald-500 hover:to-purple-600 text-white border-2 border-emerald-400/80 rounded-xl text-xs font-bold shadow-lg shadow-purple-900/60 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Salvar Oitiva')}</span>
                  </button>
                )}
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
