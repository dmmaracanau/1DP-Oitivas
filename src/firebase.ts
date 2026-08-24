import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import firebaseConfigJson from '../firebase-applet-config.json';

// Configuração do projeto Firebase Cloud Firestore
export const firebaseConfig = {
  projectId: firebaseConfigJson.projectId || "gen-lang-client-0042808261",
  appId: firebaseConfigJson.appId || "1:990634811839:web:6a14e1ff54b938e591010a",
  apiKey: firebaseConfigJson.apiKey || "AIzaSyApFItY2kDW-moOChbOZathqDZ70WNUO9w",
  authDomain: firebaseConfigJson.authDomain || "gen-lang-client-0042808261.firebaseapp.com",
  storageBucket: firebaseConfigJson.storageBucket || "gen-lang-client-0042808261.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || "990634811839",
};

// Configuração do Realtime Database (calandario-oitiva)
export const rtdbConfig = {
  apiKey: "AIzaSyBWnoSQ-KvsK3jyXbx3cLapNPdXA4pJcfI",
  authDomain: "calandario-oitiva.firebaseapp.com",
  projectId: "calandario-oitiva",
  databaseURL: "https://calandario-oitiva-default-rtdb.firebaseio.com",
  storageBucket: "calandario-oitiva.firebasestorage.app",
  messagingSenderId: "212326139293",
  appId: "1:212326139293:web:0115579f44bc263b529b74",
  measurementId: "G-3DRJ07XCKL"
};

export const firestoreDatabaseId = firebaseConfigJson.firestoreDatabaseId || "(default)";

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
  rtdbInstance = getDatabase(rtdbApp, "https://calandario-oitiva-default-rtdb.firebaseio.com");
} catch {
  rtdbInstance = getDatabase(app);
}
export const rtdb = rtdbInstance;

// Inicializa Firestore com o databaseId correto e persistência multi-abas
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app, 
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, 
    firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firestoreDatabaseId);
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

// Teste inicial de conexão com o servidor Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore operando em cache local/offline:", error.message);
    }
    return false;
  }
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
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  return errInfo;
}
