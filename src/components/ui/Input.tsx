import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
  label?: string;
}

export const Input: React.FC<InputProps> = ({ fullWidth = false, label, style, ...props }) => {
  const baseStyles: React.CSSProperties = {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    width: fullWidth ? '100%' : 'auto',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    ...style
  };

  if (label) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: fullWidth ? '100%' : 'auto' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{label}</label>
        <input style={baseStyles} {...props} />
      </div>
    );
  }

  return <input style={baseStyles} {...props} />;
};
