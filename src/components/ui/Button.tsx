import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  style,
  disabled,
  ...props 
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch(variant) {
      case 'secondary':
        return { backgroundColor: 'var(--secondary-color)', color: 'var(--text-color)' };
      case 'danger':
        return { backgroundColor: 'var(--danger-color)', color: '#fff' };
      case 'ghost':
        return { backgroundColor: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)' };
      case 'primary':
      default:
        return { backgroundColor: 'var(--primary-color)', color: '#fff' };
    }
  };

  const baseStyles: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 'bold',
    border: variant === 'ghost' ? '1px solid var(--border-color)' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    transition: 'opacity 0.2s',
    ...getVariantStyles(),
    ...style
  };

  return (
    <button style={baseStyles} disabled={disabled} {...props}>
      {children}
    </button>
  );
};
