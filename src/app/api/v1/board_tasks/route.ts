import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { sessionId, title, status = 'todo' } = await request.json();

    if (!sessionId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
    const { taskId, status } = await request.json();

    if (!taskId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from('board_tasks')
      .update({ status })
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
