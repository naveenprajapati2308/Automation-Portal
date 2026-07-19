import axios from 'axios';

export const apiClient = axios.create({
  baseURL: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`,
  timeout: 15000,
});

// Platform session issued by Testrix (same origin, same key as the shell and
// the Automation Portal — one login works everywhere).
apiClient.interceptors.request.use((config) => {
  const session = JSON.parse(localStorage.getItem('automationPortalAuth') || 'null');
  if (session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`;
  return config;
});

// Network-level failures (backend restarting, proxy down) have no response
// body. Synthesize one in the same {message} shape every page already reads,
// so the UI shows a clear reason instead of a bare "failed".
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/';
      return Promise.reject(error);
    }
    if (!error.response) {
      error.response = {
        data: { message: 'Backend unreachable — it may be restarting. Retry in a few seconds.' },
      };
    }
    return Promise.reject(error);
  },
);
