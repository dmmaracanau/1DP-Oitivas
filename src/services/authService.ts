import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged as fbOnAuthStateChanged,
  signInAnonymously,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser,
  User,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, get as rtdbGet } from 'firebase/database';
import { auth, db, rtdb, googleProvider, googleClientId } from '../firebase';
import { UserProfile, DuplicateUserGroup, MergeUsersResult } from '../types/oitiva';

const LOCAL_USER_KEY = 'oitivas_user_session';
const USERS_COLLECTION = 'users';

// In-memory token cache (required for Workspace OAuth scopes)
let cachedAccessToken: string | null = null;

// Garante o carregamento do script do Google Identity Services (GSI)
async function ensureGoogleIdentityLoaded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as any).google?.accounts?.oauth2) return;

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      if ((window as any).google?.accounts?.oauth2) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Identity Services.')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services.'));
    document.head.appendChild(script);
  });
}

// Solicita Access Token via Google Identity Services Token Client (OAuth 2.0)
async function requestTokenViaGsi(): Promise<string> {
  await ensureGoogleIdentityLoaded();
  const google = (window as any).google;
  if (!google?.accounts?.oauth2?.initTokenClient) {
    throw new Error("Google Identity Services não está pronto no navegador.");
  }

  const clientId = googleClientId;
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
  ].join(' ');

  return new Promise((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        callback: (response: any) => {
          if (response?.error) {
            return reject(new Error(response.error_description || response.error));
          }
          if (response?.access_token) {
            cachedAccessToken = response.access_token;
            return resolve(response.access_token);
          }
          reject(new Error("Nenhum token de acesso foi retornado pelo Google."));
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || "Erro na autenticação do Google Workspace."));
        }
      });
      client.requestAccessToken({ prompt: '' });
    } catch (e: any) {
      reject(e);
    }
  });
}

// Busca informações do perfil do usuário utilizando o Access Token do Google
async function fetchGoogleUserInfo(token: string): Promise<{
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
}> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Aviso ao buscar dados do perfil Google:", e);
  }
  return {};
}

// Helper to sanitize undefined values before saving to Firestore & RTDB
function sanitizeData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined && obj[key] !== null) {
      clean[key] = obj[key];
    }
  }
  return clean;
}

// Map Firebase Auth error codes to helpful Portuguese descriptions
function mapAuthError(err: any): string {
  if (!err) return 'Erro na autenticação.';
  const code = err.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'E-mail, usuário ou senha incorretos. Verifique suas credenciais.';
    case 'auth/user-not-found':
      return 'Nenhum usuário cadastrado com este e-mail.';
    case 'auth/invalid-email':
      return 'Formato de e-mail inválido.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
    case 'auth/weak-password':
      return 'A senha deve conter caracteres suficientes.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas malsucedidas. Por segurança, tente novamente em alguns minutos.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique o acesso à internet.';
    case 'auth/requires-recent-login':
      return 'Por segurança, faça login novamente antes de realizar esta alteração.';
    case 'auth/popup-closed-by-user':
      return 'A janela de autorização do Google foi fechada antes da conclusão.';
    case 'auth/popup-blocked':
      return 'A janela popup foi bloqueada pelo navegador. Permita popups para este site.';
    case 'auth/unauthorized-domain':
      return 'Domínio não autorizado pelo Firebase para popups. A autorização direta do Google Identity Services foi disponibilizada.';
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'O provedor de autenticação precisa ser ativado no console.';
    default:
      return err.message || 'Erro durante a operação de autenticação.';
  }
}

// Criptografia SHA-256 com salt para credenciais de acesso locais e em nuvem
async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "_oitivas_pcce_maracanau_2026_secure");
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return btoa(unescape(encodeURIComponent(password + "_oitivas_salt")));
  }
}

// Normaliza senhas para permitir qualquer formato ou comprimento sem nenhuma limitação para o usuário
function normalizePassword(pass: string): string {
  if (!pass) return '';
  if (pass.length < 6) {
    return `${pass}__pccesecure_pass_${pass}`;
  }
  return pass;
}

