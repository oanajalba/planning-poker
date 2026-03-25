import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    // Next.js 15 requires params to be awaited conceptually if dynamically accessing it
    const params = await context.params;
    const { id } = params;
    
    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch participants
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', id)
      .order('joined_at', { ascending: true });

    // Fetch stories (to determine current active story)
    const { data: stories } = await supabase
      .from('stories')
      .select('*')
      .eq('session_id', id)
      .order('order_index', { ascending: true });

    // Fetch votes explicitly for this session
    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', id);

    return NextResponse.json({ 
      session, 
      participants: participants || [], 
      stories: stories || [], 
      votes: votes || [] 
    }, { status: 200 });

  } catch (err: any) {
    console.error('Fetch session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const { mode } = await request.json();

    if (!mode || (mode !== 'poker' && mode !== 'board')) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .update({ mode })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(session, { status: 200 });
  } catch (err: any) {
    console.error('Update session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
