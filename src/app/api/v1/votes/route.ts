import { NextResponse } from 'next/server';
import { getScopedServerClient } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const { sessionId, storyId, participantId, value } = await request.json();

    if (!sessionId || !storyId || !participantId || !value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await getScopedServerClient(sessionId);

    // Insert vote. Overwrite if duplicate (upserting basically) due to unique constraint
    // Because Supabase handles constraints, we can use an upsert to gracefully handle network loops
    const { data: vote, error } = await supabase
      .from('votes')
      .upsert({
        session_id: sessionId,
        story_id: storyId,
        participant_id: participantId,
        value
      }, { onConflict: 'story_id,participant_id' })
      .select()
      .single();

    if (error) {
      // Catch duplicate constraint or constraint failures.
      return NextResponse.json({ error: 'Database constraint failed' }, { status: 400 });
    }

    return NextResponse.json(vote, { status: 201 });
  } catch (err: any) {
    console.error('Vote submission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