export const authService = {
  // Retorna token de acesso em memória
  getAccessToken(): string | null {
    return cachedAccessToken;
  },

  setAccessToken(token: string | null) {
    cachedAccessToken = token;
  },

  hasGoogleWorkspaceAccess(): boolean {
    return !!cachedAccessToken;
  },

  // Retorna usuário da sessão local rápida
  getCurrentUser(): UserProfile | null {
    try {
      const saved = localStorage.getItem(LOCAL_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignora erro
    }

    if (auth.currentUser) {
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || 'Servidor(a) Policial',
        photoURL: auth.currentUser.photoURL,
        role: 'user',
        isAdmin: false,
        unitName: '1ª Delegacia Metropolitana de Maracanaú',
        authProvider: auth.currentUser.isAnonymous ? 'anonymous' : 'password'
      };
    }

    return null;
  },

  // Verifica se o usuário atual é administrador
  isCurrentUserAdmin(): boolean {
    const u = this.getCurrentUser();
    if (!u) return false;
    return u.role === 'admin' || Boolean(u.isAdmin);
  },

  // Busca dados extras de perfil no Firestore ou RTDB
  async fetchUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const firestoreData = snap.data() as Partial<UserProfile>;
        const current = this.getCurrentUser() || { uid, email: null, displayName: null };
        const merged: UserProfile = {
          ...current,
          ...firestoreData,
          uid,
          role: firestoreData.role || (firestoreData.isAdmin ? 'admin' : 'user'),
          isAdmin: Boolean(firestoreData.isAdmin || firestoreData.role === 'admin')
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn("Aviso ao carregar perfil do Firestore:", err);
    }

    // Fallback RTDB
    try {
      if (rtdb) {
        const rRef = rtdbRef(rtdb, `users/${uid}`);
        const rSnap = await rtdbGet(rRef);
        if (rSnap.exists()) {
          const rtdbData = rSnap.val() as Partial<UserProfile>;
          const current = this.getCurrentUser() || { uid, email: null, displayName: null };
          const merged: UserProfile = { 
            ...current, 
            ...rtdbData, 
            uid,
            role: rtdbData.role || (rtdbData.isAdmin ? 'admin' : 'user'),
            isAdmin: Boolean(rtdbData.isAdmin || rtdbData.role === 'admin')
          };
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(merged));
          return merged;
        }
      }
    } catch {}

    return this.getCurrentUser();
  },

  // Observador de estado de autenticação com sincronização em tempo real do perfil no Firestore e RTDB
  onAuthChange(callback: (user: UserProfile | null) => void): () => void {
    let unsubUserDoc: (() => void) | null = null;

    try {
      console.log("[FirebaseAuth] Initializing onAuthStateChanged observer...");
      const unsubAuth = fbOnAuthStateChanged(auth, async (user: User | null) => {
        console.log(`[FirebaseAuth] onAuthStateChanged triggered:`, user ? { uid: user.uid, email: user.email } : 'NULL');

        if (unsubUserDoc) {
          unsubUserDoc();
          unsubUserDoc = null;
        }

        const cached = this.getCurrentUser();

        if (user) {
          const effectiveUid = (user.isAnonymous && cached?.uid) ? cached.uid : user.uid;
          const baseProfile: UserProfile = {
            uid: effectiveUid,
            username: cached?.username || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_.]/g, '') || null,
            email: user.email || cached?.email || null,
            displayName: user.displayName || cached?.displayName || user.email?.split('@')[0] || 'Servidor(a) Policial',
            photoURL: user.photoURL || cached?.photoURL || null,
            role: cached?.role || (cached?.isAdmin ? 'admin' : 'user'),
            isAdmin: Boolean(cached?.isAdmin || cached?.role === 'admin'),
            cargo: cached?.cargo || 'Inspetor(a) de Polícia',
            registrationNumber: cached?.registrationNumber || '',
            institutionalEmail: cached?.institutionalEmail || (user.email?.includes('delegacia') ? user.email : ''),
            unitName: cached?.unitName || '1ª Delegacia Metropolitana de Maracanaú',
            phone: cached?.phone || '(85) 3101-2830',
            department: cached?.department || 'Cartório de Oitivas',
            authProvider: user.isAnonymous ? (cached?.authProvider || 'anonymous') : (cachedAccessToken ? 'google' : 'password')
          };

          // Escuta em tempo real o documento do usuário no Firestore (sincroniza alterações entre dispositivos)
          try {
            const userDocRef = doc(db, USERS_COLLECTION, effectiveUid);
            unsubUserDoc = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                const liveData = snap.data() as Partial<UserProfile>;
                const liveProfile: UserProfile = {
                  ...baseProfile,
                  ...liveData,
                  uid: effectiveUid,
                  email: user.email || liveData.email || baseProfile.email,
                  displayName: user.displayName || liveData.displayName || baseProfile.displayName,
                  photoURL: user.photoURL || liveData.photoURL || null,
                  role: liveData.role || (liveData.isAdmin ? 'admin' : 'user'),
                  isAdmin: Boolean(liveData.isAdmin || liveData.role === 'admin')
                };
                localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(liveProfile));
                callback(liveProfile);
              } else {
                // Se documento ainda não existe no Firestore, salva o perfil inicial
                setDoc(userDocRef, sanitizeData({ ...baseProfile, updatedAt: Date.now() }), { merge: true }).catch(() => {});
                if (rtdb) {
                  rtdbSet(rtdbRef(rtdb, `users/${effectiveUid}`), sanitizeData({ ...baseProfile, updatedAt: Date.now() })).catch(() => {});
                }
                localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(baseProfile));
                callback(baseProfile);
              }
            }, (docErr) => {
              console.warn("[FirebaseAuth] Realtime user profile sync notice:", docErr);
              localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(baseProfile));
              callback(baseProfile);
            });
          } catch (listenerErr) {
            console.warn("[FirebaseAuth] Falha ao abrir listener de perfil:", listenerErr);
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(baseProfile));
            callback(baseProfile);
          }
        } else {
          if (cached && cached.uid) {
            try {
              signInAnonymously(auth).catch(() => {});
            } catch {}
            callback(cached);
          } else {
            cachedAccessToken = null;
            localStorage.removeItem(LOCAL_USER_KEY);
            callback(null);
          }
        }
      });

      return () => {
        unsubAuth();
        if (unsubUserDoc) unsubUserDoc();
      };
    } catch (err) {
      console.warn("[FirebaseAuth] Auth listener fallback:", err);
      const local = this.getCurrentUser();
      callback(local);
      return () => {};
    }
  },

  // Atualiza perfil próprio do usuário e sincroniza direto no Firestore e RTDB
  async updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const current = this.getCurrentUser() || {
      uid: auth.currentUser?.uid || `user_${Date.now()}`,
      email: auth.currentUser?.email || 'delegaciammaracanau@gmail.com',
      displayName: 'Servidor(a)'
    };

    const updatedProfile: UserProfile = {
      ...current,
      ...profileData,
      uid: current.uid,
      role: profileData.role !== undefined ? profileData.role : current.role,
      isAdmin: profileData.isAdmin !== undefined ? profileData.isAdmin : current.isAdmin,
      updatedAt: Date.now()
    };

    // 1. Atualiza no cache local
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updatedProfile));

    // 2. Se houver usuário no Firebase Auth, atualiza displayName e photoURL
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: updatedProfile.displayName || undefined,
          photoURL: updatedProfile.photoURL || undefined
        });
      } catch (err) {
        console.warn("Aviso ao atualizar perfil no Firebase Auth:", err);
      }
    }

    // 3. Salva no Firestore garantindo persistência na nuvem para todos os dispositivos
    try {
      const uid = updatedProfile.uid;
      const userRef = doc(db, USERS_COLLECTION, uid);
      await setDoc(userRef, sanitizeData(updatedProfile), { merge: true });
    } catch (err) {
      console.warn("Aviso ao salvar perfil no Firestore:", err);
    }

    // 4. Salva no RTDB
    try {
      if (rtdb && updatedProfile.uid) {
        const rRef = rtdbRef(rtdb, `users/${updatedProfile.uid}`);
        await rtdbSet(rRef, sanitizeData(updatedProfile));
      }
    } catch (err) {
      console.warn("Aviso ao salvar perfil no RTDB:", err);
    }

    return updatedProfile;
  },

  // Atualizar senha de acesso da conta
  async updateUserPassword(newPassword: string): Promise<void> {
    if (!newPassword) {
      throw new Error("Informe a nova senha.");
    }

    const currentProfile = this.getCurrentUser();
    const uid = currentProfile?.uid || auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Usuário não identificado.");
    }

    const pHash = await hashPassword(newPassword);

    // 1. Atualiza no Firebase Auth se usuário estiver com sessão nativa
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      try {
        await updatePassword(auth.currentUser, normalizePassword(newPassword));
      } catch (err: any) {
        console.warn("Aviso ao atualizar senha no Firebase Auth:", err);
      }
    }

    // 2. Atualiza o hash seguro no Firestore para garantir autenticação em qualquer dispositivo
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await setDoc(userRef, { passwordHash: pHash, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn("Aviso ao atualizar passwordHash no Firestore:", err);
    }
  },

  // Enviar link de recuperação / redefinição de senha para o e-mail da conta
  async sendPasswordReset(accountEmail: string): Promise<void> {
    const targetEmail = accountEmail?.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      throw new Error("Informe um e-mail válido para a recuperação de senha.");
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
    } catch (err: any) {
      throw new Error(mapAuthError(err));
    }
  },

  // Login com Google (com suporte primário ao Google Identity Services e fallback Firebase)
  async loginWithGoogle(): Promise<{ profile: UserProfile; token?: string }> {
    let token: string | null = null;
    let googleUser: { sub?: string; email?: string; name?: string; picture?: string } | null = null;
    let uid = '';

    // 1. Tenta obter token diretamente via Google Identity Services (GSI)
    try {
      token = await requestTokenViaGsi();
      if (token) {
        cachedAccessToken = token;
        googleUser = await fetchGoogleUserInfo(token);
        uid = googleUser?.sub ? `google_${googleUser.sub}` : `google_${Date.now().toString(36)}`;
      }
    } catch (gsiErr: any) {
      console.warn("Google Identity Services não concluiu, tentando fallback Firebase Auth:", gsiErr);
    }

    // 2. Se o GSI não retornou token (ex: popup fechado ou bloqueado), tenta signInWithPopup do Firebase
    if (!token) {
      try {
        const res = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(res);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          token = credential.accessToken;
        }
        uid = res.user.uid;
        googleUser = {
          email: res.user.email || undefined,
          name: res.user.displayName || undefined,
          picture: res.user.photoURL || undefined
        };
      } catch (fbErr: any) {
        console.error("Erro no login Google:", fbErr);
        throw new Error(mapAuthError(fbErr));
      }
    }

    if (!uid) {
      throw new Error("Não foi possível identificar o usuário Google.");
    }

    // Recupera dados já existentes do perfil se houver
    const docRef = doc(db, USERS_COLLECTION, uid);
    let existingData: Partial<UserProfile> = {};
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existingData = snap.data() as Partial<UserProfile>;
      }
    } catch (e) {
      console.warn("Aviso ao carregar dados do usuário no Firestore:", e);
    }

    const profile: UserProfile = {
      uid: uid,
      email: googleUser?.email || existingData.email || '',
      displayName: googleUser?.name || existingData.displayName || 'Servidor(a) Policial',
      photoURL: googleUser?.picture || existingData.photoURL || null,
      role: existingData.role || (existingData.isAdmin ? 'admin' : 'user'),
      isAdmin: Boolean(existingData.isAdmin || existingData.role === 'admin'),
      cargo: existingData.cargo || 'Escrivão(ã) / Inspetor(a)',
      registrationNumber: existingData.registrationNumber || '',
      institutionalEmail: existingData.institutionalEmail || googleUser?.email || '',
      unitName: existingData.unitName || '1ª Delegacia Metropolitana de Maracanaú',
      phone: existingData.phone || '(85) 3101-2830',
      department: existingData.department || 'Cartório de Oitivas',
      authProvider: 'google',
      updatedAt: Date.now()
    };

    // Salva perfil no Firestore e RTDB
    try {
      await setDoc(docRef, sanitizeData(profile), { merge: true });
      if (rtdb) {
        await rtdbSet(rtdbRef(rtdb, `users/${uid}`), sanitizeData(profile));
      }
    } catch (e) {
      console.warn("Erro ao gravar perfil Google:", e);
    }

    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    return { profile, token: cachedAccessToken || undefined };
  },

  // Re-solicitar token / conectar Workspace
  async connectGoogleWorkspace(): Promise<string | null> {
    // 1. Tenta obter o token diretamente via Google Identity Services
    try {
      const token = await requestTokenViaGsi();
      if (token) {
        cachedAccessToken = token;
        return token;
      }
    } catch (gsiErr: any) {
      console.warn("Tentativa via GSI não concluiu, tentando fallback Firebase:", gsiErr);
    }

    // 2. Fallback com Firebase signInWithPopup
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(res);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        return cachedAccessToken;
      }
      return null;
    } catch (err: any) {
      console.error("Erro ao conectar Google Workspace:", err);
      throw new Error(mapAuthError(err));
    }
  },

  // Login com Email ou Nome de Usuário e Senha sincronizado com Firestore e RTDB
  async loginWithEmail(identifier: string, pass: string): Promise<UserProfile> {
    console.log(`[FirebaseAuth] loginWithEmail initiated for identifier: "${identifier}"`);
    if (!identifier || !pass) {
      throw new Error("Por favor, preencha seu usuário/e-mail e a senha.");
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const pHash = await hashPassword(pass);
    let userDocSnap: any = null;
    let userDocData: any = null;
    let userUid = '';

    // 1. Busca no Firestore por Nome de Usuário
    try {
      const uQuery = query(
        collection(db, USERS_COLLECTION),
        where('username', '==', cleanIdentifier)
      );
      const uSnap = await getDocs(uQuery);
      if (!uSnap.empty) {
        userDocSnap = uSnap.docs[0];
        userDocData = userDocSnap.data();
        userUid = userDocSnap.id;
        console.log(`[FirebaseAuth] Found Firestore user by username "${cleanIdentifier}":`, { uid: userUid, email: userDocData.email });
      }
    } catch (err) {
      console.warn("[FirebaseAuth] Consulta por username no Firestore:", err);
    }

    // 2. Se não encontrou por username, busca por e-mail no Firestore
    if (!userDocData) {
      try {
        const eQuery = query(
          collection(db, USERS_COLLECTION),
          where('email', '==', cleanIdentifier)
        );
        const eSnap = await getDocs(eQuery);
        if (!eSnap.empty) {
          userDocSnap = eSnap.docs[0];
          userDocData = userDocSnap.data();
          userUid = userDocSnap.id;
          console.log(`[FirebaseAuth] Found Firestore user by email "${cleanIdentifier}":`, { uid: userUid, displayName: userDocData.displayName });
        }
      } catch (err) {
        console.warn("[FirebaseAuth] Consulta por email no Firestore:", err);
      }
    }

    const loginEmail = userDocData?.email || (cleanIdentifier.includes('@') ? cleanIdentifier : '');
    let authAttemptError: any = null;
    let fbSuccess = false;

    // 3. Tenta autenticação nativa do Firebase Auth se houver e-mail
    if (loginEmail) {
      try {
        const res = await signInWithEmailAndPassword(auth, loginEmail, normalizePassword(pass));
        userUid = res.user.uid;
        fbSuccess = true;
        
        // Recarrega documento do Firestore se existir
        const snap = await getDoc(doc(db, USERS_COLLECTION, res.user.uid));
        if (snap.exists()) {
          userDocData = snap.data();
        }
      } catch (err: any) {
        authAttemptError = err;
      }
    }

    // 4. Verificação de credenciais e Auto-provisionamento no Firebase Authentication
    if (userDocData) {
      const storedHash = userDocData.passwordHash;
      const isPasswordValid = fbSuccess || (storedHash && storedHash === pHash) || (!storedHash && fbSuccess);

      if (isPasswordValid) {
        // Se a senha é válida mas o usuário ainda não existia no Firebase Authentication, provisiona
        if (!fbSuccess && loginEmail && (authAttemptError?.code === 'auth/user-not-found' || authAttemptError?.code === 'auth/invalid-credential')) {
          try {
            const newAuthRes = await createUserWithEmailAndPassword(auth, loginEmail, normalizePassword(pass));
            if (userDocData.displayName) {
              await updateProfile(newAuthRes.user, { displayName: userDocData.displayName }).catch(() => {});
            }
            userUid = newAuthRes.user.uid;
            fbSuccess = true;
          } catch (createErr: any) {
            console.warn("[FirebaseAuth] Notice during auto-provisioning:", createErr);
          }
        }

        // Assegura sessão ativa
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch {}
        }

        const isAdmin = Boolean(userDocData.isAdmin || userDocData.role === 'admin');
        const profile: UserProfile = {
          uid: userUid || userDocSnap?.id || `user_${cleanIdentifier}`,
          username: userDocData.username || cleanIdentifier.replace(/[^a-z0-9_.]/g, ''),
          email: userDocData.email || loginEmail || null,
          displayName: userDocData.displayName || cleanIdentifier,
          photoURL: userDocData.photoURL || null,
          role: isAdmin ? 'admin' : (userDocData.role || 'user'),
          isAdmin: isAdmin,
          cargo: userDocData.cargo || 'Inspetor(a) de Polícia',
          registrationNumber: userDocData.registrationNumber || '',
          institutionalEmail: userDocData.institutionalEmail || '',
          unitName: userDocData.unitName || '1ª Delegacia Metropolitana de Maracanaú',
          phone: userDocData.phone || '(85) 3101-2830',
          department: userDocData.department || 'Cartório de Oitivas',
          delegados: userDocData.delegados,
          authProvider: 'password',
          updatedAt: Date.now()
        };

        // Salva hash e perfil sincronizado no Firestore
        try {
          await setDoc(doc(db, USERS_COLLECTION, profile.uid), sanitizeData({ ...profile, passwordHash: pHash }), { merge: true });
        } catch {}

        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
        return profile;
      } else {
        throw new Error("Senha incorreta. Verifique suas credenciais.");
      }
    }

    // Se não encontrou no Firestore e o Firebase Auth falhou
    if (authAttemptError) {
      if (authAttemptError.code === 'auth/operation-not-allowed') {
        throw new Error("O provedor de e-mail/senha ainda não está ativo no Console do Firebase > Authentication > Sign-in method.");
      }
      throw new Error(mapAuthError(authAttemptError));
    }

    throw new Error("Nenhum usuário cadastrado com este identificador. Por favor, crie seu usuário na opção de cadastro.");
  },

  // Alias para signup
  async signup(email: string, pass: string, fullName: string, username?: string, isAdmin = false): Promise<UserProfile> {
    return this.registerWithEmail(email, pass, fullName, username, isAdmin);
  },

  // Registrar novo usuário: nome de usuário, nome completo, e-mail, senha e opção de administrador
  async registerWithEmail(
    email: string, 
    pass: string, 
    fullName: string, 
    username?: string,
    isAdmin = false
  ): Promise<UserProfile> {
    console.log(`[FirebaseAuth] registerWithEmail: Email="${email}", FullName="${fullName}", Username="${username}", isAdmin=${isAdmin}`);
    if (!email || !pass) {
      throw new Error("E-mail e senha são obrigatórios.");
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username || email.split('@')[0])
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, '');
    const cleanDisplayName = fullName?.trim() || cleanUsername;

    if (!cleanUsername) {
      throw new Error("Por favor, forneça um nome de usuário válido.");
    }

    // Verifica se já existe um usuário com esse username no Firestore
    try {
      const uQuery = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
      const uSnap = await getDocs(uQuery);
      if (!uSnap.empty) {
        throw new Error(`O nome de usuário "${cleanUsername}" já está em uso. Por favor, escolha outro.`);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('já está em uso')) throw e;
    }

    const pHash = await hashPassword(pass);
    let targetUid = '';

    // 1. Tenta criar usuário diretamente no Firebase Authentication
    try {
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, normalizePassword(pass));
      targetUid = res.user.uid;
      
      if (res.user && cleanDisplayName) {
        await updateProfile(res.user, { displayName: cleanDisplayName }).catch(() => {});
      }
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/email-already-in-use') {
        try {
          const signRes = await signInWithEmailAndPassword(auth, cleanEmail, normalizePassword(pass));
          targetUid = signRes.user.uid;
        } catch {
          throw new Error("Este e-mail já está cadastrado no sistema. Faça login com suas credenciais.");
        }
      } else if (fbErr?.code === 'auth/operation-not-allowed') {
        try {
          const anonRes = await signInAnonymously(auth);
          targetUid = anonRes.user.uid;
        } catch {
          targetUid = 'user_' + cleanUsername + '_' + Date.now().toString(36);
        }
      } else {
        throw new Error(mapAuthError(fbErr));
      }
    }

    if (!targetUid) {
      targetUid = 'user_' + cleanUsername + '_' + Date.now().toString(36);
    }

    const profile: UserProfile = {
      uid: targetUid,
      username: cleanUsername,
      email: cleanEmail,
      displayName: cleanDisplayName,
      role: isAdmin ? 'admin' : 'user',
      isAdmin: Boolean(isAdmin),
      cargo: isAdmin ? 'Administrador(a) do Sistema' : 'Inspetor(a) de Polícia',
      registrationNumber: '',
      institutionalEmail: cleanEmail.includes('delegacia') ? cleanEmail : '',
      unitName: '1ª Delegacia Metropolitana de Maracanaú',
      phone: '(85) 3101-2830',
      department: 'Cartório de Oitivas',
      authProvider: 'password',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 2. Salva perfil completo sincronizado no Firestore
    try {
      const userRef = doc(db, USERS_COLLECTION, targetUid);
      await setDoc(userRef, sanitizeData({ ...profile, passwordHash: pHash }), { merge: true });
      
      if (rtdb) {
        await rtdbSet(rtdbRef(rtdb, `users/${targetUid}`), sanitizeData({ ...profile, passwordHash: pHash }));
      }
    } catch (dbErr) {
      console.warn("[FirebaseAuth] Aviso ao salvar perfil no Firestore:", dbErr);
    }

    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    return profile;
  },

  // Acesso rápido como Plantão / Cartório conectado ao Firebase Auth
  async loginAsGuest(customName = 'Cartório de Oitivas'): Promise<UserProfile> {
    try {
      const res = await signInAnonymously(auth);
      const userRef = doc(db, USERS_COLLECTION, res.user.uid);
      const snap = await getDoc(userRef);

      let profile: UserProfile;
      if (snap.exists()) {
        const d = snap.data();
        profile = {
          ...(d as UserProfile),
          uid: res.user.uid,
          role: d.role || (d.isAdmin ? 'admin' : 'user'),
          isAdmin: Boolean(d.isAdmin || d.role === 'admin')
        };
      } else {
        profile = {
          uid: res.user.uid,
          email: 'delegaciammaracanau@gmail.com',
          displayName: customName,
          role: 'user',
          isAdmin: false,
          cargo: 'Equipe de Plantão / Cartório',
          registrationNumber: 'PCCE-PLANTÃO',
          institutionalEmail: 'maracanau.plantao@policiacivil.ce.gov.br',
          unitName: '1ª Delegacia Metropolitana de Maracanaú',
          phone: '(85) 3101-2830',
          department: 'Cartório de Oitivas',
          authProvider: 'anonymous',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await setDoc(userRef, sanitizeData(profile), { merge: true });
        if (rtdb) {
          await rtdbSet(rtdbRef(rtdb, `users/${res.user.uid}`), sanitizeData(profile));
        }
      }

      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      return profile;
    } catch (err: any) {
      console.error("Erro no login anônimo/guest:", err);
      throw new Error(mapAuthError(err));
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn("Aviso no logout:", e);
    }
    cachedAccessToken = null;
    localStorage.removeItem(LOCAL_USER_KEY);
  },

  // Excluir permanentemente a conta do usuário logado (Firestore, RTDB, Firebase Auth e cache local)
  // Esta ação remove APENAS a conta do próprio usuário, sem afetar nenhum outro usuário cadastrado
  async deleteCurrentUserAccount(uid?: string): Promise<{ success: boolean; message: string }> {
    const currentUser = this.getCurrentUser();
    const targetUid = uid || currentUser?.uid || auth.currentUser?.uid;

    if (!targetUid) {
      throw new Error("Nenhum usuário identificado para exclusão de conta.");
    }

    console.log(`[FirebaseAuth] Iniciando exclusão exclusiva da conta do usuário: ${targetUid}`);

    try {
      // 1. Exclui oitivas associadas a este usuário no Firestore
      try {
        const oitivasSnap = await getDocs(collection(db, 'users', targetUid, 'oitivas'));
        for (const oDoc of oitivasSnap.docs) {
          await deleteDoc(doc(db, 'users', targetUid, 'oitivas', oDoc.id));
        }
      } catch (oitivaErr) {
        console.warn("[FirebaseAuth] Aviso ao excluir oitivas do usuário:", oitivaErr);
      }

      // 2. Exclui oitivas no RTDB deste usuário
      if (rtdb) {
        try {
          await rtdbSet(rtdbRef(rtdb, `users/${targetUid}/oitivas`), null);
        } catch (rtdbErr) {
          console.warn("[FirebaseAuth] Aviso ao excluir oitivas RTDB:", rtdbErr);
        }
      }

      // 3. Exclui documento de perfil do usuário no Firestore
      try {
        await deleteDoc(doc(db, USERS_COLLECTION, targetUid));
      } catch (docErr) {
        console.warn("[FirebaseAuth] Aviso ao excluir doc users do Firestore:", docErr);
      }

      // 4. Exclui nó deste usuário no Realtime Database
      if (rtdb) {
        try {
          await rtdbSet(rtdbRef(rtdb, `users/${targetUid}`), null);
        } catch (rtdbErr) {
          console.warn("[FirebaseAuth] Aviso ao excluir nó do usuário no RTDB:", rtdbErr);
        }
      }

      // 5. Limpa caches locais específicos do usuário
      localStorage.removeItem(`oitivas_user_${targetUid}`);
      localStorage.removeItem(LOCAL_USER_KEY);
      cachedAccessToken = null;

      // 6. Exclui usuário nativo no Firebase Authentication se estiver logado
      if (auth.currentUser && auth.currentUser.uid === targetUid) {
        try {
          await deleteUser(auth.currentUser);
        } catch (authErr: any) {
          console.warn("[FirebaseAuth] Aviso ao deletar no Firebase Auth:", authErr?.code || authErr?.message);
        }
      }

      // 7. Encerra qualquer sessão remanescente
      try {
        await fbSignOut(auth);
      } catch {}

      return {
        success: true,
        message: "Sua conta foi excluída permanentemente com sucesso."
      };
    } catch (err: any) {
      console.error("[FirebaseAuth] Erro ao excluir conta do usuário:", err);
      throw new Error("Falha ao excluir a conta: " + (err.message || 'Erro desconhecido'));
    }
  },

  // =========================================================================
  // ADMINISTRAÇÃO TOTAL DE USUÁRIOS (Poder total do Administrador)
  // =========================================================================

  // Busca todos os usuários cadastrados no banco de dados na nuvem (Firestore)
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, USERS_COLLECTION));
      const usersList: UserProfile[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const isAdmin = Boolean(data.isAdmin || data.role === 'admin');
        usersList.push({
          uid: d.id,
          username: data.username || d.id,
          email: data.email || null,
          displayName: data.displayName || 'Servidor',
          photoURL: data.photoURL || null,
          role: isAdmin ? 'admin' : (data.role || 'user'),
          isAdmin: isAdmin,
          cargo: data.cargo || 'Inspetor(a) de Polícia',
          registrationNumber: data.registrationNumber || '',
          institutionalEmail: data.institutionalEmail || '',
          unitName: data.unitName || '1ª Delegacia Metropolitana de Maracanaú',
          phone: data.phone || '',
          department: data.department || 'Cartório de Oitivas',
          authProvider: data.authProvider || 'password',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });

      return usersList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    } catch (err: any) {
      console.error("Erro ao listar todos os usuários:", err);
      throw new Error("Falha ao consultar banco de usuários: " + (err.message || 'Erro desconhecido'));
    }
  },

  // Inscrição em tempo real para a lista de usuários no Firestore (Admin)
  subscribeToAllUsers(callback: (users: UserProfile[]) => void): Unsubscribe {
    const usersCol = collection(db, USERS_COLLECTION);
    return onSnapshot(usersCol, (snap) => {
      const usersList: UserProfile[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const isAdmin = Boolean(data.isAdmin || data.role === 'admin');
        usersList.push({
          uid: d.id,
          username: data.username || d.id,
          email: data.email || null,
          displayName: data.displayName || 'Servidor',
          photoURL: data.photoURL || null,
          role: isAdmin ? 'admin' : (data.role || 'user'),
          isAdmin: isAdmin,
          cargo: data.cargo || 'Inspetor(a) de Polícia',
          registrationNumber: data.registrationNumber || '',
          institutionalEmail: data.institutionalEmail || '',
          unitName: data.unitName || '1ª Delegacia Metropolitana de Maracanaú',
          phone: data.phone || '',
          department: data.department || 'Cartório de Oitivas',
          authProvider: data.authProvider || 'password',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      callback(usersList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')));
    }, (err) => {
      console.warn("Snapshot notice em subscribeToAllUsers:", err);
    });
  },

  // Criar um novo usuário diretamente pelo Administrador
  async createUserByAdmin(userData: {
    username: string;
    email: string;
    displayName: string;
    password: string;
    role?: 'admin' | 'user' | string;
    isAdmin?: boolean;
    cargo?: string;
    unitName?: string;
    phone?: string;
    department?: string;
    registrationNumber?: string;
  }): Promise<UserProfile> {
    if (!userData.username?.trim() || !userData.email?.trim() || !userData.password) {
      throw new Error("Nome de usuário, e-mail e senha são obrigatórios.");
    }

    const cleanUsername = userData.username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanDisplayName = userData.displayName?.trim() || cleanUsername;
    const isAdmin = Boolean(userData.isAdmin || userData.role === 'admin');

    // 1. Verifica duplicidade de username
    const uQuery = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
    const uSnap = await getDocs(uQuery);
    if (!uSnap.empty) {
      throw new Error(`O nome de usuário "${cleanUsername}" já está cadastrado.`);
    }

    // 2. Verifica duplicidade de email
    const eQuery = query(collection(db, USERS_COLLECTION), where('email', '==', cleanEmail));
    const eSnap = await getDocs(eQuery);
    if (!eSnap.empty) {
      throw new Error(`O e-mail "${cleanEmail}" já está cadastrado.`);
    }

    const targetUid = 'user_' + cleanUsername + '_' + Date.now().toString(36);
    const pHash = await hashPassword(userData.password);

    const profile: UserProfile = {
      uid: targetUid,
      username: cleanUsername,
      email: cleanEmail,
      displayName: cleanDisplayName,
      role: isAdmin ? 'admin' : 'user',
      isAdmin: isAdmin,
      cargo: userData.cargo?.trim() || (isAdmin ? 'Administrador(a) do Sistema' : 'Inspetor(a) de Polícia'),
      registrationNumber: userData.registrationNumber?.trim() || '',
      institutionalEmail: cleanEmail.includes('policia') ? cleanEmail : '',
      unitName: userData.unitName?.trim() || '1ª Delegacia Metropolitana de Maracanaú',
      phone: userData.phone?.trim() || '(85) 3101-2830',
      department: userData.department?.trim() || 'Cartório de Oitivas',
      authProvider: 'password',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Salva no Firestore
    const userRef = doc(db, USERS_COLLECTION, targetUid);
    await setDoc(userRef, sanitizeData({ ...profile, passwordHash: pHash }));

    // Salva no RTDB
    if (rtdb) {
      await rtdbSet(rtdbRef(rtdb, `users/${targetUid}`), sanitizeData({ ...profile, passwordHash: pHash }));
    }

    return profile;
  },

  // Editar qualquer usuário pelo Administrador
  async updateUserByAdmin(
    targetUid: string, 
    updates: Partial<UserProfile> & { newPassword?: string }
  ): Promise<UserProfile> {
    if (!targetUid) {
      throw new Error("UID do usuário alvo é obrigatório.");
    }

    const docRef = doc(db, USERS_COLLECTION, targetUid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    const existing = snap.data() as UserProfile & { passwordHash?: string };
    const isAdmin = updates.isAdmin !== undefined ? Boolean(updates.isAdmin) : (updates.role === 'admin' ? true : existing.isAdmin);

    const merged: UserProfile = {
      ...existing,
      ...updates,
      uid: targetUid,
      role: isAdmin ? 'admin' : (updates.role || 'user'),
      isAdmin: isAdmin,
      updatedAt: Date.now()
    };

    const payloadToSave: Record<string, any> = { ...merged };

    // Se o admin definiu uma nova senha para este usuário
    if (updates.newPassword && updates.newPassword.trim().length > 0) {
      payloadToSave.passwordHash = await hashPassword(updates.newPassword.trim());
    }

    await setDoc(docRef, sanitizeData(payloadToSave), { merge: true });

    if (rtdb) {
      await rtdbSet(rtdbRef(rtdb, `users/${targetUid}`), sanitizeData(payloadToSave));
    }

    // Se o usuário editado for o próprio usuário atualmente logado, atualiza o cache local
    const current = this.getCurrentUser();
    if (current && current.uid === targetUid) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(merged));
    }

    return merged;
  },

  // Deletar qualquer usuário pelo Administrador (incluindo as oitivas associadas a ele)
  async deleteUserByAdmin(targetUid: string): Promise<void> {
    if (!targetUid) {
      throw new Error("UID do usuário alvo é obrigatório.");
    }

    console.log(`[Admin] Excluindo permanentemente usuário: ${targetUid}`);

    // 1. Exclui oitivas no Firestore deste usuário
    try {
      const oitivasSnap = await getDocs(collection(db, 'users', targetUid, 'oitivas'));
      for (const oDoc of oitivasSnap.docs) {
        await deleteDoc(doc(db, 'users', targetUid, 'oitivas', oDoc.id));
      }
    } catch (e) {
      console.warn("Aviso ao limpar oitivas do usuário excluído:", e);
    }

    // 2. Exclui oitivas no RTDB
    if (rtdb) {
      try {
        await rtdbSet(rtdbRef(rtdb, `users/${targetUid}/oitivas`), null);
      } catch {}
    }

    // 3. Exclui documento do usuário no Firestore
    await deleteDoc(doc(db, USERS_COLLECTION, targetUid));

    // 4. Exclui nó no RTDB
    if (rtdb) {
      try {
        await rtdbSet(rtdbRef(rtdb, `users/${targetUid}`), null);
      } catch {}
    }
  },

  // =========================================================================
  // UNIFICAÇÃO DE USUÁRIOS DUPLICADOS (ADMIN)
  // =========================================================================

  // Detecta e agrupa automaticamente todos os usuários duplicados no banco
  findDuplicateGroups(users: UserProfile[]): DuplicateUserGroup[] {
    if (!users || users.length < 2) return [];

    const normalize = (val?: string | null) => (val || '').trim().toLowerCase();

    // Cria grafo de conexões de duplicidade
    const n = users.length;
    const parent: number[] = Array.from({ length: n }, (_, i) => i);

    function find(i: number): number {
      if (parent[i] === i) return i;
      parent[i] = find(parent[i]);
      return parent[i];
    }

    function union(i: number, j: number) {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent[rootI] = rootJ;
      }
    }

    for (let i = 0; i < n; i++) {
      const u1 = users[i];
      const u1Name = normalize(u1.username);
      const u1Email = normalize(u1.email);

      for (let j = i + 1; j < n; j++) {
        const u2 = users[j];
        const u2Name = normalize(u2.username);
        const u2Email = normalize(u2.email);

        const sameUsername = u1Name && u2Name && u1Name === u2Name;
        const sameEmail = u1Email && u2Email && u1Email === u2Email;

        if (sameUsername || sameEmail) {
          union(i, j);
        }
      }
    }

    // Agrupa por raiz
    const clusters = new Map<number, UserProfile[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!clusters.has(root)) {
        clusters.set(root, []);
      }
      clusters.get(root)!.push(users[i]);
    }

    const duplicateGroups: DuplicateUserGroup[] = [];

    clusters.forEach((groupUsers, rootIdx) => {
      if (groupUsers.length > 1) {
        // Ordena usuários da duplicidade: Administradores e contas com mais dados primeiro
        groupUsers.sort((a, b) => {
          const aAdmin = a.role === 'admin' || Boolean(a.isAdmin) ? 1 : 0;
          const bAdmin = b.role === 'admin' || Boolean(b.isAdmin) ? 1 : 0;
          if (aAdmin !== bAdmin) return bAdmin - aAdmin;

          const aFields = [a.displayName, a.cargo, a.registrationNumber, a.phone, a.unitName].filter(Boolean).length;
          const bFields = [b.displayName, b.cargo, b.registrationNumber, b.phone, b.unitName].filter(Boolean).length;
          if (aFields !== bFields) return bFields - aFields;

          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });

        // Identifica o tipo e critério de duplicidade
        const first = groupUsers[0];
        const second = groupUsers[1];
        const firstName = normalize(first.username);
        const firstEmail = normalize(first.email);
        const secondName = normalize(second.username);
        const secondEmail = normalize(second.email);

        const sameName = firstName && secondName && firstName === secondName;
        const sameEmail = firstEmail && secondEmail && firstEmail === secondEmail;

        let matchType: 'username_and_email' | 'username' | 'email' = 'username_and_email';
        let matchedKey = '';

        if (sameName && sameEmail) {
          matchType = 'username_and_email';
          matchedKey = `@${first.username || ''} • ${first.email || ''}`;
        } else if (sameName) {
          matchType = 'username';
          matchedKey = `@${first.username || ''}`;
        } else if (sameEmail) {
          matchType = 'email';
          matchedKey = `${first.email || ''}`;
        } else {
          matchedKey = `${first.displayName || first.username || first.email || 'Duplicidade'}`;
        }

        duplicateGroups.push({
          id: `dup_group_${first.uid}_${Date.now().toString(36)}_${rootIdx}`,
          matchType,
          matchedKey,
          users: groupUsers
        });
      }
    });

    return duplicateGroups;
  },

  // Consulta a quantidade de oitivas salvas para um UID específico
  async getOitivasCountForUser(uid: string): Promise<number> {
    if (!uid) return 0;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'oitivas'));
      return snap.size;
    } catch {
      return 0;
    }
  },

  // Unifica (merge) usuários duplicados transferindo todas as oitivas para a conta principal e excluindo as secundárias
  async mergeDuplicateUsers(
    primaryUid: string, 
    secondaryUids: string[],
    options?: {
      customDisplayName?: string;
      customEmail?: string;
      customUsername?: string;
      customCargo?: string;
      customUnitName?: string;
      customPhone?: string;
      customDepartment?: string;
      customRegistration?: string;
      makeAdmin?: boolean;
    }
  ): Promise<MergeUsersResult> {
    if (!primaryUid) {
      throw new Error("UID da conta principal de destino é obrigatório.");
    }
    const cleanSecondary = (secondaryUids || []).filter(id => id && id !== primaryUid);
    if (cleanSecondary.length === 0) {
      throw new Error("Nenhum usuário secundário selecionado para unificação.");
    }

    console.log(`[Admin Unify] Iniciando unificação de ${cleanSecondary.length} contas na conta principal: ${primaryUid}`);

    // 1. Carrega dados da conta principal
    const primaryDocRef = doc(db, USERS_COLLECTION, primaryUid);
    const primarySnap = await getDoc(primaryDocRef);
    let primaryData: Partial<UserProfile> = primarySnap.exists() ? (primarySnap.data() as UserProfile) : { uid: primaryUid };

    // 2. Carrega dados das contas secundárias
    const secondaryDocsData: { uid: string; data: Partial<UserProfile> }[] = [];
    for (const secUid of cleanSecondary) {
      try {
        const secSnap = await getDoc(doc(db, USERS_COLLECTION, secUid));
        if (secSnap.exists()) {
          secondaryDocsData.push({ uid: secUid, data: secSnap.data() as UserProfile });
        } else {
          secondaryDocsData.push({ uid: secUid, data: { uid: secUid } });
        }
      } catch (err) {
        console.warn(`[Admin Unify] Aviso ao carregar doc secundário ${secUid}:`, err);
        secondaryDocsData.push({ uid: secUid, data: { uid: secUid } });
      }
    }

    // 3. Consolidação inteligente dos campos de perfil
    let mergedIsAdmin = Boolean(
      primaryData.isAdmin || 
      primaryData.role === 'admin' || 
      options?.makeAdmin ||
      secondaryDocsData.some(s => s.data.isAdmin || s.data.role === 'admin')
    );

    const mergedProfile: UserProfile = {
      ...primaryData,
      uid: primaryUid,
      username: options?.customUsername || primaryData.username || secondaryDocsData.find(s => s.data.username)?.data.username || primaryUid,
      email: options?.customEmail || primaryData.email || secondaryDocsData.find(s => s.data.email)?.data.email || null,
      displayName: options?.customDisplayName || primaryData.displayName || secondaryDocsData.find(s => s.data.displayName)?.data.displayName || 'Servidor Unificado',
      photoURL: primaryData.photoURL || secondaryDocsData.find(s => s.data.photoURL)?.data.photoURL || null,
      role: mergedIsAdmin ? 'admin' : 'user',
      isAdmin: mergedIsAdmin,
      cargo: options?.customCargo || primaryData.cargo || secondaryDocsData.find(s => s.data.cargo)?.data.cargo || 'Inspetor(a) de Polícia',
      registrationNumber: options?.customRegistration || primaryData.registrationNumber || secondaryDocsData.find(s => s.data.registrationNumber)?.data.registrationNumber || '',
      institutionalEmail: primaryData.institutionalEmail || secondaryDocsData.find(s => s.data.institutionalEmail)?.data.institutionalEmail || '',
      unitName: options?.customUnitName || primaryData.unitName || secondaryDocsData.find(s => s.data.unitName)?.data.unitName || '1ª Delegacia Metropolitana de Maracanaú',
      phone: options?.customPhone || primaryData.phone || secondaryDocsData.find(s => s.data.phone)?.data.phone || '(85) 3101-2830',
      department: options?.customDepartment || primaryData.department || secondaryDocsData.find(s => s.data.department)?.data.department || 'Cartório de Oitivas',
      authProvider: primaryData.authProvider || secondaryDocsData.find(s => s.data.authProvider)?.data.authProvider || 'password',
      passwordHash: (primaryData as any).passwordHash || (secondaryDocsData.find(s => (s.data as any).passwordHash)?.data as any)?.passwordHash,
      delegados: primaryData.delegados || secondaryDocsData.find(s => s.data.delegados)?.data.delegados,
      defaultDelegadoId: primaryData.defaultDelegadoId || secondaryDocsData.find(s => s.data.defaultDelegadoId)?.data.defaultDelegadoId,
      createdAt: primaryData.createdAt || secondaryDocsData.find(s => s.data.createdAt)?.data.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    // 4. Salva a conta principal atualizada
    await setDoc(primaryDocRef, sanitizeData(mergedProfile), { merge: true });
    if (rtdb) {
      try {
        await rtdbSet(rtdbRef(rtdb, `users/${primaryUid}`), sanitizeData(mergedProfile));
      } catch (err) {
        console.warn("[Admin Unify] Aviso ao salvar primary no RTDB:", err);
      }
    }

    // 5. Transferência e Unificação Inteligente de Oitivas (Sem duplicatas de agendamentos)
    // Agendamentos iguais (mesma pessoa, data e horário ou mesmo número de procedimento e pessoa) são unificados; diferentes são adicionados.
    let transferredOitivasCount = 0;
    let deduplicatedOitivasCount = 0;
    let addedOitivasCount = 0;

    // Helper para normalização de strings
    const norm = (s?: string | null) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normProc = (s?: string | null) => (s || '').replace(/\D/g, '');

    // Carrega oitivas existentes da conta principal para deduplicação
    const existingPrimaryOitivasMap = new Map<string, any>(); // id -> oitiva
    try {
      const primaryOitivasSnap = await getDocs(collection(db, 'users', primaryUid, 'oitivas'));
      primaryOitivasSnap.forEach(docSnap => {
        existingPrimaryOitivasMap.set(docSnap.id, { ...docSnap.data(), id: docSnap.id });
      });
    } catch (err) {
      console.warn("[Admin Unify] Aviso ao carregar oitivas existentes do usuário principal:", err);
    }

    // Função para verificar se uma oitiva secundária é idêntica/duplicada de alguma já na conta principal
    const findMatchingPrimaryOitiva = (secOitiva: any): any | null => {
      const secPerson = norm(secOitiva.personName);
      const secDate = (secOitiva.date || '').trim();
      const secTime = (secOitiva.time || '').trim();
      const secProc = normProc(secOitiva.procedureNumber);
      const secCpf = (secOitiva.cpf || '').replace(/\D/g, '');

      // 1. Match por ID idêntico
      if (existingPrimaryOitivasMap.has(secOitiva.id)) {
        return existingPrimaryOitivasMap.get(secOitiva.id);
      }

      for (const primOitiva of existingPrimaryOitivasMap.values()) {
        const primPerson = norm(primOitiva.personName);
        const primDate = (primOitiva.date || '').trim();
        const primTime = (primOitiva.time || '').trim();
        const primProc = normProc(primOitiva.procedureNumber);
        const primCpf = (primOitiva.cpf || '').replace(/\D/g, '');

        // Critério A: Mesma pessoa, mesma data e mesmo horário
        const samePersonDateTime = secPerson && primPerson && secPerson === primPerson && 
                                   secDate && primDate && secDate === primDate && 
                                   secTime && primTime && secTime === primTime;

        // Critério B: Mesmo CPF + Mesma data
        const sameCpfDate = secCpf && primCpf && secCpf.length >= 9 && secCpf === primCpf && 
                            secDate && primDate && secDate === primDate;

        // Critério C: Mesmo número de procedimento + Mesma pessoa (ex: mesmo IP/TCO e mesmo declarante/testemunha)
        const sameProcAndPerson = secProc && primProc && secProc.length >= 3 && secProc === primProc && 
                                  secPerson && primPerson && secPerson === primPerson;

        if (samePersonDateTime || sameCpfDate || sameProcAndPerson) {
          return primOitiva;
        }
      }

      return null;
    };

    for (const secUid of cleanSecondary) {
      try {
        // Busca oitivas no Firestore da conta secundária
        const oitivasSnap = await getDocs(collection(db, 'users', secUid, 'oitivas'));
        for (const oDoc of oitivasSnap.docs) {
          const secOData = oDoc.data();
          const matchedPrimaryOitiva = findMatchingPrimaryOitiva(secOData);

          if (matchedPrimaryOitiva) {
            // ---> UNIFICA AGENDAMENTOS IGUAIS: Mescla os campos complementando informações faltantes
            const mergedOitivaPayload = {
              ...matchedPrimaryOitiva,
              // Preenche campos que possam estar preenchidos apenas na conta secundária
              procedureNumber: matchedPrimaryOitiva.procedureNumber || secOData.procedureNumber || '',
              procedureType: matchedPrimaryOitiva.procedureType || secOData.procedureType || '',
              role: matchedPrimaryOitiva.role || secOData.role || 'Testemunha',
              cpf: matchedPrimaryOitiva.cpf || secOData.cpf || '',
              rg: matchedPrimaryOitiva.rg || secOData.rg || '',
              phone: matchedPrimaryOitiva.phone || secOData.phone || '',
              email: matchedPrimaryOitiva.email || secOData.email || '',
              address: matchedPrimaryOitiva.address || secOData.address || '',
              neighborhood: matchedPrimaryOitiva.neighborhood || secOData.neighborhood || '',
              city: matchedPrimaryOitiva.city || secOData.city || '',
              officerName: matchedPrimaryOitiva.officerName || secOData.officerName || '',
              clerkName: matchedPrimaryOitiva.clerkName || secOData.clerkName || '',
              locationOrLink: matchedPrimaryOitiva.locationOrLink || secOData.locationOrLink || '',
              notes: matchedPrimaryOitiva.notes 
                ? (secOData.notes && !matchedPrimaryOitiva.notes.includes(secOData.notes) ? `${matchedPrimaryOitiva.notes}\n[Obs unificada]: ${secOData.notes}` : matchedPrimaryOitiva.notes)
                : (secOData.notes || ''),
              intimationSent: matchedPrimaryOitiva.intimationSent || secOData.intimationSent || false,
              googleCalendarEventId: matchedPrimaryOitiva.googleCalendarEventId || secOData.googleCalendarEventId,
              googleDriveDocId: matchedPrimaryOitiva.googleDriveDocId || secOData.googleDriveDocId,
              googleDriveDocUrl: matchedPrimaryOitiva.googleDriveDocUrl || secOData.googleDriveDocUrl,
              uid: primaryUid,
              updatedAt: Date.now()
            };

            const targetOitivaRef = doc(db, 'users', primaryUid, 'oitivas', matchedPrimaryOitiva.id);
            await setDoc(targetOitivaRef, sanitizeData(mergedOitivaPayload), { merge: true });

            if (rtdb) {
              try {
                await rtdbSet(rtdbRef(rtdb, `users/${primaryUid}/oitivas/${matchedPrimaryOitiva.id}`), sanitizeData(mergedOitivaPayload));
                await rtdbSet(rtdbRef(rtdb, `users/${secUid}/oitivas/${oDoc.id}`), null);
              } catch {}
            }

            // Atualiza cache em memória
            existingPrimaryOitivasMap.set(matchedPrimaryOitiva.id, mergedOitivaPayload);
            deduplicatedOitivasCount++;
          } else {
            // ---> ADICIONA AGENDAMENTOS DIFERENTES
            const newOitivaPayload = {
              ...secOData,
              id: oDoc.id,
              uid: primaryUid,
              updatedAt: Date.now()
            };

            const targetOitivaRef = doc(db, 'users', primaryUid, 'oitivas', oDoc.id);
            await setDoc(targetOitivaRef, sanitizeData(newOitivaPayload), { merge: true });

            if (rtdb) {
              try {
                await rtdbSet(rtdbRef(rtdb, `users/${primaryUid}/oitivas/${oDoc.id}`), sanitizeData(newOitivaPayload));
                await rtdbSet(rtdbRef(rtdb, `users/${secUid}/oitivas/${oDoc.id}`), null);
              } catch {}
            }

            // Adiciona no mapa de existentes
            existingPrimaryOitivasMap.set(oDoc.id, newOitivaPayload);
            addedOitivasCount++;
          }

          // Deleta da conta secundária original
          await deleteDoc(doc(db, 'users', secUid, 'oitivas', oDoc.id));
          transferredOitivasCount++;
        }
      } catch (oitivaErr) {
        console.warn(`[Admin Unify] Erro ao transferir oitivas de ${secUid}:`, oitivaErr);
      }

      // 6. Exclui a conta secundária duplicada
      try {
        await deleteDoc(doc(db, USERS_COLLECTION, secUid));
        if (rtdb) {
          await rtdbSet(rtdbRef(rtdb, `users/${secUid}`), null);
        }
      } catch (delErr) {
        console.warn(`[Admin Unify] Erro ao excluir usuário secundário ${secUid}:`, delErr);
      }

      // Limpa cache local da conta secundária
      try {
        localStorage.removeItem(`oitivas_user_${secUid}`);
      } catch {}
    }

    // 7. Atualiza a sessão local se o usuário atual foi unificado
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      if (currentUser.uid === primaryUid || cleanSecondary.includes(currentUser.uid)) {
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mergedProfile));
      }
    }

    const detailMsg = deduplicatedOitivasCount > 0 
      ? ` (${deduplicatedOitivasCount} agendamento(s) idênticos unificados, ${addedOitivasCount} novos adicionados sem duplicidade)`
      : ` (${addedOitivasCount} agendamento(s) adicionados)`;

    return {
      success: true,
      primaryUid,
      primaryDisplayName: mergedProfile.displayName || mergedProfile.username || 'Servidor',
      mergedUids: cleanSecondary,
      transferredOitivasCount,
      deduplicatedOitivasCount,
      addedOitivasCount,
      message: `Unificação concluída com sucesso! ${cleanSecondary.length} conta(s) fundida(s) no perfil principal "${mergedProfile.displayName}". ${transferredOitivasCount} oitiva(s) processada(s)${detailMsg}.`
    };
  },

  // Unifica automaticamente todos os grupos duplicados encontrados no sistema
  async unifyAllDuplicates(duplicateGroups: DuplicateUserGroup[]): Promise<{
    unifiedGroupsCount: number;
    mergedUsersCount: number;
    transferredOitivasCount: number;
    deduplicatedOitivasCount: number;
    addedOitivasCount: number;
  }> {
    if (!duplicateGroups || duplicateGroups.length === 0) {
      return { unifiedGroupsCount: 0, mergedUsersCount: 0, transferredOitivasCount: 0, deduplicatedOitivasCount: 0, addedOitivasCount: 0 };
    }

    let unifiedGroupsCount = 0;
    let mergedUsersCount = 0;
    let transferredOitivasCount = 0;
    let deduplicatedOitivasCount = 0;
    let addedOitivasCount = 0;

    for (const group of duplicateGroups) {
      if (group.users.length > 1) {
        const primary = group.users[0];
        const secondaries = group.users.slice(1).map(u => u.uid);

        const res = await this.mergeDuplicateUsers(primary.uid, secondaries);
        if (res.success) {
          unifiedGroupsCount++;
          mergedUsersCount += secondaries.length;
          transferredOitivasCount += res.transferredOitivasCount;
          deduplicatedOitivasCount += (res.deduplicatedOitivasCount || 0);
          addedOitivasCount += (res.addedOitivasCount || 0);
        }
      }
    }

    return {
      unifiedGroupsCount,
      mergedUsersCount,
      transferredOitivasCount,
      deduplicatedOitivasCount,
      addedOitivasCount
    };
  }
};

