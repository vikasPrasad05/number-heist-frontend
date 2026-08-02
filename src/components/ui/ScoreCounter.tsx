'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

interface ScoreCounterProps {
    score: number;
    combo: number;
    multiplier: number;
}

export default function ScoreCounter({ score, combo, multiplier }: ScoreCounterProps) {
    const springScore = useSpring(0, { stiffness: 100, damping: 30 });
    const displayScore = useTransform(springScore, (v) => Math.round(v));

    useEffect(() => {
        springScore.set(score);
    }, [score, springScore]);

    return (
        <div className="flex items-center gap-4">
            <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Score
                </div>
                <motion.div
                    className="text-2xl font-bold tabular-nums text-sky-300"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                    <motion.span>{displayScore}</motion.span>
                </motion.div>
            </div>

            {combo > 0 && (
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="px-3 py-1 rounded-full text-center shadow-sm"
                    style={{
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                    }}
                >
                    <div className="text-xs font-bold text-emerald-300 font-sans">
                        {multiplier}x
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                        ×{combo} combo
                    </div>
                </motion.div>
            )}
        </div>
    );
}
