'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiddenOperatorPuzzle, Operator } from '../../types/game';

interface HiddenOperatorProps {
    puzzle: HiddenOperatorPuzzle;
    onAnswer: (correct: boolean) => void;
    locked?: boolean;
}

const operatorLabels: Record<Operator, string> = {
    '+': '+',
    '-': '−',
    '×': '×',
    '÷': '÷',
};

export default function HiddenOperator({ puzzle, onAnswer, locked = false }: HiddenOperatorProps) {
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (locked) return;
            const keyMap: Record<string, Operator> = {
                '1': puzzle.choices[0],
                '2': puzzle.choices[1],
                '3': puzzle.choices[2],
                '4': puzzle.choices[3],
            };
            if (keyMap[e.key]) {
                onAnswer(keyMap[e.key] === puzzle.answer);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [puzzle, onAnswer, locked]);

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={`${puzzle.left}-${puzzle.right}-${puzzle.result}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-8"
            >
                <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Find the missing operator
                </div>

                <div className="flex items-center gap-3 md:gap-5">
                    <motion.span
                        className="text-4xl md:text-6xl font-extrabold text-sky-300"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        {puzzle.left}
                    </motion.span>

                    <motion.div
                        className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-2xl text-3xl font-bold"
                        style={{
                            background: 'rgba(52, 211, 153, 0.1)',
                            border: '2px dashed rgba(52, 211, 153, 0.5)',
                            color: '#34d399',
                            fontFamily: "'Outfit', sans-serif",
                        }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        ?
                    </motion.div>

                    <motion.span
                        className="text-4xl md:text-6xl font-extrabold text-sky-300"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        {puzzle.right}
                    </motion.span>

                    <span
                        className="text-4xl md:text-5xl font-bold text-slate-400"
                    >
                        =
                    </span>

                    <motion.span
                        className="text-4xl md:text-6xl font-extrabold text-purple-300"
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                        }}
                    >
                        {puzzle.result}
                    </motion.span>
                </div>

                <div className="flex gap-3 md:gap-4 flex-wrap justify-center">
                    {puzzle.choices.map((op, i) => (
                        <motion.button
                            key={op}
                            onClick={() => { if (!locked) onAnswer(op === puzzle.answer); }}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl text-2xl md:text-3xl font-bold relative shadow-lg"
                            style={{
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1.5px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                fontFamily: "'Outfit', sans-serif",
                                opacity: locked ? 0.4 : 1,
                                pointerEvents: locked ? 'none' : 'auto',
                            }}
                            whileHover={locked ? {} : {
                                scale: 1.08,
                                background: 'rgba(56, 189, 248, 0.18)',
                                boxShadow: '0 8px 25px rgba(56, 189, 248, 0.25)',
                            }}
                            whileTap={locked ? {} : { scale: 0.95 }}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: locked ? 0.4 : 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            disabled={locked}
                        >
                            <span className="absolute top-1.5 left-2.5 text-[10px] text-slate-400 font-mono">
                                {i + 1}
                            </span>
                            {operatorLabels[op]}
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
