
export const API_BASE = '/automation';

const authStore = {
  get: () => JSON.parse(localStorage.getItem('automationPortalAuth') || 'null'),
  set: (session) => localStorage.setItem('automationPortalAuth', JSON.stringify(session)),
  clear: () => localStorage.removeItem('automationPortalAuth')
};

const friendlyHttpMessage = (status, path, serverMessage) => {
  if (serverMessage) return serverMessage;

  const area = path.startsWith('/api/auth') ? 'authentication service' : 'server';

  if (status === 0) {
    return 'Unable to connect to the server. Please check that the backend is running and try again.';
  }
  if (status === 400) {
    return 'Some required fileds are missing or invalid ';
  }
  if (status === 401) {
    return path.startsWith('/api/auth/login')
      ? 'Invalid username/email or password. Please check your credentials and try again.'
      : 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission.';
  }
  if (status === 404) {
    return 'The requested service was not found. Please refresh the page and try again.';
  }
  if (status === 409) {
    return 'This record already exists or conflicts with existing data.';
  }
  if (status === 413) {
    return 'The uploaded file is too large. Please choose a smaller file.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return `The ${area} is currently unavailable. Please make sure the backend container is running, then try again.`;
  }
  if (status >= 500) {
    return 'The server could not complete the request. Please try again in a moment.';
  }

  return 'Something went wrong. Please try again.';
};

let globalErrorCallback = null;

const triggerGlobalError = (status, message, detail = '') => {
  if (!globalErrorCallback) return;
  let title = 'Error';
  if (status === 0) title = 'Network Connection Error';
  else if (status === 401) title = 'Session Expired';
  else if (status === 403) title = 'Access Restricted (403)';
  else if (status === 404) title = 'Resource Not Found (404)';
  else if (status >= 500) title = 'Internal Server Error (500)';

  globalErrorCallback({ status, title, message, detail });
};

const unwrap = async (response, path = response.url || '') => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const message = friendlyHttpMessage(response.status, path, body.message);

    if (response.status === 403 || response.status === 404 || response.status >= 500) {
      const detail = `Request Endpoint: ${path}\nStatus Code: ${response.status}\nServer Error: ${body.message || 'No additional details provided.'}\nTimestamp: ${new Date().toISOString()}`;
      triggerGlobalError(response.status, message, detail);
    }

    const error = new Error(message);
    error.status = response.status;
    error.detail = body.message;
    throw error;
  }
  return body.data;
};


let inFlightRefresh = null;

const refreshSession = (refreshToken) => {
  if (!inFlightRefresh) {
    inFlightRefresh = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
      .then((refreshResponse) => unwrap(refreshResponse, '/api/auth/refresh'))
      .finally(() => { inFlightRefresh = null; });
  }
  return inFlightRefresh;
};

const request = async (path, options = {}, retryCount = 0) => {
  const session = authStore.get();
  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    ...options.headers
  };
  let response;
  try {
    response = await fetch(API_BASE + path, { ...options, headers });
  } catch (error) {
    const msg = 'Unable to connect to the server. Please check that the backend is running and try again.';
    const detail = `Request Endpoint: ${path}\nHTTP Method: ${options.method || 'GET'}\nError Type: ${error.name || 'NetworkError'}\nSystem Message: ${error.message}\n\nTroubleshooting:\n- Verify that the backend docker containers are running.\n- Check if there is an active internet connection.\n- Ensure the port 8080 is accessible.`;
    triggerGlobalError(0, msg, detail);
    const networkError = new Error(msg);
    networkError.cause = error;
    throw networkError;
  }
  if (response.status === 401 && session?.refreshToken && retryCount < 1) {
    try {
      const refreshed = await refreshSession(session.refreshToken);
      authStore.set(refreshed);
      return request(path, options, retryCount + 1);
    } catch {
  
      const current = authStore.get();
      if (current?.refreshToken === session.refreshToken) {
        authStore.clear();
        triggerGlobalError(401, 'Your session has expired. Please sign in again.');
      } else if (current?.accessToken) {
        return request(path, options, retryCount + 1);
      }
  
    }
  } else if (response.status === 401) {
 
    const current = authStore.get();
    if (current?.accessToken && current.accessToken !== session?.accessToken && retryCount < 2) {
      return request(path, options, retryCount + 1);
    }
    triggerGlobalError(401, 'Your session has expired. Please sign in again.');
  }
  return unwrap(response, path);
};

