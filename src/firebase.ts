import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  doc,
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import firebaseConfigJson from '../firebase-applet-config.json';

// Configura nível de log do Firestore para modo silencioso, evitando alertas de reconexão
try {
  setLogLevel('silent');
} catch {
  // Ignora se não suportado
}

// Configuração do projeto Firebase Cloud Firestore
export const firebaseConfig = {
  projectId: firebaseConfigJson.projectId || "dp-oitivas",
  appId: firebaseConfigJson.appId || "1:419038450181:web:a3e770c8f77ec00caa426c",
  apiKey: firebaseConfigJson.apiKey || "AIzaSyCnX1qIqv7YwbngXH0zBXyoX2BDu36rc3I",
  authDomain: firebaseConfigJson.authDomain || "dp-oitivas.firebaseapp.com",
  storageBucket: firebaseConfigJson.storageBucket || "dp-oitivas.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || "419038450181",
};

// Configuração do Realtime Database (calandario-oitiva)
export const rtdbConfig = {
  apiKey: "AIzaSyCnX1qIqv7YwbngXH0zBXyoX2BDu36rc3I",
  authDomain: "dp-oitivas.firebaseapp.com",
  projectId: "dp-oitivas",
  databaseURL: "https://dp-oitivas-default-rtdb.firebaseio.com",
  storageBucket: "dp-oitivas.firebasestorage.app",
  messagingSenderId: "419038450181",
  appId: "1:419038450181:web:a3e770c8f77ec00caa426c"
};

export const firestoreDatabaseId = (firebaseConfigJson as any).firestoreDatabaseId || "ai-studio-1dpoitivas-38a4723f-ec20-4946-b7a6-e8758ca2068a";
export const googleClientId = firebaseConfigJson.oAuthClientId || "419038450181-hkt4kk4p84r0afv11h9isvvgg4oa1m6e.apps.googleusercontent.com";

// Inicializa app Firebase principal
export const app = getApps().find(a => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Inicializa app secundário para o Realtime Database do projeto calandario-oitiva
let rtdbAppInstance;
try {
  rtdbAppInstance = getApps().find(a => a.name === 'rtdbApp') || initializeApp(rtdbConfig, 'rtdbApp');
} catch {
  rtdbAppInstance = app;
}

export const rtdbApp = rtdbAppInstance;

// Instância do Firebase Realtime Database
let rtdbInstance: Database;
try {
  rtdbInstance = getDatabase(rtdbApp, "https://dp-oitivas-default-rtdb.firebaseio.com/");
} catch {
  rtdbInstance = getDatabase(app);
}
export const rtdb = rtdbInstance;

// Inicializa Firestore com o databaseId correto do projeto e transporte resiliente via Long Polling
let firestoreDb: Firestore;

try {
  // Tentativa 1: Cache persistente com Long Polling forçado (evita falhas de streaming em sandboxes/proxies)
  firestoreDb = initializeFirestore(
    app, 
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    }, 
    firestoreDatabaseId
  );
} catch (err1) {
  try {
    // Tentativa 2: Cache em memória com Long Polling forçado
    firestoreDb = initializeFirestore(
      app,
      {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true
      },
      firestoreDatabaseId
    );
  } catch (err2) {
    try {
      // Tentativa 3: Instância com getFirestore padrão
      firestoreDb = getFirestore(app, firestoreDatabaseId);
    } catch (err3) {
      firestoreDb = getFirestore(app);
    }
  }
}

export const db = firestoreDb;
export const googleProvider = new GoogleAuthProvider();

// Scopes do Google Workspace (Drive, Gmail, Calendar)
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly'
];

WORKSPACE_SCOPES.forEach(scope => {
  googleProvider.addScope(scope);
});

/**
 * Utilitário de Retry com Exponential Backoff e Jitter para operações no Firestore
 * Garante resiliência em conexões instáveis, timeout transitório e restrições de rede.
 */
export async function executeFirestoreWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 4,
    initialDelayMs = 400,
    maxDelayMs = 5000,
    backoffFactor = 2,
    operationName = 'FirestoreOperation'
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      
      const errorCode = error?.code || '';
      const errorMessage = error?.message || String(error);
      
      // Verifica se o erro é transitório / passível de retry
      const isRetryable = 
        errorCode === 'unavailable' ||
        errorCode === 'deadline-exceeded' ||
        errorCode === 'resource-exhausted' ||
        errorCode === 'aborted' ||
        errorCode === 'cancelled' ||
        errorMessage.includes('Failed to get document because the client is offline') ||
        errorMessage.includes('Could not reach Cloud Firestore backend') ||
        errorMessage.includes('network-request-failed') ||
        errorMessage.includes('transport errored') ||
        errorMessage.includes('Connection failed');

      if (!isRetryable || attempt > maxRetries) {
        if (attempt > maxRetries) {
          console.warn(`[${operationName}] Limite de ${maxRetries} tentativas excedido:`, error);
        }
        throw error;
      }

      // Adiciona jitter para evitar tempestades de requisições simultâneas
      const jitter = Math.random() * 200;
      const sleepTime = Math.min(delay + jitter, maxDelayMs);

      console.warn(`[${operationName}] Tentativa ${attempt} falhou (${errorCode || errorMessage}). Nova tentativa em ${Math.round(sleepTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
      
      delay *= backoffFactor;
    }
  }

  throw new Error(`[${operationName}] Falha após ${maxRetries} tentativas.`);
}

/**
 * Re-conecta a rede do Firestore caso entre em estado de suspensão ou falha persistente
 */
export async function reconnectFirestore(): Promise<void> {
  try {
    const { disableNetwork, enableNetwork } = await import('firebase/firestore');
    await disableNetwork(db);
    await new Promise(r => setTimeout(r, 200));
    await enableNetwork(db);
    console.log('Rede do Firestore reconectada com sucesso.');
  } catch (err) {
    console.warn('Aviso ao reconectar rede do Firestore:', err);
  }
}

// Teste inicial de conexão com o servidor Firestore com mecanismo de retry robusto
export async function testFirestoreConnection(maxAttempts: number = 3): Promise<boolean> {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error: any) {
      if (i < maxAttempts) {
        await new Promise(r => setTimeout(r, 500 * i));
      }
    }
  }
  return false;
}

// Error handling padronizado conforme diretrizes de arquitetura do Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  const isTransientNetwork = 
    errInfo.error.includes('offline') ||
    errInfo.error.includes('unavailable') ||
    errInfo.error.includes('transport errored') ||
    errInfo.error.includes('backend') ||
    errInfo.error.includes('network');

  if (!isTransientNetwork) {
    console.error('Firestore Error Details:', JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Transitório (Modo Offline / Reconectando):', errInfo.error);
  }
  return errInfo;
}
