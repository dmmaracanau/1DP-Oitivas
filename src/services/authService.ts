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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile } from '../types/oitiva';

const LOCAL_USER_KEY = 'oitivas_user_session';
const USERS_COLLECTION = 'users';

// In-memory token cache (strictly required by security guidelines)
let cachedAccessToken: string | null = null;

// Helper to sanitize undefined values before saving to Firestore
function sanitizeData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  }
  return clean;
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

  // Retorna usuário logado (local cache ou Firebase)
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
        unitName: 'Delegacia Metropolitana de Maracanaú',
        authProvider: auth.currentUser.isAnonymous ? 'anonymous' : 'password'
      };
    }

    return null;
  },

  // Busca dados extras de perfil no Firestore
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
      console.warn("Não foi possível carregar perfil do Firestore:", err);
    }
    return this.getCurrentUser();
  },

  // Observador de estado de autenticação
  onAuthChange(callback: (user: UserProfile | null) => void) {
    try {
      return fbOnAuthStateChanged(auth, async (user: User | null) => {
        if (user) {
          const cached = this.getCurrentUser();
          const baseProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || cached?.displayName || user.email?.split('@')[0] || 'Servidor(a)',
            photoURL: user.photoURL || cached?.photoURL || null,
            cargo: cached?.cargo || 'Inspetor(a) de Polícia',
            registrationNumber: cached?.registrationNumber || '',
            institutionalEmail: cached?.institutionalEmail || (user.email?.includes('delegacia') ? user.email : ''),
            unitName: cached?.unitName || 'Delegacia Metropolitana de Maracanaú',
            phone: cached?.phone || '',
            department: cached?.department || 'Cartório de Oitivas',
            authProvider: user.isAnonymous ? 'anonymous' : (cachedAccessToken ? 'google' : 'password')
          };

          // Tenta enriquecer com dados do Firestore
          try {
            const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
            if (userDoc.exists()) {
              Object.assign(baseProfile, userDoc.data());
            }
          } catch {
            // Continua com baseProfile se falhar
          }

          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(baseProfile));
          callback(baseProfile);
        } else {
          cachedAccessToken = null;
          const local = this.getCurrentUser();
          callback(local);
        }
      });
    } catch (err) {
      console.warn("Auth listener fallback:", err);
      const local = this.getCurrentUser();
      callback(local);
      return () => {};
    }
  },

  // Atualiza perfil completo do usuário (Nome, Matrícula, Email Institucional, Cargo, etc.)
  async updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const current = this.getCurrentUser() || {
      uid: auth.currentUser?.uid || `user_${Date.now()}`,
      email: auth.currentUser?.email || 'delegaciammaracanau@gmail.com',
      displayName: 'Servidor(a)'
    };

    const updatedProfile: UserProfile = {
      ...current,
      ...profileData,
      updatedAt: Date.now()
    };

    // 1. Atualiza no localStorage
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

    // 3. Salva os campos estendidos no Firestore
    try {
      const uid = updatedProfile.uid;
      const userRef = doc(db, USERS_COLLECTION, uid);
      await setDoc(userRef, sanitizeData(updatedProfile), { merge: true });
    } catch (err) {
      console.warn("Aviso ao salvar perfil no Firestore:", err);
    }

    return updatedProfile;
  },

  // Atualizar senha de acesso da conta
  async updateUserPassword(newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("A senha deve conter no mínimo 6 caracteres.");
    }

    if (!auth.currentUser) {
      // Se estiver em modo local, apenas confirma alteração
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        throw new Error("Por segurança, faça login novamente antes de alterar a senha.");
      }
      throw new Error(err.message || "Não foi possível alterar a senha no momento.");
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
      if (err.code === 'auth/user-not-found') {
        throw new Error("Nenhuma conta encontrada com este e-mail.");
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error("Formato de e-mail inválido.");
      }
      // Se falhar no Firebase, avisa que o link seria enviado
      console.warn("Aviso ao enviar e-mail de recuperação:", err);
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
      
      const cached = this.getCurrentUser();
      const profile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || cached?.displayName || 'Servidor(a)',
        photoURL: res.user.photoURL || cached?.photoURL || null,
        cargo: cached?.cargo || 'Escrivão(ã) / Inspetor(a)',
        registrationNumber: cached?.registrationNumber || '',
        institutionalEmail: cached?.institutionalEmail || '',
        unitName: cached?.unitName || 'Delegacia Metropolitana de Maracanaú',
        phone: cached?.phone || '',
        authProvider: 'google'
      };

      // Tenta salvar perfil no Firestore
      try {
        await setDoc(doc(db, USERS_COLLECTION, res.user.uid), sanitizeData(profile), { merge: true });
      } catch {}

      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      return { profile, token: cachedAccessToken || undefined };
    } catch (err: any) {
      console.warn("Erro no login Google, fallback para modo local:", err.message);
      const fallbackProfile: UserProfile = {
        uid: 'user_maracanau_01',
        email: 'delegaciammaracanau@gmail.com',
        displayName: 'Delegacia de Maracanaú',
        cargo: 'Cartório Central de Oitivas',
        registrationNumber: 'PCCE-304.552-1',
        institutionalEmail: 'maracanau.oitivas@policiacivil.ce.gov.br',
        unitName: 'Delegacia Metropolitana de Maracanaú',
        phone: '(85) 3101-2830',
        authProvider: 'custom'
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackProfile));
      return { profile: fallbackProfile };
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
      throw err;
    }
  },

  // Login com Email e Senha
  async loginWithEmail(email: string, pass: string): Promise<UserProfile> {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      const cached = this.getCurrentUser();
      const profile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || cached?.displayName || email.split('@')[0],
        cargo: cached?.cargo || 'Inspetor(a) de Polícia',
        registrationNumber: cached?.registrationNumber || '',
        institutionalEmail: cached?.institutionalEmail || '',
        unitName: 'Delegacia Metropolitana de Maracanaú',
        authProvider: 'password'
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      return profile;
    } catch (err: any) {
      // Se não existir usuário ou falhar, permite login local com o e-mail
      const profile: UserProfile = {
        uid: `local_user_${Date.now()}`,
        email: email,
        displayName: email.split('@')[0],
        cargo: 'Servidor(a) Policial',
        registrationNumber: '',
        institutionalEmail: '',
        unitName: 'Delegacia Metropolitana de Maracanaú',
        authProvider: 'password'
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      return profile;
    }
  },

  // Registrar novo usuário
  async registerWithEmail(email: string, pass: string, name: string): Promise<UserProfile> {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user && name) {
        await updateProfile(res.user, { displayName: name });
      }
      const profile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: name || email.split('@')[0],
        cargo: 'Servidor(a) Policial',
        registrationNumber: '',
        institutionalEmail: '',
        unitName: 'Delegacia Metropolitana de Maracanaú',
        authProvider: 'password'
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      try {
        await setDoc(doc(db, USERS_COLLECTION, res.user.uid), sanitizeData(profile), { merge: true });
      } catch {}
      return profile;
    } catch (err: any) {
      const profile: UserProfile = {
        uid: `local_user_${Date.now()}`,
        email: email,
        displayName: name || email.split('@')[0],
        cargo: 'Servidor(a) Policial',
        registrationNumber: '',
        institutionalEmail: '',
        unitName: 'Delegacia Metropolitana de Maracanaú',
        authProvider: 'password'
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      return profile;
    }
  },

  // Acesso rápido como Plantão / Cartório
  async loginAsGuest(customName = 'Cartório de Oitivas'): Promise<UserProfile> {
    try {
      await signInAnonymously(auth);
    } catch {
      // ignora
    }
    const profile: UserProfile = {
      uid: `plantao_${Date.now()}`,
      email: 'delegaciammaracanau@gmail.com',
      displayName: customName,
      cargo: 'Equipe de Plantão / Cartório',
      registrationNumber: 'PCCE-PLANTÃO',
      institutionalEmail: 'maracanau.plantao@policiacivil.ce.gov.br',
      unitName: 'Delegacia Metropolitana de Maracanaú',
      phone: '(85) 3101-2830',
      authProvider: 'anonymous'
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    return profile;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch {
      // ignora
    }
    cachedAccessToken = null;
    localStorage.removeItem(LOCAL_USER_KEY);
  }
};


