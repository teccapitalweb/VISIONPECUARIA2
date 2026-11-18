// ═══════════════════════════════════════════════════════════════════════════
// VISIÓN PECUARIA · Aula — capa de autenticación (Firebase Auth)
// Mismo proyecto que Élite Pecuario y las landings: las cuentas son las mismas.
// ═══════════════════════════════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, signOut, setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQXkIo-BWPIeLZzHeTMN986WMDn0TrTJU",
  authDomain: "visionpecuaria-vip.firebaseapp.com",
  projectId: "visionpecuaria-vip",
  storageBucket: "visionpecuaria-vip.firebasestorage.app",
  messagingSenderId: "978318807782",
  appId: "1:978318807782:web:626e67bb30795c15b02127"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'es';
setPersistence(auth, browserLocalPersistence).catch(() => {});
getRedirectResult(auth).catch(() => {});

const continuar = () => ({ url: location.origin + '/aula/' + location.search, handleCodeInApp: false });

function usuarioPlano(u) {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    nombre: u.displayName || '',
    verificado: u.emailVerified === true,
    proveedores: (u.providerData || []).map(p => p.providerId)
  };
}

export function onUser(cb) { return onAuthStateChanged(auth, u => cb(usuarioPlano(u))); }

export async function loginGoogle() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, p);
  } catch (e) {
    // Navegadores que bloquean popups (algunos móviles / in-app de Facebook)
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
      await signInWithRedirect(auth, p);
      return;
    }
    throw e;
  }
}
export async function loginEmail(email, pass) { await signInWithEmailAndPassword(auth, email, pass); }
export async function registrar(email, pass) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  await sendEmailVerification(cred.user, continuar()).catch(() => {});
}
export async function resetPassword(email) { await sendPasswordResetEmail(auth, email, continuar()); }
export async function enviarVerificacion() { if (auth.currentUser) await sendEmailVerification(auth.currentUser, continuar()); }
export async function recargarUsuario() {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return usuarioPlano(auth.currentUser);
}
export async function getToken(forzar = false) { return auth.currentUser ? auth.currentUser.getIdToken(forzar) : null; }
export async function logout() { await signOut(auth); }
