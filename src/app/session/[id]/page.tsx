'use client';

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { getLocalSession, saveLocalSession, LocalSessionData } from '@/lib/storage';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BoardStateMachine } from '@/components/board/BoardStateMachine';

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [boardTasks, setBoardTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [localIdentity, setLocalIdentity] = useState<LocalSessionData | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinName, setJoinName] = useState('');
  
  useEffect(() => {
    const identity = getLocalSession(sessionId);
    if (identity) {
      setLocalIdentity(identity);
    } else {
      setShowJoinModal(true);
    }

    fetchInitialState();

    const channel = supabase.channel(`session:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        setSession(payload.new);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, () => {
        fetchParticipants();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories', filter: `session_id=eq.${sessionId}` }, () => {
        fetchActiveStory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `session_id=eq.${sessionId}` }, () => {
        fetchVotes();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_tasks', filter: `session_id=eq.${sessionId}` }, () => {
        fetchBoardTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchInitialState = async () => {
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSession(data.session);
      setParticipants(data.participants);
      setActiveStory(data.stories.find((s:any) => s.status === 'active') || null);
      setVotes(data.votes);
      fetchBoardTasks(); // Hydrate board tasks dynamically
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    const { data } = await supabase.from('participants').select('*').eq('session_id', sessionId).order('joined_at');
    if (data) setParticipants(data);
  };

  const fetchActiveStory = async () => {
    const { data } = await supabase.from('stories').select('*').eq('session_id', sessionId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
    if (data) setActiveStory(data || null);
  };

  const fetchVotes = async () => {
    const { data } = await supabase.from('votes').select('*').eq('session_id', sessionId);
    if (data) setVotes(data);
  };

  const fetchBoardTasks = async () => {
    const { data } = await supabase.from('board_tasks').select('*').eq('session_id', sessionId).order('created_at');
    if (data) setBoardTasks(data);
  };

  const handleJoin = async () => {
    if (!joinName.trim()) return;
    try {
      const res = await fetch('/api/v1/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, name: joinName })
      });
      if (res.ok) {
        const p = await res.json();
        const identity = { participantId: p.id, isHost: false, name: p.name };
        saveLocalSession(sessionId, identity);
        setLocalIdentity(identity);
        setShowJoinModal(false);
      }
    } catch(err) {
      console.error('Failed to join', err);
    }
  };

  const handleAction = async (action: string, payload?: any) => {
    try {
      await fetch(`/api/v1/sessions/${sessionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, callerId: localIdentity?.participantId, payload })
      });
    } catch(err) { 
      console.error('Action failed', err); 
    }
  };

  const handleVote = async (value: string) => {
    if (!activeStory || !localIdentity) return;
    try {
      await fetch('/api/v1/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, storyId: activeStory.id, participantId: localIdentity.participantId, value })
      });
    } catch(err) { 
      console.error('Vote failed', err); 
    }
  };

  if (loading) return <div className="container" style={{ marginTop: '2rem' }}>Loading session...</div>;
  if (!session) return <div className="container" style={{ marginTop: '2rem' }}>Session not found.</div>;

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem', flex: 1 }}>
      <Modal isOpen={showJoinModal} onClose={() => {}} title="Join Session">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Your Display Name" value={joinName} onChange={e => setJoinName(e.target.value)} fullWidth />
          <Button onClick={handleJoin} disabled={!joinName.trim()} fullWidth>Join</Button>
        </div>
      </Modal>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', opacity: 0.9, margin: 0 }}>{session.name || 'Untitled Session'}</h1>
        <span style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase' }}>{session.mode} • {session.status}</span>
      </div>

      {localIdentity && session.mode === 'poker' && (
        <PokerStateMachine 
          session={session} 
          participants={participants} 
          activeStory={activeStory} 
          votes={votes} 
          identity={localIdentity} 
          onAction={handleAction}
          onVote={handleVote}
        />
      )}

      {localIdentity && session.mode === 'board' && (
        <BoardStateMachine
          session={session}
          participants={participants}
          boardTasks={boardTasks}
          identity={localIdentity}
        />
      )}
    </div>
  );
}

