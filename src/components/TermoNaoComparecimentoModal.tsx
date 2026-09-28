import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Check, 
  AlertTriangle, 
  User, 
  UserCheck,
  ShieldCheck, 
  Building2, 
  Copy, 
  Calendar as CalendarIcon, 
  Clock, 
  UserX,
  FileCheck,
  Plus,
  Trash2,
  History
} from 'lucide-react';
import { Oitiva, UserProfile } from '../types/oitiva';
import { delegadoService, DelegadoInfo } from '../services/delegadoService';
import { authService } from '../services/authService';
import { 
  formatDateExtenso, 
  formatAddressCompleto, 
  formatDateBR,
  extractOitivaScheduleAttempts,
  OitivaScheduleAttempt
} from '../utils/formatters';
import { 
  TermoNaoComparecimentoPdfData, 
  downloadTermoNaoComparecimentoPdf 
} from '../utils/pdfGenerator';
import { OfficialCeHeader } from './OfficialCeHeader';

interface TermoNaoComparecimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitiva: Oitiva | null;
  allOitivas?: Oitiva[];
  user?: UserProfile | null;
  onMarkStatusAsAbsent?: (oitivaId: string) => Promise<void> | void;
}

const MOTIVOS_PREDEFINIDOS = [
  {
    label: 'Não Compareceu sem Justificativa',
    value: 'Não compareceu na data e horário designados (Ausência injustificada)',
    defaultText: 'A pessoa intimada, conquanto regularmente intimada para comparecer perante esta Autoridade Policial a fim de prestar depoimento nos autos do procedimento em epígrafe, DEIXOU DE COMPARECER no dia e horário aprazados, não apresentando qualquer justificativa legal até o presente momento.'
  },
  {
    label: 'Pessoa Não Encontrada / Não Localizada',
    value: 'Pessoa não foi encontrada no endereço informado',
    defaultText: 'Em diligência no endereço indicado no mandado de intimação, o(a) intimando(a) NÃO FOI ENCONTRADO(A), não sendo possível efetivar a entrega do mandado ou obter ciência formal da data de oitiva.'
  },
  {
    label: 'Mora em Outro Estado / Comarca Diversa',
    value: 'Reside em outro Estado / Comarca diversa',
    defaultText: 'Restou apurado e certificado pela equipe policial que a pessoa intimanda atualmente RESIDE EM OUTRO ESTADO DA FEDERAÇÃO / COMARCA DIVERSA, inviabilizando o comparecimento presencial perante esta circunscrição policial na data designada sem expedição de Carta Precatória.'
  },
  {
    label: 'Endereço Inexistente / Insuficiente',
    value: 'Endereço inexistente ou insuficiente',
    defaultText: 'O endereço constante nos autos mostrou-se INEXISTENTE OU INSUFICIENTE para a localização do intimando, frustrando o cumprimento do mandado intimatório.'
  },
  {
    label: 'Recusou-se a Receber a Intimação',
    value: 'Recusou-se a receber a intimação ou a apor o ciente',
    defaultText: 'O(A) intimando(a) foi devidamente localizado(a), contudo RECUSOU-SE a receber a cópia do mandado de intimação e/ou apor a sua assinatura na contra-fé, ciente de seu dever legal de comparecimento.'
  },
  {
    label: 'Mudou-se de Endereço',
    value: 'Mudou-se para local ignorado / desconhecido',
    defaultText: 'Foi informado por vizinhos e/ou atuais moradores do local que o intimando MUDOU-SE para paradeiro ignorado, não sendo obtidos novos dados de contato ou endereço atualizado.'
  },
  {
    label: 'Outro Motivo (Personalizado)',
    value: 'Outro motivo circunstanciado',
    defaultText: ''
  }
];

