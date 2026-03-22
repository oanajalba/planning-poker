import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, selected, interactive, style, ...props }) => {
  const baseStyles: React.CSSProperties = {
    padding: '1.5rem',
    borderRadius: '12px',
    backgroundColor: selected ? 'var(--primary-color)' : 'var(--bg-color)',
    color: selected ? '#fff' : 'var(--text-color)',
    border: `2px solid ${selected ? 'var(--primary-color)' : 'var(--border-color)'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: interactive ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    boxShadow: interactive && !selected ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
    ...style
  };

  return (
    <div style={baseStyles} {...props}>
      {children}
    </div>
  );
};
