import { jsPDF } from 'jspdf';
import { Oitiva, UserProfile } from '../types/oitiva';
import { 
  formatDateExtenso, 
  formatAddressCompleto, 
  getUserInitials 
} from './formatters';
import { delegadoService } from '../services/delegadoService';

export interface MandadoPdfData {
  procedureRef: string;
  oipInitials: string;
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

  return {
    procedureRef: ref,
    oipInitials: oip,
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

export function generateMandadoPdf(data: MandadoPdfData): jsPDF {
  // A4 standard: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const marginX = 22;
  const contentWidth = pageWidth - (marginX * 2); // 166mm
  let currentY = 18;

  // 1. Official Header (PCCE / Governo do Estado do Ceará)
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

  // 2. Title: MANDADO DE INTIMAÇÃO
  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MANDADO DE INTIMAÇÃO', pageWidth / 2, currentY, { align: 'center' });

  // 3. References (Ref and OIP)
  currentY += 7;
  doc.setFontSize(9.5);
  doc.text(`Ref.: ${data.procedureRef || '_______________________'}`, marginX, currentY);
  currentY += 4.5;
  doc.text(`OIP: ${data.oipInitials || '____________'}`, marginX, currentY);

  // 4. Opening text
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const openingText = 'A Polícia Civil do Estado do Ceará, por intermédio do Delegado de Polícia Civil abaixo assinado, no uso de suas atribuições legais,';
  const splitOpening = doc.splitTextToSize(openingText, contentWidth);
  doc.text(splitOpening, marginX, currentY);
  currentY += (splitOpening.length * 4.5) + 3;

  // 5. Determination & Intimation Details
  const personStr = data.personName.toUpperCase() || '______________________________________________________';
  const addrStr = data.address || '___________________________________________________________________';
  const phoneStr = data.phone || '(  ) __________-_________';

  const bodyParagraph = `DETERMINA, ao(à) Oficial(a) Investigador(a) de Polícia Civil ou a quem este mandado for entregue, que proceda à INTIMAÇÃO de: ${personStr}, residente em: ${addrStr}, telefone: ${phoneStr}, para comparecer à 1ª DELEGACIA DE POLÍCIA CIVIL DE MARACANAÚ, situado(a) na AVENIDA VI, Nº 410, CONJUNTO JEREISSATE I, CEP 61.900-670, MARACANAÚ/CE, tel. (85) 3101-7344.`;

  const splitBody = doc.splitTextToSize(bodyParagraph, contentWidth);
  doc.text(splitBody, marginX, currentY);
  currentY += (splitBody.length * 4.5) + 3.5;

  // 6. Date and Time
  const timeDisplay = data.timeFormatted ? `${data.timeFormatted} hrs` : '_____:_____ hrs';
  const dateParagraph = `O intimado deverá comparecer no dia ${data.dateFormatted}, às ${timeDisplay}, para oitiva em procedimento policial.`;
  const splitDate = doc.splitTextToSize(dateParagraph, contentWidth);
  doc.text(splitDate, marginX, currentY);
  currentY += (splitDate.length * 4.5) + 4.5;

  // 7. Important instruction
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TRAZER DOCUMENTO DE IDENTIFICAÇÃO E VIA DA INTIMAÇÃO.', pageWidth / 2, currentY, { align: 'center' });

  // 8. Sign-off & Delegate Signature
  currentY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Atenciosamente,', marginX, currentY);

  currentY += 16;
  const sigLineWidth = 75;
  const sigStartX = (pageWidth - sigLineWidth) / 2;
  doc.setLineWidth(0.3);
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
  currentY += 10;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INTIMADO(A): Recebi uma via deste mandado em _____/______/_______', marginX, currentY);

  currentY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura Intimado(a): ____________________________________________________', marginX, currentY);

  currentY += 5.5;
  doc.setFontSize(8);
  doc.text('(   ) Não reside no endereço.                 (   ) Pessoa não foi encontrada.', marginX, currentY);
  currentY += 4.5;
  doc.text('(   ) Endereço inexistente.                    (   ) Recusou-se a assinar ou a receber.', marginX, currentY);

  currentY += 6;
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

export function downloadMandadoPdf(data: MandadoPdfData, fileName?: string): void {
  const doc = generateMandadoPdf(data);
  const cleanName = data.personName ? data.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Intimacao';
  const name = fileName || `Mandado_Intimacao_${cleanName}.pdf`;
  doc.save(name);
}

export function getMandadoPdfFile(data: MandadoPdfData, fileName?: string): File {
  const doc = generateMandadoPdf(data);
  const cleanName = data.personName ? data.personName.replace(/[^a-zA-Z0-9]/g, '_') : 'Intimacao';
  const name = fileName || `Mandado_Intimacao_${cleanName}.pdf`;
  const blob = doc.output('blob');
  return new File([blob], name, { type: 'application/pdf' });
}
