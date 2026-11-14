import { getAccessToken, signOut } from '@/auth/session';
import { apiBaseUrl, unreachableApiMessage } from './apiConfig';

/** The file name chosen by the server (Content-Disposition), or a fallback. */
export function fileNameFrom(header: string | null, fallback: string): string {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Downloads a protected file. A plain link cannot be used because the token travels in a header,
 * so the file is fetched and then saved from memory.
 */
async function download(path: string, fallbackName: string): Promise<string> {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new Error(unreachableApiMessage);
  }

  if (response.status === 401) {
    signOut();
    throw new Error('Sessione scaduta. Accedi di nuovo.');
  }
  if (!response.ok) throw new Error(`Download non riuscito: HTTP ${response.status}`);

  const name = fileNameFrom(response.headers.get('Content-Disposition'), fallbackName);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return name;
}

export const exportApi = {
  /** Complete JSON backup: portfolio, applications with their history, companies. */
  backup: () => download('/api/v1/export', 'portfolio-backup.json'),
  /** The applications as a spreadsheet. */
  applicationsCsv: () => download('/api/v1/export/applications.csv', 'candidature.csv')
};
