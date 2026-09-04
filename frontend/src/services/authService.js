/**
 * authService.js  —  Gestión de autenticación y tokens JWT
 * ────────────────────────────────────────────────────────────────────────
 * ÚNICA FUENTE DE VERDAD del estado de autenticación en el frontend.
 * Maneja el ciclo de vida de los tokens JWT (access + refresh) y
 * notifica a los suscriptores cuando cambia el estado de autenticación.
 *
 * ─── POLÍTICA DE ALMACENAMIENTO (OWASP A02:2021) ───
 * - accessToken   →  MEMORIA SOLAMENTE (nunca en localStorage)
 *                    Previene robo de tokens vía XSS (A03:2021).
 *                    Se regenera al recargar la página vía restoreSession().
 * - refreshToken  →  localStorage (persiste entre recargas)
 *                    Se renueva automáticamente en cada refresh.
 * - currentUser   →  localStorage (persiste entre recargas)
 *                    Datos básicos del usuario para UI inmediata.
 *
 * ─── PATRÓN OBSERVER ───
 * Los componentes se suscriben con subscribe() y reciben notificaciones
 * cuando el usuario inicia/cierra sesión (setTokens / clearAuth).
 * Retorna una función para cancelar la suscripción.
 *
 * ─── RESTAURACIÓN DE SESIÓN ───
 * restoreSession() intenta renovar el access token usando el refresh
 * token almacenado. Si falla, limpia la autenticación.
 * Incluye deduplicación: si se llama múltiples veces en paralelo,
 * solo ejecuta una petición de refresh.
 */
const LS_REFRESH = 'refresh_token'
const LS_USER = 'usuario'

let accessToken = null
let currentUser = null
let _pendingRestore = null

const listeners = new Set()

function notify() {
  listeners.forEach(fn => fn(currentUser))
}

/** Lee un valor de localStorage de forma segura. */
function readLS(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

/** Escribe un valor en localStorage de forma segura. */
function writeLS(key, value) {
  try { localStorage.setItem(key, value) } catch { /* ignore */ }
}

function removeLS(key) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

/**
 * Restaura el estado en memoria a partir de localStorage al arrancar.
 * NOTA: El access token NUNCA se restaura de localStorage — solo el
 * refresh token y los datos del usuario. El access se regenera vía
 * restoreSession() usando el refresh token.
 */
function hydrate() {
  const raw = readLS(LS_USER)
  if (raw) {
    try { currentUser = JSON.parse(raw) } catch { currentUser = null }
  }
  // NO restaurar accessToken de localStorage — solo memoria.
}

hydrate()

/** Suscribe un callback a cambios en el estado de autenticación. Retorna función para desuscribirse. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Retorna el token JWT access actual desde memoria. */
export function getAccessToken() {
  return accessToken
}

/** Retorna el objeto del usuario autenticado actual. */
export function getCurrentUser() {
  return currentUser
}

/**
 * Almacena tokens y usuario.
 * - access token → solo memoria (nunca localStorage)
 * - refresh token → localStorage (persistencia entre recargas)
 * - usuario → localStorage (persistencia entre recargas)
 */
export function setTokens(access, refresh, usuario) {
  accessToken = access || null
  currentUser = usuario || null
  // access token: SOLO memoria, nunca persistir (OWASP A03:2021)
  if (refresh) {
    writeLS(LS_REFRESH, refresh)
    try { sessionStorage.setItem('refresh_token', refresh) } catch { /* ignore */ }
  }
  if (usuario) writeLS(LS_USER, JSON.stringify(usuario))
  else removeLS(LS_USER)
  notify()
}

/** Limpia todos los tokens y notifica a los listeners. */
export function clearAuth() {
  accessToken = null
  currentUser = null
  removeLS(LS_REFRESH)
  removeLS(LS_USER)
  try { sessionStorage.removeItem('refresh_token') } catch { /* ignore */ }
  notify()
}

/** Recupera el refresh token almacenado (localStorage, con fallback a sessionStorage legacy). */
export function getStoredRefreshToken() {
  return readLS(LS_REFRESH) || (() => { try { return sessionStorage.getItem('refresh_token') } catch { return null } })()
}

/** Verifica si existe un token válido (en memoria o refresh token almacenado). */
export function isAuthenticated() {
  return !!accessToken || !!getStoredRefreshToken()
}

/**
 * Restaura la sesión usando el refresh token.
 * Obtiene un nuevo access token (en memoria) y los datos del usuario.
 * Deduplica llamadas concurrentes.
 */
export function restoreSession() {
  if (_pendingRestore) return _pendingRestore
  const refresh = getStoredRefreshToken()
  if (!refresh) {
    _pendingRestore = Promise.resolve(null)
    return _pendingRestore
  }
  _pendingRestore = import('./api.js').then(({ api }) =>
    api.post('/token/refresh/', { refresh })
      .then(res => {
        // Access token: solo en memoria, nunca en localStorage
        accessToken = res.data.access
        if (res.data.refresh) {
          writeLS(LS_REFRESH, res.data.refresh)
        }
        return api.get('/me/')
      })
      .then(res => {
        currentUser = res.data
        writeLS(LS_USER, JSON.stringify(currentUser))
        notify()
        return currentUser
      })
      .catch(() => {
        clearAuth()
        return null
      })
  ).finally(() => { _pendingRestore = null })
  return _pendingRestore
}
