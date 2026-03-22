import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { sessionId, name } = await request.json();

    if (!sessionId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: participant, error } = await supabase
      .from('participants')
      .insert({ session_id: sessionId, name, is_host: false })
      .select()
      .single();

    if (error || !participant) {
      throw error;
    }

    return NextResponse.json(participant, { status: 201 });
  } catch (err: any) {
    console.error('Participant join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
