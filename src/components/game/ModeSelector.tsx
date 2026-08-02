'use client';

import { motion } from 'framer-motion';
import { GameMode, MODE_LABELS, MODE_DESCRIPTIONS, MODE_ICONS } from '../../types/game';

interface ModeSelectorProps {
    onSelectMode: (mode: GameMode) => void;
}

interface ModeConfig {
    mode: GameMode;
    label: string;
    description: string;
    badge: string;
    gradient: string;
    badgeColor: string;
    iconBg: string;
}

const modesList: ModeConfig[] = [
    {
        mode: 'speed-math',
        label: MODE_LABELS['speed-math'],
        description: MODE_DESCRIPTIONS['speed-math'],
        badge: 'SPEED',
        gradient: 'from-sky-400 to-cyan-400',
        badgeColor: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
        iconBg: 'bg-sky-400/10 text-sky-400',
    },
    {
        mode: 'pattern-recognition',
        label: MODE_LABELS['pattern-recognition'],
        description: MODE_DESCRIPTIONS['pattern-recognition'],
        badge: 'SEQUENCE',
        gradient: 'from-emerald-400 to-teal-400',
        badgeColor: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
        iconBg: 'bg-emerald-400/10 text-emerald-400',
    },
    {
        mode: 'hidden-operator',
        label: MODE_LABELS['hidden-operator'],
        description: MODE_DESCRIPTIONS['hidden-operator'],
        badge: 'OPERATOR',
        gradient: 'from-purple-400 to-indigo-400',
        badgeColor: 'bg-purple-400/10 text-purple-300 border-purple-400/30',
        iconBg: 'bg-purple-400/10 text-purple-400',
    },
    {
        mode: 'multi-step-logic',
        label: MODE_LABELS['multi-step-logic'],
        description: MODE_DESCRIPTIONS['multi-step-logic'],
        badge: 'LOGIC',
        gradient: 'from-amber-400 to-orange-400',
        badgeColor: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
        iconBg: 'bg-amber-400/10 text-amber-400',
    },
    {
        mode: 'daily-challenge',
        label: MODE_LABELS['daily-challenge'],
        description: MODE_DESCRIPTIONS['daily-challenge'],
        badge: 'DAILY',
        gradient: 'from-yellow-400 to-amber-400',
        badgeColor: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/30',
        iconBg: 'bg-yellow-400/10 text-yellow-400',
    },
    {
        mode: 'remember-the-pattern',
        label: 'Remember The Pattern',
        description: 'Recall sequence patterns & sharpen memory.',
        badge: 'MEMORY',
        gradient: 'from-purple-400 via-sky-400 to-emerald-400',
        badgeColor: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
        iconBg: 'bg-purple-400/10 text-purple-300',
    },
];

/** Compact animated memory-grid SVG icon */
function MemoryGridIcon() {
    const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const highlights = [0, 2, 4, 6, 8];

    return (
        <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {cells.map((idx) => {
                const col = idx % 3;
                const row = Math.floor(idx / 3);
                const x = col * 16 + 2;
                const y = row * 16 + 2;
                const isHighlighted = highlights.includes(idx);
                return (
                    <motion.rect
                        key={idx}
                        x={x}
                        y={y}
                        width="11"
                        height="11"
                        rx="3"
                        fill={isHighlighted ? '#c084fc' : 'rgba(192,132,252,0.1)'}
                        stroke={isHighlighted ? '#c084fc' : 'rgba(192,132,252,0.3)'}
                        strokeWidth="1"
                        animate={
                            isHighlighted
                                ? {
                                    opacity: [0.5, 1, 0.5],
                                    fill: ['#c084fc', '#38bdf8', '#c084fc'],
                                }
                                : { opacity: [0.2, 0.5, 0.2] }
                        }
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: idx * 0.1,
                        }}
                    />
                );
            })}
        </svg>
    );
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl mx-auto mt-12 md:mt-16 pt-4">
            {modesList.map((item, i) => (
                <motion.div
                    key={item.mode}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 150 }}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectMode(item.mode)}
                    className="glass-card px-4 py-3.5 rounded-2xl relative overflow-hidden cursor-pointer group flex flex-col items-center justify-center text-center border border-white/10 hover:border-white/30 shadow-md transition-all duration-300"
                >
                    {/* Top Accent Gradient Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient}`} />

                    {/* Top Right Category Badge */}
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${item.badgeColor}`}>
                        {item.badge}
                    </span>

                    {/* Icon */}
                    <div className={`p-2 rounded-xl ${item.iconBg} group-hover:scale-110 transition-all my-1 flex items-center justify-center`}>
                        {item.mode === 'remember-the-pattern' ? <MemoryGridIcon /> : <span className="text-xl">{MODE_ICONS[item.mode]}</span>}
                    </div>

                    {/* Title (Kept Normal & Bold) */}
                    <h3
                        className="text-lg font-bold text-white mb-0.5 tracking-wide text-center"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        {item.label}
                    </h3>

                    {/* Description (Kept Readable text-xs) */}
                    <p className="text-xs leading-tight text-slate-300/80 font-normal text-center max-w-[200px]">
                        {item.description}
                    </p>
                </motion.div>
            ))}
        </div>
    );
}
