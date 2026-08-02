'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, ChevronRight, Zap, Layers } from 'lucide-react';
import { LeaderboardEntry, MODE_LABELS } from '../../types/game';

interface DailyLeaderboardProps {
    entries: LeaderboardEntry[];
    playerName?: string;
}

export default function DailyLeaderboard({ entries, playerName }: DailyLeaderboardProps) {
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

    // Get today's local YYYY-MM-DD date string
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter entries recorded TODAY only
    const todayEntries = entries.filter(entry => {
        if (!entry.date) return false;
        return entry.date.split('T')[0] === todayStr;
    });

    // Group scores by player for today to find overall top player and high score
    const playerSummariesMap = new Map<string, { totalScore: number; highScore: number; totalGames: number }>();

    todayEntries.forEach(entry => {
        const existing = playerSummariesMap.get(entry.name) || { totalScore: 0, highScore: 0, totalGames: 0 };
        playerSummariesMap.set(entry.name, {
            totalScore: existing.totalScore + entry.score,
            highScore: Math.max(existing.highScore, entry.score),
            totalGames: existing.totalGames + 1,
        });
    });

    // Ensure current active player is ALWAYS included on today's list as soon as they enter their name
    if (playerName && playerName.trim() && !playerSummariesMap.has(playerName.trim())) {
        playerSummariesMap.set(playerName.trim(), {
            totalScore: 0,
            highScore: 0,
            totalGames: 0,
        });
    }

    // Sort players by highest score recorded today (highest score on top)
    const sortedPlayers = Array.from(playerSummariesMap.entries())
        .map(([name, summary]) => ({ name, ...summary }))
        .sort((a, b) => b.highScore - a.highScore)
        .slice(0, 5); // Top 5 players today

    // Formatted date string for display (e.g. "Aug 3")
    const formattedDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    // Entries for the selected player today
    const selectedPlayerEntries = selectedPlayer
        ? todayEntries.filter(e => e.name === selectedPlayer).sort((a, b) => b.score - a.score)
        : [];

    const selectedPlayerSummary = selectedPlayer ? playerSummariesMap.get(selectedPlayer) : null;

    return (
        <>
            {/* Top-Right Standalone Player Pills Stacked Vertically */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="fixed top-5 right-5 md:top-6 md:right-6 z-40 flex flex-col gap-2 items-end max-w-[210px] w-full"
            >
                {/* Section Title Badge */}
                <div className="self-start flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900/90 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-2xl shadow-lg mb-1">
                    <Trophy size={12} className="text-amber-400 animate-pulse" />
                    <span style={{ fontFamily: "'Outfit', sans-serif" }}>TODAY'S HIGH SCORE</span>
                </div>

                {sortedPlayers.map((player, idx) => {
                    const isCurrentPlayer = playerName && player.name.toLowerCase() === playerName.trim().toLowerCase();
                    const rankBadge = player.highScore === 0 ? '🎮' : (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`);

                    return (
                        <motion.button
                            key={player.name}
                            whileHover={{ scale: 1.03, x: -3 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setSelectedPlayer(player.name)}
                            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-full border shadow-xl backdrop-blur-2xl transition-all cursor-pointer w-full group ${
                                isCurrentPlayer
                                    ? 'bg-slate-900/90 border-purple-400/50 text-purple-200 shadow-purple-900/20'
                                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-white/10 hover:border-amber-400/40 text-slate-100'
                            }`}
                            title="Click to view score details"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-xs font-bold">{rankBadge}</span>
                                <span className="text-xs font-bold truncate max-w-[110px]">
                                    {player.name} {isCurrentPlayer && <span className="text-[10px] text-purple-300 font-normal ml-0.5">(You)</span>}
                                </span>
                            </div>
                            <ChevronRight size={14} className="text-slate-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </motion.button>
                    );
                })}
            </motion.div>

            {/* Player Details Popup Modal */}
            <AnimatePresence>
                {selectedPlayer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                            className="glass-card p-6 md:p-7 rounded-2xl max-w-md w-full border border-white/15 shadow-2xl relative"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedPlayer(null)}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>

                            {/* Modal Header */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-3 bg-amber-400/10 rounded-2xl text-amber-400">
                                    <Trophy size={26} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-white tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        {selectedPlayer}
                                    </h3>
                                    <p className="text-xs text-amber-300 font-semibold">
                                        Today's High Score: {selectedPlayerSummary?.highScore ? selectedPlayerSummary.highScore.toLocaleString() : 'No score yet'}
                                    </p>
                                </div>
                            </div>

                            {/* Mode Scores Breakdown */}
                            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 no-scrollbar mb-5">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    Modes Played Today ({formattedDate})
                                </div>
                                {selectedPlayerEntries.length > 0 ? (
                                    selectedPlayerEntries.map((entry, idx) => (
                                        <div
                                            key={entry.id || idx}
                                            className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3"
                                        >
                                            <div>
                                                <div className="text-sm font-bold text-white mb-1 font-sans">
                                                    {MODE_LABELS[entry.mode] || entry.mode}
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1 text-sky-400">
                                                        <Layers size={11} /> Lvl {entry.level}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-purple-400">
                                                        <Zap size={11} /> {entry.combo}x Combo
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-base font-black text-emerald-400 font-mono">
                                                    {entry.score.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono">
                                                    {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-slate-400 text-xs font-medium">
                                        No mode scores recorded yet today. Play a mode to set your high score!
                                    </div>
                                )}
                            </div>

                            {/* Modal Action Footer */}
                            <div className="flex justify-end pt-2 border-t border-white/10">
                                <button
                                    onClick={() => setSelectedPlayer(null)}
                                    className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
