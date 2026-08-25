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
  projectId: firebaseConfigJson.projectId || "dp-oitivas",
  appId: firebaseConfigJson.appId || "1:419038450181:web:a3e770c8f77ec00caa426c",
  apiKey: firebaseConfigJson.apiKey || "AIzaSyCnX1qIqv7YwbngXH0zBXyoX2BDu36rc3I",
  authDomain: firebaseConfigJson.authDomain || "dp-oitivas.firebaseapp.com",
  storageBucket: firebaseConfigJson.storageBucket || "dp-oitivas.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || "419038450181",
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
  rtdbInstance = getDatabase(rtdbApp, "https://calandario-oitiva-default-rtdb.firebaseio.com");
} catch {
  rtdbInstance = getDatabase(app);
}
export const rtdb = rtdbInstance;

// Inicializa Firestore com o databaseId correto, detecção de long polling e persistência multi-abas
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app, 
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    }, 
    firestoreDatabaseId
  );
} catch (e) {
  try {
    firestoreDb = initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true
      },
      firestoreDatabaseId
    );
  } catch {
    firestoreDb = getFirestore(app, firestoreDatabaseId);
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

// Teste inicial de conexão com o servidor Firestore com tratamento seguro de offline/unavailable
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    // Normal em inicialização offline ou se conexão ainda estiver negociando transporte
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
