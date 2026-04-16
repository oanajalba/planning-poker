import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sessionClients = new Map<string, SupabaseClient>();

export async function getSessionClient(sessionId: string): Promise<SupabaseClient | null> {
  if (sessionClients.has(sessionId)) {
    return sessionClients.get(sessionId)!;
  }
  
  try {
    const res = await fetch(`/api/v1/auth/token?sessionId=${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch session token');
    const { token } = await res.json();
    
    if (token) {
      // Create a heavily isolated client that natively enforces the token via global fetch headers
      const scopedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      // Explicitly secure the Realtime socket
      scopedClient.realtime.setAuth(token);
      
      sessionClients.set(sessionId, scopedClient);
      return scopedClient;
    }
  } catch (err) {
    console.error("Authentication failed:", err);
  }
  return null;
}

