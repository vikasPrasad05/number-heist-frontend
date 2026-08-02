'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RememberPatternPuzzle } from '../../types/game';

interface RememberThePatternProps {
    level: number;
    correctAnswers: number;
    onAnswer: (correct: boolean) => void;
    locked?: boolean;
    syncedPuzzle?: RememberPatternPuzzle;
}

type Phase = 'memorize' | 'input';

function generateSequence(length: number): number[] {
    return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

const SOFT_BLUE = '#38bdf8';
const SOFT_PURPLE = '#c084fc';
const SOFT_AMBER = '#fbbf24';
const SOFT_ROSE = '#fb7185';

export default function RememberThePattern({ level: _level, correctAnswers, onAnswer, locked = false, syncedPuzzle }: RememberThePatternProps) {
    // Requirements: Starting with 3 digits, increase by 1 each correct answer.
    const seqLen = syncedPuzzle?.sequence.length || (3 + correctAnswers);
    // Requirements: Display for 3 seconds. Slightly reduce display time as difficulty increases.
    const displayTime = Math.max(1.0, 3.0 - (correctAnswers * 0.1));

    const [sequence] = useState<number[]>(() => syncedPuzzle ? syncedPuzzle.sequence : generateSequence(seqLen));
    const [phase, setPhase] = useState<Phase>('memorize');
    const [userInput, setUserInput] = useState<number[]>([]);
    const [timeLeft, setTimeLeft] = useState(displayTime);
    const [visibleCount, setVisibleCount] = useState(0);
    const [isWrong, setIsWrong] = useState(false);

    const [activeKey, setActiveKey] = useState<number | 'backspace' | null>(null);

    const submittedRef = useRef(false);
    const countdownActiveRef = useRef(false);

    // ── Phase 1: Staggered Neon Reveal ──
    useEffect(() => {

        const revealInterval = setInterval(() => {
            setVisibleCount(prev => {
                if (prev < seqLen) return prev + 1;
                clearInterval(revealInterval);
                return prev;
            });
        }, 150);

        // Wait for all to reveal, then start the 3s (displayTime) countdown
        const totalRevealTime = seqLen * 150 + 200;
        const timerTimeout = setTimeout(() => {
            countdownActiveRef.current = true;
            const startTime = Date.now();
            const tick = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const remaining = Math.max(0, displayTime - elapsed);
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    clearInterval(tick);
                    setPhase('input');
                }
            }, 50);
            return () => clearInterval(tick);
        }, totalRevealTime);

        return () => {
            clearInterval(revealInterval);
            clearTimeout(timerTimeout);
        };
    }, [seqLen, displayTime]);

    // ── Handle Input ──
    const handleDigit = useCallback((digit: number) => {
        if (phase !== 'input' || locked || submittedRef.current || isWrong) return;

        setActiveKey(digit);
        setTimeout(() => setActiveKey(null), 150);

        setUserInput(prev => {
            const next = [...prev, digit];

            // Check if correct so far
            if (next[next.length - 1] !== sequence[next.length - 1]) {
                // WRONG - Failure Animation
                setIsWrong(true);
                submittedRef.current = true;
                setTimeout(() => onAnswer(false), 800);
                return next;
            }

            // Check if complete
            if (next.length === seqLen) {
                submittedRef.current = true;
                setTimeout(() => onAnswer(true), 200);
            }
            return next;
        });
    }, [phase, locked, sequence, seqLen, onAnswer, isWrong]);

    const handleBackspace = useCallback(() => {
        if (phase !== 'input' || locked || submittedRef.current || isWrong) return;
        setActiveKey('backspace');
        setTimeout(() => setActiveKey(null), 150);
        setUserInput(prev => prev.slice(0, -1));
    }, [phase, locked, isWrong]);

    // ── Keyboard Listener ──
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't intercept if user is typing in an input/textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

            if (phase !== 'input' || locked || submittedRef.current || isWrong) return;

            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleDigit(parseInt(e.key, 10));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                handleBackspace();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, locked, isWrong, handleDigit, handleBackspace]);

    const fraction = countdownActiveRef.current ? timeLeft / displayTime : 1;
    const barColor = fraction > 0.6 ? SOFT_BLUE : fraction > 0.3 ? SOFT_AMBER : SOFT_ROSE;

    const keypadRows = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
    ];

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
            {/* Header / Timer Bar Area */}
            <div className="w-full flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                    <motion.div
                        className="text-xs uppercase tracking-widest font-bold"
                        style={{ color: phase === 'memorize' ? SOFT_BLUE : SOFT_PURPLE }}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {phase === 'memorize' ? 'MEMORIZE PATTERN' : 'RECALL SEQUENCE'}
                    </motion.div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                        Length: <span style={{ color: SOFT_BLUE }} className="font-bold">{seqLen}</span>
                    </div>
                </div>

                {/* Internal Countdown Bar */}
                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden relative shadow-inner">
                    <motion.div
                        className="h-full relative z-10 rounded-full"
                        style={{
                            background: barColor,
                            boxShadow: `0 0 12px ${barColor}88`
                        }}
                        animate={{ width: phase === 'memorize' ? `${(timeLeft / displayTime) * 100}%` : '100%' }}
                        transition={{ duration: 0.1 }}
                    />
                </div>
            </div>

            {/* Phase Instructions */}
            <div className="text-xs uppercase tracking-wider text-slate-400 font-medium text-center">
                {phase === 'memorize' ? 'Memorize every digit precisely' : 'Enter sequence via Keyboard (0-9) or Keypad'}
            </div>

            {/* Main Display Area */}
            <div className="relative w-full py-6 flex items-center justify-center min-h-[160px]">
                <AnimatePresence mode="wait">
                    {phase === 'memorize' ? (
                        <motion.div
                            key="mem-grid"
                            exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                            className="flex flex-wrap justify-center gap-3"
                        >
                            {sequence.map((digit, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20, rotateX: 90 }}
                                    animate={i < visibleCount ? {
                                        opacity: 1,
                                        y: 0,
                                        rotateX: 0,
                                        boxShadow: `0 8px 25px ${SOFT_BLUE}33`,
                                    } : {}}
                                    className="w-14 h-18 md:w-16 md:h-20 flex items-center justify-center rounded-2xl text-3xl font-bold"
                                    style={{
                                        background: 'rgba(56, 189, 248, 0.08)',
                                        border: `2px solid ${SOFT_BLUE}66`,
                                        color: SOFT_BLUE,
                                        fontFamily: "'Outfit', sans-serif",
                                    }}
                                >
                                    {digit}
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="input-grid"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`flex flex-wrap justify-center gap-3 ${isWrong ? 'animate-shake' : ''}`}
                        >
                            {sequence.map((_, i) => {
                                const isFilled = i < userInput.length;
                                const isCurrent = i === userInput.length;
                                return (
                                    <div
                                        key={i}
                                        className="w-12 h-16 md:w-14 md:h-18 flex items-center justify-center rounded-2xl text-2xl font-bold transition-all duration-200"
                                        style={{
                                            background: isWrong ? 'rgba(251,113,133,0.15)' : isFilled ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.03)',
                                            border: `2px solid ${isWrong ? SOFT_ROSE : isFilled ? SOFT_PURPLE : isCurrent ? SOFT_BLUE : 'rgba(255,255,255,0.1)'}`,
                                            color: isWrong ? SOFT_ROSE : isFilled ? SOFT_PURPLE : SOFT_BLUE,
                                            boxShadow: isWrong ? `0 8px 25px ${SOFT_ROSE}44` : isFilled ? `0 8px 25px ${SOFT_PURPLE}44` : 'none',
                                            fontFamily: "'Outfit', sans-serif",
                                        }}
                                    >
                                        {isFilled ? userInput[i] : isCurrent ? <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>_</motion.span> : ''}
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Keypad */}
            {phase === 'input' && (
                <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 w-full max-w-[300px]"
                >
                    {keypadRows.map((row, i) => (
                        <div key={i} className="flex gap-3">
                            {row.map(num => (
                                <KeyBtn
                                    key={num}
                                    label={num}
                                    onClick={() => handleDigit(num)}
                                    disabled={locked || isWrong}
                                    isActive={activeKey === num}
                                />
                            ))}
                        </div>
                    ))}
                    <div className="flex gap-3">
                        <KeyBtn
                            label="⌫"
                            color={SOFT_AMBER}
                            onClick={handleBackspace}
                            disabled={locked || isWrong || userInput.length === 0}
                            isActive={activeKey === 'backspace'}
                        />
                        <KeyBtn
                            label="0"
                            onClick={() => handleDigit(0)}
                            disabled={locked || isWrong}
                            isActive={activeKey === 0}
                        />
                        <div className="flex-1 flex items-center justify-center text-xs text-slate-500 tracking-wider font-mono">
                            [0-9/⌫]
                        </div>
                    </div>
                </motion.div>
            )}


        </div>
    );
}

function KeyBtn({ label, onClick, disabled, color = SOFT_BLUE, isActive = false }: { label: string | number, onClick: () => void, disabled?: boolean, color?: string, isActive?: boolean }) {
    return (
        <motion.button
            whileHover={!disabled ? { scale: 1.05, boxShadow: `0 8px 20px ${color}33` } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            animate={isActive ? { scale: 1.08, backgroundColor: `${color}33`, boxShadow: `0 8px 25px ${color}55` } : { scale: 1 }}
            transition={{ duration: 0.1 }}
            onClick={onClick}
            disabled={disabled}
            className="flex-1 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-all"
            style={{
                background: isActive ? `${color}33` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : color + (isActive ? 'aa' : '44')}`,
                color: disabled ? 'rgba(255,255,255,0.2)' : color,
                fontFamily: "'Outfit', sans-serif",
                cursor: disabled ? 'default' : 'pointer'
            }}
        >
            {label}
        </motion.button>
    );
}
