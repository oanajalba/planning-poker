'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ModeSelector } from '@/components/ui/ModeSelector';
import { saveLocalSession } from '@/lib/storage';

export default function CreateSession() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [hostName, setHostName] = useState('');
  const [mode, setMode] = useState<'poker'|'board'>('poker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mode, hostName })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      
      saveLocalSession(data.session.id, {
        participantId: data.host.id,
        isHost: true,
        name: data.host.name
      });

      router.push(`/session/${data.session.id}`);
    } catch (err: any) {
      setError('Failed to create session. Check connection/database setup.');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
      <h1>Create Session</h1>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Input 
          label="Your Display Name (Required)" 
          value={hostName} 
          onChange={e => setHostName(e.target.value)} 
          placeholder="e.g. Scrum Master Jane"
          fullWidth
          required
        />
        <Input 
          label="Session Name (Optional)" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="e.g. Sprint 42 Planning"
          fullWidth
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Session Mode</label>
          <ModeSelector value={mode} onChange={setMode} />
        </div>
        
        {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</div>}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Creating...' : 'Start now'}
        </Button>
      </form>
    </div>
  );
}
