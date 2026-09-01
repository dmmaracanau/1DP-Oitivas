import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  FileText, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Info,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Send,
  FileCheck2,
  Hash
} from 'lucide-react';
import { Oitiva, UserProfile } from '../types/oitiva';
import { 
  formatWhatsAppMessageText, 
  formatDateBR,
  calculateAttemptNumber,
  formatIntimationNumberDisplay
} from '../utils/formatters';
import { 
  extractMandadoData, 
  downloadMandadoPdf, 
  MandadoPdfData 
} from '../utils/pdfGenerator';
import { DelegadoSelectorModal } from './DelegadoSelectorModal';
import { IntimationNumberPromptModal } from './IntimationNumberPromptModal';
import { DelegadoInfo, delegadoService } from '../services/delegadoService';
import { oitivaService } from '../services/oitivaService';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitiva: Oitiva | null;
  user: UserProfile | null;
  onMarkIntimationSent?: (oitivaId: string) => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  oitiva,
  user,
  onMarkIntimationSent
}) => {
  const currentYear = new Date().getFullYear();

  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [procedureNumber, setProcedureNumber] = useState('');
  const [procedureType, setProcedureType] = useState('');
  const [intimationNumber, setIntimationNumber] = useState(`01/${currentYear}`);
  const [attemptNumber, setAttemptNumber] = useState<number>(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [officerMatricula, setOfficerMatricula] = useState('');
  const [officerCargo, setOfficerCargo] = useState('Delegado de Polícia Civil');

  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDelegadoModalOpen, setIsDelegadoModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'both' | 'pdf' | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [, setLastAction] = useState<'both' | 'text' | 'pdf' | null>(null);

  useEffect(() => {
    if (oitiva && isOpen) {
      setPersonName(oitiva.personName || '');
      setPhone(oitiva.phone || '');
      setProcedureNumber(oitiva.procedureNumber || '');
      setProcedureType(oitiva.procedureType || '');
      setDate(oitiva.date || '');
      setTime(oitiva.time || '');
      setLocationOrLink(oitiva.locationOrLink || oitiva.modality || '1ª Delegacia de Polícia de Maracanaú');

      // Intimation number & Attempt calculation
      const initialIntimationNum = formatIntimationNumberDisplay(oitiva.intimationNumber);
      setIntimationNumber(initialIntimationNum);
      const calculatedAttempt = calculateAttemptNumber(oitiva);
      setAttemptNumber(calculatedAttempt);

      // Delegado de Polícia
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
      setFeedback(null);
      setLastAction(null);
    }
  }, [oitiva, user, isOpen, currentYear]);

  if (!isOpen || !oitiva) return null;

  const currentMessageText = formatWhatsAppMessageText({
    personName,
    date,
    time,
    procedureNumber,
    procedureType,
    locationOrLink,
    officerName,
    phone
  });

  const showMsg = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedback({ text, type });
  };

  const getCleanPhone = (): string => {
    const raw = phone.replace(/\D/g, '');
    if (raw.length >= 10) {
      return raw.startsWith('55') ? raw : `55${raw}`;
    }
    return '';
  };

  // Direct WhatsApp Web URL (avoids OS application picker completely)
  const getWhatsAppWebUrl = (): string => {
    const fullPhone = getCleanPhone();
    const encoded = encodeURIComponent(currentMessageText);
    if (fullPhone) {
      return `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;
    }
    return `https://web.whatsapp.com/send?text=${encoded}`;
  };

  const getMandadoData = (overrideNum?: string, overrideAttempt?: number): MandadoPdfData => {
    const base = extractMandadoData(oitiva, user);
    return {
      ...base,
      intimationNumber: overrideNum || intimationNumber,
      attemptNumber: overrideAttempt || attemptNumber,
      personName,
      procedureRef: procedureNumber ? (procedureType ? `${procedureType} nº ${procedureNumber}` : procedureNumber) : base.procedureRef,
      phone,
      timeFormatted: time,
      officerName,
      officerMatricula,
      officerCargo
    };
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(currentMessageText);
      setCopied(true);
      showMsg('Texto da intimação copiado para a área de transferência!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showMsg('Não foi possível copiar automaticamente.', 'error');
    }
  };

  const saveIntimationNumberInBackground = async (num: string) => {
    if (oitiva) {
      try {
        const currentUid = user?.uid || oitiva.uid || 'cartorio_maracanau';
        await oitivaService.update(oitiva.id, { intimationNumber: num }, currentUid);
      } catch (err) {
        console.warn('Erro ao salvar número da intimação:', err);
      }
    }
  };

  // 1. APENAS PDF
  const executeDownloadOnlyPdf = async (num: string, attempt: number) => {
    try {
      setIsGeneratingPdf(true);
      setIntimationNumber(num);
      setAttemptNumber(attempt);
      saveIntimationNumberInBackground(num);

      const data = getMandadoData(num, attempt);
      const cleanName = data.personName ? data.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Intimacao';
      const fileName = `Mandado_Intimacao_${cleanName}.pdf`;
      await downloadMandadoPdf(data, fileName);
      setLastAction('pdf');
      showMsg('Mandado de Intimação em PDF baixado com sucesso!', 'success');
      if (onMarkIntimationSent) {
        onMarkIntimationSent(oitiva.id);
      }
    } catch (err: any) {
      showMsg('Erro ao gerar o PDF da intimação.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. APENAS MENSAGEM WHATSAPP WEB
  const handleSendTextOnly = () => {
    try {
      navigator.clipboard?.writeText(currentMessageText).catch(() => {});
    } catch {}

    const url = getWhatsAppWebUrl();
    setLastAction('text');
    showMsg('Abrindo WhatsApp Web direto na conversa...', 'info');
    if (onMarkIntimationSent) {
      onMarkIntimationSent(oitiva.id);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 3. MENSAGEM + PDF DIRETO NO WHATSAPP WEB
  const executeSendTextAndPdf = async (num: string, attempt: number) => {
    setIsGeneratingPdf(true);
    setIntimationNumber(num);
    setAttemptNumber(attempt);
    saveIntimationNumberInBackground(num);

    const data = getMandadoData(num, attempt);
    const cleanName = data.personName ? data.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Intimacao';
    const fileName = `Mandado_Intimacao_${cleanName}.pdf`;

    try {
      // 1. Download the PDF directly
      await downloadMandadoPdf(data, fileName);

      // 2. Copy the text to clipboard as safety
      try {
        await navigator.clipboard.writeText(currentMessageText);
      } catch {}

      // 3. Open WhatsApp Web directly in a new tab
      const url = getWhatsAppWebUrl();
      window.open(url, '_blank', 'noopener,noreferrer');

      setLastAction('both');
      showMsg('PDF baixado e WhatsApp Web aberto! Basta arrastar o PDF para a conversa ou clicar em Anexar (📎).', 'success');

      if (onMarkIntimationSent) {
        onMarkIntimationSent(oitiva.id);
      }
    } catch (err: any) {
      showMsg('PDF baixado. Abrindo WhatsApp Web...', 'info');
      window.open(getWhatsAppWebUrl(), '_blank', 'noopener,noreferrer');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePromptConfirm = (num: string, attempt: number) => {
    setIsPromptModalOpen(false);
    if (pendingAction === 'both') {
      executeSendTextAndPdf(num, attempt);
    } else if (pendingAction === 'pdf') {
      executeDownloadOnlyPdf(num, attempt);
    }
  };

  const handleSelectDelegado = (delegado: DelegadoInfo) => {
    setOfficerName(delegado.nome);
    setOfficerMatricula(delegado.matricula ? `Mat. ${delegado.matricula}` : '');
    setOfficerCargo(delegado.cargo || 'Delegado de Polícia Civil');
    showMsg(`Delegado(a) signatário(a) alterado(a) para ${delegado.nome}`, 'success');
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm no-print overflow-y-auto"
        // Note: Backdrop click close removed per explicit user requirement - closes only via X or button
      >
        <div className="bg-[#120f1e] border-2 border-emerald-500/60 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl shadow-emerald-950/80 flex flex-col my-auto">
          
          {/* Header Compacto */}
          <div className="p-4 sm:p-5 border-b-2 border-purple-900/50 bg-[#161226] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 border-2 border-emerald-400/60 flex items-center justify-center text-emerald-200 shadow-md">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Notificação Oficial de Intimação via WhatsApp Web
                  </h2>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full font-mono">
                    INTIMAÇÃO {intimationNumber}
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                    {attemptNumber}ª Tentativa
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  1ª Delegacia de Polícia de Maracanaú • PCCE • Envio Direto via WhatsApp Web
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingAction('both');
                  setIsPromptModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Ajustar Número da Intimação"
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Nº Intimação ({intimationNumber})</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-purple-950/60 border border-purple-900/40 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div className={`mx-6 mt-3 p-3 rounded-2xl text-xs flex items-center justify-between gap-3 border shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : feedback.type === 'info'
                ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="leading-relaxed font-medium">{feedback.text}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getWhatsAppWebUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Reabrir WhatsApp Web</span>
                </a>
              </div>
            </div>
          )}

          {/* Instruções Rápidas de Envio */}
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-[#151026] border border-purple-900/30 rounded-2xl shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <span>Baixa o Mandado em <strong>PDF Oficial</strong></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <span>Abre o <strong>WhatsApp Web</strong> no chat com o texto pronto</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                <span>Arraste o PDF baixado ou use o clipe 📎</span>
              </div>
            </div>
          </div>

          {/* Body: Grid com 3 colunas compactas preenchendo os 90% de tela */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* COLUNA 1: DADOS DA OITIVA & AUTORIDADE (4 Cols) */}
            <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-purple-900/30">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Dados do Mandado
                  </h3>
                </div>

                {/* Número da Intimação & Tentativa */}
                <div className="grid grid-cols-2 gap-2 bg-[#171326] p-3 rounded-2xl border border-purple-900/30">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block">Nº da Intimação:</label>
                    <input
                      type="text"
                      value={intimationNumber}
                      onChange={(e) => setIntimationNumber(e.target.value)}
                      placeholder={`01/${currentYear}`}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block">Tentativa:</label>
                    <select
                      value={attemptNumber}
                      onChange={(e) => setAttemptNumber(Number(e.target.value))}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value={1}>1ª Tentativa</option>
                      <option value={2}>2ª Tentativa</option>
                      <option value={3}>3ª Tentativa</option>
                      <option value={4}>4ª Tentativa</option>
                      <option value={5}>5ª Tentativa</option>
                    </select>
                  </div>
                </div>

                {/* Intimado & Telefone */}
                <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/30 space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block">Intimado(a):</label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block">WhatsApp / Telefone com DDD:</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(85) 99999-9999"
                        className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-emerald-300 font-mono font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Procedimento, Data, Hora & Local */}
                <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/30 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Procedimento Policial:</span>
                    <span className="font-semibold text-zinc-200 text-xs">
                      {procedureType ? `${procedureType} nº ${procedureNumber || 'S/N'}` : (procedureNumber || 'Em andamento')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-900/20">
                    <div>
                      <span className="text-[10px] text-zinc-400 block flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-400" /> Data:
                      </span>
                      <span className="font-bold text-white text-xs">{formatDateBR(date)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" /> Horário:
                      </span>
                      <span className="font-bold text-white text-xs">{time ? `${time}h` : 'A definir'}</span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-purple-900/20">
                    <span className="text-[10px] text-zinc-400 block flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-purple-400" /> Local / Sala:
                    </span>
                    <span className="text-zinc-300 text-xs font-medium">{locationOrLink}</span>
                  </div>
                </div>

                {/* Autoridade Policial Signatária */}
                <div className="bg-[#1a142e] border border-amber-500/30 p-3 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Autoridade Signatária (DPC)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDelegadoModalOpen(true)}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Trocar
                    </button>
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-white">{officerName}</p>
                    <p className="text-[10px] text-zinc-400">{officerMatricula} • {officerCargo}</p>
                  </div>
                </div>
              </div>

              {/* Informação sobre validade */}
              <div className="p-3 bg-purple-950/30 border border-purple-900/40 rounded-2xl text-[11px] text-purple-300/80 leading-relaxed flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  O texto e o PDF contêm as advertências legais da Polícia Civil do Estado do Ceará para comparecimento oficial.
                </span>
              </div>
            </div>

            {/* COLUNA 2: PRÉVIA DA MENSAGEM WHATSAPP (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-purple-900/30">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Mensagem Formatada (WhatsApp)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-purple-950/50 border border-purple-800/40 transition-colors cursor-pointer font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>

              {/* Simulador da Tela do WhatsApp */}
              <div className="flex-1 bg-[#0b141a] border border-[#222d34] rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                {/* Chat Top bar */}
                <div className="flex items-center justify-between pb-2 border-b border-emerald-950/60 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-700/60 flex items-center justify-center text-white text-[11px] font-bold">
                      PC
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{personName || 'Intimado'}</p>
                      <p className="text-[10px] text-emerald-400 font-mono">{phone || 'Sem telefone informado'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500">Hoje</span>
                </div>

                {/* Message Bubble */}
                <div className="bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tl-sm p-3.5 text-xs font-sans whitespace-pre-wrap leading-relaxed shadow select-text overflow-y-auto max-h-[44vh]">
                  {currentMessageText}
                </div>

                {/* Chat Footer info */}
                <div className="pt-2 mt-2 border-t border-emerald-950/60 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Visualização prévia do texto enviado</span>
                  <span className="text-emerald-400">PCCE Cartório</span>
                </div>
              </div>
            </div>

            {/* COLUNA 3: AÇÕES E ENVIO (3 Cols) */}
            <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-purple-900/30">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Disparo WhatsApp Web
                  </h3>
                </div>

                {/* OPÇÃO 1: DESTAQUE MENSAGEM + PDF NO WHATSAPP WEB */}
                <div className="bg-gradient-to-br from-[#1b1233] to-[#0f231e] border-2 border-emerald-500/60 rounded-2xl p-4 space-y-3 shadow-lg shadow-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs font-bold shrink-0">
                      1
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      Enviar no WhatsApp Web (Texto + PDF)
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Pede o número da intimação, baixa o Mandado em PDF automaticamente e abre o WhatsApp Web com o texto pronto.
                  </p>
                  
                  <button
                    id="btn-send-whatsapp-both"
                    type="button"
                    onClick={() => {
                      setPendingAction('both');
                      setIsPromptModalOpen(true);
                    }}
                    disabled={isGeneratingPdf}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isGeneratingPdf ? 'Baixando Mandado...' : 'Abrir WhatsApp Web + Baixar PDF'}</span>
                  </button>
                </div>

                {/* OPÇÃO 2: APENAS ABRIR WHATSAPP WEB */}
                <div className="bg-[#171326] border border-purple-900/40 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-[10px] font-bold shrink-0">
                      2
                    </span>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Abrir WhatsApp Web (Apenas Texto)
                    </h4>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Abre diretamente a conversa do WhatsApp Web com a intimação digitada.
                  </p>

                  <button
                    id="link-send-whatsapp-text"
                    type="button"
                    onClick={handleSendTextOnly}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#241a3f] hover:bg-emerald-950/70 text-emerald-300 hover:text-white border border-emerald-600/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Conversa no WhatsApp Web</span>
                  </button>
                </div>

                {/* OPÇÃO 3: APENAS BAIXAR PDF */}
                <div className="bg-[#171326] border border-purple-900/40 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-[10px] font-bold shrink-0">
                      3
                    </span>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Apenas Baixar Mandado PDF
                    </h4>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Pede o número da intimação e gera o arquivo PDF do Mandado.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingAction('pdf');
                      setIsPromptModalOpen(true);
                    }}
                    disabled={isGeneratingPdf}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#241a3f] hover:bg-purple-950 text-purple-200 hover:text-white border border-purple-700/40 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>Baixar Arquivo PDF (A4)</span>
                  </button>
                </div>
              </div>

              {/* Dica e link de segurança */}
              <div className="p-3 bg-[#161226] border border-purple-900/30 rounded-2xl space-y-1">
                <p className="text-[10px] font-semibold text-zinc-300 flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                  Registro no Cartório:
                </p>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Ao acionar qualquer envio, a oitiva é marcada como <strong>intimada</strong> na pauta do cartório.
                </p>
              </div>
            </div>

          </div>

          {/* Footer Compacto */}
          <div className="p-3 sm:p-4 border-t border-purple-900/40 bg-[#161226] flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>WhatsApp Web • 1ª Delegacia de Maracanaú</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#201838] hover:bg-purple-950 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold border border-purple-800/40 transition-all cursor-pointer"
            >
              Fechar Janela
            </button>
          </div>

        </div>
      </div>

      {/* Modal Prompt do Número da Intimação e Tentativa */}
      <IntimationNumberPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onConfirm={handlePromptConfirm}
        initialNumber={intimationNumber}
        initialAttempt={attemptNumber}
        actionTitle={pendingAction === 'both' ? 'Confirmar e Abrir WhatsApp' : 'Confirmar e Baixar PDF'}
      />

      {/* Selector de Delegado */}
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
