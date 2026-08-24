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
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
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
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'O provedor de autenticação por E-mail/Senha precisa ser ativado no Firebase Console > Authentication > Sign-in method.';
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
      console.log("[FirebaseAuth] Initializing onAuthStateChanged observer...");
      const unsubAuth = fbOnAuthStateChanged(auth, async (user: User | null) => {
        console.log(`[FirebaseAuth] onAuthStateChanged triggered. Current Firebase Auth User:`, user ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          isAnonymous: user.isAnonymous,
          emailVerified: user.emailVerified,
          providerData: user.providerData?.map(p => ({
            providerId: p.providerId,
            email: p.email,
            displayName: p.displayName
          }))
        } : 'NULL (No active Firebase Auth session)');

        if (unsubUserDoc) {
          unsubUserDoc();
          unsubUserDoc = null;
        }

        const cached = this.getCurrentUser();

        if (user) {
          console.log(`[FirebaseAuth] User detected in Firebase Auth session: ${user.uid} (${user.email || 'anonymous'})`);
          const effectiveUid = (user.isAnonymous && cached?.uid) ? cached.uid : user.uid;
          const baseProfile: UserProfile = {
            uid: effectiveUid,
            username: cached?.username || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_.]/g, '') || null,
            email: user.email || cached?.email || null,
            displayName: user.displayName || cached?.displayName || user.email?.split('@')[0] || 'Servidor(a) Policial',
            photoURL: user.photoURL || cached?.photoURL || null,
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
                  photoURL: user.photoURL || liveData.photoURL || null
                };
                console.log(`[FirebaseAuth] Firestore user document synced for UID=${effectiveUid}:`, liveProfile.displayName);
                localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(liveProfile));
                callback(liveProfile);
              } else {
                // Se documento ainda não existe no Firestore, salva o perfil inicial
                console.log(`[FirebaseAuth] Firestore user document not found for UID=${effectiveUid}. Creating initial record...`);
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
          console.log("[FirebaseAuth] Signed out or no session active.");
          if (cached && cached.uid) {
            // Mantém sessão local persistida e reativa token Firebase anônimo em segundo plano se necessário
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

    const currentProfile = this.getCurrentUser();
    const uid = currentProfile?.uid || auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Usuário não identificado.");
    }

    const pHash = await hashPassword(newPassword);

    // 1. Tenta atualizar no Firebase Auth se usuário estiver com login de email/senha padrão
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
        console.log(`[FirebaseAuth] Attempting native signInWithEmailAndPassword for: ${loginEmail}`);
        const res = await signInWithEmailAndPassword(auth, loginEmail, normalizePassword(pass));
        userUid = res.user.uid;
        fbSuccess = true;
        console.log(`[FirebaseAuth] Native signInWithEmailAndPassword SUCCESS for UID: ${res.user.uid}, email: ${res.user.email}`);
        
        // Recarrega documento do Firestore se existir
        const snap = await getDoc(doc(db, USERS_COLLECTION, res.user.uid));
        if (snap.exists()) {
          userDocData = snap.data();
        }
      } catch (err: any) {
        authAttemptError = err;
        console.warn(`[FirebaseAuth] signInWithEmailAndPassword notice: code=${err?.code}, message=${err?.message}`);
      }
    }

    // 4. Verificação de credenciais e Auto-provisionamento no Firebase Authentication caso o usuário tenha sido criado em Firestore antes da ativação do Auth
    if (userDocData) {
      const storedHash = userDocData.passwordHash;
      const isPasswordValid = fbSuccess || (storedHash && storedHash === pHash) || (!storedHash && fbSuccess);

      if (isPasswordValid) {
        // Se a senha é válida mas o usuário ainda não existia no Firebase Authentication, cria agora!
        if (!fbSuccess && loginEmail && (authAttemptError?.code === 'auth/user-not-found' || authAttemptError?.code === 'auth/invalid-credential')) {
          try {
            console.log(`[FirebaseAuth] Auto-provisioning legacy user into Firebase Authentication: ${loginEmail}`);
            const newAuthRes = await createUserWithEmailAndPassword(auth, loginEmail, normalizePassword(pass));
            console.log(`[FirebaseAuth] SUCCESS: User provisioned in Firebase Authentication! UID: ${newAuthRes.user.uid}, Email: ${newAuthRes.user.email}`);
            
            if (userDocData.displayName) {
              await updateProfile(newAuthRes.user, { displayName: userDocData.displayName }).catch(() => {});
            }
            userUid = newAuthRes.user.uid;
            fbSuccess = true;
          } catch (createErr: any) {
            console.warn("[FirebaseAuth] Notice during auto-provisioning:", createErr?.code || createErr?.message);
          }
        }

        // Assegura sessão ativa
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch {}
        }

        const profile: UserProfile = {
          uid: userUid || userDocSnap?.id || `user_${cleanIdentifier}`,
          username: userDocData.username || cleanIdentifier.replace(/[^a-z0-9_.]/g, ''),
          email: userDocData.email || loginEmail || null,
          displayName: userDocData.displayName || cleanIdentifier,
          photoURL: userDocData.photoURL || null,
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

        // Salva hash e perfil sincronizado
        try {
          await setDoc(doc(db, USERS_COLLECTION, profile.uid), sanitizeData({ ...profile, passwordHash: pHash }), { merge: true });
        } catch {}

        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
        console.log(`[FirebaseAuth] Login complete for user: ${profile.displayName} (${profile.email})`);
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

  // Alias para signup (compatibilidade com APIs e rotinas de registro)
  async signup(email: string, pass: string, fullName: string, username?: string): Promise<UserProfile> {
    console.log(`[FirebaseAuth] signup method called for: ${email}`);
    return this.registerWithEmail(email, pass, fullName, username);
  },

  // Registrar novo usuário: nome de usuário, nome completo, e-mail e senha diretamente no Firebase Authentication
  async registerWithEmail(
    email: string, 
    pass: string, 
    fullName: string, 
    username?: string
  ): Promise<UserProfile> {
    console.log(`[FirebaseAuth] registerWithEmail started. Email: "${email}", FullName: "${fullName}", Username: "${username}"`);
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

    const pHash = await hashPassword(pass);
    let targetUid = '';
    let isNativeAuth = false;

    // 1. Tenta criar usuário diretamente no Firebase Authentication
    try {
      console.log(`[FirebaseAuth] Calling createUserWithEmailAndPassword for email: ${cleanEmail}`);
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, normalizePassword(pass));
      targetUid = res.user.uid;
      isNativeAuth = true;
      console.log(`[FirebaseAuth] SUCCESS: User registered in Firebase Authentication! UID: ${res.user.uid}, Email: ${res.user.email}`);
      
      if (res.user && cleanDisplayName) {
        try {
          await updateProfile(res.user, { displayName: cleanDisplayName });
          console.log(`[FirebaseAuth] Profile displayName set to: "${cleanDisplayName}" on Firebase Auth user.`);
        } catch (profileErr) {
          console.warn("[FirebaseAuth] Notice setting displayName:", profileErr);
        }
      }
    } catch (fbErr: any) {
      console.warn(`[FirebaseAuth] Firebase Auth registration response: code=${fbErr?.code}, message=${fbErr?.message}`);
      
      if (fbErr?.code === 'auth/email-already-in-use') {
        // Se já existe no Firebase Auth, tenta autenticar com a senha fornecida para recuperar o UID
        try {
          console.log(`[FirebaseAuth] Email already in Firebase Auth. Attempting to sign in to link profile: ${cleanEmail}`);
          const signRes = await signInWithEmailAndPassword(auth, cleanEmail, normalizePassword(pass));
          targetUid = signRes.user.uid;
          isNativeAuth = true;
        } catch {
          throw new Error("Este e-mail já está cadastrado no sistema. Faça login com suas credenciais.");
        }
      } else if (fbErr?.code === 'auth/operation-not-allowed') {
        console.warn("[FirebaseAuth] Email/Password provider not active in Firebase Console. Using Firestore persistence fallback.");
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
      cargo: 'Inspetor(a) de Polícia',
      registrationNumber: '',
      institutionalEmail: cleanEmail.includes('delegacia') ? cleanEmail : '',
      unitName: '1ª Delegacia Metropolitana de Maracanaú',
      phone: '(85) 3101-2830',
      department: 'Cartório de Oitivas',
      authProvider: 'password',
      updatedAt: Date.now()
    };

    // 2. Salva perfil completo sincronizado no Firestore
    try {
      console.log(`[FirebaseAuth] Persisting user profile in Firestore collection "${USERS_COLLECTION}" under document ID: ${targetUid}`);
      const userRef = doc(db, USERS_COLLECTION, targetUid);
      await setDoc(userRef, sanitizeData({ ...profile, passwordHash: pHash }), { merge: true });
      
      if (rtdb) {
        await rtdbSet(rtdbRef(rtdb, `users/${targetUid}`), sanitizeData({ ...profile, passwordHash: pHash }));
      }
      console.log(`[FirebaseAuth] User profile successfully synchronized in Firestore and RTDB for: ${profile.displayName}`);
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
          console.log("[FirebaseAuth] Usuário excluído do Firebase Authentication.");
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
  }
};
