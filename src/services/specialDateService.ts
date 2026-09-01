import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { 
  ref as rtdbRef, 
  set as rtdbSet, 
  remove as rtdbRemove, 
  get as rtdbGet,
  onValue as rtdbOnValue,
  Unsubscribe as RTDBUnsubscribe
} from 'firebase/database';
import { db, rtdb, auth, handleFirestoreError, OperationType, executeFirestoreWithRetry } from '../firebase';
import { CalendarSpecialDate, UserProfile } from '../types/oitiva';

const LOCAL_STORAGE_KEY = 'calendar_special_dates_v1';
const WEEKENDS_CONFIG_KEY = 'calendar_weekends_enabled_v1';

// Feriados padrão de referência Nacional, Estadual (CE) e Municipal (Maracanaú)
export const DEFAULT_FERIADOS_MARACANAU: Omit<CalendarSpecialDate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Confraternização Universal',
    date: '2026-01-01',
    type: 'feriado',
    description: 'Ano Novo (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Carnaval (Segunda-feira)',
    date: '2026-02-16',
    type: 'ponto_facultativo',
    description: 'Carnaval (Ponto Facultativo)',
    isRecurringAnnual: false,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Carnaval (Terça-feira)',
    date: '2026-02-17',
    type: 'feriado',
    description: 'Feriado de Carnaval',
    isRecurringAnnual: false,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Quarta-feira de Cinzas',
    date: '2026-02-18',
    type: 'ponto_facultativo',
    description: 'Ponto Facultativo até 14h',
    isRecurringAnnual: false,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Aniversário de Maracanaú',
    date: '2026-03-06',
    type: 'feriado',
    description: 'Emancipação Política do Município de Maracanaú (Feriado Municipal)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'São José (Padroeiro do Ceará)',
    date: '2026-03-19',
    type: 'feriado',
    description: 'Dia de São José (Feriado Estadual no Ceará)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Data Magna do Ceará',
    date: '2026-03-25',
    type: 'feriado',
    description: 'Abolição da Escravidão no Ceará (Feriado Estadual - Lei nº 14.891/2011)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Sexta-feira Santa',
    date: '2026-04-03',
    type: 'feriado',
    description: 'Paixão de Cristo (Feriado Nacional)',
    isRecurringAnnual: false,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Tiradentes',
    date: '2026-04-21',
    type: 'feriado',
    description: 'Dia de Tiradentes (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Dia do Trabalhador',
    date: '2026-05-01',
    type: 'feriado',
    description: 'Dia Mundial do Trabalho (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Corpus Christi',
    date: '2026-06-04',
    type: 'ponto_facultativo',
    description: 'Corpus Christi (Ponto Facultativo / Feriado Municipal)',
    isRecurringAnnual: false,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Feriado da Independência',
    date: '2026-09-07',
    type: 'feriado',
    description: 'Independência do Brasil (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Nossa Senhora Aparecida',
    date: '2026-10-12',
    type: 'feriado',
    description: 'Padroeira do Brasil (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Finados',
    date: '2026-11-02',
    type: 'feriado',
    description: 'Dia de Finados (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Proclamação da República',
    date: '2026-11-15',
    type: 'feriado',
    description: 'Proclamação da República (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Dia da Consciência Negra',
    date: '2026-11-20',
    type: 'feriado',
    description: 'Dia Nacional de Zumbi e da Consciência Negra (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  },
  {
    title: 'Natal',
    date: '2026-12-25',
    type: 'feriado',
    description: 'Natal (Feriado Nacional)',
    isRecurringAnnual: true,
    enabled: true,
    color: 'red'
  }
];

// Cards padrões de fins de semana (Domingo e Sábado)
export const DEFAULT_WEEKEND_CARDS: CalendarSpecialDate[] = [
  {
    id: 'weekend_sunday',
    title: 'Domingo',
    dayOfWeek: 0,
    type: 'fim_de_semana',
    description: 'Fim de semana (Domingo)',
    isRecurringWeekend: true,
    enabled: true,
    color: 'red'
  },
  {
    id: 'weekend_saturday',
    title: 'Sábado',
    dayOfWeek: 6,
    type: 'fim_de_semana',
    description: 'Fim de semana (Sábado)',
    isRecurringWeekend: true,
    enabled: true,
    color: 'red'
  }
];

