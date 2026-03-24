import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    
    const { action, callerId, payload } = await request.json();

    if (!action || !callerId) {
      return NextResponse.json({ error: 'Missing action or caller identity' }, { status: 400 });
    }

    // Verify caller is the host
    const { data: participant } = await supabase
      .from('participants')
      .select('is_host')
      .eq('id', callerId)
      .eq('session_id', id)
      .single();

    if (!participant?.is_host) {
      return NextResponse.json({ error: 'Unauthorized: Only host can transition states' }, { status: 403 });
    }

    switch (action) {
      case 'start_voting': {
        const title = payload?.title || 'Untitled Story';
        // Create new story and set session to voting
        const { data: story, error: storyError } = await supabase
          .from('stories')
          .insert({ session_id: id, title, status: 'active' })
          .select()
          .single();
        if (storyError) throw storyError;
        
        await supabase.from('sessions').update({ status: 'voting' }).eq('id', id);
        return NextResponse.json({ success: true, story }, { status: 200 });
      }

      case 'reveal': {
        await supabase.from('sessions').update({ status: 'revealed' }).eq('id', id);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      case 'revote': {
        const activeStory = await getActiveStory(id);
        if (!activeStory) return NextResponse.json({ error: 'No active story' }, { status: 400 });
        
        // Delete all votes for this story and return to voting state (same story, same title)
        await supabase.from('votes').delete().eq('story_id', activeStory.id);
        await supabase.from('sessions').update({ status: 'voting' }).eq('id', id);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      case 'next': {
        // Replaces accept_estimate + next_story. Saves history and returns to lobby.
        const { average_vote, suggested_estimate, final_estimate, revealed_votes } = payload || {};

        if (!final_estimate) {
          return NextResponse.json({ error: 'final_estimate is required' }, { status: 400 });
        }

        const activeStory = await getActiveStory(id);
        if (!activeStory) return NextResponse.json({ error: 'No active story' }, { status: 400 });

        await supabase.from('stories').update({
          status: 'completed',
          final_estimate,
          average_vote: average_vote ?? null,
          suggested_estimate: suggested_estimate ?? null,
          revealed_votes: revealed_votes ?? null,
        }).eq('id', activeStory.id);

        await supabase.from('sessions').update({ status: 'lobby' }).eq('id', id);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Session action error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getActiveStory(sessionId: string) {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}
