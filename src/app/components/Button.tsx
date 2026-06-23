'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonKind = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: ButtonKind;
  size?: ButtonSize;
  isExpressive?: boolean;
  isLoading?: boolean;
  renderIcon?: React.ComponentType<{ size?: number; className?: string }>;
  renderIconRight?: React.ComponentType<{ size?: number; className?: string }>;
  iconDescription?: string;
  hasIconOnly?: boolean;
}

const kindStyles: Record<ButtonKind, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border-none',
  secondary: 'bg-[#393939] text-white hover:bg-[#4c4c4c] active:bg-[#6f6f6f] border-none',
  tertiary: 'bg-transparent text-brand-600 hover:bg-brand-50 active:bg-brand-100 border border-brand-600',
  ghost: 'bg-transparent text-brand-600 hover:bg-surface-hover active:bg-surface-active border-none',
  danger: 'bg-[#da1e28] text-white hover:bg-[#b81922] active:bg-[#750e13] border-none',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
  xl: 'h-16 px-7 text-base',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 16,
  md: 16,
  lg: 20,
  xl: 20,
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      kind = 'primary',
      size = 'md',
      isExpressive = false,
      isLoading = false,
      renderIcon: IconLeft,
      renderIconRight: IconRight,
      iconDescription,
      hasIconOnly = false,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const iconSize = iconSizes[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={[
          'inline-flex items-center justify-center gap-2 font-sans font-normal leading-[1.28572] tracking-[0.16px] whitespace-nowrap transition-colors duration-100 select-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          kindStyles[kind],
          sizeStyles[size],
          isExpressive ? 'w-full' : '',
          hasIconOnly ? 'p-0' : '',
          isLoading ? 'relative text-transparent' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-disabled={disabled || isLoading}
        aria-label={hasIconOnly ? iconDescription : undefined}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2
              size={iconSize}
              className="absolute animate-spin"
              style={{ color: 'currentColor' }}
            />
            {children && (
              <span className="invisible">{children}</span>
            )}
          </>
        ) : (
          <>
            {IconLeft && <IconLeft size={iconSize} />}
            {children}
            {IconRight && <IconRight size={iconSize} />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

export const PrimaryButton = (props: Omit<ButtonProps, 'kind'>) => (
  <Button kind="primary" {...props} />
);
export const SecondaryButton = (props: Omit<ButtonProps, 'kind'>) => (
  <Button kind="secondary" {...props} />
);
export const TertiaryButton = (props: Omit<ButtonProps, 'kind'>) => (
  <Button kind="tertiary" {...props} />
);
export const GhostButton = (props: Omit<ButtonProps, 'kind'>) => (
  <Button kind="ghost" {...props} />
);
export const DangerButton = (props: Omit<ButtonProps, 'kind'>) => (
  <Button kind="danger" {...props} />
);
