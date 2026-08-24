export interface DelegadoInfo {
  id: string;
  nome: string;
  cargo: string;
  matricula: string;
  delegacia: string;
  municipio: string;
  portariaOuObs?: string;
  fotoUrl?: string;
}

export const DELEGADOS_PADRAO: DelegadoInfo[] = [
  {
    id: 'dpc_fernando_nachtigall',
    nome: 'Fernando Moretto Nachtigall',
    cargo: 'Delegado de Polícia Civil',
    matricula: '301.942-1-0',
    delegacia: '1ª Delegacia Metropolitana de Maracanaú',
    municipio: 'Maracanaú/CE',
    portariaOuObs: 'Titular do 1º Distrito Policial de Maracanaú'
  },
  {
    id: 'dpc_plantao_maracanau',
    nome: 'Delegado(a) Plantonista',
    cargo: 'Delegado(a) de Polícia Civil',
    matricula: '300.811-2-5',
    delegacia: 'Delegacia Metropolitana de Maracanaú (Plantão)',
    municipio: 'Maracanaú/CE',
    portariaOuObs: 'Plantão Policial Metropolitano'
  },
  {
    id: 'dpc_adjunto_maracanau',
    nome: 'Delegado(a) Adjunto(a)',
    cargo: 'Delegado(a) de Polícia Civil - Adjunto(a)',
    matricula: '302.155-4-9',
    delegacia: '1ª Delegacia Metropolitana de Maracanaú',
    municipio: 'Maracanaú/CE',
    portariaOuObs: 'Equipe de Inquéritos e Procedimentos'
  }
];

const LOCAL_STORAGE_DELEGADOS_KEY = 'agenda_delegados_custom_v1';

export const delegadoService = {
  getDelegados(): DelegadoInfo[] {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DELEGADOS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar lista de delegados:', e);
    }
    return DELEGADOS_PADRAO;
  },

  saveDelegados(delegados: DelegadoInfo[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_DELEGADOS_KEY, JSON.stringify(delegados));
    } catch (e) {
      console.warn('Erro ao salvar lista de delegados:', e);
    }
  },

  addOrUpdateDelegado(delegado: DelegadoInfo): DelegadoInfo[] {
    const list = this.getDelegados();
    const index = list.findIndex(d => d.id === delegado.id);
    let updatedList: DelegadoInfo[];
    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = delegado;
    } else {
      updatedList = [...list, delegado];
    }
    this.saveDelegados(updatedList);
    return updatedList;
  },

  removeDelegado(id: string): DelegadoInfo[] {
    const list = this.getDelegados();
    const updatedList = list.filter(d => d.id !== id);
    this.saveDelegados(updatedList);
    return updatedList;
  }
};
