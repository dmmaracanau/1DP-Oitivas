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
  User,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, get as rtdbGet } from 'firebase/database';
import { auth, db, rtdb, googleProvider } from '../firebase';
import { UserProfile } from '../types/oitiva';

const LOCAL_USER_KEY = 'oitivas_user_session';
const USERS_COLLECTION = 'users';

// In-memory token cache (strictly required for Workspace OAuth scopes)
let cachedAccessToken: string | null = null;

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
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
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
      return 'A janela de login com Google foi fechada antes da conclusão.';
    case 'auth/popup-blocked':
      return 'A janela popup foi bloqueada pelo navegador. Permita popups para este site.';
    default:
      return err.message || 'Erro durante a operação de autenticação.';
  }
}

// Normaliza senhas para permitir qualquer formato ou comprimento sem nenhuma limitação para o usuário
function normalizePassword(pass: string): string {
  if (!pass) return '';
  // Se a senha tiver menos de 6 caracteres (requisito interno do Firebase Auth),
  // adiciona sufixo transparente consistente para não bloquear o usuário.
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
        unitName: '1ª Delegacia Metropolitana de Maracanaú',
        authProvider: auth.currentUser.isAnonymous ? 'anonymous' : 'password'
      };
    }

    return null;
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
          uid
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
          const merged: UserProfile = { ...current, ...rtdbData, uid };
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
      const unsubAuth = fbOnAuthStateChanged(auth, async (user: User | null) => {
        if (unsubUserDoc) {
          unsubUserDoc();
          unsubUserDoc = null;
        }

        if (user) {
          const cached = this.getCurrentUser();
          const baseProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || cached?.displayName || user.email?.split('@')[0] || 'Servidor(a) Policial',
            photoURL: user.photoURL || cached?.photoURL || null,
            cargo: cached?.cargo || 'Inspetor(a) de Polícia',
            registrationNumber: cached?.registrationNumber || '',
            institutionalEmail: cached?.institutionalEmail || (user.email?.includes('delegacia') ? user.email : ''),
            unitName: cached?.unitName || '1ª Delegacia Metropolitana de Maracanaú',
            phone: cached?.phone || '(85) 3101-2830',
            department: cached?.department || 'Cartório de Oitivas',
            authProvider: user.isAnonymous ? 'anonymous' : (cachedAccessToken ? 'google' : 'password')
          };

          // Escuta em tempo real o documento do usuário no Firestore (sincroniza alterações entre dispositivos)
          try {
            const userDocRef = doc(db, USERS_COLLECTION, user.uid);
            unsubUserDoc = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                const liveData = snap.data() as Partial<UserProfile>;
                const liveProfile: UserProfile = {
                  ...baseProfile,
                  ...liveData,
                  uid: user.uid,
                  email: user.email || liveData.email || null,
                  displayName: user.displayName || liveData.displayName || baseProfile.displayName,
                  photoURL: user.photoURL || liveData.photoURL || null
                };
                localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(liveProfile));
                callback(liveProfile);
              } else {
                // Se documento ainda não existe no Firestore, salva o perfil inicial
                setDoc(userDocRef, sanitizeData({ ...baseProfile, updatedAt: Date.now() }), { merge: true }).catch(() => {});
                if (rtdb) {
                  rtdbSet(rtdbRef(rtdb, `users/${user.uid}`), sanitizeData({ ...baseProfile, updatedAt: Date.now() })).catch(() => {});
                }
                localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(baseProfile));
                callback(baseProfile);
              }
            }, (docErr) => {
              console.warn("Realtime user profile sync notice:", docErr);
              localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(baseProfile));
              callback(baseProfile);
            });
          } catch (listenerErr) {
            console.warn("Falha ao abrir listener de perfil:", listenerErr);
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(baseProfile));
            callback(baseProfile);
          }
        } else {
          cachedAccessToken = null;
          localStorage.removeItem(LOCAL_USER_KEY);
          callback(null);
        }
      });

      return () => {
        unsubAuth();
        if (unsubUserDoc) unsubUserDoc();
      };
    } catch (err) {
      console.warn("Auth listener fallback:", err);
      const local = this.getCurrentUser();
      callback(local);
      return () => {};
    }
  },

  // Atualiza perfil completo do usuário e sincroniza direto no Firestore e RTDB
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

    if (!auth.currentUser) {
      throw new Error("Usuário não autenticado no Firebase.");
    }

    try {
      await updatePassword(auth.currentUser, normalizePassword(newPassword));
    } catch (err: any) {
      throw new Error(mapAuthError(err));
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

  // Login com Google com obtenção do OAuth Access Token para Workspace (Drive, Gmail, Agenda)
  async loginWithGoogle(): Promise<{ profile: UserProfile; token?: string }> {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(res);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
      
      const docRef = doc(db, USERS_COLLECTION, res.user.uid);
      const snap = await getDoc(docRef);
      const existingData = snap.exists() ? (snap.data() as Partial<UserProfile>) : {};

      const profile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || existingData.displayName || 'Servidor(a) Policial',
        photoURL: res.user.photoURL || existingData.photoURL || null,
        cargo: existingData.cargo || 'Escrivão(ã) / Inspetor(a)',
        registrationNumber: existingData.registrationNumber || '',
        institutionalEmail: existingData.institutionalEmail || '',
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
          await rtdbSet(rtdbRef(rtdb, `users/${res.user.uid}`), sanitizeData(profile));
        }
      } catch (e) {
        console.warn("Erro ao gravar perfil Google:", e);
      }

      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      return { profile, token: cachedAccessToken || undefined };
    } catch (err: any) {
      console.error("Erro no login Google:", err);
      throw new Error(mapAuthError(err));
    }
  },

  // Re-solicitar token / conectar Workspace
  async connectGoogleWorkspace(): Promise<string | null> {
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

  // Login com Email e Senha sincronizado com Firestore e RTDB
  async loginWithEmail(email: string, pass: string): Promise<UserProfile> {
    if (!email || !pass) {
      throw new Error("Por favor, preencha o e-mail e a senha.");
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), normalizePassword(pass));
      
      // Carrega perfil persistido no Firestore
      const userRef = doc(db, USERS_COLLECTION, res.user.uid);
      const snap = await getDoc(userRef);
      
      let profile: UserProfile;
      if (snap.exists()) {
        const firestoreData = snap.data() as Partial<UserProfile>;
        profile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || firestoreData.displayName || email.split('@')[0],
          photoURL: res.user.photoURL || firestoreData.photoURL || null,
          cargo: firestoreData.cargo || 'Inspetor(a) de Polícia',
          registrationNumber: firestoreData.registrationNumber || '',
          institutionalEmail: firestoreData.institutionalEmail || '',
          unitName: firestoreData.unitName || '1ª Delegacia Metropolitana de Maracanaú',
          phone: firestoreData.phone || '(85) 3101-2830',
          department: firestoreData.department || 'Cartório de Oitivas',
          delegados: firestoreData.delegados,
          authProvider: 'password',
          updatedAt: Date.now()
        };
      } else {
        profile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || email.split('@')[0],
          cargo: 'Inspetor(a) de Polícia',
          registrationNumber: '',
          institutionalEmail: email.includes('delegacia') ? email : '',
          unitName: '1ª Delegacia Metropolitana de Maracanaú',
          phone: '(85) 3101-2830',
          department: 'Cartório de Oitivas',
          authProvider: 'password',
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
      console.error("Erro ao autenticar com email/senha:", err);
      throw new Error(mapAuthError(err));
    }
  },

  // Registrar novo usuário e salvar diretamente no Firestore e RTDB
  async registerWithEmail(email: string, pass: string, name: string): Promise<UserProfile> {
    if (!email || !pass) {
      throw new Error("E-mail e senha são obrigatórios.");
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), normalizePassword(pass));
      const cleanName = name?.trim() || email.split('@')[0];
      
      if (res.user && cleanName) {
        try {
          await updateProfile(res.user, { displayName: cleanName });
        } catch {}
      }

      const profile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: cleanName,
        cargo: 'Inspetor(a) de Polícia',
        registrationNumber: '',
        institutionalEmail: email.includes('delegacia') ? email : '',
        unitName: '1ª Delegacia Metropolitana de Maracanaú',
        phone: '(85) 3101-2830',
        department: 'Cartório de Oitivas',
        authProvider: 'password',
        updatedAt: Date.now()
      };

      // Grava no Firestore e RTDB
      const userRef = doc(db, USERS_COLLECTION, res.user.uid);
      await setDoc(userRef, sanitizeData(profile), { merge: true });

      if (rtdb) {
        await rtdbSet(rtdbRef(rtdb, `users/${res.user.uid}`), sanitizeData(profile));
      }

      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      return profile;
    } catch (err: any) {
      console.error("Erro ao registrar novo usuário:", err);
      throw new Error(mapAuthError(err));
    }
  },

  // Acesso rápido como Plantão / Cartório conectado ao Firebase Auth
  async loginAsGuest(customName = 'Cartório de Oitivas'): Promise<UserProfile> {
    try {
      const res = await signInAnonymously(auth);
      const userRef = doc(db, USERS_COLLECTION, res.user.uid);
      const snap = await getDoc(userRef);

      let profile: UserProfile;
      if (snap.exists()) {
        profile = {
          ...(snap.data() as UserProfile),
          uid: res.user.uid
        };
      } else {
        profile = {
          uid: res.user.uid,
          email: 'delegaciammaracanau@gmail.com',
          displayName: customName,
          cargo: 'Equipe de Plantão / Cartório',
          registrationNumber: 'PCCE-PLANTÃO',
          institutionalEmail: 'maracanau.plantao@policiacivil.ce.gov.br',
          unitName: '1ª Delegacia Metropolitana de Maracanaú',
          phone: '(85) 3101-2830',
          department: 'Cartório de Oitivas',
          authProvider: 'anonymous',
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
  }
};
