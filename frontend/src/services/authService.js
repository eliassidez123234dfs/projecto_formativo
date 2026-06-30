// In-memory auth state (tokens never stored in localStorage — only refresh token in sessionStorage)
let accessToken = null
let currentUser = null
let _pendingRestore = null

const listeners = new Set()

function notify() {
  listeners.forEach(fn => fn(currentUser))
}

/** Subscribe to auth state changes. Returns unsubscribe fn. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Get the current JWT access token from memory. */
export function getAccessToken() {
  return accessToken
}

/** Get the currently authenticated user object. */
export function getCurrentUser() {
  return currentUser
}

/** Persist tokens in memory and refresh token in sessionStorage. */
export function setTokens(access, refresh, usuario) {
  accessToken = access
  currentUser = usuario || null
  if (refresh) {
    try { sessionStorage.setItem('refresh_token', refresh) } catch {}
  }
  notify()
}

/** Clear all tokens and notify listeners. */
export function clearAuth() {
  accessToken = null
  currentUser = null
  try {
    sessionStorage.removeItem('refresh_token')
  } catch {}
  notify()
}

/** Retrieve stored refresh token from sessionStorage (survives tab refresh). */
export function getStoredRefreshToken() {
  try { return sessionStorage.getItem('refresh_token') } catch { return null }
}

/** Check if a valid token exists in memory or storage. */
export function isAuthenticated() {
  return !!accessToken || !!getStoredRefreshToken()
}

/** Attempt to restore the session by refreshing the access token. Deduplicates concurrent calls. */
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
