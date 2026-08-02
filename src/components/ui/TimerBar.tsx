'use client';

import { motion } from 'framer-motion';

interface TimerBarProps {
    fraction: number; // 0 to 1
    timeRemaining: number;
}

export default function TimerBar({ fraction, timeRemaining }: TimerBarProps) {
    const getColor = () => {
        if (fraction > 0.5) return '#34d399';
        if (fraction > 0.25) return '#fbbf24';
        return '#fb7185';
    };

    const getShadow = () => {
        if (fraction > 0.5) return '0 0 15px rgba(52, 211, 153, 0.4)';
        if (fraction > 0.25) return '0 0 15px rgba(251, 191, 36, 0.4)';
        return '0 0 15px rgba(251, 113, 133, 0.5)';
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-1.5 px-1">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Time
                </span>
                <motion.span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: getColor(), fontFamily: "'Outfit', sans-serif" }}
                    animate={fraction <= 0.25 ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                >
                    {timeRemaining.toFixed(1)}s
                </motion.span>
            </div>
            <div
                className="h-2.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
            >
                <motion.div
                    className="h-full rounded-full timer-bar"
                    style={{
                        width: `${fraction * 100}%`,
                        background: getColor(),
                        boxShadow: getShadow(),
                    }}
                    animate={fraction <= 0.25 ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
                    transition={fraction <= 0.25 ? { repeat: Infinity, duration: 0.4 } : {}}
                />
            </div>
        </div>
    );
}
