import { Oitiva } from '../types/oitiva';

function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const gmailService = {
  /**
   * Envia um e-mail genérico usando a API do Gmail
   */
  async sendEmail(
    token: string,
    params: {
      to: string;
      subject: string;
      bodyText: string;
      cc?: string;
    }
  ): Promise<{ id: string; threadId: string }> {
    const lines = [
      `To: ${params.to}`,
      params.cc ? `Cc: ${params.cc}` : '',
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      params.bodyText,
    ].filter(line => line !== '');

    const rawMessage = lines.join('\r\n');
    const encodedRaw = utf8ToBase64Url(rawMessage);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedRaw }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao enviar e-mail via Gmail.');
    }

    return await response.json();
  },

  /**
   * Envia Notificação / Intimação Oficial de Oitiva via Gmail
   */
  async sendHearingSummons(
    token: string,
    toEmail: string,
    oitiva: Oitiva,
    customIntro?: string
  ) {
    const formattedDate = oitiva.date.split('-').reverse().join('/');
    const subject = `[POLÍCIA CIVIL] Notificação de Oitiva - Procedimento: ${oitiva.procedureNumber || 'S/N'}`;

    const bodyText = [
      `ESTADO DO CEARÁ - POLÍCIA CIVIL`,
      `DELEGACIA METROPOLITANA DE MARACANAÚ`,
      `CARTÓRIO DE OITIVAS E AUDIÊNCIAS`,
      `--------------------------------------------------------------------------------`,
      ``,
      customIntro || `Prezado(a) Senhor(a) ${oitiva.personName},`,
      ``,
      `Por meio deste expediente eletrônico oficial, NOTIFICAMOS/INTIMAMOS Vossa Senhoria a comparecer para prestar depoimento na condição de ${oitiva.role?.toUpperCase() || 'DEPOENTE'}, conforme especificações abaixo:`,
      ``,
      `DADOS DO AGENDAMENTO:`,
      `• Depoente: ${oitiva.personName}`,
      oitiva.cpf ? `• CPF: ${oitiva.cpf}` : '',
      `• Procedimento: ${oitiva.procedureNumber || 'A informar no cartório'} (${oitiva.procedureType || 'Policial'})`,
      `• Data: ${formattedDate}`,
      `• Horário: ${oitiva.time || '09:00'} horas`,
      `• Modalidade: ${oitiva.modality || 'Presencial'}`,
      oitiva.modality === 'Videoconferência' 
        ? `• Link de Conexão: ${oitiva.locationOrLink || 'Será fornecido minutos antes'}`
        : `• Local: Delegacia Metropolitana de Maracanaú (Sala do Cartório de Oitivas)\n  Endereço: Maracanaú - CE`,
      oitiva.officerName ? `• Autoridade Policial: ${oitiva.officerName}` : '',
      oitiva.clerkName ? `• Escrivão(ã) Responsável: ${oitiva.clerkName}` : '',
      ``,
      `ORIENTAÇÕES IMPORTANTES:`,
      `1. É indispensável a apresentação de documento oficial com foto (RG, CNH ou Carteira de Trabalho).`,
      `2. Caso esteja impossibilitado(a) por motivo de força maior, favor responder a este e-mail anexando comprovante com antecedência mínima de 24 horas.`,
      `3. Em caso de dúvidas, favor responder a esta mensagem institucional.`,
      ``,
      `--------------------------------------------------------------------------------`,
      `Delegacia Metropolitana de Maracanaú - PCCE`,
      `E-mail: delegaciammaracanau@gmail.com`,
      `Mensagem expedida eletronicamente pelo Sistema de Agenda de Oitivas.`
    ].filter(Boolean).join('\n');

    return this.sendEmail(token, {
      to: toEmail,
      subject,
      bodyText,
    });
  },

  /**
   * Envia a Pauta de Oitivas do Dia para a equipe de policiais ou delegados
   */
  async sendDailyDocket(
    token: string,
    toEmail: string,
    dateStr: string,
    oitivas: Oitiva[]
  ) {
    const formattedDate = dateStr.split('-').reverse().join('/');
    const subject = `[PAUTA DO DIA] Oitivas Agendadas - ${formattedDate} - DP Maracanaú`;

    const dayOitivas = oitivas.filter(o => o.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const listLines = dayOitivas.length === 0
      ? ['Nenhuma oitiva agendada para esta data.']
      : dayOitivas.map((o, idx) => {
          return `${idx + 1}. [${o.time || '--:--'}] ${o.personName} (${o.role || 'Depoente'}) - Proc: ${o.procedureNumber || 'S/N'} | Status: ${o.status}`;
        });

    const bodyText = [
      `POLÍCIA CIVIL DO ESTADO DO CEARÁ`,
      `DELEGACIA METROPOLITANA DE MARACANAÚ`,
      `PAUTA DE OITIVAS - DATA: ${formattedDate}`,
      `Total de Depoimentos Programados: ${dayOitivas.length}`,
      `================================================================================`,
      ``,
      ...listLines,
      ``,
      `================================================================================`,
      `Relatório gerado automaticamente pelo Sistema de Cartório de Oitivas.`,
    ].join('\n');

    return this.sendEmail(token, {
      to: toEmail,
      subject,
      bodyText,
    });
  }
};
