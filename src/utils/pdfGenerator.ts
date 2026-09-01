import { jsPDF } from 'jspdf';
import { Oitiva, UserProfile } from '../types/oitiva';
import { 
  formatDateExtenso, 
  formatAddressCompleto, 
  getUserInitials,
  calculateAttemptNumber,
  formatIntimationNumberDisplay
} from './formatters';
import { delegadoService } from '../services/delegadoService';

export interface MandadoPdfData {
  procedureRef: string;
  oipInitials: string;
  intimationNumber?: string; // Número/ano da intimação, ex: "01/2026"
  attemptNumber?: number; // Tentativa da intimação (1ª, 2ª...)
  personName: string;
  address: string;
  phone: string;
  dateFormatted: string;
  timeFormatted: string;
  officerName: string;
  officerMatricula: string;
  officerCargo: string;
}

export function extractMandadoData(oitiva: Oitiva, user?: UserProfile | null): MandadoPdfData {
  const ref = oitiva.procedureNumber
    ? (oitiva.procedureType ? `${oitiva.procedureType} nº ${oitiva.procedureNumber}` : oitiva.procedureNumber)
    : '';

  const clerkOrUser = user?.displayName || oitiva.clerkName || 'Policial';
  const oip = getUserInitials(clerkOrUser);

  const targetOfficerName = oitiva.officerName || 'Fernando Moretto Nachtigall';
  const allDelegados = delegadoService.getDelegados();
  const matched = allDelegados.find(d => d.nome.toLowerCase() === targetOfficerName.toLowerCase());

  let offName = targetOfficerName;
  let offMat = user?.registrationNumber ? `Mat. ${user.registrationNumber}` : 'Mat. 301.942-1-0';
  let offCargo = 'Delegado de Polícia Civil';

  if (matched) {
    offName = matched.nome;
    offMat = matched.matricula ? `Mat. ${matched.matricula}` : '';
    offCargo = matched.cargo || 'Delegado de Polícia Civil';
  }

  const intimationNum = formatIntimationNumberDisplay(oitiva.intimationNumber);
  const attemptNum = calculateAttemptNumber(oitiva);

  return {
    procedureRef: ref,
    oipInitials: oip,
    intimationNumber: intimationNum,
    attemptNumber: attemptNum,
    personName: oitiva.personName || '',
    address: formatAddressCompleto(oitiva),
    phone: oitiva.phone || '',
    dateFormatted: formatDateExtenso(oitiva.date),
    timeFormatted: oitiva.time || '',
    officerName: offName,
    officerMatricula: offMat,
    officerCargo: offCargo
  };
}

// Cache for the official header image in base64 format to avoid reloading on every export
let cachedHeaderImageDataUrl: string | null = null;
let cachedHeaderAspectRatio: number = 0.23; // default header aspect ratio

export async function loadOfficialHeaderImage(): Promise<{ dataUrl: string; aspectRatio: number } | null> {
  if (cachedHeaderImageDataUrl) {
    return { dataUrl: cachedHeaderImageDataUrl, aspectRatio: cachedHeaderAspectRatio };
  }

  const sources = [
    '/images/cabecalho-oficial.png',
    './images/cabecalho-oficial.png',
    'https://lh3.googleusercontent.com/d/1H0TRKiVUk9VHOJA0j2ShtFNqQKhzRFW7',
    'https://drive.google.com/thumbnail?id=1H0TRKiVUk9VHOJA0j2ShtFNqQKhzRFW7&sz=w1600'
  ];

  for (const src of sources) {
    try {
      const res = await new Promise<{ dataUrl: string; aspectRatio: number }>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const w = img.naturalWidth || img.width || 1200;
            const h = img.naturalHeight || img.height || 276;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              const aspectRatio = h / w;
              cachedHeaderImageDataUrl = dataUrl;
              cachedHeaderAspectRatio = aspectRatio;
              resolve({ dataUrl, aspectRatio });
            } else {
              reject(new Error('Canvas context not available'));
            }
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = (e) => reject(e);
        img.src = src;
      });

      if (res && res.dataUrl) {
        return res;
      }
    } catch {
      // Continue to next image source
    }
  }

  return null;
}

