'use client';

import React, { useEffect, useState, use } from 'react';
import { getSessionClient } from '@/lib/supabase';
import { getLocalSession, saveLocalSession, LocalSessionData } from '@/lib/storage';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModeSelector } from '@/components/ui/ModeSelector';
import { BoardStateMachine } from '@/components/board/BoardStateMachine';

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [completedStories, setCompletedStories] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [boardTasks, setBoardTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  
  const [localIdentity, setLocalIdentity] = useState<LocalSessionData | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinName, setJoinName] = useState('');
  
  useEffect(() => {
    let channel: any = null;
    let currentClient: any = null;

    const initializeSession = async () => {
      // 1. Fetch/Cache our heavily isolated Session-scoped client (incorporating the Token for REST)
      const client = await getSessionClient(sessionId);
      if (!client) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      currentClient = client;

      // 2. We now have RLS permission implicitly baked into the client, setup UI
      const identity = getLocalSession(sessionId);
      if (identity) {
        setLocalIdentity(identity);
      } else {
        setShowJoinModal(true);
      }

      await fetchInitialState();

      // 3. Mount Realtime securely using the isolated client
      channel = client.channel(`session:${sessionId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (payload) => {
          setSession(payload.new);
          if ((payload.new as any)?.status === 'voting') {
            fetchVotes();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, () => {
          fetchParticipants();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stories', filter: `session_id=eq.${sessionId}` }, () => {
          fetchStories();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `session_id=eq.${sessionId}` }, () => {
          fetchVotes();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'board_tasks', filter: `session_id=eq.${sessionId}` }, () => {
          fetchBoardTasks();
        })
        .subscribe();
    };

    initializeSession();

    return () => {
      if (currentClient && channel) {
        currentClient.removeChannel(channel);
      }
    };
  }, [sessionId]);

  const fetchInitialState = async () => {
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSession(data.session);
      setParticipants(data.participants);
      const active = data.stories?.find((s: any) => s.status === 'active') ?? null;
      const completed = data.stories?.filter((s: any) => s.status === 'completed')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) ?? [];
      setActiveStory(active);
      setCompletedStories(completed);
      setVotes(data.votes);
      fetchBoardTasks();
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    const client = await getSessionClient(sessionId);
    if (!client) return;
    const { data } = await client.from('participants').select('*').eq('session_id', sessionId).order('joined_at');
    if (data) setParticipants(data);
  };

  const fetchStories = async () => {
    const client = await getSessionClient(sessionId);
    if (!client) return;
    const { data } = await client.from('stories').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
    if (data) {
      const active = data.find((s: any) => s.status === 'active') ?? null;
      const completed = data.filter((s: any) => s.status === 'completed')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setActiveStory(active);
      setCompletedStories(completed);
    }
  };

  const fetchVotes = async () => {
    const client = await getSessionClient(sessionId);
    if (!client) return;
    const { data } = await client.from('votes').select('*').eq('session_id', sessionId);
    if (data) setVotes(data);
  };

  const fetchBoardTasks = async () => {
    const client = await getSessionClient(sessionId);
    if (!client) return;
    const { data } = await client.from('board_tasks').select('*').eq('session_id', sessionId).order('created_at');
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

  const handleModeChange = async (mode: 'poker' | 'board') => {
    if (!localIdentity?.isHost) return;
    try {
      await fetch(`/api/v1/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
    } catch(err) {
      console.error('Failed to change mode', err);
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', opacity: 0.9, margin: 0 }}>{session.name || 'Untitled Session'}</h1>
        
        {localIdentity?.isHost ? (
          <div style={{ width: '220px' }}>
            <ModeSelector value={session.mode} onChange={handleModeChange} />
          </div>
        ) : (
          <span style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase' }}>
            {session.mode} • {session.status}
          </span>
        )}
      </div>

      {localIdentity && session.mode === 'poker' && (
        <PokerStateMachine 
          session={session} 
          participants={participants} 
          activeStory={activeStory}
          completedStories={completedStories}
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const POKER_VALUES = ['1', '2', '3', '5', '8', '13', '21'];
const FIBONACCI = [...POKER_VALUES, '?'];

/** Compute numeric average of votes (ignoring non-numeric values like '?') */
function computeAverage(voteValues: string[]): number | null {
  const numeric = voteValues.map(Number).filter((n, i) => !isNaN(n) && voteValues[i] !== '?');
  if (numeric.length === 0) return null;
  return numeric.reduce((a, b) => a + b, 0) / numeric.length;
}

/** Find the nearest valid planning poker value to a given number */
function nearestPokerValue(avg: number): string {
  const numericValues = POKER_VALUES.map(Number);
  let closest = numericValues[0];
  let minDiff = Math.abs(avg - closest);
  for (const v of numericValues) {
    const diff = Math.abs(avg - v);
    if (diff < minDiff) { minDiff = diff; closest = v; }
  }
  return String(closest);
}

/** Build revealed_votes snapshot: array of { name, value } */
function buildRevealedVotes(participants: any[], votes: any[], storyId: string) {
  return participants.map(p => {
    const v = votes.find((v: any) => v.participant_id === p.id && v.story_id === storyId);
    return { name: p.name, value: v ? v.value : null };
  });
}

// ─── Main Poker State Machine ────────────────────────────────────────────────

function PokerStateMachine({ session, participants, activeStory, completedStories, votes, identity, onAction, onVote }: any) {
  const isHost = identity.isHost;
  const myVote = activeStory ? votes.find((v: any) => v.participant_id === identity.participantId && v.story_id === activeStory.id) : null;

  // Inline story title state — replaces window.prompt
  const [showStoryInput, setShowStoryInput] = React.useState(false);
  const [storyTitle, setStoryTitle] = React.useState('');

  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = React.useState(false);

  const handleStartVoting = () => {
    const title = storyTitle.trim() || 'Untitled Story';
    onAction('start_voting', { title });
    setShowStoryInput(false);
    setStoryTitle('');
  };

  const handleClearHistory = () => {
    onAction('clear_history');
    setShowClearHistoryConfirm(false);
  };

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (session.status === 'lobby') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Session code */}
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
        
        {/* Participants */}
        <div>
          <h3 style={{ fontSize: '1.1rem', opacity: 0.8 }}>Participants ({participants.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {participants.map((p: any) => (
              <li key={p.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: p.id === identity.participantId ? 'bold' : 'normal' }}>
                  {p.name} {p.id === identity.participantId && '(You)'}
                </span>
                {p.is_host && <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--primary-color)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>Host</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Start voting — inline story input, no window.prompt */}
        {isHost && !showStoryInput && (
          <Button id="start-voting-btn" onClick={() => setShowStoryInput(true)} fullWidth>
            Start Voting
          </Button>
        )}

        {isHost && showStoryInput && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Input
              id="story-title-input"
              label="Story title"
              value={storyTitle}
              onChange={e => setStoryTitle(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleStartVoting(); }}
              fullWidth
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="ghost" onClick={() => { setShowStoryInput(false); setStoryTitle(''); }} fullWidth>Cancel</Button>
              <Button id="confirm-start-voting-btn" onClick={handleStartVoting} fullWidth>Start Voting</Button>
            </div>
          </div>
        )}

        {/* History */}
        {completedStories.length > 0 && (
          <>
            <CompletedStoriesHistory 
              stories={completedStories} 
              participants={participants} 
              isHost={isHost}
              onClear={() => setShowClearHistoryConfirm(true)}
            />
            
            <Modal isOpen={showClearHistoryConfirm} onClose={() => setShowClearHistoryConfirm(false)} title="Clear History?">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <p>Delete all completed stories? This cannot be undone.</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button variant="ghost" onClick={() => setShowClearHistoryConfirm(false)} fullWidth>Cancel</Button>
                  <Button onClick={handleClearHistory} style={{ backgroundColor: '#ff4444' }} fullWidth>Clear History</Button>
                </div>
              </div>
            </Modal>
          </>
        )}
      </div>
    );
  }


  // ── Voting ─────────────────────────────────────────────────────────────────
  if (session.status === 'voting') {
    const hasVoted = !!myVote;
    const storyVotes = votes.filter((v: any) => v.story_id === activeStory?.id);
    const votesCount = storyVotes.length;
    const allVoted = votesCount === participants.length;

    // Waiting view (already voted, waiting for others)
    if (hasVoted && !allVoted) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{activeStory?.title}</h2>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--primary-color)', lineHeight: 1 }}>
              {votesCount} / {participants.length}
            </div>
            <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>votes cast</p>
          </div>

          <VoteStatusList participants={participants} votes={storyVotes} />

          {isHost && (
            <Button variant="ghost" onClick={() => onAction('reveal')} style={{ marginTop: '1rem' }}>
              Force Reveal Votes
            </Button>
          )}
        </div>
      );
    }

    // Voting view
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{activeStory?.title || 'Voting...'}</h2>
          <div style={{ fontSize: '1rem', opacity: 0.7 }}>
            {votesCount} / {participants.length} votes cast
          </div>
        </div>

        <VoteStatusList participants={participants} votes={storyVotes} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          {FIBONACCI.map(val => (
            <Card 
              key={val} 
              interactive 
              onClick={() => !hasVoted && onVote(val)}
              style={{ 
                opacity: hasVoted ? 0.4 : 1, 
                padding: '1.25rem 0.5rem', 
                fontSize: '1.5rem', 
                textAlign: 'center',
                cursor: hasVoted ? 'not-allowed' : 'pointer',
                outline: myVote?.value === val ? '2px solid var(--primary-color)' : 'none',
              }}
            >
              {val}
            </Card>
          ))}
        </div>

        {isHost && (
          <Button 
            onClick={() => onAction('reveal')} 
            fullWidth 
            variant={allVoted ? 'primary' : 'ghost'}
          >
            {allVoted ? 'Reveal Votes' : 'Force Reveal Votes'}
          </Button>
        )}
      </div>
    );
  }

  // ── Revealed ───────────────────────────────────────────────────────────────
  if (session.status === 'revealed') {
    return (
      <RevealedView
        activeStory={activeStory}
        participants={participants}
        votes={votes}
        identity={identity}
        isHost={isHost}
        onAction={onAction}
      />
    );
  }

  return <div style={{ opacity: 0.5 }}>Unhandled session state: {session.status}</div>;
}

// ─── Vote Status List (no values shown) ──────────────────────────────────────

function VoteStatusList({ participants, votes }: { participants: any[]; votes: any[] }) {
  const votedIds = new Set(votes.map((v: any) => v.participant_id));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {participants.map((p: any) => {
        const voted = votedIds.has(p.id);
        return (
          <div key={p.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
          }}>
            <span style={{ fontSize: '0.95rem' }}>{p.name}</span>
            <span style={{ fontSize: '0.85rem', color: voted ? 'var(--primary-color)' : 'var(--text-color)', opacity: voted ? 1 : 0.45 }}>
              {voted ? '✅ Voted' : '⏳ Waiting'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Revealed View ────────────────────────────────────────────────────────────

function RevealedView({ activeStory, participants, votes, identity, isHost, onAction }: any) {
  const storyVotes = votes.filter((v: any) => v.story_id === activeStory?.id);
  const voteValues = storyVotes.map((v: any) => v.value);

  const avg = computeAverage(voteValues);
  const suggested = avg !== null ? nearestPokerValue(avg) : null;

  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustValue, setAdjustValue] = useState<string | null>(null);

  const handleNext = (overrideFinalEstimate?: string) => {
    const revealedVotes = buildRevealedVotes(participants, votes, activeStory?.id);
    onAction('next', {
      average_vote: avg,
      suggested_estimate: suggested,
      final_estimate: overrideFinalEstimate ?? suggested ?? '?',
      revealed_votes: revealedVotes,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ textAlign: 'center', fontSize: '1.4rem', margin: 0 }}>{activeStory?.title}</h2>

      {/* Vote cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
        {participants.map((p: any) => {
          const v = storyVotes.find((v: any) => v.participant_id === p.id);
          return (
            <div key={p.id} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <Card style={{ padding: '1.5rem 0.5rem', fontSize: '2rem', backgroundColor: 'var(--secondary-color)', border: 'none', textAlign: 'center' }}>
                {v ? v.value : '—'}
              </Card>
              <span style={{ fontSize: '0.85rem', fontWeight: p.id === identity.participantId ? 'bold' : 'normal', opacity: 0.8 }}>{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* Analytics strip */}
      {avg !== null && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          padding: '0.9rem 1.2rem',
          backgroundColor: 'var(--secondary-color)',
          borderRadius: '10px',
          fontSize: '1rem',
        }}>
          <span>Avg: <strong>{avg.toFixed(1)}</strong></span>
          <span>Suggested: <strong style={{ color: 'var(--primary-color)' }}>{suggested}</strong></span>
        </div>
      )}

      {/* Adjust inline picker */}
      {isHost && adjustMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7, textAlign: 'center' }}>Tap to select final estimate</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
            {POKER_VALUES.map(val => (
              <button
                key={val}
                onClick={() => setAdjustValue(val)}
                style={{
                  padding: '1rem 0.5rem',
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: adjustValue === val
                    ? '2px solid var(--primary-color)'
                    : '1px solid var(--border-color)',
                  backgroundColor: adjustValue === val ? 'var(--primary-color)' : 'var(--secondary-color)',
                  color: adjustValue === val ? '#fff' : 'var(--text-color)',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                {val}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="ghost" onClick={() => { setAdjustMode(false); setAdjustValue(null); }} fullWidth>Cancel</Button>
            <Button
              onClick={() => { if (adjustValue) handleNext(adjustValue); }}
              disabled={!adjustValue}
              fullWidth
            >
              Confirm {adjustValue ? `→ ${adjustValue}` : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Host actions */}
      {isHost && !adjustMode && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="ghost" onClick={() => onAction('revote')} fullWidth>Revote</Button>
          <Button variant="ghost" onClick={() => setAdjustMode(true)} fullWidth>Adjust</Button>
          <Button onClick={() => handleNext()} fullWidth>Next</Button>
        </div>
      )}
    </div>
  );
}

// ─── Completed Stories History ─────────────────────────────────────────────

function CompletedStoriesHistory({ stories, participants, isHost, onClear }: { stories: any[]; participants: any[]; isHost?: boolean; onClear?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', opacity: 0.7, margin: 0 }}>Completed Stories</h3>
        {isHost && (
          <button 
            onClick={onClear} 
            style={{ background: 'none', border: 'none', color: 'var(--error-color, #ff4444)', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.6 }}
          >
            Clear History
          </button>
        )}
      </div>
      {stories.map((story: any) => {
        const revealedVotes: Array<{ name: string; value: string | null }> = story.revealed_votes || [];
        const ts = story.created_at
          ? new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        return (
          <div key={story.id} style={{
            padding: '0.9rem 1rem',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            {/* Title + accepted estimate + time */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{story.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <span style={{
                  backgroundColor: 'var(--primary-color)',
                  color: '#fff',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}>
                  {story.final_estimate}
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{ts}</span>
              </div>
            </div>

            {/* Avg + suggested */}
            {(story.average_vote != null || story.suggested_estimate) && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', opacity: 0.75 }}>
                {story.average_vote != null && <span>Avg: {Number(story.average_vote).toFixed(1)}</span>}
                {story.suggested_estimate && <span>Suggested: {story.suggested_estimate}</span>}
              </div>
            )}

            {/* Vote chips */}
            {revealedVotes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.1rem' }}>
                {revealedVotes.map((rv, i) => (
                  <span key={i} style={{
                    fontSize: '0.78rem',
                    padding: '0.15rem 0.45rem',
                    backgroundColor: 'var(--secondary-color)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}>
                    {rv.name}: {rv.value ?? '—'}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
