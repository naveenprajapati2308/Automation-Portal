import { apiClient } from '../api/client.js';

/** Fetches a file through apiClient (so the auth header goes along) and saves it via a
 * throwaway <a download> — used for collection exports and execution report downloads. */
export async function downloadFrom(url, fallbackName) {
  const res = await apiClient.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const starMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="([^"]+)"/i);
  const filename = starMatch ? decodeURIComponent(starMatch[1]) : (plainMatch ? plainMatch[1] : fallbackName);
  const blobUrl = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}
