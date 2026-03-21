import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NeonButton from '../ui/NeonButton';
import GlassCard from '../ui/GlassCard';
import { socket } from '../../lib/socket';
import type { GameMode } from '../../types/game';
import { MODE_LABELS } from '../../types/game';
import ModeSelector from './ModeSelector';

const VaultScene = lazy(() => import('../three/VaultScene'));

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

interface MultiplayerLobbyProps {
    playerName: string;
    onGameStart: (room: RoomState) => void;
    onSoloMode: (mode: GameMode) => void;
    onBack: () => void;
}

export default function MultiplayerLobby({ playerName, onGameStart, onSoloMode, onBack: _onBack }: MultiplayerLobbyProps) {
    const [lobbyView, setLobbyView] = useState<'menu' | 'create' | 'join' | 'in-room' | 'solo-select'>('menu');
    const [joinCode, setJoinCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isJoining, setIsJoining] = useState(false);

    // Use a ref to hold the latest roomState — avoids stale closure in socket callbacks
    const roomStateRef = useRef<RoomState | null>(null);
    useEffect(() => {
        roomStateRef.current = roomState;
    }, [roomState]);

    // Also keep a stable ref to the onGameStart callback
    const onGameStartRef = useRef(onGameStart);
    useEffect(() => { onGameStartRef.current = onGameStart; }, [onGameStart]);

    useEffect(() => {
        // ── Attempt rejoin if page was refreshed ──────────────────────────────
        const savedRoom = sessionStorage.getItem('mp_room_id');
        const savedName = sessionStorage.getItem('mp_player_name');
        if (savedRoom && savedName === playerName) {
            console.log('[Lobby] Attempting rejoin:', savedRoom);
            socket.emit('rejoin_room', { roomId: savedRoom, playerName: savedName });
        }

        // room_created: Host created a room
        socket.on('room_created', (room) => {
            sessionStorage.setItem('mp_room_id', room.id);
            sessionStorage.setItem('mp_player_name', playerName);
            setRoomState(room);
            setLobbyView('in-room');
        });

        // room_joined: Player 2 joined successfully
        socket.on('room_joined', (room) => {
            sessionStorage.setItem('mp_room_id', room.id);
            sessionStorage.setItem('mp_player_name', playerName);
            setRoomState(room);
            setLobbyView('in-room');
            setIsJoining(false);
        });

        // room_rejoined: Successful rejoin after page refresh
        socket.on('room_rejoined', (room) => {
            console.log('[Lobby] Rejoined room:', room.id);
            setRoomState(room);
            setLobbyView('in-room');
        });

        // rejoin_failed: Grace period expired or room gone
        socket.on('rejoin_failed', ({ reason }: { reason: string }) => {
            console.warn('[Lobby] Rejoin failed:', reason);
            sessionStorage.removeItem('mp_room_id');
            sessionStorage.removeItem('mp_player_name');
            setErrorMsg(reason === 'room_gone' ? 'Room expired — please create or join a new one.' : 'Could not rejoin. Please join again.');
        });

        // room_updated: Any state change
        socket.on('room_updated', (room) => {
            setRoomState(room);
        });

        socket.on('countdown_step', (count) => {
            setCountdown(count);
        });

        // game_started: Use ref to get fresh roomState (avoid stale closure)
        socket.on('game_started', () => {
            const currentRoom = roomStateRef.current;
            if (currentRoom) onGameStartRef.current(currentRoom);
        });

        // opponent_left: Other player intentionally left or timed out
        socket.on('opponent_left', ({ name }: { name: string }) => {
            setErrorMsg(`${name} left the room.`);
            setLobbyView('in-room'); // stay in room, let host ready again
        });

        // opponent_reconnected: Other player came back after refresh
        socket.on('opponent_reconnected', ({ name }: { name: string }) => {
            setErrorMsg(''); // clear any disconnecting warning
            console.log(`[Lobby] ${name} reconnected`);
        });

        // opponent_disconnecting: Other player disconnected (grace period started)
        socket.on('opponent_disconnecting', ({ name }: { name: string }) => {
            setErrorMsg(`${name} disconnected — waiting for them to reconnect...`);
        });

        socket.on('error', (msg) => {
            setErrorMsg(msg);
            setIsJoining(false);
            setLobbyView(prev => {
                if (prev === 'join') {
                    setRoomState(null);
                    return 'menu';
                }
                return prev;
            });
        });

        return () => {
            socket.off('room_created');
            socket.off('room_joined');
            socket.off('room_rejoined');
            socket.off('rejoin_failed');
            socket.off('room_updated');
            socket.off('countdown_step');
            socket.off('game_started');
            socket.off('opponent_left');
            socket.off('opponent_reconnected');
            socket.off('opponent_disconnecting');
            socket.off('error');
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Register once on mount — refs handle fresh values


    const handleCreateClick = () => {
        setLobbyView('create');
        setErrorMsg('');
    };

    const handleJoinClick = () => {
        setLobbyView('join');
        setErrorMsg('');
    };

    const handleModeSelect = (mode: GameMode) => {
        socket.emit('create_room', { playerName, mode });
    };

    const submitJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (isJoining) return; // Prevent double-submit
        const code = joinCode.trim().toUpperCase();
        if (code.length === 5) {
            setIsJoining(true);
            setErrorMsg('');
            socket.emit('join_room', { roomId: code, playerName });
        }
    };

    const handleReady = () => {
        if (!roomState) return;
        socket.emit('player_ready', { roomId: roomState.id });
    };

    const handleLeaveRoom = () => {
        socket.emit('leave_room');
        sessionStorage.removeItem('mp_room_id');
        sessionStorage.removeItem('mp_player_name');
        setLobbyView('menu');
        setRoomState(null);
        setCountdown(null);
        setErrorMsg('');
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
            <AnimatePresence mode="wait">
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg mb-6 text-center text-sm font-bold tracking-wider"
                    >
                        {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MENU VIEW */}
            {lobbyView === 'menu' && (
                <motion.div
                    key="menu"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-stretch"
                >
                    <GlassCard className="flex-1 p-8 flex flex-col items-center justify-center text-center group">
                        <h3 className="text-sm font-semibold mb-3 tracking-[0.2em] text-white/90 uppercase">Solo Mode</h3>
                        <p className="text-xs text-white/40 mb-8 font-mono">Immediate access. Perfect for training.</p>
                        <NeonButton color="green" onClick={() => setLobbyView('solo-select')} className="w-full">TRAIN SOLO</NeonButton>
                    </GlassCard>

                    <GlassCard className="flex-1 p-8 flex flex-col items-center justify-center text-center group">
                        <h3 className="text-sm font-semibold mb-3 tracking-[0.2em] text-white/90 uppercase">Create Room</h3>
                        <p className="text-xs text-white/40 mb-8 font-mono">Host a match and select the game mode.</p>
                        <NeonButton color="blue" onClick={handleCreateClick} className="w-full">HOST ROOM</NeonButton>
                    </GlassCard>

                    <GlassCard className="flex-1 p-8 flex flex-col items-center justify-center text-center group">
                        <h3 className="text-sm font-semibold mb-3 tracking-[0.2em] text-white/90 uppercase">Join Room</h3>
                        <p className="text-xs text-white/40 mb-8 font-mono">Join an existing match via access code.</p>
                        <NeonButton color="purple" onClick={handleJoinClick} className="w-full">JOIN PLAYER</NeonButton>
                    </GlassCard>
                </motion.div>
            )}

            {/* SOLO SELECT VIEW */}
            {lobbyView === 'solo-select' && (
                <motion.div
                    key="solo-select"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                >
                    <h2 className="text-lg font-semibold text-center mb-10 text-white/90 tracking-[0.2em] uppercase">SOLO TRAINING: Select Mode</h2>
                    <ModeSelector onSelectMode={(mode) => onSoloMode(mode)} />
                    <div className="mt-8 flex justify-center">
                        <button onClick={() => setLobbyView('menu')} className="text-gray-500 hover:text-white text-sm uppercase tracking-widest transition-colors font-mono">
                            [ Back To Menu ]
                        </button>
                    </div>
                </motion.div>
            )}

            {/* CREATE VIEW */}
            {lobbyView === 'create' && (
                <motion.div
                    key="create"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                >
                    <h2 className="text-lg font-semibold text-center mb-10 text-white/90 tracking-[0.2em] uppercase">Select Game Mode</h2>
                    <ModeSelector onSelectMode={handleModeSelect} />
                    <div className="mt-8 flex justify-center">
                        <button onClick={() => setLobbyView('menu')} className="text-gray-500 hover:text-white text-sm uppercase tracking-widest transition-colors font-mono">
                            [ Cancel ]
                        </button>
                    </div>
                </motion.div>
            )}

            {/* JOIN VIEW */}
            {lobbyView === 'join' && (
                <motion.div
                    key="join"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full max-w-md p-10 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl"
                >
                    <h2 className="text-sm font-semibold mb-8 text-center tracking-[0.2em] text-white/90 uppercase">ENTER ROOM CODE</h2>
                    <form onSubmit={submitJoin} className="space-y-8">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="ABC12"
                            maxLength={5}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-white/30 transition-all text-2xl text-center tracking-[0.5em] font-mono placeholder:text-white/20"
                            autoFocus
                        />
                        <NeonButton type="submit" className="w-full" disabled={joinCode.trim().length !== 5 || isJoining} color="green">
                            {isJoining ? 'JOINING...' : 'ACCESS'}
                        </NeonButton>
                    </form>
                    <div className="mt-6 flex justify-center">
                        <button onClick={() => setLobbyView('menu')} className="text-gray-500 hover:text-white text-sm uppercase tracking-widest transition-colors font-mono">
                            [ Cancel ]
                        </button>
                    </div>
                </motion.div>
            )}

            {/* IN-ROOM VIEW */}
            {lobbyView === 'in-room' && roomState && (
                <motion.div
                    key="in-room"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-3xl"
                >
                    <div className="flex flex-col items-center mb-10 text-center">
                        <h2 className="text-2xl font-bold tracking-[0.2em] text-white">
                            ROOM: <span className="text-white/70 font-mono tracking-widest ml-2">{roomState.id}</span>
                        </h2>
                        <div className="flex items-center gap-3 mt-4 text-xs font-mono uppercase tracking-[0.2em]">
                            <span className="text-white/40">Mode:</span>
                            <span className="text-white/90 bg-white/10 px-3 py-1 rounded-full">{MODE_LABELS[roomState.mode]}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        {roomState.players.map((p) => {
                            const isMe = p.id === socket.id;
                            return (
                                <GlassCard key={p.id} className="p-6 relative overflow-hidden" glow={p.ready ? 'green' : 'none'}>
                                    <h3 className={`text-lg font-medium mb-1 tracking-[0.1em] ${isMe ? 'text-white' : 'text-white/70'}`}>
                                        {p.name} {isMe ? '(YOU)' : ''}
                                    </h3>
                                    {p.isHost && <p className="text-[10px] text-white/40 mb-6 uppercase font-mono tracking-[0.2em]">Host</p>}

                                    <div className="mt-4">
                                        {p.ready ? (
                                            <span className="text-[#00ff88] font-medium uppercase tracking-[0.2em] text-[10px] bg-[#00ff88]/10 px-3 py-1.5 rounded-full border border-[#00ff88]/20">
                                                READY
                                            </span>
                                        ) : (
                                            <span className="text-white/40 font-medium uppercase tracking-[0.2em] text-[10px] bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                                                WAITING
                                            </span>
                                        )}
                                    </div>
                                </GlassCard>
                            );
                        })}
                        {/* Empty slot if less than 2 players */}
                        {Array.from({ length: 2 - roomState.players.length }).map((_, i) => (
                            <GlassCard key={`empty-${i}`} className="p-6 flex items-center justify-center opacity-50 border-dashed">
                                <p className="text-gray-500 uppercase tracking-widest font-bold text-sm">WAITING FOR OPPONENT...</p>
                            </GlassCard>
                        ))}
                    </div>

                    <div className="flex justify-center flex-col items-center">
                        {countdown !== null ? (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                key={countdown}
                                className="text-6xl font-light text-white tracking-widest"
                            >
                                {countdown}
                            </motion.div>
                        ) : (
                            <NeonButton
                                color={roomState.players.find(p => p.id === socket.id)?.ready ? 'green' : 'blue'}
                                onClick={handleReady}
                                disabled={roomState.players.find(p => p.id === socket.id)?.ready || roomState.players.length < 2}
                                className="w-full max-w-md"
                            >
                                {roomState.players.find(p => p.id === socket.id)?.ready ? 'READY' : 'MARK AS READY'}
                            </NeonButton>
                        )}

                        {countdown === null && (
                            <button onClick={handleLeaveRoom} className="mt-6 text-gray-500 hover:text-white text-sm uppercase tracking-widest transition-colors font-mono">
                                [ Leave Room ]
                            </button>
                        )}
                    </div>
                </motion.div>
            )}

            <div className="w-full h-[180px] md:h-[220px] mt-8 relative z-0">
                <Suspense fallback={null}>
                    <VaultScene />
                </Suspense>
            </div>
        </div>
    );
}
