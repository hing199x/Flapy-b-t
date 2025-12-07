import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GRAVITY,
  JUMP_STRENGTH,
  PIPE_SPEED,
  PIPE_SPAWN_RATE,
  BIRD_SIZE,
  PIPE_WIDTH,
  GAP_SIZE,
  GROUND_HEIGHT,
  MAX_Y,
} from './constants';
import { GameState, PipeData } from './types';
import Bird from './components/Bird';
import Pipe from './components/Pipe';
import { getGameCommentary } from './services/geminiService';
import { playJumpSound, playScoreSound, playCrashSound, ensureAudioContext } from './utils/audio';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [birdY, setBirdY] = useState(GAME_HEIGHT / 2);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [pipes, setPipes] = useState<PipeData[]>([]);
  const [aiComment, setAiComment] = useState<string>('');
  const [isLoadingComment, setIsLoadingComment] = useState(false);

  // Refs for game loop
  const birdYRef = useRef(GAME_HEIGHT / 2);
  const birdVelocityRef = useRef(0);
  const pipesRef = useRef<PipeData[]>([]);
  const frameRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const loopRef = useRef<number | null>(null);
  const speedRef = useRef(PIPE_SPEED);

  const resetGame = () => {
    setGameState(GameState.START);
    setScore(0);
    setBirdY(GAME_HEIGHT / 2);
    setBirdVelocity(0);
    setPipes([]);
    setAiComment('');
    
    birdYRef.current = GAME_HEIGHT / 2;
    birdVelocityRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    frameRef.current = 0;
    speedRef.current = PIPE_SPEED;
  };

  const startGame = () => {
    ensureAudioContext();
    resetGame();
    setGameState(GameState.PLAYING);
    playJumpSound();
  };

  const jump = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      birdVelocityRef.current = JUMP_STRENGTH;
      playJumpSound();
    } else if (gameState === GameState.START) {
      startGame();
      birdVelocityRef.current = JUMP_STRENGTH;
    }
  }, [gameState]);

  const handleGameOver = async () => {
    playCrashSound();
    setGameState(GameState.GAME_OVER);
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }

    const currentScore = scoreRef.current;
    if (currentScore > highScore) {
      setHighScore(currentScore);
    }

    // Call Gemini
    setIsLoadingComment(true);
    const comment = await getGameCommentary(currentScore);
    setAiComment(comment);
    setIsLoadingComment(false);
  };

  const gameLoop = () => {
    // Increase difficulty: speed up slightly every 5 points
    const difficultyMultiplier = Math.floor(scoreRef.current / 5) * 0.2;
    speedRef.current = PIPE_SPEED + Math.min(difficultyMultiplier, 3); // Max speed increase cap

    // 1. Update Physics
    birdVelocityRef.current += GRAVITY;
    birdYRef.current += birdVelocityRef.current;

    // 2. Spawn Pipes
    frameRef.current++;
    // Adjust spawn rate based on speed to keep gap somewhat consistent
    const currentSpawnRate = Math.max(PIPE_SPAWN_RATE - Math.floor(scoreRef.current / 2), 60);

    if (frameRef.current % currentSpawnRate === 0) {
      const minPipeHeight = 50;
      const maxPipeHeight = GAME_HEIGHT - GROUND_HEIGHT - GAP_SIZE - minPipeHeight;
      const randomHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
      
      pipesRef.current.push({
        id: frameRef.current,
        x: GAME_WIDTH,
        topHeight: randomHeight,
        passed: false,
      });
    }

    // 3. Move Pipes & Clean up
    pipesRef.current.forEach(pipe => {
      pipe.x -= speedRef.current;
    });
    
    if (pipesRef.current.length > 0 && pipesRef.current[0].x < -PIPE_WIDTH) {
      pipesRef.current.shift();
    }

    // 4. Collision Detection
    const birdRect = {
      left: 50 + 6, // tighter hitbox
      right: 50 + BIRD_SIZE - 6,
      top: birdYRef.current + 6,
      bottom: birdYRef.current + BIRD_SIZE - 6,
    };

    // Ground/Ceiling
    if (birdRect.bottom >= GAME_HEIGHT - GROUND_HEIGHT || birdRect.top <= 0) {
      handleGameOver();
      return;
    }

    // Pipes
    let collided = false;
    pipesRef.current.forEach(pipe => {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;

      if (birdRect.right > pipeLeft && birdRect.left < pipeRight) {
        if (birdRect.top < pipe.topHeight || birdRect.bottom > pipe.topHeight + GAP_SIZE) {
          collided = true;
        }
      }

      if (!pipe.passed && birdRect.left > pipeRight) {
        pipe.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
        playScoreSound();
      }
    });

    if (collided) {
      handleGameOver();
      return;
    }

    setBirdY(birdYRef.current);
    setPipes([...pipesRef.current]);

    loopRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      loopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  // Determine Background Gradient based on Score (Day -> Dusk -> Night)
  const getBackgroundGradient = () => {
    if (score < 10) return "bg-gradient-to-b from-sky-300 to-blue-200"; // Day
    if (score < 20) return "bg-gradient-to-b from-orange-400 to-yellow-200"; // Dusk
    return "bg-gradient-to-b from-indigo-900 to-purple-800"; // Night
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 sm:p-4 font-sans select-none overflow-hidden touch-none">
      
      <div className="relative w-full h-full sm:h-auto max-w-md flex flex-col items-center gap-4 sm:gap-6">
        
        {/* Header / Score Board */}
        <div className="absolute top-8 w-full px-8 flex justify-between items-center z-40 pointer-events-none">
           <div className="flex flex-col">
             <span className="text-white text-xs font-bold uppercase drop-shadow-md">Score</span>
             <span className="text-4xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">{score}</span>
           </div>
           <div className="flex flex-col text-right">
             <span className="text-white/80 text-xs font-bold uppercase drop-shadow-md">Best</span>
             <span className="text-2xl font-bold text-yellow-400 drop-shadow-md">{highScore}</span>
           </div>
        </div>

        {/* Game Area */}
        <div 
          onPointerDown={jump}
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
          className={`relative ${getBackgroundGradient()} overflow-hidden shadow-2xl sm:rounded-xl sm:border-4 border-slate-800 cursor-pointer transition-colors duration-[2000ms] ring-4 ring-slate-900/50`}
        >
          {/* Background Decor - Clouds/Stars */}
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000">
             {score >= 20 ? (
               // Stars for Night
               <>
                 <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                 <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-75"></div>
                 <div className="absolute top-40 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse delay-150"></div>
               </>
             ) : (
               // Clouds for Day
               <>
                 <div className="absolute top-20 left-10 text-white/40"><CloudIcon size={60} /></div>
                 <div className="absolute top-40 right-20 text-white/30"><CloudIcon size={40} /></div>
               </>
             )}
          </div>

          {/* Game Objects */}
          <Bird y={birdY} velocity={birdVelocityRef.current} />
          {pipes.map(pipe => (
            <Pipe key={pipe.id} pipe={pipe} />
          ))}

          {/* Ground */}
          <div 
            style={{ height: GROUND_HEIGHT }}
            className="absolute bottom-0 w-full bg-[#ded895] border-t-4 border-[#73bf2e] z-30"
          >
             <div 
               className={`w-full h-full opacity-50 ${gameState === GameState.PLAYING ? 'animate-scrolling-bg' : ''}`}
               style={{
                  backgroundImage: 'linear-gradient(135deg, #d0c874 25%, transparent 25%, transparent 50%, #d0c874 50%, #d0c874 75%, transparent 75%, transparent)',
                  backgroundSize: '20px 20px',
                  animationDuration: `${2 / (speedRef.current / PIPE_SPEED)}s` // Speed up animation visually
               }}
             />
          </div>

          {/* Start Screen */}
          {gameState === GameState.START && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 z-40 backdrop-blur-[2px]">
              <div className="bg-white p-6 rounded-2xl shadow-xl text-center animate-bounce-slow max-w-[80%]">
                <h1 className="text-2xl font-black text-sky-500 mb-1 tracking-tighter uppercase">Flappy AI</h1>
                <p className="text-slate-500 text-sm mb-4">Chạm để nhảy</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); startGame(); }}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-10 rounded-full transition-transform active:scale-95 shadow-[0_4px_0_#15803d]"
                >
                  PLAY
                </button>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-50 backdrop-blur-sm px-6">
              <div className="bg-white p-5 rounded-2xl shadow-2xl text-center w-full max-w-xs border-4 border-slate-200">
                <h2 className="text-3xl font-black text-slate-800 mb-4">GAME OVER</h2>
                
                {/* AI Commentary Section */}
                <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-4 min-h-[70px] flex items-center justify-center">
                  {isLoadingComment ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>AI đang nghĩ lời cà khịa...</span>
                    </div>
                  ) : (
                    <p className="text-slate-700 italic font-semibold text-sm leading-snug">
                      "{aiComment || 'Keep flying!'}"
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                   <div className="bg-orange-100 rounded-lg p-2">
                      <div className="text-[10px] uppercase font-bold text-orange-600">Score</div>
                      <div className="text-2xl font-bold text-slate-800">{score}</div>
                   </div>
                   <div className="bg-yellow-100 rounded-lg p-2">
                      <div className="text-[10px] uppercase font-bold text-yellow-600">Best</div>
                      <div className="text-2xl font-bold text-slate-800">{highScore}</div>
                   </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); startGame(); }}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-8 rounded-xl transition-all active:scale-95 shadow-[0_4px_0_#0369a1]"
                >
                  Thử lại ngay
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile PWA Install Hint */}
        <div className="hidden sm:block text-slate-400 text-xs max-w-xs text-center">
           Mẹo: Thêm vào màn hình chính để chơi full màn hình như app xịn!
        </div>

        <style>{`
          @keyframes scrolling-bg {
            0% { background-position: 0 0; }
            100% { background-position: 20px 0; }
          }
          .animate-scrolling-bg {
            animation: scrolling-bg 0.5s linear infinite;
          }
          .animate-bounce-slow {
            animation: bounce 2s infinite;
          }
        `}</style>
      </div>
    </div>
  );
};

const CloudIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size / 1.6} viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.5 2C16.8 2 15.3 2.9 14.4 4.3C13.8 3.5 12.9 3 11.9 3C9.8 3 8.1 4.5 7.6 6.5C7.4 6.5 7.2 6.5 7 6.5C3.7 6.5 1 9.2 1 12.5C1 15.8 3.7 18.5 7 18.5H19C21.8 18.5 24 16.3 24 13.5C24 10.7 21.8 8.5 19 8.5C19 4.9 16.1 2 12.5 2H18.5Z" transform="translate(0 -2) scale(1)"/>
  </svg>
);

export default App;
