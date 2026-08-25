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
  UserCheck
} from 'lucide-react';
import { Oitiva, UserProfile } from '../types/oitiva';
import { 
  formatWhatsAppMessageText, 
  formatDateBR, 
  formatAddressCompleto 
} from '../utils/formatters';
import { 
  extractMandadoData, 
  downloadMandadoPdf, 
  getMandadoPdfFile, 
  MandadoPdfData 
} from '../utils/pdfGenerator';
import { DelegadoSelectorModal } from './DelegadoSelectorModal';
import { DelegadoInfo, delegadoService } from '../services/delegadoService';

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
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [procedureNumber, setProcedureNumber] = useState('');
  const [procedureType, setProcedureType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [officerMatricula, setOfficerMatricula] = useState('');
  const [officerCargo, setOfficerCargo] = useState('Delegado de Polícia Civil');

  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDelegadoModalOpen, setIsDelegadoModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    if (oitiva && isOpen) {
      setPersonName(oitiva.personName || '');
      setPhone(oitiva.phone || '');
      setProcedureNumber(oitiva.procedureNumber || '');
      setProcedureType(oitiva.procedureType || '');
      setDate(oitiva.date || '');
      setTime(oitiva.time || '');
      setLocationOrLink(oitiva.locationOrLink || oitiva.modality || '1ª Delegacia de Polícia de Maracanaú');

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
    }
  }, [oitiva, user, isOpen]);

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
    setTimeout(() => setFeedback(null), 5000);
  };

  const getCleanPhone = (): string => {
    const raw = phone.replace(/\D/g, '');
    if (raw.length >= 10) {
      return raw.startsWith('55') ? raw : `55${raw}`;
    }
    return '';
  };

  const getWhatsAppWebUrl = (customText?: string): string => {
    const fullPhone = getCleanPhone();
    const encoded = encodeURIComponent(customText || currentMessageText);
    if (fullPhone) {
      return `https://wa.me/${fullPhone}?text=${encoded}`;
    }
    return `https://wa.me/?text=${encoded}`;
  };

  const getMandadoData = (): MandadoPdfData => {
    const base = extractMandadoData(oitiva, user);
    return {
      ...base,
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

  const handleDownloadOnlyPdf = () => {
    try {
      setIsGeneratingPdf(true);
      const data = getMandadoData();
      downloadMandadoPdf(data);
      showMsg('PDF do Mandado de Intimação baixado com sucesso!', 'success');
      if (onMarkIntimationSent) {
        onMarkIntimationSent(oitiva.id);
      }
    } catch (err: any) {
      showMsg('Erro ao gerar o PDF da intimação.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendTextOnly = () => {
    const url = getWhatsAppWebUrl();
    if (onMarkIntimationSent) {
      onMarkIntimationSent(oitiva.id);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendTextAndPdf = async () => {
    setIsGeneratingPdf(true);
    const data = getMandadoData();

    try {
      const pdfFile = getMandadoPdfFile(data);

      // Check if Web Share API with Files is supported (mobile / tablets / compatible browsers)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Mandado de Intimação - ${personName || 'PCCE'}`,
          text: currentMessageText,
          files: [pdfFile]
        });
        showMsg('Intimação e PDF compartilhados com sucesso!', 'success');
        if (onMarkIntimationSent) {
          onMarkIntimationSent(oitiva.id);
        }
        return;
      }

      // Fallback for Desktop / WhatsApp Web:
      // 1. Download the PDF directly for the officer
      downloadMandadoPdf(data);
      
      // 2. Open WhatsApp Web / App with text pre-filled
      const url = getWhatsAppWebUrl();
      window.open(url, '_blank', 'noopener,noreferrer');

      if (onMarkIntimationSent) {
        onMarkIntimationSent(oitiva.id);
      }

      showMsg('PDF baixado e WhatsApp aberto! Arraste ou anexe o arquivo baixado na conversa para enviar tudo junto.', 'info');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showMsg('Erro ao processar envio com PDF. Tentando abrir WhatsApp...', 'error');
        window.open(getWhatsAppWebUrl(), '_blank', 'noopener,noreferrer');
      }
    } finally {
      setIsGeneratingPdf(false);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm no-print overflow-y-auto">
        <div className="bg-[#120f1e] border border-purple-900/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-purple-950/70 flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-purple-900/40 bg-[#161226] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shadow-md">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Notificação Oficial por WhatsApp
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    Texto + PDF
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  1ª Delegacia de Polícia de Maracanaú • Intimação Eletrônica
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-purple-950/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div className={`mx-5 mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 border shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : feedback.type === 'info'
                ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="leading-relaxed">{feedback.text}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* Quick Metadata Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#171326] p-3 rounded-2xl border border-purple-900/30">
              <div>
                <span className="text-[10px] text-zinc-400 block">Intimado(a):</span>
                <span className="font-bold text-white text-xs">{personName || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">WhatsApp de Envio:</span>
                <span className="font-mono text-emerald-300 text-xs font-semibold">{phone || 'Sem telefone informado'}</span>
              </div>
            </div>

            {/* Delegate Selector Strip */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-[#1a142e] border border-purple-900/40 rounded-xl text-xs">
              <div className="flex items-center gap-2 truncate">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-zinc-300 truncate">
                  Autoridade Signatária: <strong className="text-white">{officerName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDelegadoModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
              >
                <UserCheck className="w-3 h-3" />
                <span>Trocar DPC</span>
              </button>
            </div>

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                  <span>Mensagem Formatada para o WhatsApp</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-white px-2 py-0.5 rounded-md hover:bg-purple-950/50 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>

              {/* Chat-style Preview Bubble */}
              <div className="bg-[#0b141a] border border-emerald-900/40 rounded-2xl p-4 text-xs font-sans text-[#e9edef] whitespace-pre-wrap leading-relaxed shadow-inner select-text">
                {currentMessageText}
              </div>
            </div>

            {/* Explanatory Info Card */}
            <div className="bg-[#151025] border border-purple-900/30 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-zinc-300">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-purple-200">
                  Envio Completo com Documento Oficial (PDF)
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  O botão <strong>"Enviar Mensagem + PDF"</strong> gera automaticamente o Mandado de Intimação em alta resolução com o cabeçalho e a assinatura da autoridade, baixando o arquivo e abrindo o WhatsApp com a mensagem pronta para anexar e enviar.
                </p>
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="p-4 sm:p-5 border-t border-purple-900/40 bg-[#161226] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              {/* Baixar apenas PDF */}
              <button
                type="button"
                onClick={handleDownloadOnlyPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#201838] hover:bg-purple-950/60 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold border border-purple-800/40 transition-all cursor-pointer disabled:opacity-50"
                title="Baixar apenas o PDF do Mandado"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Baixar PDF</span>
              </button>

              {/* Enviar apenas Texto */}
              <button
                type="button"
                onClick={handleSendTextOnly}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#201838] hover:bg-purple-950/60 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-semibold border border-emerald-800/40 transition-all cursor-pointer"
                title="Abrir WhatsApp apenas com o texto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Apenas Texto</span>
              </button>
            </div>

            {/* Primary Action: Enviar Mensagem + PDF */}
            <button
              id="btn-whatsapp-send-all"
              type="button"
              onClick={handleSendTextAndPdf}
              disabled={isGeneratingPdf}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Gerando Intimação...' : 'Enviar Mensagem + PDF'}</span>
            </button>

          </div>

        </div>
      </div>

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
