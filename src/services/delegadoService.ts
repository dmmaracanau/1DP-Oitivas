import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { ref, set, remove, onValue } from 'firebase/database';
import { db, rtdb, auth, handleFirestoreError, OperationType, executeFirestoreWithRetry } from '../firebase';

export interface DelegadoInfo {
  id: string;
  nome: string;
  cargo: string;
  matricula: string;
  delegacia: string;
  municipio: string;
  portariaOuObs?: string;
  fotoUrl?: string;
  createdAt?: number;
  updatedAt?: number;
}

function sanitizePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
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

const LOCAL_STORAGE_DELEGADOS_KEY = 'agenda_delegados_unified_v2';
const LAST_SELECTED_DELEGADO_KEY = 'oitivas_last_selected_delegado_name';

// Cache em memória para acesso síncrono instantâneo
let memoryDelegados: DelegadoInfo[] = (() => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_DELEGADOS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar cache local de delegados:', e);
  }
  return DELEGADOS_PADRAO;
})();

const listeners: Set<(delegados: DelegadoInfo[]) => void> = new Set();

function notifySubscribers(list: DelegadoInfo[]) {
  memoryDelegados = list;
  try {
    localStorage.setItem(LOCAL_STORAGE_DELEGADOS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao atualizar cache local de delegados:', e);
  }
  listeners.forEach(cb => {
    try {
      cb(list);
    } catch (err) {
      console.error('Erro no callback de delegados:', err);
    }
  });
}

let isFirestoreListenerStarted = false;
let isRtdbListenerStarted = false;

// Inicializa a semeadura se o catálogo estiver vazio
async function seedDefaultDelegadosIfEmpty() {
  try {
    const colRef = collection(db, 'delegados');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      const batch = writeBatch(db);
      for (const d of DELEGADOS_PADRAO) {
        const dRef = doc(db, 'delegados', d.id);
        batch.set(dRef, { ...d, createdAt: Date.now(), updatedAt: Date.now() });
      }
      await batch.commit();
      console.log('Catálogo unificado de Delegados semeado com sucesso no Firestore.');
    }
  } catch (err) {
    console.warn('Verificação/semeadura de delegados no Firestore:', err);
  }
}

