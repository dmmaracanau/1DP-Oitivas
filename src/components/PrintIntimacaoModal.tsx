import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  Edit3, 
  Download,
  Phone,
  UserCheck,
  Hash
} from 'lucide-react';
import { Oitiva, UserProfile } from '../types/oitiva';
import { 
  formatDateExtenso, 
  getUserInitials, 
  formatAddressCompleto,
  calculateAttemptNumber,
  formatIntimationNumberDisplay
} from '../utils/formatters';
import { OfficialCeHeader } from './OfficialCeHeader';
import { DelegadoSelectorModal } from './DelegadoSelectorModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { IntimationNumberPromptModal } from './IntimationNumberPromptModal';
import { DelegadoInfo, delegadoService } from '../services/delegadoService';
import { downloadMandadoPdf, MandadoPdfData } from '../utils/pdfGenerator';
import { oitivaService } from '../services/oitivaService';

interface PrintIntimacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitiva: Oitiva | null;
  user: UserProfile | null;
  onMarkIntimationSent?: (oitivaId: string) => void;
}

export const PrintIntimacaoModal: React.FC<PrintIntimacaoModalProps> = ({
  isOpen,
  onClose,
  oitiva,
  user,
  onMarkIntimationSent
}) => {
  const currentYear = new Date().getFullYear();

  // Editable fields for custom adjustments before printing or downloading
  const [procedureRef, setProcedureRef] = useState('');
  const [oipInitials, setOipInitials] = useState('');
  const [intimationNumber, setIntimationNumber] = useState(`01/${currentYear}`);
  const [attemptNumber, setAttemptNumber] = useState<number>(1);
  const [personName, setPersonName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [dateFormatted, setDateFormatted] = useState('');
  const [timeFormatted, setTimeFormatted] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [officerMatricula, setOfficerMatricula] = useState('');
  const [officerCargo, setOfficerCargo] = useState('Delegado de Polícia Civil');
  
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDelegadoModalOpen, setIsDelegadoModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  useEffect(() => {
    if (oitiva) {
      // Procedure Ref
      const ref = oitiva.procedureNumber
        ? (oitiva.procedureType ? `${oitiva.procedureType} nº ${oitiva.procedureNumber}` : oitiva.procedureNumber)
        : '';
      setProcedureRef(ref);

      // OIP Initials
      const clerkOrUser = user?.displayName || oitiva.clerkName || 'Policial';
      setOipInitials(getUserInitials(clerkOrUser));

      // Intimation Number and Attempt Count
      const initialIntimationNum = formatIntimationNumberDisplay(oitiva.intimationNumber);
      setIntimationNumber(initialIntimationNum);
      const calculatedAttempt = calculateAttemptNumber(oitiva);
      setAttemptNumber(calculatedAttempt);

      // Person Name
      setPersonName(oitiva.personName || '');

      // Address
      const addr = formatAddressCompleto(oitiva);
      setAddress(addr);

      // Phone
      setPhone(oitiva.phone || '');

      // Date formatted
      setDateFormatted(formatDateExtenso(oitiva.date));

      // Time formatted
      setTimeFormatted(oitiva.time || '');

      // Delegado Name & Matricula sincronizados com o catálogo de Delegados
      const targetOfficerName = oitiva.officerName || 'Fernando Moretto Nachtigall';
      const allDelegados = delegadoService.getDelegados();
      const matched = allDelegados.find(d => d.nome.toLowerCase() === targetOfficerName.toLowerCase());

      if (matched) {
        setOfficerName(matched.nome);
        setOfficerMatricula(matched.matricula ? `Mat. ${matched.matricula}` : '');
        setOfficerCargo(matched.cargo || 'Delegado de Polícia Civil');
      } else {
        setOfficerName(targetOfficerName);
        setOfficerMatricula(user?.registrationNumber ? `Mat. ${user.registrationNumber}` : 'Mat. 301.942-1-0');
        setOfficerCargo('Delegado de Polícia Civil');
      }
    }
  }, [oitiva, user, isOpen, currentYear]);

  if (!isOpen || !oitiva) return null;

  const handleSelectDelegado = (delegado: DelegadoInfo) => {
    setOfficerName(delegado.nome);
    setOfficerMatricula(delegado.matricula ? `Mat. ${delegado.matricula}` : '');
    setOfficerCargo(delegado.cargo || 'Delegado de Polícia Civil');
  };

  const executeDownloadPdf = async (num: string, attempt: number) => {
    const finalNumber = formatIntimationNumberDisplay(num);
    setIntimationNumber(finalNumber);
    setAttemptNumber(attempt);

    // Save intimation number on oitiva in background
    if (oitiva) {
      try {
        const currentUid = user?.uid || oitiva.uid || 'cartorio_maracanau';
        await oitivaService.update(oitiva.id, { intimationNumber: finalNumber }, currentUid);
      } catch (err) {
        console.warn('Não foi possível persistir número da intimação no banco:', err);
      }
    }

    const data: MandadoPdfData = {
      procedureRef,
      oipInitials,
      intimationNumber: finalNumber,
      attemptNumber: attempt,
      personName,
      address,
      phone,
      dateFormatted,
      timeFormatted,
      officerName,
      officerMatricula,
      officerCargo
    };

    const cleanName = personName ? personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Intimacao';
    const fileName = `Mandado_Intimacao_${cleanName}.pdf`;
    await downloadMandadoPdf(data, fileName);
    
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);

    if (onMarkIntimationSent && oitiva) {
      onMarkIntimationSent(oitiva.id);
    }
  };

  const handleOpenDownloadPrompt = () => {
    setIsPromptModalOpen(true);
  };

  const handleConfirmPrompt = (num: string, attempt: number) => {
    setIsPromptModalOpen(false);
    executeDownloadPdf(num, attempt);
  };

  const handlePrintBrowser = () => {
    if (onMarkIntimationSent && oitiva) {
      onMarkIntimationSent(oitiva.id);
    }
    window.print();
  };

  const handleCopyText = () => {
    const fullText = `MANDADO DE INTIMAÇÃO
INTIMAÇÃO ${intimationNumber}

Ref.: ${procedureRef || '_______________________'}
OIP: ${oipInitials || '____________'}

A Polícia Civil do Estado do Ceará, por intermédio do Delegado de Polícia Civil abaixo assinado, no uso de suas atribuições legais,

DETERMINA, ao(à) Oficial(a) Investigador(a) de Polícia Civil ou a quem este mandado for entregue, que proceda à INTIMAÇÃO de: ${personName || '______________________________________________________'},
residente em: ${address || '___________________________________________________________________'},
telefone: ${phone || '(  ) __________-_________'}, para comparecer à 1ª DELEGACIA DE POLICIA CIVIL DE MARACANAÚ, situado(a) na AVENIDA VI, Nº 410, CONJUNTO JEREISSATE I, CEP 61.900-670, MARACANAÚ/CE, tel. (85) 3101-7344.

O intimado deverá comparecer no dia ${dateFormatted}, às ${timeFormatted ? `${timeFormatted} hrs` : '_____:_____ hrs'}, para oitiva em procedimento policial.

TRAZER DOCUMENTO DE IDENTIFICAÇÃO E VIA DA INTIMAÇÃO.
${attemptNumber}ª TENTATIVA DE INTIMAÇÃO

Atenciosamente,

_____________________________________
${officerName || 'Fernando Moretto Nachtigall'}
${officerMatricula ? `${officerMatricula} - ` : ''}${officerCargo || 'Delegado de Polícia Civil'}

INTIMADO(A): Recebi uma via deste mandado em _____/______/_______
Assinatura Intimado(a): _________________________________________
( ) Não reside no endereço.      ( ) Pessoa não foi encontrada.
( ) Endereço inexistente.       ( ) Recusou-se a assinar ou a receber.

Policial encarregado: ___________________________________ em ______/______/_______

1ª Delegacia de Maracanaú – Polícia Civil do Estado do Ceará | Av. VI, 410, Jereissati I, Maracanaú/CE, CEP: 61.900-670, Fone: (85) 3101-7344 | Email: 1dpmaracanau@pc.ce.gov.br | Site: www.policiacivil.ce.gov.br`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-[#120f1e] border-2 border-purple-900/60 rounded-3xl w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-950/80 my-auto flex flex-col">
          
          {/* Modal Controls Header (Hidden in Print) */}
          <div className="p-4 border-b-2 border-purple-900/40 bg-[#161226] flex items-center justify-between no-print shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 border-2 border-purple-400/40 flex items-center justify-center text-purple-200 shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Mandado de Intimação Oficial
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full font-mono">
                    INTIMAÇÃO {intimationNumber}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                    {attemptNumber}ª Tentativa
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  1ª Delegacia Metropolitana de Maracanaú • PCCE
                </p>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border-2 border-purple-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Alterar Número da Intimação e Tentativa"
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Nº Intimação ({intimationNumber})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDelegadoModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-2 border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Trocar Delegado(a) Signatário(a)"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trocar Delegado</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                  isEditing
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-[#1b152d] text-zinc-300 hover:text-white border-purple-900/60 hover:bg-purple-950/50'
                }`}
                title="Ajustar dados antes de baixar"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEditing ? 'Visualizar' : 'Editar Dados'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1b152d] hover:bg-purple-950/50 text-zinc-300 hover:text-white border-2 border-purple-900/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Copiar texto da intimação"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-2 border-emerald-500/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Notificar por WhatsApp (Texto + PDF)"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {/* Botão de Download: Pede o número da intimação se acionado */}
              <button
                id="btn-download-mandado"
                onClick={handleOpenDownloadPrompt}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-900/50 border-2 border-purple-400/50 transition-all cursor-pointer"
                title="Fazer Download do Mandado em PDF (Pede o número da intimação)"
              >
                {downloaded ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
                <span>{downloaded ? 'Baixado!' : 'Fazer Download da Intimação'}</span>
              </button>

              {/* Opção secundária para impressão direta no navegador */}
              <button
                onClick={handlePrintBrowser}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-purple-950/40 border border-purple-900/40 transition-colors"
                title="Imprimir direto pelo navegador"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-purple-950/40 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick edit drawer when active (Hidden in Print) */}
          {isEditing && (
            <div className="p-4 bg-[#181328] border-b-2 border-purple-900/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs no-print">
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Número da Intimação (NN/AAAA)</label>
                <input
                  type="text"
                  value={intimationNumber}
                  onChange={(e) => setIntimationNumber(e.target.value)}
                  placeholder={`01/${currentYear}`}
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Tentativa de Intimação</label>
                <select
                  value={attemptNumber}
                  onChange={(e) => setAttemptNumber(Number(e.target.value))}
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white"
                >
                  <option value={1}>1ª Tentativa de Intimação</option>
                  <option value={2}>2ª Tentativa de Intimação</option>
                  <option value={3}>3ª Tentativa de Intimação</option>
                  <option value={4}>4ª Tentativa de Intimação</option>
                  <option value={5}>5ª Tentativa de Intimação</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Referência (Procedimento)</label>
                <input
                  type="text"
                  value={procedureRef}
                  onChange={(e) => setProcedureRef(e.target.value)}
                  placeholder="Ex: IP nº 123/2026"
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">OIP (Iniciais Policial)</label>
                <input
                  type="text"
                  value={oipInitials}
                  onChange={(e) => setOipInitials(e.target.value)}
                  placeholder="Ex: M.S"
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Nome do Intimado</label>
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Endereço Residencial</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Telefone de Contato</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(85) 98765-4321"
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Data da Oitiva</label>
                <input
                  type="text"
                  value={dateFormatted}
                  onChange={(e) => setDateFormatted(e.target.value)}
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Horário da Oitiva</label>
                <input
                  type="text"
                  value={timeFormatted}
                  onChange={(e) => setTimeFormatted(e.target.value)}
                  placeholder="10:00"
                  className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 mb-1">Delegado(a) Signatário(a)</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="Fernando Moretto Nachtigall"
                    className="w-full bg-[#110d1e] border-2 border-purple-900/50 rounded-xl px-2.5 py-1.5 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDelegadoModalOpen(true)}
                    className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border-2 border-amber-500/40 rounded-xl hover:bg-amber-500/30 text-[11px] font-bold"
                  >
                    DPC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PRINTABLE MANDADO SHEET CONTAINER */}
          <div className="p-4 sm:p-8 bg-[#0b0914] overflow-y-auto flex-1 flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible">
            
            {/* Exact A4 Sheet Layout */}
            <div 
              id="mandado-a4-sheet"
              className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black px-10 py-8 sm:px-12 sm:py-10 shadow-2xl print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-0 flex flex-col justify-between"
              style={{ fontFamily: '"Arial", "Helvetica", sans-serif', color: '#000000', lineHeight: '1.45' }}
            >
              {/* Top Area: Header + Body Content */}
              <div className="space-y-5">
                
                {/* 1. Official Header at 80% Scale */}
                <OfficialCeHeader scale={80} className="mb-3" />

                {/* 2. Document Title and Intimation Number */}
                <div className="text-center pt-1 pb-1">
                  <h1 className="text-[17px] font-black tracking-wide uppercase text-black font-sans">
                    MANDADO DE INTIMAÇÃO
                  </h1>
                  <h2 className="text-[13px] font-black tracking-wide uppercase text-black font-sans mt-0.5">
                    INTIMAÇÃO {intimationNumber || `01/${currentYear}`}
                  </h2>
                </div>

                {/* 3. References Block */}
                <div className="space-y-1 text-[12px] font-bold text-black font-sans">
                  <p>
                    <span className="font-bold">Ref.: </span>
                    <span className="font-semibold text-black tracking-normal">
                      {procedureRef || '_______________________'}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold">OIP: </span>
                    <span className="font-bold text-black tracking-wider">
                      {oipInitials || '____________'}
                    </span>
                  </p>
                </div>

                {/* 4. Official Opening */}
                <p className="text-[12px] text-justify leading-relaxed text-black">
                  A Polícia Civil do Estado do Ceará, por intermédio do Delegado de Polícia Civil abaixo assinado, no uso de suas atribuições legais,
                </p>

                {/* 5. Determination & Intimation Details (Com Nome em Negrito e Sublinhado, Endereço em Negrito e Telefone em Negrito) */}
                <p className="text-[12px] text-justify leading-relaxed text-black">
                  <strong className="font-bold">DETERMINA</strong>, ao(à) Oficial(a) Investigador(a) de Polícia Civil ou a quem este mandado for entregue, que proceda à <strong className="font-bold">INTIMAÇÃO</strong> de:{' '}
                  <span className="font-bold uppercase underline underline-offset-2">
                    {personName || '______________________________________________________'}
                  </span>,{' '}
                  residente em:{' '}
                  <strong className="font-bold">
                    {address || '___________________________________________________________________'}
                  </strong>,{' '}
                  telefone:{' '}
                  <strong className="font-bold">
                    {phone || '(  ) __________-_________'}
                  </strong>, para comparecer à <strong className="font-bold">1ª DELEGACIA DE POLICIA CIVIL DE MARACANAÚ</strong>, situado(a) na <strong className="font-bold">AVENIDA VI, Nº 410, CONJUNTO JEREISSATE I, CEP 61.900-670, MARACANAÚ/CE, tel. (85) 3101-7344</strong>.
                </p>

                {/* 6. Date and Time of Hearing (Com Data e Horário em Negrito e Sublinhados) */}
                <p className="text-[12px] text-justify leading-relaxed text-black">
                  O intimado deverá comparecer no dia{' '}
                  <span className="font-bold underline underline-offset-2">
                    {dateFormatted}
                  </span>, às{' '}
                  <span className="font-bold underline underline-offset-2">
                    {timeFormatted ? `${timeFormatted} hrs` : '_____:_____ hrs'}
                  </span>, para oitiva em procedimento policial.
                </p>

                {/* 7. Instructions & Tentativa de Intimação */}
                <div className="text-center pt-2 space-y-1">
                  <p className="text-[12px] font-black uppercase tracking-wider text-black font-sans">
                    TRAZER DOCUMENTO DE IDENTIFICAÇÃO E VIA DA INTIMAÇÃO.
                  </p>
                  <p className="text-[12px] font-black uppercase tracking-wider text-black font-sans">
                    {attemptNumber}ª TENTATIVA DE INTIMAÇÃO
                  </p>
                </div>

                {/* 8. Delegate Signature Block (com o Delegado Selecionado) */}
                <div className="pt-4 pb-1 text-center flex flex-col items-center">
                  <p className="text-[12px] text-left w-full pl-6 mb-5 font-normal">
                    Atenciosamente,
                  </p>
                  <div className="w-72 border-t border-black pt-1 mt-5 text-center">
                    <p className="text-[12px] font-bold text-black uppercase leading-tight">
                      {officerName || 'Fernando Moretto Nachtigall'}
                    </p>
                    <p className="text-[11px] text-zinc-800 leading-tight">
                      {officerMatricula ? `${officerMatricula} - ` : ''}{officerCargo || 'Delegado de Polícia Civil'}
                    </p>
                  </div>
                </div>

                {/* 9. Lower Return Receipt Section (Preenchível pelo OIP) */}
                <div className="pt-2.5 border-t border-zinc-300 text-[11px] leading-relaxed text-black space-y-1.5 font-sans">
                  
                  <p className="font-semibold">
                    INTIMADO(A): Recebi uma via deste mandado em _____/______/_______
                  </p>
                  
                  <p>
                    Assinatura Intimado(a): _________________________________________
                  </p>

                  {/* Checkbox Options */}
                  <div className="grid grid-cols-2 gap-y-0.5 pt-1 text-[10.5px]">
                    <div>( &nbsp; ) Não reside no endereço.</div>
                    <div>( &nbsp; ) Pessoa não foi encontrada.</div>
                    <div>( &nbsp; ) Endereço inexistente.</div>
                    <div>( &nbsp; ) Recusou-se a assinar ou a receber.</div>
                  </div>

                  <p className="pt-1.5">
                    Policial encarregado: ___________________________________ em ______/______/_______
                  </p>
                </div>

              </div>

              {/* Bottom Area: Standardized Official Footer */}
              <div className="pt-4 mt-2 border-t border-zinc-400 text-center font-sans">
                <p className="text-[10px] font-bold text-zinc-900 leading-tight">
                  1ª Delegacia de Maracanaú – Polícia Civil do Estado do Ceará
                </p>
                <p className="text-[9px] text-zinc-700 leading-tight mt-0.5">
                  Av. VI, 410, Jereissati I, Maracanaú/CE, CEP: 61.900-670, Fone: (85) 3101-7344 | Email: 1dpmaracanau@pc.ce.gov.br | Site: www.policiacivil.ce.gov.br
                </p>
                {/* Bottom decorative color bar of Ceará */}
                <div className="w-full h-1.5 bg-gradient-to-r from-[#008643] via-[#f9b233] to-[#008643] mt-1.5 rounded-full" />
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Modal Prompt do Número da Intimação e Tentativa */}
      <IntimationNumberPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onConfirm={handleConfirmPrompt}
        initialNumber={intimationNumber}
        initialAttempt={attemptNumber}
        actionTitle="Confirmar e Baixar PDF"
      />

      {/* Modal Seletor de Delegados para troca rápida no Mandado */}
      <DelegadoSelectorModal
        isOpen={isDelegadoModalOpen}
        onClose={() => setIsDelegadoModalOpen(false)}
        onSelectDelegado={handleSelectDelegado}
        currentSelectedNome={officerName}
        user={user}
      />

      {/* Modal de Notificação WhatsApp com opção de envio do PDF */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        oitiva={oitiva ? { ...oitiva, intimationNumber } : null}
        user={user}
        onMarkIntimationSent={onMarkIntimationSent}
      />
    </>
  );
};