export const TermoNaoComparecimentoModal: React.FC<TermoNaoComparecimentoModalProps> = ({
  isOpen,
  onClose,
  oitiva,
  allOitivas = [],
  user,
  onMarkStatusAsAbsent
}) => {
  const [delegadosList, setDelegadosList] = useState<DelegadoInfo[]>([]);

  // Histórico consolidado de agendamentos e notificações tentadas
  const [scheduleAttempts, setScheduleAttempts] = useState<OitivaScheduleAttempt[]>([]);
  const [showAddAttemptForm, setShowAddAttemptForm] = useState(false);
  const [newAttemptDate, setNewAttemptDate] = useState('');
  const [newAttemptTime, setNewAttemptTime] = useState('09:00');
  const [newAttemptReason, setNewAttemptReason] = useState('Remarcação anterior');

  // Motivo
  const [selectedMotivoCategoria, setSelectedMotivoCategoria] = useState<string>(MOTIVOS_PREDEFINIDOS[0].value);
  const [motivoDetalhado, setMotivoDetalhado] = useState<string>(MOTIVOS_PREDEFINIDOS[0].defaultText);
  
  // Data do Termo (default: hoje)
  const todayYMD = new Date().toISOString().split('T')[0];
  const [termoDate, setTermoDate] = useState<string>(todayYMD);

  // DPC
  const [dpcName, setDpcName] = useState('');
  const [dpcMatricula, setDpcMatricula] = useState('');
  const [dpcCargo, setDpcCargo] = useState('Delegado de Polícia Civil');

  // OIP (Único Oficial Investigador / Escrivão)
  const [oipName, setOipName] = useState('');
  const [oipMatricula, setOipMatricula] = useState('');
  const [oipCargo, setOipCargo] = useState('Oficial de Investigação Policial (OIP)');

  // Estado de geração
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMarkingAbsent, setIsMarkingAbsent] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Carrega catálogo unificado de delegados e OIPs
  useEffect(() => {
    const unsub = delegadoService.subscribeToDelegados((list) => {
      setDelegadosList(list);
    });
    return () => unsub();
  }, []);

  // Preenche dados padrão quando a oitiva é aberta
  useEffect(() => {
    if (!oitiva) return;

    // Extrai todo o histórico de agendamentos e notificações tentadas
    const attempts = extractOitivaScheduleAttempts(oitiva, allOitivas);
    setScheduleAttempts(attempts);
    setShowAddAttemptForm(false);

    // Motivo default
    setSelectedMotivoCategoria(MOTIVOS_PREDEFINIDOS[0].value);
    setMotivoDetalhado(MOTIVOS_PREDEFINIDOS[0].defaultText);
    setTermoDate(todayYMD);

    // DPC: Usa o oficial da oitiva ou o default
    const allDelegados = delegadoService.getDelegados();
    const dpcOfficers = allDelegados.filter(d => d.category === 'dpc' || !d.category || !d.id.startsWith('oip_'));
    const oipOfficers = allDelegados.filter(d => d.category === 'oip' || d.id.startsWith('oip_'));

    const targetDpcName = oitiva.officerName || delegadoService.getLastSelectedDelegado() || 'Fernando Moretto Nachtigall';
    const foundDpc = dpcOfficers.find(d => d.nome.toLowerCase() === targetDpcName.toLowerCase()) || dpcOfficers[0];

    if (foundDpc) {
      setDpcName(foundDpc.nome);
      setDpcMatricula(foundDpc.matricula || '301.942-1-0');
      setDpcCargo(foundDpc.cargo || 'Delegado de Polícia Civil');
    } else {
      setDpcName(targetDpcName);
      setDpcMatricula('301.942-1-0');
      setDpcCargo('Delegado de Polícia Civil');
    }

    // OIP: Usuário logado da conta, escrivão da oitiva ou oficial do catálogo
    const activeUser = user || authService.getCurrentUser();
    const accountUserName = activeUser?.displayName || activeUser?.username || '';
    const accountUserMatricula = activeUser?.registrationNumber || '';
    const accountUserCargo = activeUser?.cargo || (activeUser as any)?.position || 'Oficial de Investigação Policial (OIP)';

    const defaultOipName = accountUserName || oitiva.clerkName || (oipOfficers[0] ? oipOfficers[0].nome : 'Oficial de Investigação Policial');
    const foundOip = oipOfficers.find(o => o.nome.toLowerCase() === defaultOipName.toLowerCase());

    if (accountUserName && defaultOipName.toLowerCase() === accountUserName.toLowerCase()) {
      setOipName(accountUserName);
      setOipMatricula(accountUserMatricula || (foundOip ? foundOip.matricula : ''));
      setOipCargo(accountUserCargo || (foundOip ? foundOip.cargo : 'Oficial de Investigação Policial (OIP)'));
    } else if (foundOip) {
      setOipName(foundOip.nome);
      setOipMatricula(foundOip.matricula || '');
      setOipCargo(foundOip.cargo || 'Oficial de Investigação Policial (OIP)');
    } else {
      setOipName(defaultOipName);
      setOipMatricula(accountUserMatricula || '');
      setOipCargo(accountUserCargo || 'Oficial de Investigação Policial (OIP)');
    }
  }, [oitiva, user, isOpen]);

  if (!isOpen || !oitiva) return null;

  const handleAddAttempt = () => {
    if (!newAttemptDate) return;
    const cleanTime = (newAttemptTime || '09:00').trim().replace(/h$/i, '');
    const newEntry: OitivaScheduleAttempt = {
      order: scheduleAttempts.length + 1,
      label: `Notificação`,
      date: newAttemptDate,
      time: cleanTime,
      dateFormatted: formatDateBR(newAttemptDate),
      timeFormatted: `${cleanTime}h`,
      isCurrent: false
    };

    const combined = [...scheduleAttempts, newEntry].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });

    const total = combined.length;
    const reindexed = combined.map((item, idx) => {
      const ord = idx + 1;
      return {
        ...item,
        order: ord,
        label: `${ord}ª Notificação`,
        isCurrent: idx === total - 1
      };
    });

    setScheduleAttempts(reindexed);
    setNewAttemptDate('');
    setShowAddAttemptForm(false);
  };

  const handleRemoveAttempt = (idxToRemove: number) => {
    if (scheduleAttempts.length <= 1) return;
    const filtered = scheduleAttempts.filter((_, idx) => idx !== idxToRemove);
    const total = filtered.length;
    const reindexed = filtered.map((item, idx) => {
      const ord = idx + 1;
      return {
        ...item,
        order: ord,
        label: `${ord}ª Notificação`,
        isCurrent: idx === total - 1
      };
    });
    setScheduleAttempts(reindexed);
  };

  const handleSelectMotivo = (value: string) => {
    setSelectedMotivoCategoria(value);
    const found = MOTIVOS_PREDEFINIDOS.find(m => m.value === value);
    if (found) {
      setMotivoDetalhado(found.defaultText);
    }
  };

  const handleDpcSelectChange = (nome: string) => {
    const found = delegadosList.find(d => d.nome === nome);
    if (found) {
      setDpcName(found.nome);
      setDpcMatricula(found.matricula);
      setDpcCargo(found.cargo || 'Delegado de Polícia Civil');
    } else {
      setDpcName(nome);
    }
  };

  const activeUser = user || authService.getCurrentUser();
  const currentAccountUserName = activeUser?.displayName || activeUser?.username || '';
  const currentAccountUserMatricula = activeUser?.registrationNumber || '';
  const currentAccountUserCargo = activeUser?.cargo || (activeUser as any)?.position || 'Oficial de Investigação Policial (OIP)';

  const currentUserOipOption: DelegadoInfo | null = currentAccountUserName.trim() ? {
    id: 'current_user_account_oip',
    category: 'oip',
    nome: currentAccountUserName.trim(),
    matricula: currentAccountUserMatricula.trim(),
    cargo: currentAccountUserCargo.trim() || 'Oficial de Investigação Policial (OIP)',
    delegacia: activeUser?.unitName || '1ª Delegacia Metropolitana de Maracanaú',
    municipio: 'Maracanaú/CE',
    portariaOuObs: 'Usuário da Conta (Você)'
  } : null;

  const handleOipSelectChange = (nome: string) => {
    if (!nome) return;

    if (currentUserOipOption && currentUserOipOption.nome.toLowerCase() === nome.toLowerCase()) {
      setOipName(currentUserOipOption.nome);
      setOipMatricula(currentUserOipOption.matricula);
      setOipCargo(currentUserOipOption.cargo);
      return;
    }

    const found = delegadosList.find(d => d.nome.toLowerCase() === nome.toLowerCase());
    if (found) {
      setOipName(found.nome);
      setOipMatricula(found.matricula);
      setOipCargo(found.cargo || 'Oficial de Investigação Policial (OIP)');
    } else {
      setOipName(nome);
    }
  };

  const buildPdfData = (): TermoNaoComparecimentoPdfData => {
    const procedureRef = oitiva.procedureNumber
      ? (oitiva.procedureType ? `${oitiva.procedureType} nº ${oitiva.procedureNumber}` : oitiva.procedureNumber)
      : 'Procedimento Policial';

    return {
      procedureRef,
      personName: oitiva.personName || 'Não informado',
      cpf: oitiva.cpf,
      rg: oitiva.rg,
      address: formatAddressCompleto(oitiva),
      phone: oitiva.phone,
      role: oitiva.role || 'Declarante',
      dateFormatted: formatDateExtenso(oitiva.date),
      timeFormatted: oitiva.time || '',
      scheduleAttempts: scheduleAttempts.map(att => ({
        order: att.order,
        label: att.label,
        dateFormatted: att.dateFormatted,
        timeFormatted: att.timeFormatted,
        description: att.description,
        isCurrent: att.isCurrent
      })),
      termoDateFormatted: formatDateExtenso(termoDate),
      motivoCategoria: selectedMotivoCategoria,
      motivoDetalhado: motivoDetalhado.trim(),
      dpcName: dpcName.trim() || 'Delegado de Polícia Civil',
      dpcMatricula: dpcMatricula.trim(),
      dpcCargo: dpcCargo.trim() || 'Delegado de Polícia Civil',
      oipName: oipName.trim() || 'Oficial de Investigação Policial',
      oipMatricula: oipMatricula.trim(),
      oipCargo: oipCargo.trim() || 'Oficial de Investigação Policial (OIP)',
      // Compatibilidade retroativa
      oip1Name: oipName.trim() || 'Oficial de Investigação Policial',
      oip1Matricula: oipMatricula.trim(),
      oip1Cargo: oipCargo.trim() || 'Oficial de Investigação Policial (OIP)'
    };
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const data = buildPdfData();
      const cleanPerson = oitiva.personName ? oitiva.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Oitiva';
      await downloadTermoNaoComparecimentoPdf(data, `Termo_Nao_Comparecimento_${cleanPerson}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar termo de não comparecimento em PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAbsentAndDownload = async () => {
    setIsMarkingAbsent(true);
    try {
      if (onMarkStatusAsAbsent) {
        await onMarkStatusAsAbsent(oitiva.id);
      }
      await handleDownloadPdf();
      onClose();
    } catch (err) {
      console.error('Erro ao atualizar status e baixar termo:', err);
    } finally {
      setIsMarkingAbsent(false);
    }
  };

  const handleCopyText = () => {
    const data = buildPdfData();
    const attemptsSummary = scheduleAttempts.length > 1
      ? `DATAS E HORÁRIOS DESIGNADOS (${scheduleAttempts.length} tentativas de notificação/agendamento):\n` +
        scheduleAttempts.map(a => `• ${a.label}: ${a.dateFormatted} às ${a.timeFormatted}${a.description ? ` (${a.description})` : ''}`).join('\n')
      : `Data e Horário Designados: ${data.dateFormatted} às ${data.timeFormatted}h`;

    const textToCopy = `POLÍCIA CIVIL DO ESTADO DO CEARÁ
1ª DELEGACIA METROPOLITANA DE MARACANAÚ

TERMO DE NÃO COMPARECIMENTO
Procedimento: ${data.procedureRef}

Aos ${data.termoDateFormatted}, nesta cidade de Maracanaú/CE, no Cartório da 1ª Delegacia Metropolitana de Maracanaú, sob a presidência do(a) Delegado(a) de Polícia Civil ${data.dpcName.toUpperCase()} (${data.dpcMatricula || 'DPC'}), com a presença do(a) Oficial de Investigação Policial (OIP) adiante assinado(a), foi formalmente CERTIFICADA A AUSÊNCIA E NÃO COMPARECIMENTO da pessoa de ${data.personName.toUpperCase()}, CPF: ${data.cpf || 'Não informado'}, qualificada como ${data.role}.

${scheduleAttempts.length > 1
  ? `DATAS DESIGNADAS (${scheduleAttempts.length} Notificações):\n` +
    scheduleAttempts.map(a => `• ${a.label}: ${a.dateFormatted} às ${a.timeFormatted}`).join('\n')
  : `Data e Horário Designados: ${data.dateFormatted} às ${data.timeFormatted}h`}

MOTIVO / CIRCUNSTÂNCIAS:
${data.motivoCategoria}
${data.motivoDetalhado}

Do que para constar, lavrou-se o presente Termo.

__________________________       __________________________
${data.dpcName.toUpperCase()}               ${data.oipName.toUpperCase()}
${data.dpcCargo}                ${data.oipCargo}
${data.dpcMatricula ? `Mat. ${data.dpcMatricula}` : ''}                     ${data.oipMatricula ? `Mat. ${data.oipMatricula}` : ''}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const dpcOptions = delegadosList.filter(d => d.category === 'dpc' || !d.category || !d.id.startsWith('oip_'));
  const baseOipOptions = delegadosList.filter(d => d.category === 'oip' || d.id.startsWith('oip_') || d.category === 'dpc');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto no-print"
      // Closes only via close buttons (X or Fechar)
    >
      <div className="bg-[#120f1e] border-2 border-purple-600/70 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col shadow-2xl shadow-purple-950/90 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-purple-900/60 bg-[#161226] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/90 border-2 border-rose-500/80 flex items-center justify-center text-rose-300 shadow-md shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/50">
                  Documento Oficial PCCE
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Ofício & Termo de Ausência
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                Gerar Termo de Não Comparecimento
              </h2>
            </div>
          </div>

          <button
            id="btn-close-termo-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-purple-950/60 border border-purple-900/40 rounded-xl transition-colors cursor-pointer"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Responsive 2-column workspace for 95vw */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Form & Configuration (Col-Span 7) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Card Resumo do Intimado */}
            <div className="bg-[#171326] p-4 rounded-2xl border border-purple-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-inner">
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">Intimando(a) / Declarante:</span>
                <span className="text-sm font-black text-white">{oitiva.personName}</span>
                <span className="text-[11px] text-purple-300 block mt-0.5">
                  Condição: {oitiva.role || 'Oitiva'} • CPF: {oitiva.cpf || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 block uppercase">Pauta / Agendamento:</span>
                <div className="flex items-center gap-1.5 text-zinc-200 font-semibold mt-0.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>{formatDateBR(oitiva.date)}</span>
                  {oitiva.time && (
                    <span className="text-purple-300 font-mono">às {oitiva.time}h</span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Proc: {oitiva.procedureType || 'Proc.'} nº {oitiva.procedureNumber || 'S/N'}
                </span>
              </div>
            </div>

            {/* Seção Nova: Histórico de Notificações */}
            <div className="bg-[#181329] p-4 rounded-2xl border-2 border-purple-800/50 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-purple-900/30">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Notificações Designadas ({scheduleAttempts.length} {scheduleAttempts.length === 1 ? 'tentativa' : 'tentativas'})
                  </h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  scheduleAttempts.length > 1 
                    ? 'bg-purple-950 text-purple-300 border-purple-500/50' 
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  {scheduleAttempts.length} {scheduleAttempts.length === 1 ? 'Notificação' : 'Notificações'}
                </span>
              </div>

              <div className="space-y-2">
                {scheduleAttempts.map((att, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border bg-[#120d20] border-purple-900/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] bg-purple-600/30 text-purple-200 border border-purple-500/30">
                        {att.order}ª
                      </span>
                      <div>
                        <span className="font-bold text-white text-xs">
                          {att.label}: {att.dateFormatted} às {att.timeFormatted}
                        </span>
                      </div>
                    </div>

                    {scheduleAttempts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttempt(idx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Remover esta data do termo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Botão para adicionar notificação anterior manualmente se necessário */}
              {!showAddAttemptForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddAttemptForm(true)}
                  className="flex items-center gap-1.5 text-[11px] text-purple-300 hover:text-white font-semibold py-1.5 px-2.5 rounded-lg bg-[#140e24] hover:bg-purple-950/80 border border-purple-700/40 transition-colors cursor-pointer mt-1"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Adicionar Data de Notificação</span>
                </button>
              ) : (
                <div className="bg-[#120d20] p-3 rounded-xl border border-purple-700/60 space-y-2 mt-2">
                  <span className="text-[10px] font-bold text-purple-300 block uppercase">
                    Adicionar Data de Notificação:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-zinc-400 mb-0.5">Data:</label>
                      <input 
                        type="date"
                        value={newAttemptDate}
                        onChange={(e) => setNewAttemptDate(e.target.value)}
                        className="w-full bg-[#0a0714] border border-purple-700/70 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-400 mb-0.5">Horário:</label>
                      <input 
                        type="time"
                        value={newAttemptTime}
                        onChange={(e) => setNewAttemptTime(e.target.value)}
                        className="w-full bg-[#0a0714] border border-purple-700/70 rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddAttemptForm(false)}
                      className="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAttempt}
                      disabled={!newAttemptDate}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Seção 1: Motivo do Não Comparecimento */}
            <div className="bg-[#181329] p-4 rounded-2xl border-2 border-purple-800/50 space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-purple-900/30">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Motivo & Circunstâncias da Ausência
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-purple-300 uppercase mb-1">
                    Selecione o Motivo Principal:
                  </label>
                  <select
                    value={selectedMotivoCategoria}
                    onChange={(e) => handleSelectMotivo(e.target.value)}
                    className="w-full bg-[#100c1e] border-2 border-purple-600/70 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {MOTIVOS_PREDEFINIDOS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-purple-300 uppercase mb-1">
                    Data de Lavratura do Termo:
                  </label>
                  <input
                    type="date"
                    value={termoDate}
                    onChange={(e) => setTermoDate(e.target.value)}
                    className="w-full bg-[#100c1e] border-2 border-purple-600/70 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-300 uppercase mb-1">
                  Texto / Certidão Circunstanciada (Editável):
                </label>
                <textarea
                  rows={4}
                  value={motivoDetalhado}
                  onChange={(e) => setMotivoDetalhado(e.target.value)}
                  placeholder="Descreva detalhes específicos do não comparecimento, certidão do oficial que tentou a entrega, etc..."
                  className="w-full bg-[#100c1e] border border-purple-700/60 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed"
                />
              </div>
            </div>

            {/* Seção 2: Assinaturas Oficiais (1 DPC e 1 OIP) */}
            <div className="bg-[#181329] p-4 rounded-2xl border-2 border-purple-800/50 space-y-3.5">
              <div className="flex items-center gap-2 pb-1 border-b border-purple-900/30">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  2. Autoridades e Policiais Responsáveis (1 DPC + 1 OIP)
                </h3>
              </div>

              {/* DPC */}
              <div className="bg-[#130f22] p-3.5 rounded-xl border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-300 uppercase flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Autoridade Policial Presidente (DPC):
                  </span>
                  {dpcOptions.length > 0 && (
                    <select
                      onChange={(e) => handleDpcSelectChange(e.target.value)}
                      value={dpcName}
                      className="bg-[#1c1432] text-amber-200 border border-amber-500/40 rounded-lg px-2 py-0.5 text-[10px] font-semibold"
                    >
                      <option value="">-- Selecionar do Catálogo --</option>
                      {dpcOptions.map((d) => (
                        <option key={d.id} value={d.nome}>{d.nome} ({d.matricula || 'DPC'})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={dpcName}
                      onChange={(e) => setDpcName(e.target.value)}
                      placeholder="Nome do(a) Delegado(a)"
                      className="w-full bg-[#0d0918] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={dpcMatricula}
                      onChange={(e) => setDpcMatricula(e.target.value)}
                      placeholder="Matrícula (ex: 301.942-1-0)"
                      className="w-full bg-[#0d0918] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              {/* 1 OIP: Escolha de 1 OIP (do catálogo ou o próprio usuário da conta) */}
              <div className="bg-[#130f22] p-3.5 rounded-xl border border-purple-500/40 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black text-purple-300 uppercase flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    Oficial de Investigação Policial (OIP / Escrivão):
                  </span>

                  <div className="flex items-center gap-1.5">
                    {currentUserOipOption && (
                      <button
                        type="button"
                        onClick={() => handleOipSelectChange(currentUserOipOption.nome)}
                        className="px-2 py-0.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-500/50 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Preencher com o usuário logado da conta"
                      >
                        <User className="w-3 h-3 text-purple-300" />
                        <span>Usar Meu Usuário</span>
                      </button>
                    )}

                    <select
                      onChange={(e) => handleOipSelectChange(e.target.value)}
                      value={oipName}
                      className="bg-[#1c1432] text-purple-200 border border-purple-500/40 rounded-lg px-2 py-0.5 text-[10px] font-semibold max-w-[210px] truncate"
                    >
                      <option value="">-- Catálogo de OIP --</option>
                      {currentUserOipOption && (
                        <optgroup label="Usuário da Conta (Você)">
                          <option value={currentUserOipOption.nome}>
                            👤 {currentUserOipOption.nome} {currentUserOipOption.matricula ? `(Mat. ${currentUserOipOption.matricula})` : ''}
                          </option>
                        </optgroup>
                      )}
                      <optgroup label="Catálogo de Oficiais">
                        {baseOipOptions.map((o) => (
                          <option key={o.id} value={o.nome}>
                            {o.nome} {o.matricula ? `(Mat. ${o.matricula})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={oipName}
                      onChange={(e) => setOipName(e.target.value)}
                      placeholder="Nome do(a) Policial / OIP / Escrivão(ã)"
                      className="w-full bg-[#0d0918] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={oipMatricula}
                      onChange={(e) => setOipMatricula(e.target.value)}
                      placeholder="Matrícula"
                      className="w-full bg-[#0d0918] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 font-mono"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={oipCargo}
                      onChange={(e) => setOipCargo(e.target.value)}
                      placeholder="Cargo"
                      className="w-full bg-[#0d0918] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Document Preview Sheet (Col-Span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-3 sticky top-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300 uppercase flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Pré-visualização do Documento Oficial:
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                Padrão A4 Oficial
              </span>
            </div>

            {/* Paper Preview Card - Idêntico ao Ofício/PDF Gerado */}
            <div 
              className="bg-white text-black p-6 sm:p-7 rounded-2xl border-2 border-purple-400/40 shadow-2xl shadow-black/60 max-h-[62vh] overflow-y-auto"
              style={{ fontFamily: '"Arial", "Helvetica", sans-serif', color: '#000000', lineHeight: '1.45' }}
            >
              {/* 1. Official Header */}
              <OfficialCeHeader scale={80} className="mb-2" />

              {/* 2. Title & Procedure */}
              <div className="text-center pt-1 pb-1">
                <h3 className="text-[15px] font-black tracking-wide uppercase text-black font-sans">
                  TERMO DE NÃO COMPARECIMENTO
                </h3>
                <h4 className="text-[11px] font-black tracking-wide uppercase text-black font-sans mt-0.5">
                  {oitiva.procedureRef || (oitiva.procedureType ? `PROCEDIMENTO: ${oitiva.procedureType.toUpperCase()} Nº ${oitiva.procedureNumber || 'S/N'}` : (oitiva.procedureNumber ? `PROCEDIMENTO: PROC. Nº ${oitiva.procedureNumber}` : 'PROCEDIMENTO POLICIAL'))}
                </h4>
              </div>

              {/* 3. Opening Paragraph */}
              <p className="text-[10.5px] text-justify leading-relaxed text-black mt-2">
                Aos <strong className="font-bold">{formatDateExtenso(termoDate)}</strong>, nesta cidade de Maracanaú, Estado do Ceará, no Cartório da <strong className="font-bold">1ª DELEGACIA METROPOLITANA DE MARACANAÚ</strong>, sob a presidência do(a) Delegado(a) de Polícia Civil <strong className="font-bold">{(dpcName.trim() || 'FERNANDO MORETTO NACHTIGALL').toUpperCase()}</strong>{dpcMatricula.trim() ? ` (${dpcMatricula.trim()})` : ''}, com a presença do(a) Oficial de Investigação Policial (OIP) adiante qualificado(a) e assinado(a), foi formalmente <u className="font-black"><strong>CERTIFICADA A AUSÊNCIA E NÃO COMPARECIMENTO</strong></u> da seguinte pessoa intimada:
              </p>

              {/* 4. Box de Qualificação do Intimado com Todas as Datas/Notificações */}
              <div className="bg-[#f8f8f8] border border-zinc-300 rounded-md p-2.5 text-[9.5px] text-black leading-relaxed space-y-1 my-2">
                <div>
                  <span className="font-bold">INTIMANDO(A): </span>
                  <span className="font-bold uppercase">{oitiva.personName || 'NÃO INFORMADO'}</span>
                </div>
                <div>
                  <span>Condição: {oitiva.role || 'OITIVA / DECLARANTE'}</span>
                  <span> • </span>
                  <span>
                    {[
                      oitiva.cpf ? `CPF: ${oitiva.cpf}` : null,
                      oitiva.rg ? `RG: ${oitiva.rg}` : null,
                      oitiva.phone ? `Tel: ${oitiva.phone}` : null
                    ].filter(Boolean).join('  |  ') || 'Documento não informado'}
                  </span>
                </div>
                <div>
                  <span>Endereço: {formatAddressCompleto(oitiva) || 'Endereço não informado'}</span>
                </div>

                <div className="pt-1 border-t border-zinc-200">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-black text-[9.5px]">
                      {scheduleAttempts.length > 1 
                        ? `Datas Designadas (${scheduleAttempts.length} Notificações):`
                        : 'Data e Horário Designados:'
                      }
                    </span>
                    {scheduleAttempts.length > 1 && (
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-300">
                        {scheduleAttempts.length} notificações
                      </span>
                    )}
                  </div>

                  {scheduleAttempts.length > 1 ? (
                    <div className="space-y-0.5 pl-1.5 mt-0.5">
                      {scheduleAttempts.map((att, idx) => (
                        <div key={idx} className="text-[9px] text-black">
                          <span>
                            • <strong className="font-semibold">{att.label}: </strong>
                            {att.dateFormatted} às {att.timeFormatted}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[9.5px] text-black">
                      <span className="font-bold">{formatDateExtenso(oitiva.date)}</span> às <span className="font-bold">{oitiva.time ? `${oitiva.time}h` : 'horário aprazado'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Motivo e Circunstâncias */}
              <div className="mt-2 space-y-0.5">
                <p className="text-[9.5px] font-bold text-black uppercase">
                  MOTIVO / CIRCUNSTÂNCIAS DO NÃO COMPARECIMENTO:
                </p>
                <p className="text-[10px] text-justify leading-relaxed text-black">
                  <span className="font-bold">Motivo: </span>
                  <u className="font-bold">{selectedMotivoCategoria}. </u>
                  <span>{motivoDetalhado.trim() || 'A pessoa intimada deixou de comparecer no dia e horário aprazados perante esta unidade policial, sem apresentar qualquer justificativa plausível até o presente momento.'}</span>
                </p>
              </div>

              {/* 6. Fechamento Legal */}
              <p className="text-[10px] text-justify leading-relaxed text-black mt-2">
                Do que, para constar e produzir os regulares efeitos legais e jurídicos nos autos do procedimento em epígrafe, determinou a Autoridade Policial a lavratura do presente <strong className="font-bold">TERMO DE NÃO COMPARECIMENTO</strong>, o qual lido e achado conforme, vai devidamente assinado pela Autoridade Policial e pelo(a) Oficial de Investigação Policial presente.
              </p>

              {/* 7. Local e Data (Alinhado à direita para padrão oficial e evitar sobreposição com assinatura) */}
              <p className="text-right text-[10px] text-black mt-3 mb-6">
                Maracanaú/CE, {formatDateExtenso(termoDate)}.
              </p>

              {/* 8. Signatures Section (1 DPC + 1 OIP Lado a Lado) */}
              <div className="grid grid-cols-2 gap-4 pt-2 text-center">
                {/* DPC Signature (Esquerda) */}
                <div>
                  <div className="w-40 border-b border-black mx-auto mb-1"></div>
                  <p className="text-[9px] font-bold text-black uppercase">
                    {(dpcName.trim() || 'FERNANDO MORETTO NACHTIGALL').toUpperCase()}
                  </p>
                  <p className="text-[7.5px] text-zinc-700">
                    {dpcCargo.trim() || 'Delegado de Polícia Civil'}{dpcMatricula.trim() ? ` - Mat. ${dpcMatricula.trim()}` : ''}
                  </p>
                </div>

                {/* 1 OIP Signature (Direita) */}
                <div>
                  <div className="w-40 border-b border-black mx-auto mb-1"></div>
                  <p className="text-[9px] font-bold text-black uppercase">
                    {(oipName.trim() || 'OFICIAL DE INVESTIGAÇÃO POLICIAL').toUpperCase()}
                  </p>
                  <p className="text-[7.5px] text-zinc-700">
                    {oipCargo.trim() || 'Oficial de Investigação Policial'}{oipMatricula.trim() ? ` - Mat. ${oipMatricula.trim()}` : ''}
                  </p>
                </div>
              </div>

              {/* 9. Official Footer */}
              <div className="pt-3 mt-4 border-t border-zinc-300 text-center space-y-0.5">
                <p className="text-[8px] font-bold text-zinc-800">
                  1ª Delegacia de Maracanaú – Polícia Civil do Estado do Ceará
                </p>
                <p className="text-[7.5px] text-zinc-600">
                  Av. VI, 410, Jereissati I, Maracanaú/CE, CEP: 61.900-670, Fone: (85) 3101-7344
                </p>
                <p className="text-[7.5px] text-zinc-600">
                  Email: 1dpmaracanau@pc.ce.gov.br  |  Site: www.policiacivil.ce.gov.br
                </p>
                {/* Ceará Tri-color Bar */}
                <div className="flex h-1 w-full mt-1.5 rounded-full overflow-hidden">
                  <div className="w-[35%] bg-[#008643]"></div>
                  <div className="w-[30%] bg-[#f9b233]"></div>
                  <div className="w-[35%] bg-[#008643]"></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer com Botões de Ação */}
        <div className="p-4 sm:p-5 border-t-2 border-purple-900/60 bg-[#161226] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#120d20] hover:bg-purple-950 text-zinc-300 hover:text-white border border-purple-800/50 rounded-xl transition-all cursor-pointer shadow-sm"
              title="Copiar texto da certidão para colar no sistema de inquéritos"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSuccess ? 'Texto Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#191428] hover:bg-purple-950 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-colors cursor-pointer"
            >
              Fechar Janela
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              id="btn-download-termo-pdf-only"
              type="button"
              disabled={isGenerating || isMarkingAbsent}
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border-2 border-purple-400/80 rounded-xl font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Gerando PDF...' : 'Baixar Termo em PDF'}</span>
            </button>

            <button
              id="btn-mark-absent-and-download"
              type="button"
              disabled={isGenerating || isMarkingAbsent}
              onClick={handleMarkAbsentAndDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white font-black rounded-xl border-2 border-rose-300 shadow-lg shadow-rose-950/80 transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50"
              title="Atualiza o status da oitiva no banco para 'Não Compareceu' e faz o download do termo em PDF"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isMarkingAbsent ? 'Processando...' : 'Marcar Falta & Baixar Termo'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

