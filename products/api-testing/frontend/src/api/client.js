import axios from 'axios';

export const apiClient = axios.create({
  baseURL: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`,
  timeout: 15000,
});


apiClient.interceptors.request.use((config) => {
  const session = JSON.parse(localStorage.getItem('automationPortalAuth') || 'null');
  if (session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`;
  return config;
});


// Guarded so several concurrent 401s (e.g. a page firing multiple requests at once) only
// clear/redirect once, instead of each one racing to the same navigation.
let sessionExpiredRedirectStarted = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Mandatory session-expiry behavior: clear auth data immediately and leave — never
      // keep showing this protected page or let further requests go out on a dead token.
      localStorage.removeItem('automationPortalAuth');
      if (!sessionExpiredRedirectStarted) {
        sessionExpiredRedirectStarted = true;
        // Navigate the TOP window, not this one — API Testing has no login screen of its
        // own; when embedded in the shell's iframe, window.top is the real outer window
        // (and window.top === window when running standalone).
        window.top.location.href = '/';
      }
      return Promise.reject(error);
    }
    if (!error.response) {
      error.response = {
        data: { message: 'Internal Error please try again later' },
      };
    }
    return Promise.reject(error);
  },
);
