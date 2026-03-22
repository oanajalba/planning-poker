import React from 'react';

export interface ModeSelectorProps {
  value: 'poker' | 'board';
  onChange: (value: 'poker' | 'board') => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange }) => {
  return (
    <div style={{
      display: 'flex',
      backgroundColor: 'var(--secondary-color)',
      borderRadius: '8px',
      padding: '0.25rem',
      gap: '0.25rem'
    }}>
      <button
        type="button"
        onClick={() => onChange('poker')}
        style={{
          flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none',
          backgroundColor: value === 'poker' ? 'var(--bg-color)' : 'transparent',
          color: 'var(--text-color)',
          fontWeight: value === 'poker' ? 'bold' : 'normal',
          boxShadow: value === 'poker' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          cursor: 'pointer', transition: 'all 0.2s', opacity: value === 'poker' ? 1 : 0.7
        }}
      >
        Planning Poker
      </button>
      <button
        type="button"
        onClick={() => onChange('board')}
        style={{
          flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none',
          backgroundColor: value === 'board' ? 'var(--bg-color)' : 'transparent',
          color: 'var(--text-color)',
          fontWeight: value === 'board' ? 'bold' : 'normal',
          boxShadow: value === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          cursor: 'pointer', transition: 'all 0.2s', opacity: value === 'board' ? 1 : 0.7
        }}
      >
        Simple Board
      </button>
    </div>
  );
};
