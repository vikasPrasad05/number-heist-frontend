import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameMode } from './types/game';
import MultiplayerLobby from './components/game/MultiplayerLobby';
import MultiplayerGameShell from './components/game/MultiplayerGameShell';
import GameShell from './components/game/GameShell';
import NeonButton from './components/ui/NeonButton';
import DailyLeaderboard from './components/game/DailyLeaderboard';
import { useLeaderboard } from './hooks/useLeaderboard';

export default function App() {
  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const [selectedSoloMode, setSelectedSoloMode] = useState<GameMode | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState<string | null>(null);
  const leaderboard = useLeaderboard();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialJoinCode(roomParam.toUpperCase());
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const savedName = localStorage.getItem('number-heist-player-name');
    if (savedName) {
      setPlayerName(savedName);
      setIsNameSubmitted(true);
    }
    setMounted(true);
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim().length >= 2) {
      localStorage.setItem('number-heist-player-name', playerName.trim());
      setIsNameSubmitted(true);
    }
  };

  if (!mounted) return null;

  if (activeRoom) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="multiplayer-game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <MultiplayerGameShell
            roomState={activeRoom}
            playerName={playerName}
            onExit={() => setActiveRoom(null)}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (selectedSoloMode) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="solo-game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <GameShell
            mode={selectedSoloMode}
            playerName={playerName}
            onExit={() => setSelectedSoloMode(null)}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-between items-center relative z-10 py-10 px-4">
      <div className="flex flex-col items-center w-full max-w-5xl mx-auto my-auto gap-8 md:gap-10">
        {/* Main Title & Tagline */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center flex flex-col items-center gap-3"
        >
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight soft-gradient-accent drop-shadow-sm"
            style={{
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            NUM HEIST
          </h1>
          <motion.p
            className="text-sm md:text-base tracking-widest text-slate-300/90 font-medium whitespace-nowrap text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Master numbers. Sharpen your logic. Unlock your mind.
          </motion.p>
        </motion.div>

        {/* Player Name Form or Player Tag + Cards Lobby */}
        <AnimatePresence mode="wait">
          {!isNameSubmitted ? (
            <motion.div
              key="name-entry"
              initial={{ opacity: 0, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md p-8 md:p-10 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-6 text-center text-white/90 tracking-wide font-sans">
                ENTER YOUR NAME
              </h2>
              <form onSubmit={handleNameSubmit} className="space-y-6">
                <div>
                  <label htmlFor="playerName" className="block text-xs uppercase tracking-wider mb-2 text-slate-400 font-medium">
                    Player Name
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-purple-400/50 focus:bg-white/[0.08] transition-all text-lg font-medium text-center tracking-wide placeholder:text-slate-500 text-white"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <NeonButton
                  type="submit"
                  className="w-full py-4 text-base"
                  disabled={playerName.trim().length < 2}
                  color="purple"
                  size="lg"
                >
                  START PLAYING
                </NeonButton>
              </form>
            </motion.div>
          ) : (
            <>
              {/* Floating Top-Left Player Tag */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="fixed top-5 left-5 md:top-6 md:left-6 z-30 flex items-center gap-2.5 bg-slate-900/80 px-5 py-2.5 rounded-full border border-white/10 shadow-2xl backdrop-blur-2xl"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Player:</span>
                <span className="text-sm font-bold tracking-wide text-white">{playerName}</span>
                <button
                  onClick={() => setIsNameSubmitted(false)}
                  className="text-xs tracking-wider text-purple-300/80 hover:text-purple-200 transition-colors ml-2 font-semibold underline"
                >
                  Change
                </button>
              </motion.div>

              {/* Floating Top-Right 24H Daily Leaderboard */}
              <DailyLeaderboard entries={leaderboard.entries} playerName={playerName} />

              <motion.div
                key="multiplayer-lobby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex flex-col items-center"
              >
                {/* Lobby Cards */}
                <MultiplayerLobby
                  playerName={playerName}
                  initialJoinCode={initialJoinCode}
                  onGameStart={(room) => setActiveRoom(room)}
                  onSoloMode={(mode) => setSelectedSoloMode(mode)}
                  onBack={() => setIsNameSubmitted(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-slate-500 font-medium tracking-wider">
            Crafted by Vikas
          </p>
        </motion.div>
      </div>
    </main>
  );
}
