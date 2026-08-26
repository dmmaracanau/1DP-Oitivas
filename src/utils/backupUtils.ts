import { Oitiva, UserProfile } from '../types/oitiva';

export interface OitivasBackupData {
  version: string;
  exportedAt: string;
  app: string;
  unit: string;
  user: {
    uid: string;
    displayName: string;
    email: string;
    cargo?: string;
  };
  totalRecords: number;
  oitivas: Oitiva[];
}

/**
 * Exporta todas as oitivas atuais do usuário para um arquivo JSON baixado localmente
 */
export function exportOitivasBackup(oitivas: Oitiva[], user: UserProfile | null): boolean {
  try {
    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0];
    const timeFormatted = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    const safeUserName = (user?.displayName || user?.username || 'cartorio')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');

    const backupPayload: OitivasBackupData = {
      version: '1.0',
      exportedAt: now.toISOString(),
      app: 'Agenda de Oitivas - Polícia Civil',
      unit: user?.unitName || '1ª Delegacia Metropolitana de Maracanaú',
      user: {
        uid: user?.uid || 'guest_user',
        displayName: user?.displayName || 'Usuário do Sistema',
        email: user?.email || user?.institutionalEmail || '',
        cargo: user?.cargo || ''
      },
      totalRecords: oitivas.length,
      oitivas: oitivas
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_oitivas_${safeUserName}_${dateFormatted}_${timeFormatted}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erro ao exportar backup de oitivas:', error);
    return false;
  }
}
