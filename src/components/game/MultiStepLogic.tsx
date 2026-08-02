'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiStepPuzzle } from '../../types/game';

interface MultiStepLogicProps {
    puzzle: MultiStepPuzzle;
    onAnswer: (correct: boolean) => void;
    locked?: boolean;
}

export default function MultiStepLogic({ puzzle, onAnswer, locked = false }: MultiStepLogicProps) {
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
                key={puzzle.equations.join('|')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-6"
            >
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-2">
                    Solve the logic chain
                </div>

                <div className="flex flex-col gap-3 w-full max-w-md">
                    {puzzle.equations.map((eq, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="px-6 py-3.5 rounded-2xl text-lg font-mono flex items-center justify-between shadow-md"
                            style={{
                                background: 'rgba(56, 189, 248, 0.06)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                color: '#38bdf8',
                            }}
                        >
                            <span className="text-slate-400 text-xs font-mono">
                                Step {i + 1}
                            </span>
                            <span className="font-semibold">{eq}</span>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: puzzle.equations.length * 0.1 }}
                    className="px-6 py-3.5 rounded-2xl text-base font-bold tracking-wide shadow-md"
                    style={{
                        background: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        color: '#34d399',
                        fontFamily: "'Outfit', sans-serif",
                    }}
                >
                    🎯 {puzzle.question}
                </motion.div>

                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 mt-2">
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