// Pre-load header on module load for instant generation
if (typeof window !== 'undefined') {
  loadOfficialHeaderImage().catch(() => {});
}

interface TextSpan {
  text: string;
  bold?: boolean;
  underline?: boolean;
}

/**
 * Renderiza um parágrafo formatado com suporte a trechos em negrito e sublinhados,
 * calculando quebra de linha de forma precisa sem distorcer o fluxo de texto.
 */
function renderFormattedParagraph(
  doc: jsPDF,
  spans: TextSpan[],
  startX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number = 4.6
): number {
  let currentX = startX;
  let currentY = startY;

  interface Token {
    word: string;
    bold: boolean;
    underline: boolean;
    isSpace: boolean;
  }

  const tokens: Token[] = [];

  for (const span of spans) {
    if (!span.text) continue;
    // Divide respeitando e preservando os espaços
    const parts = span.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      tokens.push({
        word: part,
        bold: Boolean(span.bold),
        underline: Boolean(span.underline),
        isSpace: /^\s+$/.test(part)
      });
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Se estiver no início da linha e for espaço em branco, ignora
    if (currentX === startX && token.isSpace) {
      continue;
    }

    doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
    const wordWidth = doc.getTextWidth(token.word);

    // Se a palavra ultrapassar a largura máxima, faz quebra de linha
    if (!token.isSpace && currentX + wordWidth > startX + maxWidth && currentX > startX) {
      currentX = startX;
      currentY += lineHeight;
    }

    // Desenha a palavra
    doc.text(token.word, currentX, currentY);

    // Desenha sublinhado se solicitado para tokens que não sejam apenas espaço
    if (token.underline && !token.isSpace) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.28);
      doc.line(currentX, currentY + 0.6, currentX + wordWidth, currentY + 0.6);
    }

    currentX += wordWidth;
  }

  return currentY + lineHeight;
}

/**
 * Direct PDF vector generator with formatted bold runs and styled sections.
 * 100% vector-based, crisp text, zero external canvas dependencies, no color parsing errors.
 */
