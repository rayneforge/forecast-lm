import React from 'react';
import './button.scss';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Visual variant */
    variant?: 'primary' | 'ghost';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Content */
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    children,
    className,
    ...rest
}) => {
    return (
        <button
            className={`rf-button rf-button--${variant} rf-button--${size}${className ? ` ${className}` : ''}`}
            {...rest}
        >
            {children}
        </button>
    );
};
