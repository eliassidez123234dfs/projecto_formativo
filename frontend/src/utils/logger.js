const BATCH_SIZE = 10;
const FLUSH_DELAY = 3000;
const MAX_MESSAGE = 300;

let queue = [];
let timer = null;

function sanitize(err) {
  const entry = {
    type: 'Error',
    message: 'Error desconocido',
    status: null,
    url: '',
    timestamp: new Date().toISOString(),
  };

  if (err && typeof err === 'object') {
    if (typeof err.name === 'string') entry.type = err.name.slice(0, 60);
    if (typeof err.message === 'string') {
      entry.message = err.message.slice(0, MAX_MESSAGE);
    }
    if (err.response && typeof err.response.status === 'number') {
      entry.status = err.response.status;
    }
    if (typeof err.config?.url === 'string') {
      entry.url = String(err.config.url).split('?')[0].slice(0, 200);
    }
  } else if (typeof err === 'string') {
    entry.message = err.slice(0, MAX_MESSAGE);
  }

  return entry;
}

function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0);
  try {
    fetch('/api/logging/client/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ errors: batch }),
    }).catch(() => {});
  } catch (e) {
    queue = batch;
  }
}

export function logClientError(err) {
  queue.push(sanitize(err));
  if (queue.length >= BATCH_SIZE) {
    flush();
  } else {
    clearTimeout(timer);
    timer = setTimeout(flush, FLUSH_DELAY);
  }
}

export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    logClientError({
      name: 'window.onerror',
      message: event?.message || 'Error de página',
      status: null,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    logClientError({
      name: 'UnhandledPromise',
      message: reason?.message || String(reason || 'Promesa rechazada'),
      status: reason?.response?.status || null,
    });
  });
}
