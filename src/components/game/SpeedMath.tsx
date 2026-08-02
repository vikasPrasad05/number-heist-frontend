'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpeedMathPuzzle } from '../../types/game';

interface SpeedMathProps {
    puzzle: SpeedMathPuzzle;
    onAnswer: (correct: boolean) => void;
    locked?: boolean;
}

export default function SpeedMath({ puzzle, onAnswer, locked = false }: SpeedMathProps) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInput('');
        inputRef.current?.focus();
    }, [puzzle]);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!input.trim() || locked) return;
            const userAnswer = parseFloat(input);
            onAnswer(userAnswer === puzzle.answer);
        },
        [input, puzzle.answer, onAnswer, locked]
    );

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={puzzle.question}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-6"
            >
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-2">
                    Solve the equation
                </div>

                <motion.div
                    className="text-4xl md:text-6xl font-extrabold tracking-wide text-sky-300"
                    style={{
                        fontFamily: "'Outfit', sans-serif",
                    }}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                    {puzzle.question} = ?
                </motion.div>

                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 mt-4">
                    <input
                        ref={inputRef}
                        type="number"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Your answer"
                        className="w-56 px-6 py-4 text-3xl font-bold text-center rounded-2xl outline-none transition-all shadow-inner"
                        style={{
                            background: 'rgba(56, 189, 248, 0.08)',
                            border: '1.5px solid rgba(56, 189, 248, 0.3)',
                            color: '#f8fafc',
                            fontFamily: "'Outfit', sans-serif",
                            opacity: locked ? 0.5 : 1,
                        }}
                        disabled={locked}
                        readOnly={locked}
                        autoFocus
                    />
                    <motion.button
                        type="submit"
                        className="px-8 py-3.5 rounded-full font-bold text-sm uppercase tracking-wider shadow-lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)',
                            border: '1px solid rgba(52, 211, 153, 0.4)',
                            color: '#34d399',
                            fontFamily: "'Outfit', sans-serif",
                            opacity: locked ? 0.4 : 1,
                            pointerEvents: locked ? 'none' : 'auto',
                        }}
                        whileHover={locked ? {} : { scale: 1.05, boxShadow: '0 8px 25px rgba(52, 211, 153, 0.25)' }}
                        whileTap={locked ? {} : { scale: 0.95 }}
                        disabled={locked}
                    >
                        Submit ↵
                    </motion.button>
                </form>
            </motion.div>
        </AnimatePresence>
    );
}
