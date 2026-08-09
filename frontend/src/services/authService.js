/**
 * authService.js  —  Gestión de autenticación y tokens JWT
 * ────────────────────────────────────────────────────────────────────────
 * Maneja el ciclo de vida de los tokens JWT (access + refresh) y
 * notifica a los suscriptores cuando cambia el estado de autenticación.
 *
 * ─── POLÍTICA DE ALMACENAMIENTO ───
 * - accessToken   →  Solo en memoria (variable JS). Se pierde al recargar.
 * - refreshToken  →  sessionStorage (persiste entre recargas de pestaña,
 *                    pero no entre ventanas/dominios).
 * - currentUser   →  Solo en memoria.
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
let accessToken = null
let currentUser = null
let _pendingRestore = null

const listeners = new Set()

function notify() {
  listeners.forEach(fn => fn(currentUser))
}

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

/** Almacena los tokens en memoria (access) y sessionStorage (refresh) y notifica a los listeners. */
export function setTokens(access, refresh, usuario) {
  accessToken = access
  currentUser = usuario || null
  if (refresh) {
    try { sessionStorage.setItem('refresh_token', refresh) } catch {}
  }
  notify()
}

/** Limpia todos los tokens y notifica a los listeners. */
export function clearAuth() {
  accessToken = null
  currentUser = null
  try {
    sessionStorage.removeItem('refresh_token')
  } catch {}
  notify()
}

/** Recupera el refresh token almacenado en sessionStorage. */
export function getStoredRefreshToken() {
  try { return sessionStorage.getItem('refresh_token') } catch { return null }
}

/** Verifica si existe un token válido (en memoria o almacenado). */
export function isAuthenticated() {
  return !!accessToken || !!getStoredRefreshToken()
}

/** Intenta restaurar la sesión renovando el access token. Deduplica llamadas concurrentes. */
export function restoreSession() {
  if (_pendingRestore) return _pendingRestore
  const refresh = getStoredRefreshToken()
  if (!refresh) {
    _pendingRestore = Promise.resolve(null)
    return _pendingRestore
  }
  _pendingRestore = import('./api.js').then(({ default: api }) =>
    api.post('/token/refresh/', { refresh })
      .then(res => {
        accessToken = res.data.access
        return api.get('/me/')
      })
      .then(res => {
        currentUser = res.data
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
