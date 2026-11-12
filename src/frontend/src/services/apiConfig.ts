export const apiBaseUrl: string = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

export const unreachableApiMessage = `API non raggiungibile (${apiBaseUrl}). Avvia il backend .NET e verifica VITE_API_BASE_URL.`;
