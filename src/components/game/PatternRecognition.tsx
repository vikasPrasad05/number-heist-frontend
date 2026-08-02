'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PatternPuzzle } from '../../types/game';

interface PatternRecognitionProps {
    puzzle: PatternPuzzle;
    onAnswer: (correct: boolean) => void;
    locked?: boolean;
}

export default function PatternRecognition({ puzzle, onAnswer, locked = false }: PatternRecognitionProps) {
    const [input, setInput] = useState('');
    const [showHint, setShowHint] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInput('');
        setShowHint(false);
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
                key={puzzle.sequence.join(',')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-6"
            >
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-2">
                    Find the next number
                </div>

                <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
                    {puzzle.sequence.map((num, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08, type: 'spring' }}
                            className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl text-xl md:text-2xl font-bold shadow-lg"
                            style={{
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1.5px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                fontFamily: "'Outfit', sans-serif",
                            }}
                        >
                            {num}
                        </motion.div>
                    ))}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: puzzle.sequence.length * 0.08, type: 'spring' }}
                        className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl text-2xl font-bold"
                        style={{
                            background: 'rgba(52, 211, 153, 0.08)',
                            border: '2px dashed rgba(52, 211, 153, 0.5)',
                            color: '#34d399',
                            fontFamily: "'Outfit', sans-serif",
                        }}
                    >
                        ?
                    </motion.div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 mt-2">
                    <input
                        ref={inputRef}
                        type="number"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Next number"
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
                    <div className="flex gap-3">
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
                        <motion.button
                            type="button"
                            onClick={() => setShowHint(true)}
                            className="px-6 py-3.5 rounded-full font-semibold text-sm uppercase tracking-wider shadow-md"
                            style={{
                                background: 'rgba(192, 132, 252, 0.12)',
                                border: '1px solid rgba(192, 132, 252, 0.3)',
                                color: '#c084fc',
                                fontFamily: "'Outfit', sans-serif",
                                opacity: locked ? 0.4 : 1,
                                pointerEvents: locked ? 'none' : 'auto',
                            }}
                            whileHover={locked ? {} : { scale: 1.05 }}
                            whileTap={locked ? {} : { scale: 0.95 }}
                            disabled={locked}
                        >
                            Hint
                        </motion.button>
                    </div>
                </form>

                <AnimatePresence>
                    {showHint && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-sm px-5 py-3 rounded-2xl font-medium shadow-md backdrop-blur-md"
                            style={{
                                background: 'rgba(192, 132, 252, 0.12)',
                                border: '1px solid rgba(192, 132, 252, 0.3)',
                                color: '#e9d5ff',
                            }}
                        >
                            💡 {puzzle.hint}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