function getLocalCache(): CalendarSpecialDate[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Aviso ao ler cache local de feriados:", err);
  }
  
  // Se não houver cache, inicializa com feriados padrão + fins de semana
  const seeded: CalendarSpecialDate[] = [
    ...DEFAULT_WEEKEND_CARDS,
    ...DEFAULT_FERIADOS_MARACANAU.map((item, idx) => ({
      ...item,
      id: `default_holiday_${item.date || idx}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }))
  ];
  setLocalCache(seeded);
  return seeded;
}

function setLocalCache(data: CalendarSpecialDate[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Falha ao salvar cache de feriados:", err);
  }
}

export function isUserAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  return Boolean(
    user.isAdmin === true || 
    user.role === 'admin' || 
    user.email === '1dpmmaracanau@gmail.com' ||
    user.email === '1dpmmidias@gmail.com' ||
    user.username === 'admin' ||
    user.username === '1dpm'
  );
}

export const specialDateService = {
  isUserAdmin,

  /**
   * Assinatura em tempo real global de feriados e fins de semana sincronizada no Firebase Firestore e RTDB
   */
  subscribe(
    onData: (items: CalendarSpecialDate[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    // 1. Carrega dados do cache local imediatamente
    const initial = getLocalCache();
    onData(initial);

    let unsubFirestore: Unsubscribe | null = null;
    let unsubRTDB: RTDBUnsubscribe | null = null;

    // 2. Listener do Firestore na coleção global /special_dates
    try {
      const colRef = collection(db, 'special_dates');
      unsubFirestore = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: CalendarSpecialDate[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              items.push({
                id: docSnap.id,
                title: d.title || 'Feriado',
                date: d.date || undefined,
                dayOfWeek: typeof d.dayOfWeek === 'number' ? d.dayOfWeek : undefined,
                type: d.type || 'feriado',
                description: d.description || '',
                isRecurringWeekend: Boolean(d.isRecurringWeekend),
                isRecurringAnnual: typeof d.isRecurringAnnual === 'boolean' 
                  ? d.isRecurringAnnual 
                  : (typeof d.isRecurring === 'boolean' ? d.isRecurring : true),
                enabled: d.enabled !== false,
                color: d.color || 'red',
                createdAt: d.createdAt || Date.now(),
                updatedAt: d.updatedAt || Date.now(),
                createdBy: d.createdBy || ''
              });
            });

            // Se a coleção tiver itens, garante que fins de semana recorrentes estejam incluídos caso não estejam no DB
            const hasSunday = items.some(x => x.dayOfWeek === 0 || x.id === 'weekend_sunday');
            const hasSaturday = items.some(x => x.dayOfWeek === 6 || x.id === 'weekend_saturday');

            const completeList = [...items];
            if (!hasSunday) completeList.unshift(DEFAULT_WEEKEND_CARDS[0]);
            if (!hasSaturday) completeList.unshift(DEFAULT_WEEKEND_CARDS[1]);

            setLocalCache(completeList);
            onData(completeList);
          } else {
            // Se o Firestore estiver vazio pela primeira vez, inicializa com o conjunto padrão
            specialDateService.seedInitialDataIfEmpty().then((seeded) => {
              if (seeded && seeded.length > 0) {
                onData(seeded);
              }
            });
          }
        },
        (err) => {
          console.warn("Aviso no snapshot de feriados do Firestore:", err);
          handleFirestoreError(err, OperationType.LIST, 'special_dates');
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      console.warn("Erro ao iniciar listener do Firestore para feriados:", err);
      if (onError) onError(err);
    }

    // 3. Listener do RTDB global /special_dates
    try {
      if (rtdb) {
        const specialRef = rtdbRef(rtdb, 'special_dates');
        unsubRTDB = rtdbOnValue(specialRef, (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            if (val && typeof val === 'object') {
              const rtdbItems: CalendarSpecialDate[] = Object.entries(val).map(([id, item]: any) => ({
                ...item,
                id
              }));
              if (rtdbItems.length > 0) {
                const hasSunday = rtdbItems.some(x => x.dayOfWeek === 0 || x.id === 'weekend_sunday');
                const hasSaturday = rtdbItems.some(x => x.dayOfWeek === 6 || x.id === 'weekend_saturday');
                const completeList = [...rtdbItems];
                if (!hasSunday) completeList.unshift(DEFAULT_WEEKEND_CARDS[0]);
                if (!hasSaturday) completeList.unshift(DEFAULT_WEEKEND_CARDS[1]);

                setLocalCache(completeList);
                onData(completeList);
              }
            }
          }
        });
      }
    } catch (rtdbErr) {
      console.warn("Aviso no listener RTDB de feriados:", rtdbErr);
    }

    return () => {
      if (unsubFirestore) unsubFirestore();
      if (unsubRTDB) unsubRTDB();
    };
  },

  /**
   * Salva dados iniciais caso a base do Firebase esteja vazia
   */
  async seedInitialDataIfEmpty(): Promise<CalendarSpecialDate[]> {
    try {
      const snap = await getDocs(collection(db, 'special_dates'));
      if (!snap.empty) {
        return getLocalCache();
      }

      const allToSeed: CalendarSpecialDate[] = [
        ...DEFAULT_WEEKEND_CARDS,
        ...DEFAULT_FERIADOS_MARACANAU.map((item, idx) => ({
          ...item,
          id: `holiday_${item.date?.replace(/-/g, '_') || idx}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'Sistema Oficial'
        }))
      ];

      for (const item of allToSeed) {
        const docRef = doc(db, 'special_dates', item.id);
        await executeFirestoreWithRetry(
          () => setDoc(docRef, item, { merge: true }),
          { operationName: `seedSpecialDate:${item.id}` }
        );
        if (rtdb) {
          await rtdbSet(rtdbRef(rtdb, `special_dates/${item.id}`), item);
        }
      }

      setLocalCache(allToSeed);
      return allToSeed;
    } catch (e) {
      console.warn("Erro ao semear feriados iniciais:", e);
      return getLocalCache();
    }
  },

  /**
   * Adiciona ou atualiza um feriado ou demarcação especial (Apenas Administrador)
   */
  async save(
    specialDate: Omit<CalendarSpecialDate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    user: UserProfile | null
  ): Promise<string> {
    if (!isUserAdmin(user)) {
      throw new Error("Apenas administradores podem adicionar ou editar feriados e demarcações.");
    }

    const now = Date.now();
    const id = specialDate.id || (
      specialDate.date ? `holiday_${specialDate.date.replace(/-/g, '_')}_${now}` : `special_${now}`
    );

    const payload: CalendarSpecialDate = {
      ...specialDate,
      id,
      title: (specialDate.title || 'Feriado').trim(),
      type: specialDate.type || 'feriado',
      isRecurringAnnual: typeof specialDate.isRecurringAnnual === 'boolean' ? specialDate.isRecurringAnnual : true,
      enabled: specialDate.enabled !== false,
      color: specialDate.color || 'red',
      createdAt: now,
      updatedAt: now,
      createdBy: user?.displayName || user?.email || 'Administrador'
    };

    // 1. Atualiza cache local
    const current = getLocalCache();
    const updated = [payload, ...current.filter(x => x.id !== id)];
    setLocalCache(updated);

    // 2. Grava no Firestore com retry robusto
    try {
      const docRef = doc(db, 'special_dates', id);
      await executeFirestoreWithRetry(
        () => setDoc(docRef, payload, { merge: true }),
        { operationName: `saveSpecialDate:${id}` }
      );
    } catch (err: any) {
      console.warn("Erro ao salvar feriado no Firestore:", err);
      handleFirestoreError(err, OperationType.WRITE, `special_dates/${id}`);
    }

    // 3. Grava no RTDB
    try {
      if (rtdb) {
        await rtdbSet(rtdbRef(rtdb, `special_dates/${id}`), payload);
      }
    } catch (rtdbErr) {
      console.warn("Erro ao salvar feriado no RTDB:", rtdbErr);
    }

    return id;
  },

  /**
   * Exclui um feriado ou demarcação especial (Apenas Administrador)
   */
  async delete(id: string, user: UserProfile | null): Promise<void> {
    if (!isUserAdmin(user)) {
      throw new Error("Apenas administradores podem excluir feriados e demarcações.");
    }

    // 1. Atualiza cache local
    const current = getLocalCache();
    const filtered = current.filter(x => x.id !== id);
    setLocalCache(filtered);

    // 2. Exclui do Firestore com retry robusto
    try {
      const docRef = doc(db, 'special_dates', id);
      await executeFirestoreWithRetry(
        () => deleteDoc(docRef),
        { operationName: `deleteSpecialDate:${id}` }
      );
    } catch (err: any) {
      console.warn("Erro ao excluir feriado do Firestore:", err);
      handleFirestoreError(err, OperationType.DELETE, `special_dates/${id}`);
    }

    // 3. Exclui do RTDB
    try {
      if (rtdb) {
        await rtdbRemove(rtdbRef(rtdb, `special_dates/${id}`));
      }
    } catch (rtdbErr) {
      console.warn("Erro ao excluir feriado do RTDB:", rtdbErr);
    }
  },

  /**
   * Ativa ou desativa a exibição automática de cards de fins de semana (Domingo / Sábado)
   */
  async toggleWeekendDisplay(dayOfWeek: number, enabled: boolean, user: UserProfile | null): Promise<void> {
    if (!isUserAdmin(user)) {
      throw new Error("Apenas administradores podem alterar configurações de fins de semana.");
    }

    const id = dayOfWeek === 0 ? 'weekend_sunday' : 'weekend_saturday';
    const defaultItem = dayOfWeek === 0 ? DEFAULT_WEEKEND_CARDS[0] : DEFAULT_WEEKEND_CARDS[1];

    const current = getLocalCache();
    const existing = current.find(x => x.id === id) || defaultItem;
    const updatedItem: CalendarSpecialDate = {
      ...existing,
      enabled,
      updatedAt: Date.now()
    };

    await this.save(updatedItem, user);
  },

  /**
   * Retorna todos os feriados e datas especiais aplicáveis a uma determinada data (YYYY-MM-DD).
   * Fins de semana são destacados visualmente pela tonalidade das células do calendário.
   */
  getSpecialDatesForDate(dateStr: string, dayOfWeek: number, allSpecialDates: CalendarSpecialDate[]): CalendarSpecialDate[] {
    const list = allSpecialDates && allSpecialDates.length > 0 ? allSpecialDates : getLocalCache();
    const matched: CalendarSpecialDate[] = [];
    const targetMonthDay = dateStr.length >= 10 ? dateStr.slice(5) : ''; // "MM-DD"

    // Feriados e datas específicas (incluindo feriados com recorrência anual para anos subsequentes)
    for (const item of list) {
      if (item.enabled === false) continue;
      if (item.type === 'fim_de_semana' || item.isRecurringWeekend || item.id === 'weekend_sunday' || item.id === 'weekend_saturday') continue;

      // 1.1 Coincidência exata de data (YYYY-MM-DD)
      if (item.date === dateStr) {
        if (!matched.some(x => x.id === item.id)) {
          matched.push(item);
        }
        continue;
      }

      // 1.2 Coincidência por recorrência anual (mesmo mês e dia em anos diferentes)
      if (item.isRecurringAnnual !== false && item.date && targetMonthDay) {
        const itemMonthDay = item.date.slice(5);
        if (itemMonthDay === targetMonthDay) {
          if (!matched.some(x => x.id === item.id)) {
            matched.push(item);
          }
        }
      }
    }

    return matched;
  }
};