export const auth = authStore;

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: (refreshToken) => request('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  me: () => request('/api/auth/me'),
  forgotPassword: (payload) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Profile ───────────────────────────────────────────────────────────────
  profile: () => request('/api/profile'),
  updateProfile: (payload) => request('/api/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  uploadProfileImage: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/profile/image', { method: 'POST', body: form });
  },
  auditLogs: () => request('/api/profile/audit-logs'),
  requestEmailChange: (payload) => request('/api/profile/email-change/request', { method: 'POST', body: JSON.stringify(payload) }),
  verifyEmailChange: (payload) => request('/api/profile/email-change/verify', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Admin: User Management (SUPER_ADMIN only) ─────────────────────────────
  adminListUsers: () => request('/api/admin/users'),
  adminGetUser: (id) => request(`/api/admin/users/${id}`),
  adminCreateUser: (payload) => request('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateUser: (id, payload) => request(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDisableUser: (id) => request(`/api/admin/users/${id}/disable`, { method: 'PUT', body: JSON.stringify({}) }),
  adminEnableUser: (id) => request(`/api/admin/users/${id}/enable`, { method: 'PUT', body: JSON.stringify({}) }),
  adminResetPassword: (id, payload) => request(`/api/admin/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminAssignRole: (id, role) => request(`/api/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  adminDeleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),

  // ── Portal ────────────────────────────────────────────────────────────────
  dashboardSummary: () => request('/api/dashboard/summary'),
  dashboardTrends: (range) => request(`/api/dashboard/trends?range=${range || '7d'}`),
  dashboardModuleHealth: (range) => request(`/api/dashboard/module-health?range=${range || '30d'}`),
  dashboardRecentActivity: () => request('/api/dashboard/recent-activity'),
  dashboardFailureAnalysis: (range) => request(`/api/dashboard/failure-analysis?range=${range || '30d'}`),
  dashboardSlowTests: (range) => request(`/api/dashboard/slow-tests?range=${range || '30d'}`),
  dashboardFlakyTests: (range) => request(`/api/dashboard/flaky-tests?range=${range || '30d'}`),
  dashboardPassRateTrend: (range) => request(`/api/dashboard/pass-rate-trend?range=${range || '7d'}`),
  dashboardDurationTrend: (range) => request(`/api/dashboard/duration-trend?range=${range || '7d'}`),
  dashboardHeatmap: (range) => request(`/api/dashboard/heatmap?range=${range || '7d'}`),
  dashboardEnvDistribution: (range) => request(`/api/dashboard/env-distribution?range=${range || '30d'}`),
  dashboardRegressionAlerts: () => request('/api/dashboard/regression-alerts'),
  getTestSteps: (testCaseId) => request(`/api/test-cases/${testCaseId}/steps`),

  environments: () => request('/api/environments'),
  environmentsHealth: () => request('/api/environments/health'),
  createEnvironment: (payload) => request('/api/environments', { method: 'POST', body: JSON.stringify(payload) }),
  updateEnvironment: (id, payload) => request(`/api/environments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEnvironment: (id) => request(`/api/environments/${id}`, { method: 'DELETE' }),

  configurations: () => request('/api/configurations'),
  updateConfiguration: (key, payload) => request(`/api/configurations/${key}`, { method: 'PUT', body: JSON.stringify(payload) }),

  modules: () => request('/api/modules'),

  // ── Admin: Module Management (SUPER_ADMIN only) ───────────────────────────
  adminListModules: () => request('/api/admin/modules'),
  adminCreateModule: (payload) => request('/api/admin/modules', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateModule: (id, payload) => request(`/api/admin/modules/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteModule: (id) => request(`/api/admin/modules/${id}`, { method: 'DELETE' }),
  adminToggleModule: (id) => request(`/api/admin/modules/${id}/toggle`, { method: 'PATCH' }),
  executions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/api/executions' + (qs ? '?' + qs : ''));
  },
  runExecution: (payload) => request('/api/executions/run', { method: 'POST', body: JSON.stringify(payload) }),
  executionDetails: (id) => request(`/api/executions/${id}`),
  executionTestCases: (id) => request(`/api/executions/${id}/test-cases`),
  executionArtifacts: (id) => request(`/api/executions/${id}/artifacts`),
  executionLogs: (id) => request(`/api/executions/${id}/logs`),
  executionSummary: (id) => request(`/api/executions/${id}/summary`),
  deleteExecution: (id) => request(`/api/executions/${id}`, { method: 'DELETE' }),
  cancelExecution: (id) => request(`/api/executions/${id}/cancel`, { method: 'POST' }),
  rerunExecution: (id) => request(`/api/executions/${id}/rerun`, { method: 'POST' }),
  rerunFailedExecution: (id) => request(`/api/executions/${id}/rerun-failed`, { method: 'POST' }),
  runnerSuites: () => request('/api/executions/runner/suites'),

  reportsList: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/api/reports' + (qs ? '?' + qs : ''));
  },
  reportDetails: (id) => request(`/api/reports/${id}`),
  reportFailedTests: (id) => request(`/api/reports/${id}/failed-tests`),

  screenshotsList: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/api/screenshots' + (qs ? '?' + qs : ''));
  },
  deleteScreenshot: (testCaseId) => request(`/api/screenshots/${testCaseId}`, { method: 'DELETE' }),

  compareExecutions: (baseId, targetId) => request(`/api/compare/executions?baseExecutionId=${baseId}&targetExecutionId=${targetId}`),
  compareLatest: (module) => request(`/api/compare/latest?module=${module}`),
  setErrorCallback: (cb) => { globalErrorCallback = cb; }
};
