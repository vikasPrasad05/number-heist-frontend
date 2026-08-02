'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameMode, MODE_LABELS } from '../../types/game';
import NeonButton from '../ui/NeonButton';

interface GameOverProps {
    score: number;
    level: number;
    questionsAnswered: number;
    correctAnswers: number;
    maxCombo: number;
    mode: GameMode;
    highScore: number;
    playerName: string; // Added this
    onRestart: () => void;
    onExit: () => void;
    onSaveScore: (name: string) => void;
}

export default function GameOver({
    score,
    level,
    questionsAnswered,
    correctAnswers,
    maxCombo,
    mode,
    highScore,
    playerName: initialPlayerName, // Renamed to avoid collision
    onRestart,
    onExit,
    onSaveScore,
}: GameOverProps) {
    const [playerName, setPlayerName] = useState(initialPlayerName);
    const [saved, setSaved] = useState(false);
    const isNewHighScore = score > highScore;
    const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;

    useEffect(() => {
        if (initialPlayerName && initialPlayerName.trim() && !saved && score > 0) {
            onSaveScore(initialPlayerName.trim());
            setSaved(true);
        }
    }, [initialPlayerName, score, saved, onSaveScore]);

    const handleSave = useCallback(() => {
        if (playerName.trim()) {
            onSaveScore(playerName.trim());
            setSaved(true);
        }
    }, [playerName, onSaveScore]);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="glass-card p-8 md:p-12 max-w-lg w-full text-center"
                style={{ boxShadow: '0 0 40px rgba(0, 212, 255, 0.1)' }}
            >
                {/* Header */}
                <motion.div
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    className="mb-6"
                >
                    <div className="text-4xl mb-3">
                        {isNewHighScore ? '🎉' : '✨'}
                    </div>
                    <h2
                        className="text-3xl font-extrabold mb-1 tracking-tight"
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            color: isNewHighScore ? '#34d399' : '#fb7185',
                        }}
                    >
                        {isNewHighScore ? 'NEW HIGH SCORE!' : 'GAME COMPLETE'}
                    </h2>
                    <div className="text-sm font-medium text-slate-400">
                        {MODE_LABELS[mode]}
                    </div>
                </motion.div>

                {/* Score */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="text-5xl md:text-6xl font-black mb-8 text-sky-300"
                    style={{
                        fontFamily: "'Outfit', sans-serif",
                    }}
                >
                    {score.toLocaleString()}
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {[
                        { label: 'Level', value: level, color: '#38bdf8' },
                        { label: 'Accuracy', value: `${accuracy}%`, color: accuracy > 70 ? '#34d399' : '#fbbf24' },
                        { label: 'Max Combo', value: `${maxCombo}x`, color: '#c084fc' },
                        { label: 'Correct', value: `${correctAnswers}/${questionsAnswered}`, color: '#38bdf8' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.08 }}
                            className="p-3.5 rounded-2xl shadow-sm"
                            style={{
                                background: 'rgba(255,255,255,0.035)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <div className="text-xs uppercase tracking-wider mb-1 text-slate-400 font-medium">
                                {stat.label}
                            </div>
                            <div className="text-lg font-bold" style={{ color: stat.color, fontFamily: "'Outfit', sans-serif" }}>
                                {stat.value}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Save Score */}
                <AnimatePresence>
                    {!saved ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6"
                        >
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    placeholder="Enter your name"
                                    maxLength={20}
                                    className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none font-medium"
                                    style={{
                                        background: 'rgba(56, 189, 248, 0.08)',
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        color: '#f8fafc',
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                />
                                <NeonButton onClick={handleSave} color="green" size="sm" disabled={!playerName.trim()}>
                                    Save
                                </NeonButton>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-6 text-sm font-semibold text-emerald-400"
                        >
                            ✓ Score saved to leaderboard!
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                    <NeonButton onClick={onRestart} color="blue" size="md">
                        Play Again
                    </NeonButton>
                    <NeonButton onClick={onExit} color="purple" size="md">
                        Menu
                    </NeonButton>
                </div>
            </motion.div>
        </div>
    );
}
