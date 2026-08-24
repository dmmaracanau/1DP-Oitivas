import { Oitiva } from '../types/oitiva';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
}

export const driveService = {
  /**
   * Busca ou cria a pasta padrão "Oitivas - DP Maracanaú"
   */
  async getOrCreateAppFolder(token: string): Promise<string> {
    // 1. Procura se já existe a pasta
    const q = "name = 'Oitivas - DP Maracanaú' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Se não existir, cria a pasta
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Oitivas - DP Maracanaú',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Pasta do Sistema de Cartório de Oitivas da Delegacia Metropolitana de Maracanaú'
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao criar pasta no Google Drive.');
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  },

  /**
   * Faz upload de um arquivo de texto/termo para o Google Drive
   */
  async uploadTextDocument(
    token: string,
    fileName: string,
    content: string,
    folderId?: string
  ): Promise<GoogleDriveFile> {
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata: any = {
      name: fileName,
      mimeType: 'text/plain',
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
      content +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao salvar arquivo no Google Drive.');
    }

    return await response.json();
  },

  /**
   * Salva a Ficha / Termo da Oitiva no Google Drive
   */
  async saveOitivaTermToDrive(token: string, oitiva: Oitiva): Promise<GoogleDriveFile> {
    const folderId = await this.getOrCreateAppFolder(token);
    const dateFormatted = oitiva.date.split('-').reverse().join('-');
    const safeName = oitiva.personName.replace(/[^a-zA-Z0-9À-ÿ ]/g, '_');
    const fileName = `Termo_Oitiva_${dateFormatted}_${safeName}.txt`;

    const content = [
      `================================================================================`,
      `ESTADO DO CEARÁ - SECRETARIA DA SEGURANÇA PÚBLICA E DEFESA SOCIAL`,
      `POLÍCIA CIVIL DO ESTADO DO CEARÁ`,
      `DELEGACIA METROPOLITANA DE MARACANAÚ`,
      `================================================================================`,
      ``,
      `TERMO DE QUALIFICAÇÃO E OITIVA POLICIAL`,
      ``,
      `1. DADOS DO PROCEDIMENTO:`,
      `• Número do Procedimento: ${oitiva.procedureNumber || 'S/N'}`,
      `• Tipo de Procedimento: ${oitiva.procedureType || 'Inquérito Policial'}`,
      `• Autoridade Policial: ${oitiva.officerName || 'A designar'}`,
      `• Escrivão(ã) de Polícia: ${oitiva.clerkName || 'A designar'}`,
      ``,
      `2. DADOS DO DEPOENTE / QUALIFICAÇÃO:`,
      `• Nome Completo: ${oitiva.personName}`,
      `• Condição no Procedimento: ${oitiva.role || 'Depoente'}`,
      `• CPF: ${oitiva.cpf || 'Não informado'}`,
      `• RG: ${oitiva.rg || 'Não informado'}`,
      `• Telefone / WhatsApp: ${oitiva.phone || 'Não informado'}`,
      `• E-mail: ${oitiva.email || 'Não informado'}`,
      `• Endereço Residencial: ${oitiva.address || 'Não informado'}`,
      `• Bairro / Cidade: ${[oitiva.neighborhood, oitiva.city || 'Maracanaú - CE'].filter(Boolean).join(', ')}`,
      ``,
      `3. DADOS DO AGENDAMENTO:`,
      `• Data da Oitiva: ${oitiva.date.split('-').reverse().join('/')}`,
      `• Horário Previsto: ${oitiva.time || '09:00'} horas`,
      `• Modalidade: ${oitiva.modality || 'Presencial'}`,
      `• Local / Sala / Link: ${oitiva.locationOrLink || 'Sala de Audiências / Cartório'}`,
      `• Status do Agendamento: ${oitiva.status}`,
      ``,
      `4. OBSERVAÇÕES / REGISTROS DO CARTÓRIO:`,
      `${oitiva.notes || 'Sem observações adicionais registradas.'}`,
      ``,
      `================================================================================`,
      `Documento emitido eletronicamente em: ${new Date().toLocaleString('pt-BR')}`,
      `Delegacia Metropolitana de Maracanaú`,
      `================================================================================`,
    ].join('\r\n');

    return this.uploadTextDocument(token, fileName, content, folderId);
  },

  /**
   * Salva a Pauta do Dia no Google Drive
   */
  async savePautaToDrive(token: string, dateStr: string, oitivas: Oitiva[]): Promise<GoogleDriveFile> {
    const folderId = await this.getOrCreateAppFolder(token);
    const dateFormatted = dateStr.split('-').reverse().join('-');
    const fileName = `Pauta_Oitivas_${dateFormatted}_DP_Maracanau.txt`;

    const dayOitivas = oitivas.filter(o => o.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const listText = dayOitivas.map((o, idx) => {
      return [
        `[Item ${idx + 1}] Horário: ${o.time || '--:--'}`,
        `  • Depoente: ${o.personName} (${o.role || 'Depoente'})`,
        `  • Procedimento: ${o.procedureNumber || 'S/N'} (${o.procedureType || 'IP'})`,
        `  • Status: ${o.status}`,
        `  • Contato: ${o.phone || 'Sem telefone'} | CPF: ${o.cpf || 'Sem CPF'}`,
        `  • Modalidade: ${o.modality || 'Presencial'} - ${o.locationOrLink || 'Cartório'}`,
        `  • Assinatura do Depoente: _____________________________________________`,
        ``
      ].join('\r\n');
    }).join('\r\n');

    const content = [
      `================================================================================`,
      `POLÍCIA CIVIL DO ESTADO DO CEARÁ - DELEGACIA METROPOLITANA DE MARACANAÚ`,
      `PAUTA OFICIAL DE AUDIÊNCIAS E OITIVAS`,
      `DATA: ${dateStr.split('-').reverse().join('/')} | TOTAL DE OITIVAS: ${dayOitivas.length}`,
      `================================================================================`,
      ``,
      listText || 'Nenhuma oitiva agendada para esta data.\r\n',
      `================================================================================`,
      `Emitido pelo Sistema de Cartório de Oitivas em: ${new Date().toLocaleString('pt-BR')}`,
      `================================================================================`,
    ].join('\r\n');

    return this.uploadTextDocument(token, fileName, content, folderId);
  },

  /**
   * Lista arquivos salvos na pasta do sistema
   */
  async listAppFiles(token: string): Promise<GoogleDriveFile[]> {
    const folderId = await this.getOrCreateAppFolder(token);
    const q = `'${folderId}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,createdTime,size)&orderBy=createdTime desc&pageSize=20`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao listar arquivos do Google Drive.');
    }

    const data = await res.json();
    return data.files || [];
  },

  /**
   * Deleta arquivo no Google Drive
   */
  async deleteFile(token: string, fileId: string): Promise<void> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao deletar arquivo do Google Drive.');
    }
  }
};
