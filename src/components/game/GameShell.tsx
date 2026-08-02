'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameMode } from '../../types/game';
import { useTimer } from '../../hooks/useTimer';
import { useScore } from '../../hooks/useScore';
import { useGameState } from '../../hooks/useGameState';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import TimerBar from '../ui/TimerBar';
import ScoreCounter from '../ui/ScoreCounter';
import SpeedMath from './SpeedMath';
import PatternRecognition from './PatternRecognition';
import HiddenOperator from './HiddenOperator';
import MultiStepLogic from './MultiStepLogic';
import RememberThePattern from './RememberThePattern';
import GameOver from './GameOver';
import { MODE_LABELS } from '../../types/game';
import { GAME_CONFIG } from '../../lib/constants';
import {
    playCorrectSound,
    playWrongSound,
    playLevelUpSound,
    playGameOverSound,
    playComboSound,
    playTimerWarningSound,
} from '../../lib/sounds';

interface GameShellProps {
    mode: GameMode;
    playerName: string;
    onExit: () => void;
}

export default function GameShell({ mode, playerName, onExit }: GameShellProps) {
    const gameState = useGameState();
    const scoreHook = useScore();
    const leaderboard = useLeaderboard();
    const feedbackTimeoutRef = useRef<any>(null);
    // Lock: true once an answer has been submitted for the current puzzle
    const answeredRef = useRef(false);
    const [isLocked, setIsLocked] = useState(false);

    const handleTimeUp = useCallback(() => {
        playGameOverSound();
        gameState.endGame();
    }, [gameState]);

    const timer = useTimer({
        totalTime: gameState.totalTime,
        onTimeUp: handleTimeUp,
        onWarning: playTimerWarningSound,
    });

    // Start game on mount
    useEffect(() => {
        gameState.startGame(mode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // Start timer when puzzle changes — also reset the answer lock
    useEffect(() => {
        if (gameState.currentPuzzle && gameState.isPlaying) {
            answeredRef.current = false;
            setIsLocked(false);
            timer.start(gameState.totalTime);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState.currentPuzzle, gameState.isPlaying]);

    const handleAnswer = useCallback(
        (correct: boolean) => {
            // Guard: only process the very first answer per puzzle
            if (!gameState.isPlaying || answeredRef.current) return;
            answeredRef.current = true;
            setIsLocked(true);
            timer.stop();

            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }

            if (correct) {
                const leveledUp = gameState.markCorrect();
                scoreHook.addCorrect(
                    gameState.level,
                    timer.timeRemaining,
                    timer.totalTime
                );
                playCorrectSound();

                if (scoreHook.combo > 0) {
                    playComboSound(scoreHook.combo);
                }

                gameState.setFeedback('correct');

                feedbackTimeoutRef.current = setTimeout(() => {
                    gameState.setFeedback(null);
                    if (leveledUp) {
                        playLevelUpSound();
                    }

                    // Check if daily challenge is over
                    if (mode === 'daily-challenge' && gameState.correctAnswers >= GAME_CONFIG.DAILY_PUZZLE_COUNT) {
                        playGameOverSound();
                        gameState.endGame();
                        return;
                    }

                    gameState.nextPuzzle();
                }, GAME_CONFIG.ANSWER_FEEDBACK_DURATION);
            } else {
                playWrongSound();
                scoreHook.breakCombo();
                gameState.markWrong();
                gameState.setFeedback('wrong');

                feedbackTimeoutRef.current = setTimeout(() => {
                    gameState.setFeedback(null);

                    // Requirements: If wrong -> end round with final score
                    if (gameState.mode === 'remember-the-pattern') {
                        playGameOverSound();
                        gameState.endGame();
                        return;
                    }

                    gameState.nextPuzzle();
                }, GAME_CONFIG.ANSWER_FEEDBACK_DURATION);
            }
        },
        [gameState, scoreHook, timer, mode]
    );

    const handleRestart = useCallback(() => {
        scoreHook.resetScore();
        gameState.startGame(mode);
    }, [scoreHook, gameState, mode]);

    const handleExitGame = useCallback(() => {
        if (scoreHook.score > 0 && playerName && playerName.trim()) {
            leaderboard.addEntry(playerName.trim(), scoreHook.score, mode, gameState.level, scoreHook.maxCombo);
        }
        onExit();
    }, [scoreHook.score, playerName, mode, gameState.level, scoreHook.maxCombo, leaderboard, onExit]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
            timer.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (gameState.isGameOver) {
        return (
            <GameOver
                score={scoreHook.score}
                level={gameState.level}
                questionsAnswered={gameState.questionsAnswered}
                correctAnswers={gameState.correctAnswers}
                maxCombo={scoreHook.maxCombo}
                mode={mode}
                playerName={playerName}
                highScore={leaderboard.getHighScore(mode)}
                onRestart={handleRestart}
                onExit={onExit}
                onSaveScore={(name: string) => {
                    leaderboard.addEntry(name, scoreHook.score, mode, gameState.level, scoreHook.maxCombo);
                }}
            />
        );
    }

    const renderPuzzle = () => {
        // Remember The Pattern: self-contained component with its own timer
        if (gameState.mode === 'remember-the-pattern') {
            return (
                <RememberThePattern
                    key={gameState.questionsAnswered}
                    level={gameState.level}
                    correctAnswers={gameState.correctAnswers}
                    onAnswer={handleAnswer}
                    locked={isLocked}
                />
            );
        }

        if (!gameState.currentPuzzle) return null;
        const puzzle = gameState.currentPuzzle;

        switch (puzzle.type) {
            case 'speed-math':
                return <SpeedMath puzzle={puzzle} onAnswer={handleAnswer} locked={isLocked} />;
            case 'pattern-recognition':
                return <PatternRecognition puzzle={puzzle} onAnswer={handleAnswer} locked={isLocked} />;
            case 'hidden-operator':
                return <HiddenOperator puzzle={puzzle} onAnswer={handleAnswer} locked={isLocked} />;
            case 'multi-step-logic':
                return <MultiStepLogic puzzle={puzzle} onAnswer={handleAnswer} locked={isLocked} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative">
            {/* Header Bar */}
            <div
                className="sticky top-0 z-30 px-4 md:px-8 py-4 shadow-sm"
                style={{
                    background: 'rgba(11, 15, 25, 0.75)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                            <motion.button
                                onClick={handleExitGame}
                                className="text-xs font-semibold px-4 py-2 rounded-full font-sans transition-all shadow-sm"
                                style={{
                                    background: 'rgba(251, 113, 133, 0.12)',
                                    border: '1px solid rgba(251, 113, 133, 0.3)',
                                    color: '#fb7185',
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                ← Exit
                            </motion.button>
                            <div>
                                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">
                                    Player: <span style={{ color: '#34d399' }} className="font-semibold">{playerName}</span>
                                </div>
                                <div className="text-sm font-bold text-sky-300" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {MODE_LABELS[mode]}
                                </div>
                                <div className="text-xs text-slate-400 font-medium">
                                    Level {gameState.level} • Q{gameState.questionsAnswered + 1}
                                </div>
                            </div>
                        </div>
                        <ScoreCounter score={scoreHook.score} combo={scoreHook.combo} multiplier={scoreHook.multiplier} />
                    </div>
                    {mode !== 'remember-the-pattern' && (
                        <TimerBar fraction={timer.fraction} timeRemaining={timer.timeRemaining} />
                    )}
                </div>
            </div>

            {/* Feedback Overlay */}
            <AnimatePresence>
                {gameState.feedbackState && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1.2 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="text-6xl md:text-8xl"
                        >
                            {gameState.feedbackState === 'correct' ? '✅' : '❌'}
                        </motion.div>
                        <div
                            className="absolute inset-0"
                            style={{
                                background:
                                    gameState.feedbackState === 'correct'
                                        ? 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)'
                                        : 'radial-gradient(circle, rgba(251,113,133,0.12) 0%, transparent 70%)',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Level Up Overlay */}
            <AnimatePresence>
                {gameState.feedbackState === 'correct' && gameState.correctAnswers > 0 && gameState.correctAnswers % GAME_CONFIG.QUESTIONS_PER_LEVEL === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-24 left-0 right-0 z-30 flex justify-center pointer-events-none"
                    >
                        <div
                            className="px-6 py-2.5 rounded-full text-base font-bold shadow-xl backdrop-blur-xl"
                            style={{
                                background: 'rgba(52, 211, 153, 0.2)',
                                border: '1px solid rgba(52, 211, 153, 0.5)',
                                color: '#34d399',
                                fontFamily: "'Outfit', sans-serif",
                            }}
                        >
                            🌟 Level Up! → Level {gameState.level}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Puzzle Area */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-2xl">
                    {renderPuzzle()}
                </div>
            </div>
        </div>
    );
}
