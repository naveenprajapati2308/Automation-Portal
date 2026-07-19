import axios from 'axios';

export const apiClient = axios.create({
  baseURL: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`,
  timeout: 15000,
});

// Network-level failures (backend restarting, proxy down) have no response
// body. Synthesize one in the same {message} shape every page already reads,
// so the UI shows a clear reason instead of a bare "failed".
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.response = {
        data: { message: 'Backend unreachable — it may be restarting. Retry in a few seconds.' },
      };
    }
    return Promise.reject(error);
  },
);
