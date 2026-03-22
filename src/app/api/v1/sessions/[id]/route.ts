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
