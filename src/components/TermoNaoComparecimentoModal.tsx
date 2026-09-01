import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Check, 
  AlertTriangle, 
  User, 
  ShieldCheck, 
  Building2, 
  Copy, 
  Calendar as CalendarIcon, 
  Clock, 
  UserX,
  FileCheck
} from 'lucide-react';
import { Oitiva, UserProfile } from '../types/oitiva';
import { delegadoService, DelegadoInfo } from '../services/delegadoService';
import { 
  formatDateExtenso, 
  formatAddressCompleto, 
  formatDateBR 
} from '../utils/formatters';
import { 
  TermoNaoComparecimentoPdfData, 
  downloadTermoNaoComparecimentoPdf 
} from '../utils/pdfGenerator';

interface TermoNaoComparecimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitiva: Oitiva | null;
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
  user,
  onMarkStatusAsAbsent
}) => {
  const [delegadosList, setDelegadosList] = useState<DelegadoInfo[]>([]);

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

  // OIP 1
  const [oip1Name, setOip1Name] = useState('');
  const [oip1Matricula, setOip1Matricula] = useState('');
  const [oip1Cargo, setOip1Cargo] = useState('Oficial de Investigação Policial (OIP)');

  // OIP 2
  const [oip2Name, setOip2Name] = useState('');
  const [oip2Matricula, setOip2Matricula] = useState('');
  const [oip2Cargo, setOip2Cargo] = useState('Oficial de Investigação Policial (OIP)');

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

    // OIP 1: Usuário logado ou Escrivão da oitiva
    const loggedUserClerk = user?.displayName || oitiva.clerkName || (oipOfficers[0] ? oipOfficers[0].nome : 'Oficial de Investigação');
    const foundOip1 = oipOfficers.find(o => o.nome.toLowerCase() === loggedUserClerk.toLowerCase());
    
    if (foundOip1) {
      setOip1Name(foundOip1.nome);
      setOip1Matricula(foundOip1.matricula || '');
      setOip1Cargo(foundOip1.cargo || 'Oficial de Investigação Policial (OIP)');
    } else {
      setOip1Name(loggedUserClerk);
      setOip1Matricula(user?.registrationNumber || '');
      setOip1Cargo(user?.position || 'Oficial de Investigação Policial (OIP)');
    }

    // OIP 2: Segunda testemunha policial
    const candidateOip2 = oipOfficers.find(o => o.nome.toLowerCase() !== loggedUserClerk.toLowerCase()) || oipOfficers[1] || oipOfficers[0];
    if (candidateOip2) {
      setOip2Name(candidateOip2.nome);
      setOip2Matricula(candidateOip2.matricula || '');
      setOip2Cargo(candidateOip2.cargo || 'Oficial de Investigação Policial (OIP)');
    } else {
      setOip2Name('Oficial de Investigação Policial');
      setOip2Matricula('');
      setOip2Cargo('Oficial de Investigação Policial (OIP)');
    }
  }, [oitiva, user, isOpen]);

  if (!isOpen || !oitiva) return null;

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

  const handleOip1SelectChange = (nome: string) => {
    const found = delegadosList.find(d => d.nome === nome);
    if (found) {
      setOip1Name(found.nome);
      setOip1Matricula(found.matricula);
      setOip1Cargo(found.cargo || 'Oficial de Investigação Policial (OIP)');
    } else {
      setOip1Name(nome);
    }
  };

  const handleOip2SelectChange = (nome: string) => {
    const found = delegadosList.find(d => d.nome === nome);
    if (found) {
      setOip2Name(found.nome);
      setOip2Matricula(found.matricula);
      setOip2Cargo(found.cargo || 'Oficial de Investigação Policial (OIP)');
    } else {
      setOip2Name(nome);
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
      termoDateFormatted: formatDateExtenso(termoDate),
      motivoCategoria: selectedMotivoCategoria,
      motivoDetalhado: motivoDetalhado.trim(),
      dpcName: dpcName.trim() || 'Delegado de Polícia Civil',
      dpcMatricula: dpcMatricula.trim(),
      dpcCargo: dpcCargo.trim() || 'Delegado de Polícia Civil',
      oip1Name: oip1Name.trim() || 'Oficial de Investigação 1',
      oip1Matricula: oip1Matricula.trim(),
      oip1Cargo: oip1Cargo.trim() || 'Oficial de Investigação Policial (OIP)',
      oip2Name: oip2Name.trim() || 'Oficial de Investigação 2',
      oip2Matricula: oip2Matricula.trim(),
      oip2Cargo: oip2Cargo.trim() || 'Oficial de Investigação Policial (OIP)'
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
    const textToCopy = `POLÍCIA CIVIL DO ESTADO DO CEARÁ
1ª DELEGACIA METROPOLITANA DE MARACANAÚ

TERMO DE NÃO COMPARECIMENTO
Procedimento: ${data.procedureRef}

Aos ${data.termoDateFormatted}, nesta cidade de Maracanaú/CE, no Cartório da 1ª Delegacia Metropolitana de Maracanaú, sob a presidência do(a) Delegado(a) de Polícia Civil ${data.dpcName.toUpperCase()} (${data.dpcMatricula || 'DPC'}), com a presença dos Oficiais de Investigação Policial (OIP) adiante assinados, foi formalmente CERTIFICADA A AUSÊNCIA E NÃO COMPARECIMENTO da pessoa de ${data.personName.toUpperCase()}, CPF: ${data.cpf || 'Não informado'}, qualificada como ${data.role}, que estava devidamente intimada para comparecer no dia ${data.dateFormatted} às ${data.timeFormatted}h.

MOTIVO / CIRCUNSTÂNCIAS:
${data.motivoCategoria}
${data.motivoDetalhado}

Do que para constar, lavrou-se o presente Termo.

_____________________________________________
${data.dpcName.toUpperCase()}
${data.dpcCargo} ${data.dpcMatricula ? `- Mat. ${data.dpcMatricula}` : ''}

__________________________       __________________________
${data.oip1Name.toUpperCase()}               ${data.oip2Name.toUpperCase()}
${data.oip1Cargo}                ${data.oip2Cargo}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const dpcOptions = delegadosList.filter(d => d.category === 'dpc' || !d.category || !d.id.startsWith('oip_'));
  const oipOptions = delegadosList.filter(d => d.category === 'oip' || d.id.startsWith('oip_') || d.category === 'dpc');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto no-print"
      // Note: No backdrop click close per explicit user requirement
    >
      <div className="bg-[#120f1e] border-2 border-purple-600/70 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-purple-950/90 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
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

        {/* Form Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Card Resumo do Intimado */}
          <div className="bg-[#171326] p-3.5 rounded-2xl border border-purple-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                rows={3}
                value={motivoDetalhado}
                onChange={(e) => setMotivoDetalhado(e.target.value)}
                placeholder="Descreva detalhes específicos do não comparecimento, certidão do oficial que tentou a entrega, etc..."
                className="w-full bg-[#100c1e] border border-purple-700/60 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed"
              />
            </div>
          </div>

          {/* Seção 2: Assinaturas Oficiais (1 DPC e 2 OIPs) */}
          <div className="bg-[#181329] p-4 rounded-2xl border-2 border-purple-800/50 space-y-3.5">
            <div className="flex items-center gap-2 pb-1 border-b border-purple-900/30">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Autoridades e Policiais Responsáveis pelas Assinaturas (1 DPC + 2 OIP)
              </h3>
            </div>

            {/* DPC */}
            <div className="bg-[#130f22] p-3 rounded-xl border border-amber-500/40 space-y-2">
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

            {/* 2 OIPs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* OIP 1 */}
              <div className="bg-[#130f22] p-3 rounded-xl border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-purple-300 uppercase">
                    1º Oficial Investigador (OIP):
                  </span>
                  {oipOptions.length > 0 && (
                    <select
                      onChange={(e) => handleOip1SelectChange(e.target.value)}
                      value={oip1Name}
                      className="bg-[#1c1432] text-purple-200 border border-purple-500/40 rounded-lg px-2 py-0.5 text-[10px] font-semibold max-w-[150px] truncate"
                    >
                      <option value="">-- Catálogo --</option>
                      {oipOptions.map((o) => (
                        <option key={o.id} value={o.nome}>{o.nome}</option>
                      ))}
                    </select>
                  )}
                </div>

                <input
                  type="text"
                  value={oip1Name}
                  onChange={(e) => setOip1Name(e.target.value)}
                  placeholder="Nome do 1º Policial / OIP"
                  className="w-full bg-[#0d0918] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                />

                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={oip1Matricula}
                    onChange={(e) => setOip1Matricula(e.target.value)}
                    placeholder="Matrícula"
                    className="bg-[#0d0918] border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-300"
                  />
                  <input
                    type="text"
                    value={oip1Cargo}
                    onChange={(e) => setOip1Cargo(e.target.value)}
                    placeholder="Cargo"
                    className="bg-[#0d0918] border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-300"
                  />
                </div>
              </div>

              {/* OIP 2 */}
              <div className="bg-[#130f22] p-3 rounded-xl border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-purple-300 uppercase">
                    2º Oficial Investigador (OIP):
                  </span>
                  {oipOptions.length > 0 && (
                    <select
                      onChange={(e) => handleOip2SelectChange(e.target.value)}
                      value={oip2Name}
                      className="bg-[#1c1432] text-purple-200 border border-purple-500/40 rounded-lg px-2 py-0.5 text-[10px] font-semibold max-w-[150px] truncate"
                    >
                      <option value="">-- Catálogo --</option>
                      {oipOptions.map((o) => (
                        <option key={o.id} value={o.nome}>{o.nome}</option>
                      ))}
                    </select>
                  )}
                </div>

                <input
                  type="text"
                  value={oip2Name}
                  onChange={(e) => setOip2Name(e.target.value)}
                  placeholder="Nome do 2º Policial / OIP"
                  className="w-full bg-[#0d0918] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                />

                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={oip2Matricula}
                    onChange={(e) => setOip2Matricula(e.target.value)}
                    placeholder="Matrícula"
                    className="bg-[#0d0918] border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-300"
                  />
                  <input
                    type="text"
                    value={oip2Cargo}
                    onChange={(e) => setOip2Cargo(e.target.value)}
                    placeholder="Cargo"
                    className="bg-[#0d0918] border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-300"
                  />
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
              className="flex items-center gap-1.5 px-3 py-2 bg-[#120d20] hover:bg-purple-950 text-zinc-300 hover:text-white border border-purple-800/50 rounded-xl transition-all cursor-pointer shadow-sm"
              title="Copiar texto da certidão para colar no sistema de inquéritos"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSuccess ? 'Texto Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-[#191428] hover:bg-purple-950 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white font-black rounded-xl border-2 border-rose-300 shadow-lg shadow-rose-950/80 transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50"
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
