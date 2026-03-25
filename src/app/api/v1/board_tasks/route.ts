import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { sessionId, title, callerId, status = 'todo' } = await request.json();

    if (!sessionId || !title || !callerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify host
    const { data: host } = await supabase.from('participants').select('is_host').eq('id', callerId).eq('session_id', sessionId).single();
    if (!host?.is_host) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { data: task, error } = await supabase
      .from('board_tasks')
      .insert({ session_id: sessionId, title, status })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    console.error('Board task creation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { taskId, status, title, callerId } = await request.json();

    if (!taskId || !callerId || (!status && !title)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get task to find session_id
    const { data: existingTask } = await supabase.from('board_tasks').select('session_id').eq('id', taskId).single();
    if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Verify host
    const { data: host } = await supabase.from('participants').select('is_host').eq('id', callerId).eq('session_id', existingTask.session_id).single();
    if (!host?.is_host) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const updates: any = {};
    if (status) updates.status = status;
    if (title) updates.title = title;

    const { data: task, error } = await supabase
      .from('board_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(task, { status: 200 });
  } catch (err: any) {
    console.error('Board task update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const sessionId = searchParams.get('sessionId');
    const callerId = searchParams.get('callerId');

    if (!callerId || (!taskId && !sessionId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine target session
    let targetSessionId = sessionId;
    if (taskId) {
      const { data } = await supabase.from('board_tasks').select('session_id').eq('id', taskId).single();
      if (!data) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      targetSessionId = data.session_id;
    }

    // Verify host
    const { data: host } = await supabase.from('participants').select('is_host').eq('id', callerId).eq('session_id', targetSessionId).single();
    if (!host?.is_host) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    let query = supabase.from('board_tasks').delete();
    if (taskId) query = query.eq('id', taskId);
    else query = query.eq('session_id', targetSessionId);

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Board task deletion error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