export async function generateMandadoPdf(data: MandadoPdfData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const marginX = 22;
  const contentWidth = pageWidth - (marginX * 2); // 166mm
  let currentY = 16;

  // 1. Official Header Image (PCCE / Governo do Estado do Ceará)
  const headerImg = await loadOfficialHeaderImage();

  if (headerImg && headerImg.dataUrl) {
    const headerWidth = 148;
    const headerHeight = headerWidth * (headerImg.aspectRatio || 0.23);
    const headerX = (pageWidth - headerWidth) / 2;

    doc.addImage(headerImg.dataUrl, 'PNG', headerX, currentY, headerWidth, headerHeight);
    currentY += headerHeight + 5;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('GOVERNO DO ESTADO DO CEARÁ', pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFontSize(9);
    doc.text('SECRETARIA DA SEGURANÇA PÚBLICA E DEFESA SOCIAL', pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFontSize(9.5);
    doc.text('POLÍCIA CIVIL DO ESTADO DO CEARÁ', pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('1ª DELEGACIA METROPOLITANA DE MARACANAÚ', pageWidth / 2, currentY, { align: 'center' });

    currentY += 3;
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 4;
  }

  // 2. Title: MANDADO DE INTIMAÇÃO (Fonte um pouco maior e negrito)
  currentY += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(0, 0, 0);
  doc.text('MANDADO DE INTIMAÇÃO', pageWidth / 2, currentY, { align: 'center' });

  // 2.1 Subtitle: INTIMAÇÃO XX/XXXX (Fonte maior, negrito e com mais destaque)
  currentY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const currentYear = new Date().getFullYear();
  const rawNum = data.intimationNumber ? data.intimationNumber.trim() : `01/${currentYear}`;
  const intimationTitle = rawNum.toUpperCase().startsWith('INTIMAÇÃO') 
    ? rawNum.toUpperCase() 
    : `INTIMAÇÃO ${rawNum.toUpperCase()}`;
  doc.text(intimationTitle, pageWidth / 2, currentY, { align: 'center' });

  // 3. References (Ref and OIP) - com quebra de linha maior após o número da intimação
  currentY += 9;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Ref.: ', marginX, currentY);
  const refLabelWidth = doc.getTextWidth('Ref.: ');
  doc.setFont('helvetica', 'normal');
  doc.text(data.procedureRef || '_______________________', marginX + refLabelWidth, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text('OIP: ', marginX, currentY);
  const oipLabelWidth = doc.getTextWidth('OIP: ');
  doc.setFont('helvetica', 'normal');
  doc.text(data.oipInitials || '____________', marginX + oipLabelWidth, currentY);

  // 4. Opening text com espaçamento harmonioso antes do início do texto
  currentY += 7.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const openingText = 'A Polícia Civil do Estado do Ceará, por intermédio do Delegado de Polícia Civil abaixo assinado, no uso de suas atribuições legais,';
  const splitOpening = doc.splitTextToSize(openingText, contentWidth);
  doc.text(splitOpening, marginX, currentY);
  currentY += (splitOpening.length * 4.5) + 3;

  // 5. Determination & Intimation Details (com nome em negrito e sublinhado, endereço em negrito, telefone em negrito)
  const personStr = data.personName.toUpperCase() || '______________________________________________________';
  const addrStr = data.address || '___________________________________________________________________';
  const phoneStr = data.phone || '(  ) __________-_________';

  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);

  const bodySpans: TextSpan[] = [
    { text: 'DETERMINA', bold: true },
    { text: ', ao(à) Oficial(a) Investigador(a) de Polícia Civil ou a quem este mandado for entregue, que proceda à ' },
    { text: 'INTIMAÇÃO', bold: true },
    { text: ' de: ' },
    { text: personStr, bold: true, underline: true },
    { text: ', residente em: ' },
    { text: addrStr, bold: true },
    { text: ', telefone: ' },
    { text: phoneStr, bold: true },
    { text: ', para comparecer à ' },
    { text: '1ª DELEGACIA DE POLICIA CIVIL DE MARACANAÚ', bold: true },
    { text: ', situado(a) na ' },
    { text: 'AVENIDA VI, Nº 410, CONJUNTO JEREISSATE I, CEP 61.900-670, MARACANAÚ/CE, tel. (85) 3101-7344.', bold: true }
  ];

  currentY = renderFormattedParagraph(doc, bodySpans, marginX, currentY, contentWidth, 4.6);
  currentY += 2;

  // 6. Date and Time (com data e horário em negrito e sublinhados)
  const timeDisplay = data.timeFormatted ? `${data.timeFormatted} hrs` : '_____:_____ hrs';
  const dateSpans: TextSpan[] = [
    { text: 'O intimado deverá comparecer no dia ' },
    { text: data.dateFormatted, bold: true, underline: true },
    { text: ', às ' },
    { text: timeDisplay, bold: true, underline: true },
    { text: ', para oitiva em procedimento policial.' }
  ];

  currentY = renderFormattedParagraph(doc, dateSpans, marginX, currentY, contentWidth, 4.6);
  currentY += 3;

  // 7. Important instruction & Tentativa de Intimação (Xª TENTATIVA DE INTIMAÇÃO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TRAZER DOCUMENTO DE IDENTIFICAÇÃO E VIA DA INTIMAÇÃO.', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  const attempt = data.attemptNumber || 1;
  const attemptStr = `${attempt}ª TENTATIVA DE INTIMAÇÃO`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(attemptStr, pageWidth / 2, currentY, { align: 'center' });

  // 8. Sign-off & Delegate Signature
  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Atenciosamente,', marginX, currentY);

  currentY += 14;
  const sigLineWidth = 75;
  const sigStartX = (pageWidth - sigLineWidth) / 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(sigStartX, currentY, sigStartX + sigLineWidth, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(data.officerName.toUpperCase() || 'FERNANDO MORETTO NACHTIGALL', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const sigSub = data.officerMatricula 
    ? `${data.officerMatricula} - ${data.officerCargo || 'Delegado de Polícia Civil'}`
    : (data.officerCargo || 'Delegado de Polícia Civil');
  doc.text(sigSub, pageWidth / 2, currentY, { align: 'center' });

  // 9. Receipt / Contra-fé section
  currentY += 7.5;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INTIMADO(A): Recebi uma via deste mandado em _____/______/_______', marginX, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura Intimado(a): ____________________________________________________', marginX, currentY);

  currentY += 5;
  doc.setFontSize(8);
  doc.text('(   ) Não reside no endereço.                 (   ) Pessoa não foi encontrada.', marginX, currentY);
  currentY += 4;
  doc.text('(   ) Endereço inexistente.                    (   ) Recusou-se a assinar ou a receber.', marginX, currentY);

  currentY += 5.5;
  doc.text('Policial encarregado: ___________________________________ em ______/______/_______', marginX, currentY);

  // 10. Footer info
  const footerY = 278;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('1ª Delegacia de Maracanaú – Polícia Civil do Estado do Ceará', pageWidth / 2, footerY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Av. VI, 410, Jereissati I, Maracanaú/CE, CEP: 61.900-670, Fone: (85) 3101-7344', pageWidth / 2, footerY + 3.5, { align: 'center' });
  doc.text('Email: 1dpmaracanau@pc.ce.gov.br  |  Site: www.policiacivil.ce.gov.br', pageWidth / 2, footerY + 7, { align: 'center' });

  // CE decorative color bar (Green / Gold / Green)
  const barY = footerY + 9.5;
  doc.setFillColor(0, 134, 67); // Green #008643
  doc.rect(marginX, barY, contentWidth * 0.35, 1.2, 'F');
  doc.setFillColor(249, 178, 51); // Gold #f9b233
  doc.rect(marginX + (contentWidth * 0.35), barY, contentWidth * 0.30, 1.2, 'F');
  doc.setFillColor(0, 134, 67); // Green #008643
  doc.rect(marginX + (contentWidth * 0.65), barY, contentWidth * 0.35, 1.2, 'F');

  return doc;
}

export async function downloadMandadoPdf(data: MandadoPdfData, fileName?: string): Promise<void> {
  const doc = await generateMandadoPdf(data);
  const cleanName = data.personName ? data.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Intimacao';
  const name = fileName || `Mandado_Intimacao_${cleanName}.pdf`;
  doc.save(name);
}

export async function getMandadoPdfFile(data: MandadoPdfData, fileName?: string): Promise<File> {
  const doc = await generateMandadoPdf(data);
  const cleanName = data.personName ? data.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Intimacao';
  const name = fileName || `Mandado_Intimacao_${cleanName}.pdf`;
  const blob = doc.output('blob');
  return new File([blob], name, { type: 'application/pdf' });
}

export interface TermoScheduleAttempt {
  order: number;
  label: string;
  dateFormatted: string;
  timeFormatted: string;
  description?: string;
  isCurrent?: boolean;
}

export interface TermoNaoComparecimentoPdfData {
  procedureRef: string;
  personName: string;
  cpf?: string;
  rg?: string;
  address?: string;
  phone?: string;
  role?: string;
  dateFormatted: string;
  timeFormatted: string;
  scheduleAttempts?: TermoScheduleAttempt[];
  termoDateFormatted?: string;
  motivoCategoria: string;
  motivoDetalhado: string;
  dpcName: string;
  dpcMatricula: string;
  dpcCargo: string;
  oip1Name: string;
  oip1Matricula: string;
  oip1Cargo: string;
  oip2Name: string;
  oip2Matricula: string;
  oip2Cargo: string;
}

/**
 * Direct PDF vector generator for "TERMO DE NÃO COMPARECIMENTO"
 * With official PCCE header, legal text, reason details, full notifications/reschedules list, and signatures for 1 DPC and 2 OIPs.
 */
export async function generateTermoNaoComparecimentoPdf(data: TermoNaoComparecimentoPdfData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const marginX = 22;
  const contentWidth = pageWidth - (marginX * 2); // 166mm
  let currentY = 16;

  // 1. Official Header Image (PCCE / Governo do Estado do Ceará)
  const headerImg = await loadOfficialHeaderImage();

  if (headerImg && headerImg.dataUrl) {
    const headerWidth = 148;
    const headerHeight = headerWidth * (headerImg.aspectRatio || 0.23);
    const headerX = (pageWidth - headerWidth) / 2;

    doc.addImage(headerImg.dataUrl, 'PNG', headerX, currentY, headerWidth, headerHeight);
    currentY += headerHeight + 5;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('GOVERNO DO ESTADO DO CEARÁ', pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFontSize(9);
    doc.text('SECRETARIA DA SEGURANÇA PÚBLICA E DEFESA SOCIAL', pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFontSize(9.5);
    doc.text('POLÍCIA CIVIL DO ESTADO DO CEARÁ', pageWidth / 2, currentY, { align: 'center' });

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('1ª DELEGACIA METROPOLITANA DE MARACANAÚ', pageWidth / 2, currentY, { align: 'center' });

    currentY += 3;
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 4;
  }

  // 2. Title: TERMO DE NÃO COMPARECIMENTO
  currentY += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(0, 0, 0);
  doc.text('TERMO DE NÃO COMPARECIMENTO', pageWidth / 2, currentY, { align: 'center' });

  // 2.1 Subtitle: Procedimento / Ref
  currentY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const procTitle = data.procedureRef ? `PROCEDIMENTO: ${data.procedureRef.toUpperCase()}` : 'PROCEDIMENTO POLICIAL';
  doc.text(procTitle, pageWidth / 2, currentY, { align: 'center' });

  // 3. Opening certidão text
  currentY += 8;
  const termoDataStr = data.termoDateFormatted || data.dateFormatted;
  const timeDisplay = data.timeFormatted ? `${data.timeFormatted}h` : 'horário aprazado';

  const introSpans: TextSpan[] = [
    { text: 'Aos ' },
    { text: termoDataStr, bold: true },
    { text: ', nesta cidade de Maracanaú, Estado do Ceará, no Cartório da ' },
    { text: '1ª DELEGACIA METROPOLITANA DE MARACANAÚ', bold: true },
    { text: ', sob a presidência do(a) Delegado(a) de Polícia Civil ' },
    { text: data.dpcName.toUpperCase(), bold: true },
    { text: (data.dpcMatricula ? ` (${data.dpcMatricula})` : '') + ', com a presença dos Oficiais de Investigação Policial (OIP) adiante qualificados e assinados, foi formalmente ' },
    { text: 'CERTIFICADA A AUSÊNCIA E NÃO COMPARECIMENTO', bold: true, underline: true },
    { text: ' da seguinte pessoa intimada:' }
  ];

  currentY = renderFormattedParagraph(doc, introSpans, marginX, currentY, contentWidth, 4.4);
  currentY += 2.5;

  // 4. Box de Qualificação do Intimado com Todas as Datas/Horários e Notificações Tentadas
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);

  const boxStartY = currentY;
  const personNameStr = data.personName ? data.personName.toUpperCase() : 'NÃO INFORMADO';
  const roleStr = data.role || 'OITIVA / DECLARANTE';
  const docInfo = [
    data.cpf ? `CPF: ${data.cpf}` : null,
    data.rg ? `RG: ${data.rg}` : null,
    data.phone ? `Tel: ${data.phone}` : null
  ].filter(Boolean).join('  |  ') || 'Documento não informado';

  const addrStr = data.address || 'Endereço não informado';

  let boxTextY = boxStartY + 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`INTIMANDO(A): ${personNameStr}`, marginX + 3, boxTextY);

  boxTextY += 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Condição: ${roleStr}  •  ${docInfo}`, marginX + 3, boxTextY);

  boxTextY += 4.2;
  doc.text(`Endereço: ${addrStr}`, marginX + 3, boxTextY);

  const attempts = data.scheduleAttempts && data.scheduleAttempts.length > 0
    ? data.scheduleAttempts
    : [{
        order: 1,
        label: '1ª Notificação',
        dateFormatted: data.dateFormatted,
        timeFormatted: timeDisplay,
        isCurrent: true
      }];

  if (attempts.length > 1) {
    boxTextY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Datas Designadas (${attempts.length} Notificações):`, marginX + 3, boxTextY);

    attempts.forEach((att) => {
      boxTextY += 3.8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`• ${att.label}: ${att.dateFormatted} às ${att.timeFormatted}`, marginX + 5, boxTextY);
    });
  } else {
    boxTextY += 4.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Data e Horário Designados: ${data.dateFormatted} às ${timeDisplay}`, marginX + 3, boxTextY);
  }

  const boxHeight = (boxTextY - boxStartY) + 3.5;
  doc.roundedRect(marginX, boxStartY, contentWidth, boxHeight, 1.5, 1.5, 'S');
  currentY = boxStartY + boxHeight + 4;

  // 5. Motivo e Circunstâncias do Não Comparecimento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('MOTIVO / CIRCUNSTÂNCIAS DO NÃO COMPARECIMENTO:', marginX, currentY);
  currentY += 4.5;

  const motivoSpans: TextSpan[] = [
    { text: 'Motivo: ', bold: true },
    { text: data.motivoCategoria + '. ', bold: true, underline: true },
    { text: data.motivoDetalhado || 'A pessoa intimada deixou de comparecer no dia e horário aprazados perante esta unidade policial, sem apresentar qualquer justificativa plausível até o presente momento.' }
  ];

  currentY = renderFormattedParagraph(doc, motivoSpans, marginX, currentY, contentWidth, 4.4);
  currentY += 2.5;

  // 6. Fechamento legal
  const closingSpans: TextSpan[] = [
    { text: 'Do que, para constar e produzir os regulares efeitos legais e jurídicos nos autos do procedimento em epígrafe, determinou a Autoridade Policial a lavratura do presente ' },
    { text: 'TERMO DE NÃO COMPARECIMENTO', bold: true },
    { text: ', o qual lido e achado conforme, vai devidamente assinado pela Autoridade Policial e pelos Oficiais de Investigação Policial presentes.' }
  ];

  currentY = renderFormattedParagraph(doc, closingSpans, marginX, currentY, contentWidth, 4.4);
  currentY += 3.5;

  // 7. Local e Data (alinhado à direita para não conflitar com a assinatura central da Autoridade Policial)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const localDataStr = `Maracanaú/CE, ${termoDataStr}.`;
  doc.text(localDataStr, pageWidth - marginX, currentY, { align: 'right' });

  // 8. Seção de Assinaturas (1 DPC no centro superior + 2 OIPs abaixo lado a lado)
  // Espaçamento vertical amplo (18mm) garantindo que a rubrica/assinatura não sobreponha a data nem o texto
  currentY += 18;

  // DPC (Centro)
  const dpcLineWidth = 85;
  const dpcStartX = (pageWidth - dpcLineWidth) / 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(dpcStartX, currentY, dpcStartX + dpcLineWidth, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(data.dpcName.toUpperCase() || 'FERNANDO MORETTO NACHTIGALL', pageWidth / 2, currentY, { align: 'center' });

  currentY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const dpcSub = data.dpcMatricula 
    ? `${data.dpcCargo || 'Delegado de Polícia Civil'} - Mat. ${data.dpcMatricula}`
    : (data.dpcCargo || 'Delegado de Polícia Civil');
  doc.text(dpcSub, pageWidth / 2, currentY, { align: 'center' });

  // 2 OIPs (Lado a lado)
  currentY += 12;
  const oipColWidth = 72;
  const oip1StartX = marginX + 3;
  const oip2StartX = pageWidth - marginX - oipColWidth - 3;

  // Linha OIP 1
  doc.line(oip1StartX, currentY, oip1StartX + oipColWidth, currentY);
  // Linha OIP 2
  doc.line(oip2StartX, currentY, oip2StartX + oipColWidth, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const oip1CenterX = oip1StartX + (oipColWidth / 2);
  const oip2CenterX = oip2StartX + (oipColWidth / 2);

  doc.text(data.oip1Name.toUpperCase() || 'OFICIAL INVESTIGADOR 1', oip1CenterX, currentY, { align: 'center' });
  doc.text(data.oip2Name.toUpperCase() || 'OFICIAL INVESTIGADOR 2', oip2CenterX, currentY, { align: 'center' });

  currentY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const oip1Sub = data.oip1Matricula 
    ? `${data.oip1Cargo || 'Oficial de Investigação Policial'} - Mat. ${data.oip1Matricula}`
    : (data.oip1Cargo || 'Oficial de Investigação Policial (OIP)');
  const oip2Sub = data.oip2Matricula 
    ? `${data.oip2Cargo || 'Oficial de Investigação Policial'} - Mat. ${data.oip2Matricula}`
    : (data.oip2Cargo || 'Oficial de Investigação Policial (OIP)');

  doc.text(oip1Sub, oip1CenterX, currentY, { align: 'center' });
  doc.text(oip2Sub, oip2CenterX, currentY, { align: 'center' });

  // 9. Official Footer
  const footerY = 278;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('1ª Delegacia de Maracanaú – Polícia Civil do Estado do Ceará', pageWidth / 2, footerY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Av. VI, 410, Jereissati I, Maracanaú/CE, CEP: 61.900-670, Fone: (85) 3101-7344', pageWidth / 2, footerY + 3.5, { align: 'center' });
  doc.text('Email: 1dpmaracanau@pc.ce.gov.br  |  Site: www.policiacivil.ce.gov.br', pageWidth / 2, footerY + 7, { align: 'center' });

  // CE decorative color bar (Green / Gold / Green)
  const barY = footerY + 9.5;
  doc.setFillColor(0, 134, 67); // Green #008643
  doc.rect(marginX, barY, contentWidth * 0.35, 1.2, 'F');
  doc.setFillColor(249, 178, 51); // Gold #f9b233
  doc.rect(marginX + (contentWidth * 0.35), barY, contentWidth * 0.30, 1.2, 'F');
  doc.setFillColor(0, 134, 67); // Green #008643
  doc.rect(marginX + (contentWidth * 0.65), barY, contentWidth * 0.35, 1.2, 'F');

  return doc;
}

export async function downloadTermoNaoComparecimentoPdf(data: TermoNaoComparecimentoPdfData, fileName?: string): Promise<void> {
  const doc = await generateTermoNaoComparecimentoPdf(data);
  const cleanName = data.personName ? data.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Termo';
  const name = fileName || `Termo_Nao_Comparecimento_${cleanName}.pdf`;
  doc.save(name);
}

export async function getTermoNaoComparecimentoPdfFile(data: TermoNaoComparecimentoPdfData, fileName?: string): Promise<File> {
  const doc = await generateTermoNaoComparecimentoPdf(data);
  const cleanName = data.personName ? data.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Termo';
  const name = fileName || `Termo_Nao_Comparecimento_${cleanName}.pdf`;
  const blob = doc.output('blob');
  return new File([blob], name, { type: 'application/pdf' });
}


