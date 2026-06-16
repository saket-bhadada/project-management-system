// Get the backend URL from environment or derive from current location
function getBackendURL() {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Default: assume backend is on port 3000 on same host
  const host = window.location.hostname;
  const port = import.meta.env.DEV ? 3000 : window.location.port;
  return `http://${host}:${port}`;
}

export const BACKEND_URL = getBackendURL();

export function getWebSocketURL(path) {
  const protocol = BACKEND_URL.startsWith('https') ? 'wss:' : 'ws:';
  const url = BACKEND_URL.replace(/^https?:\/\//, '');
  return `${protocol}//${url}${path}`;
}
