export type HearingStatus = 
  | 'Agendada' 
  | 'Realizada' 
  | 'Remarcada' 
  | 'Cancelada' 
  | 'Não Compareceu';

export type HearingRole = 
  | 'Testemunha' 
  | 'Vítima' 
  | 'Investigado' 
  | 'Declarante' 
  | 'Representante Legal' 
  | 'Informante' 
  | 'Perito' 
  | 'Outro';

export type ProcedureType = 
  | 'Inquérito Policial (IP)' 
  | 'Termo Circunstanciado de Ocorrência (TCO)' 
  | 'Auto de Prisão em Flagrante (APF)' 
  | 'Boletim de Ocorrência (BO)' 
  | 'Procedimento Administrativo' 
  | 'Carta Precatória' 
  | 'Outro';

export type HearingModality = 'Presencial' | 'Videoconferência' | 'Híbrida';

export interface Oitiva {
  id: string;
  // Campo OBRIGATÓRIO
  personName: string; 
  
  // Campos opcionais
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  procedureNumber?: string;
  procedureType?: ProcedureType | string;
  role?: HearingRole | string;
  cpf?: string;
  rg?: string;
  phone?: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  officerName?: string; // Delegado(a)
  clerkName?: string; // Escrivão(ã) / Responsável
  modality?: HearingModality;
  locationOrLink?: string; // Sala 01, ou link do Google Meet/Teams
  status: HearingStatus;
  notes?: string;
  intimationSent?: boolean; // Intimação expedida/entregue
  googleCalendarEventId?: string;
  googleDriveDocId?: string;
  googleDriveDocUrl?: string;
  lastGmailSentAt?: number;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  uid?: string; // ID do usuário autenticado no Firebase Auth
}

export interface UserProfile {
  uid: string;
  username?: string | null; // Nome de usuário de acesso / login
  email: string | null; // E-mail da conta / Gmail pessoal para login e recuperação
  displayName: string | null; // Nome completo
  photoURL?: string | null; // Foto ou avatar do perfil
  role?: 'admin' | 'user' | string; // Papel de sistema ('admin' ou 'user')
  isAdmin?: boolean; // Booleano indicando privilégio administrativo
  cargo?: string | null; // Cargo funcional (Ex: Delegado(a), Escrivão(ã), Inspetor(a))
  registrationNumber?: string | null; // Matrícula funcional
  institutionalEmail?: string | null; // E-mail institucional (Ex: @policiacivil.ce.gov.br)
  unitName?: string | null; // Lotação / Delegacia (Ex: "Delegacia Metropolitana de Maracanaú")
  phone?: string | null; // Telefone / WhatsApp de contato
  department?: string | null; // Cartório / Plantão / Setor
  authProvider?: 'google' | 'password' | 'anonymous' | 'custom';
  delegados?: any[]; // Lista personalizada de delegados sincronizada
  defaultDelegadoId?: string;
  createdAt?: number;
  updatedAt?: number;
  passwordHash?: string;
  oitivasCount?: number; // Contagem estimada de oitivas vinculadas
}

export interface DuplicateUserGroup {
  id: string;
  matchType: 'username_and_email' | 'username' | 'email' | 'manual';
  matchedKey: string;
  users: UserProfile[];
}

export interface MergeUsersResult {
  success: boolean;
  primaryUid: string;
  primaryDisplayName: string;
  mergedUids: string[];
  transferredOitivasCount: number;
  deduplicatedOitivasCount?: number;
  addedOitivasCount?: number;
  message: string;
}

