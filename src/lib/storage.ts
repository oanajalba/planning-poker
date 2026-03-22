const STORAGE_KEY = 'planning_poker_sessions';

export interface LocalSessionData {
  participantId: string;
  isHost: boolean;
  name: string;
}

export function saveLocalSession(sessionId: string, data: LocalSessionData) {
  if (typeof window === 'undefined') return;
  const existing = getLocalSessions();
  existing[sessionId] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getLocalSession(sessionId: string): LocalSessionData | null {
  if (typeof window === 'undefined') return null;
  const existing = getLocalSessions();
  return existing[sessionId] || null;
}

function getLocalSessions(): Record<string, LocalSessionData> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}
