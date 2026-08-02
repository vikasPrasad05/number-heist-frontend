'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface NeonButtonProps {
    children: ReactNode;
    onClick?: () => void;
    color?: 'blue' | 'green' | 'red' | 'purple';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit';
}

const colorMap = {
    blue: {
        bg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(129, 140, 248, 0.2) 100%)',
        border: 'rgba(56, 189, 248, 0.3)',
        text: '#38bdf8',
        hoverBg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.35) 0%, rgba(129, 140, 248, 0.35) 100%)',
        hoverBorder: 'rgba(56, 189, 248, 0.6)',
        indicator: '#38bdf8',
        shadow: 'rgba(56, 189, 248, 0.2)',
    },
    green: {
        bg: 'linear-gradient(135deg, rgba(52, 211, 153, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
        border: 'rgba(52, 211, 153, 0.3)',
        text: '#34d399',
        hoverBg: 'linear-gradient(135deg, rgba(52, 211, 153, 0.35) 0%, rgba(16, 185, 129, 0.35) 100%)',
        hoverBorder: 'rgba(52, 211, 153, 0.6)',
        indicator: '#34d399',
        shadow: 'rgba(52, 211, 153, 0.2)',
    },
    red: {
        bg: 'linear-gradient(135deg, rgba(251, 113, 133, 0.2) 0%, rgba(244, 63, 94, 0.2) 100%)',
        border: 'rgba(251, 113, 133, 0.3)',
        text: '#fb7185',
        hoverBg: 'linear-gradient(135deg, rgba(251, 113, 133, 0.35) 0%, rgba(244, 63, 94, 0.35) 100%)',
        hoverBorder: 'rgba(251, 113, 133, 0.6)',
        indicator: '#fb7185',
        shadow: 'rgba(251, 113, 133, 0.2)',
    },
    purple: {
        bg: 'linear-gradient(135deg, rgba(192, 132, 252, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
        border: 'rgba(192, 132, 252, 0.3)',
        text: '#c084fc',
        hoverBg: 'linear-gradient(135deg, rgba(192, 132, 252, 0.35) 0%, rgba(168, 85, 247, 0.35) 100%)',
        hoverBorder: 'rgba(192, 132, 252, 0.6)',
        indicator: '#c084fc',
        shadow: 'rgba(192, 132, 252, 0.2)',
    },
};

const sizeMap = {
    sm: 'px-5 py-2 text-xs tracking-wider font-semibold',
    md: 'px-7 py-3 text-sm tracking-wider font-semibold',
    lg: 'px-9 py-4 text-base tracking-wider font-bold',
};

export default function NeonButton({
    children,
    onClick,
    color = 'blue',
    size = 'md',
    disabled = false,
    className = '',
    type = 'button',
}: NeonButtonProps) {
    const c = colorMap[color];

    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
                ${sizeMap[size]}
                relative rounded-full
                overflow-hidden transition-all duration-300
                disabled:opacity-30 disabled:cursor-not-allowed
                shadow-lg backdrop-blur-md
                ${className}
            `}
            style={{
                fontFamily: "'Outfit', sans-serif",
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.text,
                boxShadow: `0 8px 25px -5px ${c.shadow}`,
            }}
            whileHover={
                !disabled
                    ? {
                        background: c.hoverBg,
                        borderColor: c.hoverBorder,
                        scale: 1.03,
                        boxShadow: `0 12px 30px -5px ${c.shadow}`,
                    }
                    : undefined
            }
            whileTap={!disabled ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <span className="flex items-center justify-center gap-2">
                {children}
            </span>
        </motion.button>
    );
}
