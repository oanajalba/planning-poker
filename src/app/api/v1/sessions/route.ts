import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { APP_VERSION } from '@/lib/version';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

export async function POST(request: Request) {
  try {
    const { name, mode, hostName } = await request.json();

    if (!hostName || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!supabaseJwtSecret) {
      return NextResponse.json({ error: 'Server configuration error: missing JWT Secret' }, { status: 500 });
    }

    // Generate the session ID natively so we don't have to rely on INSERT ... RETURNING which fails stringent RLS
    const sessionId = crypto.randomUUID();

    // 1. Insert session (using standard anon client, since our strict RLS allows any insert on sessions)
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        v_app_version: APP_VERSION,
        name: name || null,
        mode,
        status: mode === 'poker' ? 'lobby' : 'board'
      });
      // Notice we do NOT use .select() here because we can't read it without a scoped token yet

    if (sessionError) {
      throw sessionError;
    }

    // 2. Mint Custom JWT specifically for this new session
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

    // 3. Create a securely scoped Supabase client to insert the participant
    const scopedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: participant, error: participantError } = await scopedSupabase
      .from('participants')
      .insert({
        session_id: sessionId,
        name: hostName,
        is_host: true
      })
      .select()
      .single();

    if (participantError || !participant) {
      throw participantError;
    }

    // We no longer return the full session from the DB, we just mock it with what we inserted
    const sessionResponse = {
      id: sessionId,
      v_app_version: APP_VERSION,
      name: name || null,
      mode,
      status: mode === 'poker' ? 'lobby' : 'board'
    };

    return NextResponse.json({ session: sessionResponse, host: participant }, { status: 201 });
  } catch (err: any) {
    console.error('Session creation error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
