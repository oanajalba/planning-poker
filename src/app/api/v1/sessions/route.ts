import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { APP_VERSION } from '@/lib/version';

export async function POST(request: Request) {
  try {
    const { name, mode, hostName } = await request.json();

    if (!hostName || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Insert session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        v_app_version: APP_VERSION,
        name: name || null,
        mode,
        status: mode === 'poker' ? 'lobby' : 'board'
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw sessionError;
    }

    // 2. Insert host participant
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        name: hostName,
        is_host: true
      })
      .select()
      .single();

    if (participantError || !participant) {
      throw participantError;
    }

    return NextResponse.json({ session, host: participant }, { status: 201 });
  } catch (err: any) {
    console.error('Session creation error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
