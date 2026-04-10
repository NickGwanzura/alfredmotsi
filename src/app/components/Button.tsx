/**
 * Carbon Design System Button Component
 * 
 * A fully accessible, Carbon-compliant button component with:
 * - All Carbon button kinds (primary, secondary, tertiary, ghost, danger)
 * - Proper sizes (sm, md, lg, xl)
 * - Icon support with correct positioning
 * - Loading state
 * - Full keyboard accessibility
 * - Focus management
 */

'use client';

import React, { forwardRef, useState } from 'react';

export type ButtonKind = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button */
  kind?: ButtonKind;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button takes full width */
  isExpressive?: boolean;
  /** Whether the button is in loading state */
  isLoading?: boolean;
  /** Icon component to render (left side) */
  renderIcon?: React.ComponentType<{ size?: number; className?: string }>;
  /** Icon component to render on the right side (after text) */
  renderIconRight?: React.ComponentType<{ size?: number; className?: string }>;
  /** Accessible label for icon-only buttons */
  iconDescription?: string;
  /** Whether button has tooltip */
  hasIconOnly?: boolean;
}

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
      className,
      onClick,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = useState(false);

    // Size configurations following Carbon specs
    const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
      sm: { height: 32, padding: '0 12px', fontSize: 12 },
      md: { height: 40, padding: '0 16px', fontSize: 14 },
      lg: { height: 48, padding: '0 20px', fontSize: 14 },
      xl: { height: 64, padding: '0 28px', fontSize: 16 },
    };

    // Kind configurations following Carbon color tokens
    const kindStyles: Record<ButtonKind, React.CSSProperties> = {
      primary: {
        backgroundColor: '#0f62fe',
        color: '#ffffff',
        border: 'none',
      },
      secondary: {
        backgroundColor: '#393939',
        color: '#ffffff',
        border: 'none',
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: '#0f62fe',
        border: '1px solid #0f62fe',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#0f62fe',
        border: 'none',
      },
      danger: {
        backgroundColor: '#da1e28',
        color: '#ffffff',
        border: 'none',
      },
    };

    // Hover states
    const getHoverStyles = (): React.CSSProperties => {
      if (disabled || isLoading) return {};
      
      const hoverColors: Record<ButtonKind, string> = {
        primary: '#0353e9',
        secondary: '#4c4c4c',
        tertiary: 'transparent',
        ghost: '#e5e5e5',
        danger: '#b81922',
      };

      const hoverTextColors: Record<ButtonKind, string> = {
        primary: '#ffffff',
        secondary: '#ffffff',
        tertiary: '#0353e9',
        ghost: '#0353e9',
        danger: '#ffffff',
      };

      return {
        backgroundColor: hoverColors[kind],
        color: hoverTextColors[kind],
      };
    };

    // Active states
    const getActiveStyles = (): React.CSSProperties => {
      if (disabled || isLoading) return {};
      
      const activeColors: Record<ButtonKind, string> = {
        primary: '#002d9c',
        secondary: '#6f6f6f',
        tertiary: 'rgba(15, 98, 254, 0.1)',
        ghost: '#c6c6c6',
        danger: '#750e13',
      };

      return {
        backgroundColor: activeColors[kind],
      };
    };

    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
      fontWeight: 400,
      lineHeight: 1.28572,
      letterSpacing: '0.16px',
      textDecoration: 'none',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      borderRadius: 0,
      transition: 'background-color 0.11s cubic-bezier(0, 0, 0.38, 0.9), color 0.11s',
      outline: 'none',
      position: 'relative',
      ...sizeStyles[size],
      ...kindStyles[kind],
      width: isExpressive ? '100%' : 'auto',
      opacity: disabled || isLoading ? 0.5 : 1,
    };

    // Icon sizes based on button size
    const iconSizes: Record<ButtonSize, number> = {
      sm: 16,
      md: 16,
      lg: 20,
      xl: 20,
    };

    const iconSize = iconSizes[size];

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        Object.assign(e.currentTarget.style, getHoverStyles());
      }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        Object.assign(e.currentTarget.style, kindStyles[kind]);
      }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        setIsPressed(true);
        Object.assign(e.currentTarget.style, getActiveStyles());
      }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        setIsPressed(false);
        Object.assign(e.currentTarget.style, getHoverStyles());
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
      e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #ffffff, inset 0 0 0 4px #0f62fe';
    };

    const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
      e.currentTarget.style.boxShadow = 'none';
    };

    // Loading spinner component
    const LoadingSpinner = () => (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        style={{
          animation: 'spin 1s linear infinite',
        }}
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray="283"
          strokeDashoffset="75"
          style={{
            transformOrigin: 'center',
          }}
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        type={type}
        className={className}
        disabled={disabled || isLoading}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={baseStyles}
        aria-disabled={disabled || isLoading}
        aria-label={hasIconOnly ? iconDescription : undefined}
        aria-pressed={isPressed}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            {children}
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

// Utility exports for quick access
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
