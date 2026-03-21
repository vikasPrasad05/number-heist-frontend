import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../../lib/socket';
import type { GameMode, Puzzle } from '../../types/game';
import { MODE_LABELS } from '../../types/game';
import { generatePuzzle } from '../../engine/puzzleGenerators';
import SpeedMath from './SpeedMath';
import PatternRecognition from './PatternRecognition';
import HiddenOperator from './HiddenOperator';
import MultiStepLogic from './MultiStepLogic';
import RememberThePattern from './RememberThePattern';
import NeonButton from '../ui/NeonButton';
import GlassCard from '../ui/GlassCard';

interface Player {
    id: string;
    name: string;
    score: number;
    ready: boolean;
    connected: boolean;
    isHost: boolean;
}

interface RoomState {
    id: string;
    status: string;
    players: Player[];
    mode: GameMode;
    round: number;
    maxRounds: number;
}

interface MultiplayerGameShellProps {
    roomState: RoomState;
    playerName: string;
    onExit: () => void;
}

export default function MultiplayerGameShell({ roomState: initialRoomState, playerName, onExit }: MultiplayerGameShellProps) {
    const [roomState, setRoomState] = useState<RoomState>(initialRoomState);
    const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
    const [roundWinner, setRoundWinner] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);
    const [opponentReconnecting, setOpponentReconnecting] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [suddenDeath, setSuddenDeath] = useState(false);

    const clientId = socket.id;
    const me = roomState.players.find(p => p.id === clientId);
    const opponent = roomState.players.find(p => p.id !== clientId);
    const isHost = me?.isHost;

    // Refs so socket callbacks always have fresh values (no stale closures)
    const isHostRef = useRef(isHost);
    const roomStateRef = useRef(roomState);
    useEffect(() => { isHostRef.current = isHost; }, [isHost]);
    useEffect(() => { roomStateRef.current = roomState; }, [roomState]);

    useEffect(() => {
        socket.on('room_updated', (updatedRoom) => {
            setRoomState(updatedRoom);
            if (updatedRoom.status === 'results' || updatedRoom.status === 'ended') {
                setIsGameOver(true);
            }
        });

        socket.on('sync_puzzle', (data) => {
            setPuzzle(data.puzzle);
            setIsLocked(false);
            setRoundWinner(null);
            setFeedback(null);
        });

        socket.on('round_end', (data) => {
            setRoundWinner(data.winnerName);
            setIsLocked(true);
        });

        // Host publishes puzzle at the start of each round
        socket.on('round_start', (data) => {
            setRoundWinner(null);
            setPuzzle(null);
            if (isHostRef.current) {
                const room = roomStateRef.current;
                const level = Math.ceil(data.round / 2) || 1;
                const newPuzzle = generatePuzzle(room.mode, level);
                socket.emit('publish_puzzle', { roomId: room.id, puzzle: newPuzzle });
            }
        });

        // Host also publishes the very first puzzle when game_started fires
        socket.on('game_started', () => {
            if (isHostRef.current) {
                const room = roomStateRef.current;
                const level = 1;
                const newPuzzle = generatePuzzle(room.mode, level);
                socket.emit('publish_puzzle', { roomId: room.id, puzzle: newPuzzle });
            }
        });

        socket.on('player_wrong', (data) => {
            if (data.id === socket.id) {
                setFeedback('wrong');
                setTimeout(() => setFeedback(null), 1000);
            }
        });

        socket.on('game_over', () => {
            setIsGameOver(true);
        });

        // opponent_left: Other player intentionally left or timed out after grace period
        socket.on('opponent_left', () => {
            setOpponentDisconnected(true);
            setIsGameOver(true);
            sessionStorage.removeItem('mp_room_id');
            sessionStorage.removeItem('mp_player_name');
        });

        // opponent_disconnecting: Opponent lost connection, grace period started
        socket.on('opponent_disconnecting', () => {
            setOpponentReconnecting(true);
        });

        // opponent_reconnected: Opponent came back during grace period
        socket.on('opponent_reconnected', () => {
            setOpponentReconnecting(false);
        });

        // Keep old error handler for any other errors
        socket.on('error', (msg) => {
            console.warn('[GameShell] socket error:', msg);
        });

        socket.on('sudden_death', () => {
            setSuddenDeath(true);
            setTimeout(() => setSuddenDeath(false), 3000);
        });

        return () => {
            socket.off('room_updated');
            socket.off('sync_puzzle');
            socket.off('round_end');
            socket.off('round_start');
            socket.off('game_started');
            socket.off('player_wrong');
            socket.off('game_over');
            socket.off('opponent_left');
            socket.off('opponent_disconnecting');
            socket.off('opponent_reconnected');
            socket.off('error');
            socket.off('sudden_death');
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Listeners registered once — refs keep values fresh

    // On mount: if host and game is already playing, publish the first puzzle immediately.
    // (game_started fires in MultiplayerLobby before this component mounts, so we can't catch it here)
    useEffect(() => {
        if (isHostRef.current && roomStateRef.current.status === 'playing') {
            const room = roomStateRef.current;
            const level = Math.ceil((room.round || 1) / 2) || 1;
            const newPuzzle = generatePuzzle(room.mode, level);
            socket.emit('publish_puzzle', { roomId: room.id, puzzle: newPuzzle });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run only on mount

    const handleAnswer = useCallback((correct: boolean) => {
        if (isLocked) return;

        if (correct) {
            setFeedback('correct');
            const points = roomState.round * 100;
            socket.emit('submit_answer', { roomId: roomState.id, correct: true, points, playerName });
            setIsLocked(true);
        } else {
            socket.emit('submit_answer', { roomId: roomState.id, correct: false, points: 0, playerName });
            setIsLocked(true);
            setTimeout(() => setIsLocked(false), 1000);
        }
    }, [isLocked, roomState.round, roomState.id, playerName]);

    if (isGameOver) {
        const myScore = me?.score || 0;
        const opScore = opponent?.score || 0;
        const didWin = myScore > opScore;
        const isTie = myScore === opScore;
        const title = opponentDisconnected ? "OPPONENT FLED" : didWin ? "VICTORY" : isTie ? "DRAW" : "DEFEAT";
        const color = didWin ? "text-[#00ff88]" : isTie ? "text-[#00d4ff]" : "text-[#ff3366]";

        const myReadyForRematch = me?.ready || false;
        const opReadyForRematch = opponent?.ready || false;

        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <GlassCard className="w-full max-w-lg p-8 text-center relative overflow-hidden" glow={didWin ? "green" : "red"}>
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)' }} />

                    <h1 className={`text-4xl md:text-6xl font-black tracking-widest mb-4 ${color}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        {title}
                    </h1>

                    <div className="flex justify-between items-center my-8 p-6 bg-white/5 rounded-2xl border border-white/10 font-mono">
                        <div className="text-left">
                            <p className="text-[10px] text-gray-400 mb-1 tracking-widest uppercase">{me?.name || 'YOU'}</p>
                            <p className={`text-3xl font-bold ${myScore >= opScore ? "text-white" : "text-gray-400"}`}>{myScore.toLocaleString()}</p>
                            {myReadyForRematch && <p className="text-[10px] text-[#00ff88] mt-2 tracking-widest uppercase font-bold">READY</p>}
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-12 w-px bg-white/10" />
                            <span className="text-gray-500 text-xs tracking-widest">VS</span>
                            <div className="h-12 w-px bg-white/10" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 mb-1 tracking-widest uppercase">{opponent?.name || 'OPPONENT'}</p>
                            <p className={`text-3xl font-bold ${opScore >= myScore ? "text-white" : "text-gray-400"}`}>{opScore.toLocaleString()}</p>
                            {opReadyForRematch && <p className="text-[10px] text-[#00ff88] mt-2 tracking-widest uppercase font-bold">READY</p>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 max-w-xs mx-auto mt-8">
                        <NeonButton
                            onClick={() => socket.emit('request_rematch', { roomId: roomState.id })}
                            color="green"
                            disabled={myReadyForRematch}
                            className="w-full"
                        >
                            {myReadyForRematch ? "WAITING FOR OPPONENT..." : "REQUEST REMATCH"}
                        </NeonButton>
                        <NeonButton
                            onClick={() => {
                                socket.emit('leave_room');
                                sessionStorage.removeItem('mp_room_id');
                                sessionStorage.removeItem('mp_player_name');
                                onExit();
                            }}
                            color="blue"
                            className="w-full"
                        >
                            EXIT TO MENU
                        </NeonButton>
                    </div>
                </GlassCard>
            </div>
        );
    }

    const renderPuzzle = () => {
        if (!puzzle && roomState.mode !== 'remember-the-pattern') return (
            <div className="text-center">
                <div className="inline-block w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-[#00d4ff] animate-pulse uppercase tracking-widest text-sm font-bold">
                    Awaiting Server Sync...
                </div>
            </div>
        );

        if (roomState.mode === 'remember-the-pattern') {
            return (
                <RememberThePattern
                    key={`${roomState.round}-${puzzle?.type === 'remember-the-pattern' ? puzzle.sequence.join('') : ''}`}
                    level={roomState.round}
                    correctAnswers={roomState.round - 1}
                    onAnswer={handleAnswer}
                    locked={isLocked}
                    syncedPuzzle={puzzle?.type === 'remember-the-pattern' ? puzzle : undefined}
                />
            );
        }

        switch (puzzle?.type) {
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
            <div className="sticky top-0 z-30 px-4 py-4 backdrop-blur-md bg-black/50 border-b border-white/10">
                <div className="max-w-4xl mx-auto flex justify-between gap-4 items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-gray-400 tracking-widest">{me?.name || 'YOU'}</span>
                        <span className="text-xl font-bold text-[#00d4ff] font-mono">{me?.score.toLocaleString()}</span>
                    </div>

                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase text-gray-500 tracking-widest">
                            {MODE_LABELS[roomState.mode]}
                        </span>
                        <span className="text-sm font-bold text-white uppercase tracking-widest">
                            {suddenDeath ? <span className="text-red-500 animate-pulse">SUDDEN DEATH</span> : `Round ${roomState.round} / ${roomState.maxRounds}`}
                        </span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase text-gray-400 tracking-widest">{opponent?.name || 'OPPONENT'}</span>
                        <span className="text-xl font-bold text-[#b44dff] font-mono">{opponent?.score.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-0">
                <AnimatePresence>
                    {feedback && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center"
                        >
                            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1.2 }} exit={{ scale: 0, opacity: 0 }} className="text-6xl md:text-8xl">
                                {feedback === 'correct' ? '✅' : '❌'}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {renderPuzzle()}
            </div>
            
            <AnimatePresence>
                {opponentReconnecting && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 px-6 py-4 rounded-xl font-bold tracking-widest uppercase text-center">
                            <div className="inline-block w-4 h-4 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin mr-3" />
                            Opponent reconnecting...
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {roundWinner && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="text-center">
                            <h2 className="text-sm font-bold text-white/40 tracking-widest uppercase mb-2">ROUND WINNER</h2>
                            <p className="text-4xl text-[#00ff88] font-black tracking-widest">{roundWinner}</p>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
