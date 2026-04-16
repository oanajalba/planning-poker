import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

// Exclusively for Server/API Route usage dynamically building scoped clients
export async function getScopedServerClient(sessionId: string) {
  if (!supabaseJwtSecret) {
    throw new Error('Server configuration error: missing JWT Secret');
  }

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ 
    role: 'anon', 
    app_session_id: sessionId,
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
  })).toString('base64url');
  
  const signature = crypto.createHmac('sha256', supabaseJwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
    
  const token = `${header}.${payload}.${signature}`;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