// Keep PokerStateMachine as previously written
function PokerStateMachine({ session, participants, activeStory, votes, identity, onAction, onVote }: any) {
  const isHost = identity.isHost;
  const myVote = activeStory ? votes.find((v:any) => v.participant_id === identity.participantId && v.story_id === activeStory.id) : null;

  if (session.status === 'lobby') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--secondary-color)', padding: '1rem', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Session Link / Code</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.id}
            </h2>
            <Button variant="ghost" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?code=${session.id}`)} style={{ padding: '0.5rem' }}>
              Copy Link
            </Button>
          </div>
        </div>
        
        <div>
          <h3 style={{ fontSize: '1.1rem', opacity: 0.8 }}>Participants ({participants.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {participants.map((p:any) => (
              <li key={p.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: p.id === identity.participantId ? 'bold' : 'normal' }}>
                  {p.name} {p.id === identity.participantId && '(You)'}
                </span>
                {p.is_host && <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--primary-color)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>Host</span>}
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <Button onClick={() => {
            const title = prompt('Enter story title:', 'New Task');
            if(title) onAction('start_voting', { title });
          }} fullWidth>
            Start Voting
          </Button>
        )}
      </div>
    );
  }

  if (session.status === 'voting') {
    const FIBONACCI = ['1','2','3','5','8','13','21','?'];
    const hasVoted = !!myVote;
    const votesCount = votes.filter((v:any) => v.story_id === activeStory?.id).length;
    const allVoted = votesCount === participants.length;

    if (hasVoted && !allVoted) {
      return (
        <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <h2>Waiting for others</h2>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {votesCount} / {participants.length}
          </div>
          <p>votes cast</p>
          {isHost && (
            <Button variant="ghost" onClick={() => onAction('reveal')} style={{ marginTop: '2rem' }}>
              Force Reveal Votes
            </Button>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{activeStory?.title || 'Voting...'}</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {FIBONACCI.map(val => (
            <Card 
              key={val} 
              interactive 
              onClick={() => !hasVoted && onVote(val)}
              style={{ opacity: hasVoted ? 0.5 : 1, padding: '1rem', fontSize: '1.5rem' }}
            >
              {val}
            </Card>
          ))}
        </div>

        {isHost && allVoted && (
          <Button onClick={() => onAction('reveal')} fullWidth>
            Reveal Votes
          </Button>
        )}
      </div>
    );
  }

  if (session.status === 'revealed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h2 style={{ textAlign: 'center' }}>{activeStory?.title}</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
          {participants.map((p:any) => {
            const v = votes.find((v:any) => v.participant_id === p.id && v.story_id === activeStory?.id);
            return (
              <div key={p.id} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Card style={{ padding: '1.5rem', fontSize: '2rem', backgroundColor: 'var(--secondary-color)', color: 'var(--text-color)', border: 'none' }}>
                  {v ? v.value : '—'}
                </Card>
                <span style={{ fontSize: '0.9rem', fontWeight: p.id === identity.participantId ? 'bold' : 'normal' }}>{p.name}</span>
              </div>
            );
          })}
        </div>

        {isHost && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button variant="ghost" onClick={() => onAction('revote')} fullWidth>Revote</Button>
            <Button onClick={() => {
              const est = prompt('Enter final estimate for this story:');
              if (est) onAction('accept_estimate', { estimate: est });
            }} fullWidth>Accept Estimate</Button>
          </div>
        )}
      </div>
    );
  }

  if (session.status === 'finalized') {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h2>Estimate Accepted</h2>
        <Card style={{ padding: '3rem', fontSize: '5rem', margin: '0 auto', maxWidth: '250px', backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none' }}>
          {activeStory?.final_estimate}
        </Card>
        
        {isHost && (
          <Button onClick={() => onAction('next_story')} fullWidth style={{ marginTop: '2rem' }}>
            Next Story
          </Button>
        )}
      </div>
    );
  }

  return <div>Unhandled mapping for session state</div>;
}
