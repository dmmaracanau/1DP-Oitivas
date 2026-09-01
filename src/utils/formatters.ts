import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HearingRole, HearingStatus } from '../types/oitiva';

export function getFirstName(fullName?: string): string {
  if (!fullName) return '';
  const clean = fullName.trim();
  if (!clean) return '';
  return clean.split(/\s+/)[0];
}

export function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 2) return clean ? `(${clean}` : '';
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const d = parseISO(dateStr);
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function getStatusBadgeClasses(status: HearingStatus): string {
  switch (status) {
    case 'Agendada':
      return 'bg-purple-950/60 text-purple-300 border-purple-500/40';
    case 'Realizada':
      return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
    case 'Remarcada':
      return 'bg-amber-950/60 text-amber-300 border-amber-500/40';
    case 'Cancelada':
      return 'bg-rose-950/60 text-rose-300 border-rose-500/40';
    case 'Não Compareceu':
      return 'bg-orange-950/60 text-orange-300 border-orange-500/40';
    default:
      return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }
}

export function getRoleBadgeClasses(role?: HearingRole | string): string {
  switch (role) {
    case 'Testemunha':
      return 'bg-blue-950/50 text-blue-300 border-blue-500/30';
    case 'Vítima':
      return 'bg-teal-950/50 text-teal-300 border-teal-500/30';
    case 'Investigado':
      return 'bg-red-950/50 text-red-300 border-red-500/30';
    case 'Declarante':
      return 'bg-purple-950/50 text-purple-300 border-purple-500/30';
    default:
      return 'bg-zinc-900 text-zinc-400 border-zinc-700';
  }
}

export function formatWhatsAppMessageText(oitiva: {
  personName: string;
  date: string;
  time: string;
  procedureNumber?: string;
  procedureType?: string;
  locationOrLink?: string;
  officerName?: string;
  modality?: string;
  phone?: string;
}): string {
  const dateFormatted = formatDateBR(oitiva.date);
  
  // Format procedure
  let procText = oitiva.procedureNumber || 'Em andamento';
  if (oitiva.procedureNumber && oitiva.procedureType) {
    procText = `${oitiva.procedureType} nº ${oitiva.procedureNumber}`;
  }

  // Format time
  let timeText = oitiva.time || 'A definir';
  if (oitiva.time && !oitiva.time.toLowerCase().includes('h')) {
    timeText = `${oitiva.time}h`;
  }

  // Format location / room
  const localText = oitiva.locationOrLink || oitiva.modality || '1ª Delegacia de Polícia de Maracanaú';

  // Format officer
  const autoridadeText = oitiva.officerName || 'Fernando Moretto Nachtigall';

  return `*COMUNICADO / INTIMAÇÃO DE OITIVA*
*1ª DELEGACIA DE POLÍCIA DE MARACANAÚ*
Olá, *${oitiva.personName || 'Cidadão(ã)'}*.

Informamos que está agendada a sua oitiva referente ao procedimento:
• *Procedimento:* ${procText}
• *Data:* ${dateFormatted}
• *Horário:* ${timeText}
• *Local / Formato:* ${localText}
• *Autoridade:* ${autoridadeText}

Por favor, compareça portando documento de identificação oficial com foto (RG ou CNH), e apresente essa notificação.

*POR FAVOR CONFIRMAR RECEBIMENTO*

Caso haja impossibilidade justificada de comparecimento, favor entrar em contato.`;
}

export function generateWhatsAppReminder(oitiva: {
  personName: string;
  date: string;
  time: string;
  procedureNumber?: string;
  procedureType?: string;
  locationOrLink?: string;
  officerName?: string;
  modality?: string;
  phone?: string;
}): string {
  const text = formatWhatsAppMessageText(oitiva);
  const cleanPhone = (oitiva.phone || '').replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  
  if (cleanPhone.length >= 10) {
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${fullPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

export function getUserInitials(userOrName?: string | { displayName?: string | null; username?: string | null; email?: string | null } | null): string {
  if (!userOrName) return '';
  let name = '';
  if (typeof userOrName === 'string') {
    name = userOrName;
  } else {
    name = userOrName.displayName || userOrName.username || userOrName.email?.split('@')[0] || '';
  }
  const clean = name.trim();
  if (!clean) return '';
  const stopwords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'para', 'com']);
  const parts = clean
    .split(/[\s,._-]+/)
    .filter(p => p.length > 0 && !stopwords.has(p.toLowerCase()));
  if (parts.length === 0) return clean.charAt(0).toUpperCase();
  return parts.map(p => p.charAt(0).toUpperCase()).join('.');
}

export function formatDateExtenso(dateStr?: string | null): string {
  if (!dateStr) return '______ de _________________ de __________';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    const monthName = months[monthIndex] || month;
    return `${parseInt(day, 10)} de ${monthName} de ${year}`;
  } catch {
    return dateStr;
  }
}

export function formatAddressCompleto(oitiva: {
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
}): string {
  const parts: string[] = [];
  if (oitiva.address && oitiva.address.trim()) parts.push(oitiva.address.trim());
  if (oitiva.neighborhood && oitiva.neighborhood.trim()) parts.push(oitiva.neighborhood.trim());
  if (oitiva.city && oitiva.city.trim()) parts.push(oitiva.city.trim());
  
  if (parts.length === 0) {
    return '___________________________________________________________________';
  }
  return parts.join(', ');
}

/**
 * Calcula a tentativa de intimação atual da oitiva (1ª, 2ª, 3ª...)
 * Baseado no histórico de remarcações ou status da oitiva.
 */
export function calculateAttemptNumber(oitiva?: {
  status?: HearingStatus | string;
  history?: Array<{ action: string }>;
} | null): number {
  if (!oitiva) return 1;
  const reschedules = oitiva.history?.filter(
    h => h.action === 'remarcada' || h.action === 'data_alterada'
  ).length || 0;

  if (reschedules > 0) {
    return 1 + reschedules;
  }
  if (oitiva.status === 'Remarcada') {
    return 2;
  }
  return 1;
}

/**
 * Formata o número da intimação no padrão NN/AAAA (ex: 01/2026)
 */
export function formatIntimationNumberDisplay(raw?: string | null): string {
  const currentYear = new Date().getFullYear();
  if (!raw || !raw.trim()) {
    return `01/${currentYear}`;
  }
  const clean = raw.trim();
  if (/^\d{1,2}\/\d{4}$/.test(clean)) {
    const [num, yr] = clean.split('/');
    return `${num.padStart(2, '0')}/${yr}`;
  }
  return clean;
}

