import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {cn} from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover shadow-sm',
  secondary: 'bg-surface text-fg border border-border hover:bg-surface-hover',
  ghost: 'bg-transparent text-fg hover:bg-surface-hover',
  dark: 'bg-fg text-fg-inverse hover:opacity-90',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  active?: boolean;
}

export function Button({variant = 'secondary', size = 'md', icon, active, className, children, ...rest}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center rounded-lg font-medium transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-brand',
        VARIANTS[variant],
        SIZES[size],
        active && 'bg-brand-soft text-brand border-brand',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
