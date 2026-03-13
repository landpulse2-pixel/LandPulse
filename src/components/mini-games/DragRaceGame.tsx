'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'AI_RACING' | 'TRANSITION' | 'RESULTS';
type ShiftQuality = 'PERFECT' | 'GOOD' | 'BAD' | null;
type Player = { id: 1 | 2; name: string; avatar: string; color: string; isAI?: boolean };
type RaceResult = { player: Player; time: number; distance: number; bestShift: ShiftQuality };

const AI_SKILL_LEVELS = {
  easy: { perfectChance: 0.2, goodChance: 0.4, reactionTime: [400, 700] },
  medium: { perfectChance: 0.4, goodChance: 0.7, reactionTime: [250, 450] },
  hard: { perfectChance: 0.65, goodChance: 0.85, reactionTime: [150, 300] }
};
type AISkill = keyof typeof AI_SKILL_LEVELS;

export default function DragRaceGame({ 
  onDuelComplete,
  players: initialPlayers,
  aiSkill = 'medium'
}: { 
  onDuelComplete?: (results: RaceResult[]) => void;
  players?: [Player, Player];
  aiSkill?: AISkill;
}) {
  const defaultPlayers: [Player, Player] = [
    { id: 1, name: 'Vous', avatar: '🔵', color: 'from-blue-500 to-cyan-500', isAI: false },
    { id: 2, name: 'MotoBot', avatar: '🤖', color: 'from-red-500 to-orange-500', isAI: true }
  ];
  const [players] = useState<[Player, Player]>(initialPlayers || defaultPlayers);
  
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [currentPlayer, setCurrentPlayer] = useState<Player>(players[0]);
  const [results, setResults] = useState<RaceResult[]>([]);
  
  const [gear, setGear] = useState(0);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [displayRPM, setDisplayRPM] = useState(0);
  const [shiftQuality, setShiftQuality] = useState<ShiftQuality>(null);
  const [countdown, setCountdown] = useState(3);
  const [bestShift, setBestShift] = useState<ShiftQuality>('BAD');
  
  const requestRef = useRef<number>();
  const logicRPM = useRef(0);
  const logicSpeed = useRef(0);
  const logicDistance = useRef(0);
  const shiftBarPos = useRef(0);
  const lastTime = useRef(0);
  const startTime = useRef(0);
  const gearShifted = useRef(false);
  
  // Animation states
  const [roadOffset, setRoadOffset] = useState(0);
  const [stripeOffset, setStripeOffset] = useState(0);
  
  const aiShiftTimeout = useRef<NodeJS.Timeout | null>(null);
  const aiCurrentGear = useRef(0);
  const aiLogicDistance = useRef(0);
  const aiLogicSpeed = useRef(0);
  const aiBestShift = useRef<ShiftQuality>('BAD');

  const MAX_RPM = 8000;
  const GEAR_COUNT = 5;
  const FINISH_LINE = 400;

  const executeShiftGear = useCallback(() => {
    if (gearShifted.current) return false;
    
    gearShifted.current = true;
    const pos = shiftBarPos.current;
    let quality: ShiftQuality = 'BAD';
    let targetRPM = 1500;

    if (pos >= 62 && pos <= 78) {
      quality = 'PERFECT';
      targetRPM = 2800;
      logicSpeed.current += 10;
      if (bestShift !== 'PERFECT') setBestShift('PERFECT');
    } else if (pos >= 45 && pos <= 90) {
      quality = 'GOOD';
      targetRPM = 3800;
      logicSpeed.current += 4;
      if (bestShift === 'BAD') setBestShift('GOOD');
    } else {
      quality = 'BAD';
      targetRPM = 1200;
      logicSpeed.current *= 0.8;
    }

    logicRPM.current = targetRPM;
    setDisplayRPM(targetRPM);
    setShiftQuality(quality);
    setGear(g => g + 1);
    
    setTimeout(() => { gearShifted.current = false; }, 300);
    setTimeout(() => setShiftQuality(null), 800);
    
    return true;
  }, [bestShift]);

  const updateGame = useCallback((time: number) => {
    if (gameState !== 'RACING') return;

    lastTime.current = time;

    const rpmRiseRate = gear === 0 ? 30 : 80 + (gear * 25);
    logicRPM.current = Math.min(logicRPM.current + rpmRiseRate, MAX_RPM + 3000);

    const optimalRPM = 6500;
    const rpmEfficiency = 1 - Math.abs(logicRPM.current - optimalRPM) / optimalRPM;
    const acceleration = gear === 0 ? 0.02 : (0.15 + gear * 0.03) * Math.max(0.3, rpmEfficiency);
    
    if (logicRPM.current > 1500 && !gearShifted.current) {
      logicSpeed.current = Math.min(logicSpeed.current + acceleration, 180 + gear * 25);
    } else {
      logicSpeed.current *= 0.992;
    }

    logicDistance.current += logicSpeed.current * 0.016;
    const shiftSpeed = gear === 0 ? 0.3 : 0.8 + (gear * 0.4);
    shiftBarPos.current = (shiftBarPos.current + shiftSpeed) % 100;

    // Update road animation based on speed
    const speedFactor = logicSpeed.current * 0.8;
    setRoadOffset(prev => (prev + speedFactor) % 200);
    setStripeOffset(prev => (prev + speedFactor * 1.5) % 80);

    setDisplayRPM(prev => prev + (logicRPM.current - prev) * 0.1);
    setDisplaySpeed(prev => prev + (logicSpeed.current - prev) * 0.1);
    setDisplayDistance(Math.floor(logicDistance.current));

    if (logicDistance.current >= FINISH_LINE) {
      finishRace(time);
      return;
    }

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, gear]);

  const runAIRace = useCallback((aiPlayer: Player) => {
    const skill = AI_SKILL_LEVELS[aiSkill];
    aiCurrentGear.current = 0;
    aiLogicDistance.current = 0;
    aiLogicSpeed.current = 0;
    aiBestShift.current = 'BAD';
    
    const aiStartTime = performance.now();
    
    const aiUpdateLoop = (time: number) => {
      if (aiCurrentGear.current >= GEAR_COUNT && aiLogicDistance.current >= FINISH_LINE) return;
      
      const aiAcceleration = (0.15 + aiCurrentGear.current * 0.03) * 0.8;
      aiLogicSpeed.current = Math.min(aiLogicSpeed.current + aiAcceleration, 180 + aiCurrentGear.current * 25);
      aiLogicDistance.current += aiLogicSpeed.current * 0.016;
      
      if (aiLogicDistance.current >= FINISH_LINE) {
        const aiRaceTime = (time - aiStartTime) / 1000;
        const result: RaceResult = {
          player: aiPlayer,
          time: aiRaceTime,
          distance: FINISH_LINE,
          bestShift: aiBestShift.current
        };
        setResults(prev => [...prev, result]);
        setGameState('RESULTS');
        onDuelComplete?.([...results, result]);
        return;
      }
      
      requestRef.current = requestAnimationFrame(aiUpdateLoop);
    };
    
    const scheduleAIShift = (gearNum: number) => {
      if (gearNum >= GEAR_COUNT) return;
      const [minTime, maxTime] = skill.reactionTime;
      const reactionDelay = minTime + Math.random() * (maxTime - minTime);
      
      aiShiftTimeout.current = setTimeout(() => {
        const roll = Math.random();
        let quality: ShiftQuality;
        
        if (roll < skill.perfectChance) {
          quality = 'PERFECT';
          aiLogicSpeed.current += 10;
        } else if (roll < skill.goodChance) {
          quality = 'GOOD';
          aiLogicSpeed.current += 4;
        } else {
          quality = 'BAD';
          aiLogicSpeed.current *= 0.85;
        }
        
        if (quality === 'PERFECT' || (quality === 'GOOD' && aiBestShift.current === 'BAD')) {
          aiBestShift.current = quality;
        }
        
        aiCurrentGear.current++;
        if (aiCurrentGear.current < GEAR_COUNT) scheduleAIShift(aiCurrentGear.current);
      }, reactionDelay + gearNum * 300);
    };
    
    setTimeout(() => {
      scheduleAIShift(0);
      requestRef.current = requestAnimationFrame(aiUpdateLoop);
    }, 500);
    
  }, [aiSkill, results, onDuelComplete]);

  useEffect(() => {
    if (gameState === 'RACING') {
      lastTime.current = performance.now();
      startTime.current = lastTime.current;
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => { 
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (aiShiftTimeout.current) clearTimeout(aiShiftTimeout.current);
    };
  }, [gameState, updateGame]);

  useEffect(() => {
    if (gameState === 'COUNTDOWN' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'COUNTDOWN' && countdown === 0) {
      setGameState('RACING');
      setGear(1);
      logicRPM.current = 2000;
      gearShifted.current = false;
    }
  }, [gameState, countdown]);

  const startDuel = () => {
    setResults([]);
    setCurrentPlayer(players[0]);
    startPlayerRace(players[0]);
  };

  const startPlayerRace = (player: Player) => {
    setCurrentPlayer(player);
    setGear(0);
    logicRPM.current = 0;
    logicSpeed.current = 0;
    logicDistance.current = 0;
    shiftBarPos.current = 0;
    setDisplayRPM(0);
    setDisplaySpeed(0);
    setDisplayDistance(0);
    setRoadOffset(0);
    setStripeOffset(0);
    setShiftQuality(null);
    setBestShift('BAD');
    setCountdown(3);
    setGameState('COUNTDOWN');
  };

  const finishRace = (endTime: number) => {
    const raceTime = (endTime - startTime.current) / 1000;
    const result: RaceResult = {
      player: currentPlayer,
      time: raceTime,
      distance: FINISH_LINE,
      bestShift
    };
    
    const newResults = [...results, result];
    setResults(newResults);
    
    setTimeout(() => {
      if (results.length === 0) {
        const nextPlayer = players[1];
        if (nextPlayer.isAI) {
          setGameState('AI_RACING');
          runAIRace(nextPlayer);
        } else {
          setGameState('TRANSITION');
          setTimeout(() => startPlayerRace(players[1]), 2000);
        }
      } else {
        setGameState('RESULTS');
        onDuelComplete?.(newResults);
      }
    }, 1500);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'LOBBY' || gameState === 'RESULTS') startDuel();
        else if (gameState === 'RACING') executeShiftGear();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, executeShiftGear]);

  const rpmAngle = Math.min(Math.max((displayRPM / MAX_RPM) * 180 - 90, -90), 90);
  const motoColor = currentPlayer.id === 1 ? '#3b82f6' : '#ef4444';

  // LOBBY
  if (gameState === 'LOBBY') {
    return (
      <div className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 p-6 text-center">
        <h2 className="text-2xl font-black text-white mb-6">🏁 DUEL MOTO</h2>
        <div className="flex justify-center gap-4 mb-6">
          {players.map((p) => (
            <div key={p.id} className={`flex flex-col items-center p-4 rounded-xl bg-gradient-to-br ${p.color} shadow-lg`}>
              {p.isAI && <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">IA</div>}
              <div className="text-4xl mb-2">{p.avatar}</div>
              <div className="font-bold text-white">{p.name}</div>
            </div>
          ))}
        </div>
        <button onClick={startDuel} className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-black text-lg text-white uppercase tracking-widest active:scale-[0.98] transition-transform">
          🎮 LANCER LE DUEL
        </button>
      </div>
    );
  }

  // AI RACING
  if (gameState === 'AI_RACING') {
    return (
      <div className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 p-6 text-center">
        <div className="text-6xl mb-4 animate-bounce">🏍️</div>
        <div className="text-xl font-bold text-white">Course IA...</div>
        <div className="mt-4 text-2xl font-black text-yellow-400">Rapport: {Math.min(aiCurrentGear.current + 1, 5)}/5</div>
      </div>
    );
  }

  // TRANSITION
  if (gameState === 'TRANSITION') {
    return (
      <div className="w-full max-w-md mx-auto h-64 bg-gradient-to-b from-gray-900 to-black rounded-2xl flex items-center justify-center text-center p-6">
        <div>
          <div className="text-6xl mb-4 animate-bounce">{players[1].avatar}</div>
          <h3 className="text-2xl font-black text-white">À ton tour !</h3>
        </div>
      </div>
    );
  }

  // RESULTS
  if (gameState === 'RESULTS') {
    const sortedResults = [...results].sort((a, b) => a.time - b.time);
    const winner = sortedResults[0];
    return (
      <div className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-900 to-black rounded-2xl p-6 text-center">
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="text-2xl font-black text-yellow-400">VAINQUEUR</h2>
        <div className="text-2xl font-black text-white mt-2">{winner.player.avatar} {winner.player.name}</div>
        <div className="text-gray-400 mt-1">{winner.time.toFixed(2)}s</div>
        <button onClick={startDuel} className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl font-black text-white uppercase">
          🔄 Rejouer
        </button>
      </div>
    );
  }

  // RACING - Vue style Drag Racing classique
  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 select-none">
      
      {/* Header */}
      <div className={`px-4 py-2 bg-gradient-to-r ${currentPlayer.color} flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <span>{currentPlayer.avatar}</span>
          <span className="font-bold text-white">{currentPlayer.name}</span>
        </div>
        <div className="text-white font-mono">Vitesse: {Math.floor(displaySpeed)} km/h</div>
      </div>

      {/* Zone de course - Vue de dessus style Drag Racing */}
      <div className="relative h-64 overflow-hidden bg-gray-800">
        
        {/* Route avec perspective verticale */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                #2a2a2a 0px,
                #2a2a2a ${40 - roadOffset % 40}px,
                #333 ${40 - roadOffset % 40}px,
                #333 80px
              )
            `
          }}
        />
        
        {/* Lignes blanches pointillées centrales */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-2 h-full"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent 0px,
                transparent ${20 - stripeOffset % 40}px,
                #fff ${20 - stripeOffset % 40}px,
                #fff ${40 - stripeOffset % 40}px,
                transparent ${40 - stripeOffset % 40}px,
                transparent 40px
              )
            `
          }}
        />
        
        {/* Bandes latérales jaunes (piste) */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-yellow-400" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-yellow-400" />
        
        {/* Marquages de distance sur les côtés */}
        {[...Array(8)].map((_, i) => {
          const y = (i * 80 + roadOffset) % 320;
          return (
            <React.Fragment key={i}>
              <div 
                className="absolute left-10 text-white text-xs font-bold"
                style={{ top: `${320 - y}px` }}
              >
                {Math.floor((y + logicDistance.current * 3) / 10)}m
              </div>
            </React.Fragment>
          );
        })}

        {/* MOTO - Vue de dessus réaliste */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <svg width="60" height="100" viewBox="0 0 60 100">
            {/* Roue avant */}
            <ellipse cx="30" cy="15" rx="12" ry="6" fill="#1a1a1a" stroke="#444" strokeWidth="1" />
            
            {/* Corps de la moto */}
            <path d="M18 20 L42 20 L38 70 L22 70 Z" fill={motoColor} />
            
            {/* Pilote */}
            <ellipse cx="30" cy="45" rx="8" ry="12" fill="#111" />
            <circle cx="30" cy="30" r="8" fill="#111" stroke={motoColor} strokeWidth="2" />
            
            {/* Roue arrière */}
            <ellipse cx="30" cy="85" rx="14" ry="7" fill="#1a1a1a" stroke="#444" strokeWidth="1" />
            
            {/* Flammes échappement à haute vitesse */}
            {displaySpeed > 80 && (
              <>
                <ellipse cx="20" cy="95" rx="4" ry="8" fill="#fbbf24" opacity="0.7" className="animate-pulse" />
                <ellipse cx="40" cy="95" rx="4" ry="8" fill="#fbbf24" opacity="0.7" className="animate-pulse" />
              </>
            )}
          </svg>
        </div>

        {/* Countdown */}
        {gameState === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
            <div className="text-7xl font-black text-white animate-ping">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        )}

        {/* Shift quality */}
        {shiftQuality && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-lg font-black text-white animate-bounce z-20 ${
            shiftQuality === 'PERFECT' ? 'bg-green-500' : shiftQuality === 'GOOD' ? 'bg-yellow-500 text-black' : 'bg-red-500'
          }`}>
            {shiftQuality}
          </div>
        )}
      </div>

      {/* Dashboard */}
      <div className="p-4 bg-gradient-to-b from-gray-800 to-gray-900 text-white">
        {/* RPM Gauge */}
        <div className="relative w-44 h-20 mx-auto mb-4">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <path d="M15,85 A80,80 0 0,1 185,85" fill="none" stroke="#374151" strokeWidth="10" strokeLinecap="round" />
            <path d="M15,85 A80,80 0 0,1 100,15" fill="none" stroke="#22c55e" strokeWidth="10" strokeDasharray="125" />
            <path d="M100,15 A80,80 0 0,1 150,35" fill="none" stroke="#eab308" strokeWidth="10" strokeDasharray="60" strokeDashoffset="125" />
            <path d="M150,35 A80,80 0 0,1 185,85" fill="none" stroke="#ef4444" strokeWidth="10" strokeDasharray="40" strokeDashoffset="185" />
            <g transform="translate(100, 85)">
              <line x1="0" y1="0" x2="0" y2="-55" stroke="#f87171" strokeWidth="4" strokeLinecap="round"
                style={{ transform: `rotate(${rpmAngle}deg)`, transformOrigin: '0 0', transition: 'transform 0.04s ease-out' }} />
              <circle cx="0" cy="0" r="6" fill="#fff" />
            </g>
            <text x="100" y="98" fill="#fbbf24" fontSize="8" textAnchor="middle">x1000 RPM</text>
          </svg>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-400 text-xs">VITESSE</div>
            <div className="text-xl font-black">{Math.floor(displaySpeed)} <span className="text-xs">km/h</span></div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-400 text-xs">RAPPORT</div>
            <div className={`text-3xl font-black ${gear >= 5 ? 'text-purple-400' : 'text-yellow-400'}`}>{gear || 'N'}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-400 text-xs">DISTANCE</div>
            <div className="text-xl font-black">{displayDistance} <span className="text-xs">m</span></div>
          </div>
        </div>

        {/* Shift bar */}
        <div className="relative h-7 bg-gray-700 rounded-full overflow-hidden border border-gray-600 mb-3">
          <div className="absolute left-[45%] w-[45%] h-full bg-yellow-500/20" />
          <div className="absolute left-[62%] w-[16%] h-full bg-green-500/40 border-x-2 border-green-300" />
          <div className="absolute top-1 bottom-1 w-1 bg-white rounded-full shadow-[0_0_8px_white]" style={{ left: `${shiftBarPos.current}%` }} />
        </div>

        {/* Button */}
        <button
          onClick={gameState === 'RACING' ? executeShiftGear : undefined}
          disabled={gameState === 'COUNTDOWN'}
          className={`w-full py-3 rounded-xl font-black text-base uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 bg-gradient-to-r ${currentPlayer.color}`}
        >
          {gameState === 'COUNTDOWN' ? '⏱ ...' : `⚡ PASSER LA ${gear + 1}ÈME !`}
        </button>
      </div>
    </div>
  );
}
