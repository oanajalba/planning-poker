'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  
  useEffect(() => {
    const codeParam = searchParams?.get('code');
    if (codeParam) setCode(codeParam);
  }, [searchParams]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/session/${code.trim()}`);
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
      <h1>Join Session</h1>
      <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Input 
          label="Session Code" 
          value={code} 
          onChange={e => setCode(e.target.value)} 
          placeholder="Paste code or UUID here"
          fullWidth
          required
        />
        <Button type="submit" fullWidth disabled={!code.trim()}>
          Join
        </Button>
      </form>
    </div>
  );
}

export default function JoinSession() {
  return (
    <Suspense fallback={<div className="container" style={{ marginTop: '2rem' }}>Loading...</div>}>
      <JoinForm />
    </Suspense>
  );
}
