import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Server, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import NeonButton from '../ui/NeonButton';
import GlassCard from '../ui/GlassCard';
import { socket } from '../../lib/socket';
import type { GameMode } from '../../types/game';
import { MODE_LABELS } from '../../types/game';
import ModeSelector from './ModeSelector';



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
    initialJoinCode?: string | null;
    onGameStart: (room: RoomState) => void;
    onSoloMode: (mode: GameMode) => void;
    onBack: () => void;
}

export default function MultiplayerLobby({ playerName, onGameStart, onSoloMode, onBack: _onBack, initialJoinCode }: MultiplayerLobbyProps) {
    const [lobbyView, setLobbyView] = useState<'menu' | 'create' | 'join' | 'in-room' | 'solo-select'>(initialJoinCode ? 'join' : 'menu');
    const [joinCode, setJoinCode] = useState(initialJoinCode || '');
    const [invitePhone, setInvitePhone] = useState('');
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

        const handleRoomCreated = (room: RoomState) => {
            sessionStorage.setItem('mp_room_id', room.id);
            sessionStorage.setItem('mp_player_name', playerName);
            setRoomState(room);
            setLobbyView('in-room');
        };

        const handleRoomJoined = (room: RoomState) => {
            sessionStorage.setItem('mp_room_id', room.id);
            sessionStorage.setItem('mp_player_name', playerName);
            setRoomState(room);
            setLobbyView('in-room');
            setIsJoining(false);
        };

        const handleRoomRejoined = (room: RoomState) => {
            console.log('[Lobby] Rejoined room:', room.id);
            setRoomState(room);
            setLobbyView('in-room');
        };

        const handleRejoinFailed = ({ reason }: { reason: string }) => {
            console.warn('[Lobby] Rejoin failed:', reason);
            sessionStorage.removeItem('mp_room_id');
            sessionStorage.removeItem('mp_player_name');
            setErrorMsg(reason === 'room_gone' ? 'Room expired — please create or join a new one.' : 'Could not rejoin. Please join again.');
        };

        const handleRoomUpdated = (room: RoomState) => {
            setRoomState(room);
        };

        const handleCountdownStep = (count: number) => {
            setCountdown(count);
        };

        const handleGameStarted = () => {
            const currentRoom = roomStateRef.current;
            if (currentRoom) onGameStartRef.current(currentRoom);
        };

        const handleOpponentLeft = ({ name }: { name: string }) => {
            setErrorMsg(`${name} left the room.`);
            setLobbyView('in-room');
        };

        const handleOpponentReconnected = ({ name }: { name: string }) => {
            setErrorMsg('');
            console.log(`[Lobby] ${name} reconnected`);
        };

        const handleOpponentDisconnecting = ({ name }: { name: string }) => {
            setErrorMsg(`${name} disconnected — waiting for them to reconnect...`);
        };

        const handleError = (msg: string) => {
            setErrorMsg(msg);
            setIsJoining(false);
            setLobbyView(prev => {
                if (prev === 'join') {
                    setRoomState(null);
                    return 'menu';
                }
                return prev;
            });
        };

        socket.on('room_created', handleRoomCreated);
        socket.on('room_joined', handleRoomJoined);
        socket.on('room_rejoined', handleRoomRejoined);
        socket.on('rejoin_failed', handleRejoinFailed);
        socket.on('room_updated', handleRoomUpdated);
        socket.on('countdown_step', handleCountdownStep);
        socket.on('game_started', handleGameStarted);
        socket.on('opponent_left', handleOpponentLeft);
        socket.on('opponent_reconnected', handleOpponentReconnected);
        socket.on('opponent_disconnecting', handleOpponentDisconnecting);
        socket.on('error', handleError);

        return () => {
            socket.off('room_created', handleRoomCreated);
            socket.off('room_joined', handleRoomJoined);
            socket.off('room_rejoined', handleRoomRejoined);
            socket.off('rejoin_failed', handleRejoinFailed);
            socket.off('room_updated', handleRoomUpdated);
            socket.off('countdown_step', handleCountdownStep);
            socket.off('game_started', handleGameStarted);
            socket.off('opponent_left', handleOpponentLeft);
            socket.off('opponent_reconnected', handleOpponentReconnected);
            socket.off('opponent_disconnecting', handleOpponentDisconnecting);
            socket.off('error', handleError);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


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

            {/* MENU VIEW - Clean Beautiful Cards without bottom CTA lines */}
            {lobbyView === 'menu' && (
                <motion.div
                    key="menu"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mx-auto"
                >
                    {/* Card 1: Solo Practice */}
                    <motion.div
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={() => setLobbyView('solo-select')}
                        className="glass-card p-7 md:p-8 rounded-3xl relative overflow-hidden cursor-pointer group flex flex-col items-center justify-center text-center border border-emerald-400/20 hover:border-emerald-400/50 shadow-xl transition-all duration-300 min-h-[220px]"
                    >
                        {/* Top Gradient Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
                        
                        {/* Top Badge */}
                        <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
                            OFFLINE
                        </span>
                        
                        <div className="flex flex-col items-center justify-center w-full py-2">
                            <div className="p-3.5 bg-emerald-400/10 rounded-2xl text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-400/20 transition-all mb-4">
                                <Gamepad2 size={30} />
                            </div>

                            <h3 className="text-xl font-extrabold text-white mb-2 tracking-wide text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                Solo Practice
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-300/80 font-normal text-center max-w-[220px]">
                                Play offline & sharpen your math skills across 6 puzzle modes.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 2: Create Room */}
                    <motion.div
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={handleCreateClick}
                        className="glass-card p-7 md:p-8 rounded-3xl relative overflow-hidden cursor-pointer group flex flex-col items-center justify-center text-center border border-purple-400/20 hover:border-purple-400/50 shadow-xl transition-all duration-300 min-h-[220px]"
                    >
                        {/* Top Gradient Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-pink-400" />
                        
                        {/* Top Badge */}
                        <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-purple-400/10 text-purple-300 border border-purple-400/30">
                            MULTIPLAYER
                        </span>
                        
                        <div className="flex flex-col items-center justify-center w-full py-2">
                            <div className="p-3.5 bg-purple-400/10 rounded-2xl text-purple-400 group-hover:scale-110 group-hover:bg-purple-400/20 transition-all mb-4">
                                <Server size={30} />
                            </div>

                            <h3 className="text-xl font-extrabold text-white mb-2 tracking-wide text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                Create Room
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-300/80 font-normal text-center max-w-[220px]">
                                Host a live game room & invite friends for a live battle.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 3: Join Room */}
                    <motion.div
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={handleJoinClick}
                        className="glass-card p-7 md:p-8 rounded-3xl relative overflow-hidden cursor-pointer group flex flex-col items-center justify-center text-center border border-sky-400/20 hover:border-sky-400/50 shadow-xl transition-all duration-300 min-h-[220px]"
                    >
                        {/* Top Gradient Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-400" />
                        
                        {/* Top Badge */}
                        <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase bg-sky-400/10 text-sky-300 border border-sky-400/30">
                            QUICK JOIN
                        </span>
                        
                        <div className="flex flex-col items-center justify-center w-full py-2">
                            <div className="p-3.5 bg-sky-400/10 rounded-2xl text-sky-400 group-hover:scale-110 group-hover:bg-sky-400/20 transition-all mb-4">
                                <Users size={30} />
                            </div>

                            <h3 className="text-xl font-extrabold text-white mb-2 tracking-wide text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                Join Room
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-300/80 font-normal text-center max-w-[220px]">
                                Enter an active 5-digit code to join a live match.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* SOLO SELECT VIEW */}
            {lobbyView === 'solo-select' && (
                <motion.div
                    key="solo-select"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center gap-12 md:gap-16 pt-4 pb-8"
                >
                    <div className="w-full max-w-3xl flex items-center justify-between px-2 gap-4">
                        <button
                            onClick={() => setLobbyView('menu')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-purple-400/40 text-slate-200 hover:text-white text-xs font-semibold tracking-wider transition-all duration-300 shadow-xl backdrop-blur-2xl group shrink-0"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-purple-400" />
                            <span>Back to Menu</span>
                        </button>

                        <h2 className="text-xl md:text-2xl font-black text-center text-white tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            SOLO PRACTICE: Select Mode
                        </h2>

                        <div className="hidden sm:block w-[130px] shrink-0" />
                    </div>

                    <ModeSelector onSelectMode={(mode) => onSoloMode(mode)} />
                </motion.div>
            )}

            {/* CREATE VIEW */}
            {lobbyView === 'create' && (
                <motion.div
                    key="create"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center gap-12 md:gap-16 pt-4 pb-8"
                >
                    <div className="w-full max-w-3xl flex items-center justify-between px-2 gap-4">
                        <button
                            onClick={() => setLobbyView('menu')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-purple-400/40 text-slate-200 hover:text-white text-xs font-semibold tracking-wider transition-all duration-300 shadow-xl backdrop-blur-2xl group shrink-0"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-purple-400" />
                            <span>Back to Menu</span>
                        </button>

                        <h2 className="text-xl md:text-2xl font-black text-center text-white tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Select Game Mode
                        </h2>

                        <div className="hidden sm:block w-[130px] shrink-0" />
                    </div>

                    <ModeSelector onSelectMode={handleModeSelect} />
                </motion.div>
            )}

            {/* JOIN VIEW */}
            {lobbyView === 'join' && (
                <motion.div
                    key="join"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full max-w-md p-8 md:p-10 rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl"
                >
                    <h2 className="text-lg font-bold mb-6 text-center text-white/90 tracking-wide uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>ENTER ROOM CODE</h2>
                    <form onSubmit={submitJoin} className="space-y-6">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="ABC12"
                            maxLength={5}
                            className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-4 outline-none focus:border-emerald-400/50 transition-all text-3xl text-center tracking-[0.4em] font-mono text-white placeholder:text-slate-600"
                            autoFocus
                        />
                        <NeonButton type="submit" className="w-full text-base py-4" disabled={joinCode.trim().length !== 5 || isJoining} color="green">
                            {isJoining ? 'JOINING...' : 'JOIN ROOM'}
                        </NeonButton>
                    </form>
                    <div className="mt-6 flex justify-center">
                        <button onClick={() => setLobbyView('menu')} className="text-slate-400 hover:text-white text-xs uppercase tracking-wider transition-colors font-medium underline">
                            Cancel
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
                            <GlassCard key={`empty-${i}`} className="p-6 flex flex-col items-center justify-center border-dashed">
                                <p className="text-gray-500 uppercase tracking-widest font-bold text-sm mb-6">WAITING FOR OPPONENT...</p>
                                
                                <div className="w-full max-w-xs space-y-3">
                                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] text-center border-b border-white/5 pb-2 mb-2">Invite via WhatsApp</p>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Phone (e.g. 919876543210)" 
                                            value={invitePhone}
                                            onChange={(e) => setInvitePhone(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-[#25D366] transition-colors text-xs font-mono placeholder:text-white/20"
                                        />
                                        <button 
                                            onClick={() => {
                                                if(invitePhone.length > 5) {
                                                    const text = encodeURIComponent(`Hey! Join my Number Heist match.\nRoom Code: ${roomState.id}\nLink: ${window.location.origin}/?room=${roomState.id}`);
                                                    window.open(`https://wa.me/${invitePhone}?text=${text}`, '_blank');
                                                }
                                            }}
                                            className="bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 rounded-lg px-4 hover:bg-[#25D366]/20 transition-colors text-xs uppercase tracking-widest font-bold"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
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


        </div>
    );
}