export const delegadoService = {
  /**
   * Obtém a lista atual de delegados de forma síncrona
   */
  getDelegados(): DelegadoInfo[] {
    return memoryDelegados.length > 0 ? memoryDelegados : DELEGADOS_PADRAO;
  },

  /**
   * Recupera o último delegado selecionado pelo usuário atual
   */
  getLastSelectedDelegado(): string {
    try {
      const saved = localStorage.getItem(LAST_SELECTED_DELEGADO_KEY);
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch (e) {
      console.warn('Erro ao carregar último delegado selecionado:', e);
    }
    const delegados = this.getDelegados();
    return delegados.length > 0 ? delegados[0].nome : 'Fernando Moretto Nachtigall';
  },

  /**
   * Salva a preferência de seleção do usuário atual
   */
  setLastSelectedDelegado(nome: string) {
    if (!nome) return;
    try {
      localStorage.setItem(LAST_SELECTED_DELEGADO_KEY, nome.trim());
    } catch (e) {
      console.warn('Erro ao salvar preferência de delegado:', e);
    }
  },

  /**
   * Inscreve um componente para receber atualizações em tempo real
   * do catálogo unificado de delegados
   */
  subscribeToDelegados(callback: (delegados: DelegadoInfo[]) => void): () => void {
    listeners.add(callback);
    // Emite o estado atual imediatamente
    callback(this.getDelegados());

    // Inicia listener do Firestore se ainda não iniciado
    if (!isFirestoreListenerStarted) {
      isFirestoreListenerStarted = true;
      seedDefaultDelegadosIfEmpty();

      try {
        const colRef = collection(db, 'delegados');
        onSnapshot(
          colRef,
          (snapshot) => {
            if (!snapshot.empty) {
              const list: DelegadoInfo[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as DelegadoInfo;
                list.push({
                  id: docSnap.id,
                  nome: data.nome || 'Delegado(a)',
                  cargo: data.cargo || 'Delegado de Polícia Civil',
                  matricula: data.matricula || '',
                  delegacia: data.delegacia || '1ª Delegacia Metropolitana de Maracanaú',
                  municipio: data.municipio || 'Maracanaú/CE',
                  portariaOuObs: data.portariaOuObs || '',
                  fotoUrl: data.fotoUrl || '',
                  createdAt: data.createdAt || Date.now(),
                  updatedAt: data.updatedAt || Date.now()
                });
              });

              // Ordena por nome
              list.sort((a, b) => a.nome.localeCompare(b.nome));
              notifySubscribers(list);
            } else {
              // Se vazio, semeia
              seedDefaultDelegadosIfEmpty();
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, 'delegados');
          }
        );
      } catch (err) {
        console.warn('Erro ao anexar onSnapshot em delegados:', err);
      }
    }

    // Inicia listener no Realtime Database como redundância em tempo real
    if (!isRtdbListenerStarted && rtdb) {
      isRtdbListenerStarted = true;
      try {
        const delegadosRef = ref(rtdb, 'system/delegados');
        onValue(delegadosRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const list: DelegadoInfo[] = Object.values(data);
            if (Array.isArray(list) && list.length > 0) {
              list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
              notifySubscribers(list);
            }
          }
        });
      } catch (err) {
        console.warn('Erro ao anexar listener no RTDB para delegados:', err);
      }
    }

    return () => {
      listeners.delete(callback);
    };
  },

  /**
   * Adiciona ou atualiza uma Autoridade Policial no catálogo unificado
   * (Operação exclusiva para Administradores)
   */
  async addOrUpdateDelegado(delegado: DelegadoInfo): Promise<DelegadoInfo[]> {
    const id = delegado.id || `dpc_${Date.now()}`;
    const payload: DelegadoInfo = {
      ...delegado,
      id,
      updatedAt: Date.now(),
      createdAt: delegado.createdAt || Date.now()
    };

    const sanitized = sanitizePayload(payload);

    // Atualiza imediatamente cache local
    const currentList = this.getDelegados();
    const index = currentList.findIndex(d => d.id === id);
    let updatedList: DelegadoInfo[];
    if (index >= 0) {
      updatedList = [...currentList];
      updatedList[index] = payload;
    } else {
      updatedList = [...currentList, payload];
    }
    updatedList.sort((a, b) => a.nome.localeCompare(b.nome));
    notifySubscribers(updatedList);

    // Persiste no Firestore compartilhado com retry robusto
    try {
      const dRef = doc(db, 'delegados', id);
      await executeFirestoreWithRetry(
        () => setDoc(dRef, sanitized, { merge: true }),
        { operationName: `addOrUpdateDelegado:${id}` }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `delegados/${id}`);
    }

    // Broadcast no Realtime Database
    try {
      if (rtdb) {
        const dRefRtdb = ref(rtdb, `system/delegados/${id}`);
        await set(dRefRtdb, sanitized);
      }
    } catch (err) {
      console.warn('Erro ao atualizar delegado no RTDB:', err);
    }

    return updatedList;
  },

  /**
   * Remove uma Autoridade Policial do catálogo unificado
   * (Operação exclusiva para Administradores)
   */
  async removeDelegado(id: string): Promise<DelegadoInfo[]> {
    // Atualiza imediatamente cache local
    const currentList = this.getDelegados();
    const updatedList = currentList.filter(d => d.id !== id);
    notifySubscribers(updatedList);

    // Remove do Firestore compartilhado com retry robusto
    try {
      const dRef = doc(db, 'delegados', id);
      await executeFirestoreWithRetry(
        () => deleteDoc(dRef),
        { operationName: `removeDelegado:${id}` }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `delegados/${id}`);
    }

    // Remove do Realtime Database
    try {
      if (rtdb) {
        const dRefRtdb = ref(rtdb, `system/delegados/${id}`);
        await remove(dRefRtdb);
      }
    } catch (err) {
      console.warn('Erro ao remover delegado no RTDB:', err);
    }

    return updatedList;
  }
};

