'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'AI_RACING' | 'TRANSITION' | 'RESULTS';
type ShiftQuality = 'PERFECT' | 'GOOD' | 'BAD' | null;
type Player = { id: 1 | 2; name: string; avatar: string; color: string; isAI?: boolean };
type RaceResult = { player: Player; time: number; distance: number; bestShift: ShiftQuality };

// --- CONFIG IA ---
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
  // --- CONFIG JOUEURS ---
  const defaultPlayers: [Player, Player] = [
    { id: 1, name: 'Vous', avatar: '🔵', color: 'from-blue-500 to-cyan-500', isAI: false },
    { id: 2, name: 'MotoBot', avatar: '🤖', color: 'from-red-500 to-orange-500', isAI: true }
  ];
  const [players] = useState<[Player, Player]>(initialPlayers || defaultPlayers);
  
  // --- ÉTATS GLOBAUX ---
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [currentPlayer, setCurrentPlayer] = useState<Player>(players[0]);
  const [results, setResults] = useState<RaceResult[]>([]);
  
  // --- ÉTATS COURSE (par joueur) ---
  const [gear, setGear] = useState(0);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [displayRPM, setDisplayRPM] = useState(0);
  const [shiftQuality, setShiftQuality] = useState<ShiftQuality>(null);
  const [countdown, setCountdown] = useState(3);
  const [bestShift, setBestShift] = useState<ShiftQuality>('BAD');
  
  // --- RÉFÉRENCES LOGIQUE ---
  const requestRef = useRef<number>();
  const logicRPM = useRef(0);
  const logicSpeed = useRef(0);
  const logicDistance = useRef(0);
  const shiftBarPos = useRef(0);
  const lastTime = useRef(0);
  const startTime = useRef(0);
  const gearShifted = useRef(false);
  const roadOffset = useRef(0);
  const barrierOffset = useRef(0);
  const cloudOffset = useRef(0);
  const particles = useRef<Array<{x: number, y: number, life: number, speed: number}>>([]);
  const [speedLinesOpacity, setSpeedLinesOpacity] = useState(0);
  
  // --- IA RÉFÉRENCES ---
  const aiShiftTimeout = useRef<NodeJS.Timeout | null>(null);
  const aiCurrentGear = useRef(0);
  const aiLogicDistance = useRef(0);
  const aiLogicSpeed = useRef(0);
  const aiBestShift = useRef<ShiftQuality>('BAD');

  // --- CONFIG COURSE ---
  const MAX_RPM = 8000;
  const GEAR_COUNT = 5;
  const FINISH_LINE = 400;

  // --- FONCTION SHIFT GEAR ---
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

  // --- BOUCLE D'ANIMATION ---
  const updateGame = useCallback((time: number) => {
    if (gameState !== 'RACING' && gameState !== 'AI_RACING') return;

    const deltaTime = time - lastTime.current;
    lastTime.current = time;

    // Physique RPM/Vitesse
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

    // Décor animé
    const speedFactor = logicSpeed.current * 0.15;
    roadOffset.current = (roadOffset.current + speedFactor) % 100;
    barrierOffset.current = (barrierOffset.current + speedFactor * 0.7) % 50;
    cloudOffset.current = (cloudOffset.current + speedFactor * 0.1) % 200;

    // Particules
    if (logicSpeed.current > 30 && Math.random() > 0.7) {
      particles.current.push({ x: 100 + (Math.random() - 0.5) * 20, y: 165, life: 1, speed: 2 + Math.random() * 3 });
    }
    particles.current = particles.current.map(p => ({ ...p, y: p.y - p.speed, life: p.life - 0.03 })).filter(p => p.life > 0);
    setSpeedLinesOpacity(Math.min((logicSpeed.current - 50) / 150, 0.8));

    // UI Updates
    setDisplayRPM(prev => prev + (logicRPM.current - prev) * 0.1);
    setDisplaySpeed(prev => prev + (logicSpeed.current - prev) * 0.1);
    setDisplayDistance(Math.floor(logicDistance.current));

    // Fin de course
    if (logicDistance.current >= FINISH_LINE) {
      finishRace(time);
      return;
    }

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, gear]);

  // --- LOGIQUE IA ---
  const runAIRace = useCallback((aiPlayer: Player) => {
    const skill = AI_SKILL_LEVELS[aiSkill];
    aiCurrentGear.current = 0;
    aiLogicDistance.current = 0;
    aiLogicSpeed.current = 0;
    aiBestShift.current = 'BAD';
    
    const aiStartTime = performance.now();
    
    const aiUpdateLoop = (time: number) => {
      if (aiCurrentGear.current >= GEAR_COUNT && aiLogicDistance.current >= FINISH_LINE) {
        return;
      }
      
      // Simulation physique IA
      const aiAcceleration = (0.15 + aiCurrentGear.current * 0.03) * 0.8;
      aiLogicSpeed.current = Math.min(aiLogicSpeed.current + aiAcceleration, 180 + aiCurrentGear.current * 25);
      aiLogicDistance.current += aiLogicSpeed.current * 0.016;
      
      // Si assez de distance et pas encore fini
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
    
    // Planifier les shifts IA
    const scheduleAIShift = (gearNum: number) => {
      if (gearNum >= GEAR_COUNT) return;
      
      // Temps de réaction basé sur le niveau de compétence
      const [minTime, maxTime] = skill.reactionTime;
      const reactionDelay = minTime + Math.random() * (maxTime - minTime);
      
      aiShiftTimeout.current = setTimeout(() => {
        // Déterminer la qualité du shift
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
        
        // Mettre à jour le meilleur shift
        if (quality === 'PERFECT' || (quality === 'GOOD' && aiBestShift.current === 'BAD')) {
          aiBestShift.current = quality;
        }
        
        aiCurrentGear.current++;
        
        // Planifier le prochain shift
        if (aiCurrentGear.current < GEAR_COUNT) {
          scheduleAIShift(aiCurrentGear.current);
        }
      }, reactionDelay + gearNum * 300); // Délai progressif par rapport
    };
    
    // Démarrer la course IA après un délai
    setTimeout(() => {
      scheduleAIShift(0);
      requestRef.current = requestAnimationFrame(aiUpdateLoop);
    }, 500);
    
  }, [aiSkill, results, onDuelComplete]);

  // Gestion animation loop
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

  // Countdown logic
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

  // --- ACTIONS ---
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
    roadOffset.current = 0;
    barrierOffset.current = 0;
    cloudOffset.current = 0;
    particles.current = [];
    setDisplayRPM(0);
    setDisplaySpeed(0);
    setDisplayDistance(0);
    setSpeedLinesOpacity(0);
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
    
    // Next player or results
    setTimeout(() => {
      if (results.length === 0) {
        // First player finished → check if player 2 is AI
        const nextPlayer = players[1];
        
        if (nextPlayer.isAI) {
          // Mode IA : lancer la course IA directement
          setGameState('AI_RACING');
          runAIRace(nextPlayer);
        } else {
          // Mode 2 joueurs humains
          setGameState('TRANSITION');
          setTimeout(() => startPlayerRace(players[1]), 2000);
        }
      } else {
        // Second player finished → show results
        setGameState('RESULTS');
        onDuelComplete?.(newResults);
      }
    }, 1500);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'LOBBY' || gameState === 'RESULTS') {
          startDuel();
        } else if (gameState === 'RACING') {
          executeShiftGear();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, executeShiftGear]);

  // RPM angle clamped
  const rawAngle = (displayRPM / MAX_RPM) * 180 - 90;
  const rpmAngle = Math.min(Math.max(rawAngle, -90), 90);

  // --- RENDU LOBBY ---
  if (gameState === 'LOBBY') {
    return (
      <div className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 p-6 text-center">
        <h2 className="text-2xl font-black text-white mb-6">🏁 DUEL MOTO</h2>
        
        <div className="flex justify-center gap-4 mb-6">
          {players.map((p, i) => (
            <div key={p.id} className={`flex flex-col items-center p-4 rounded-xl bg-gradient-to-br ${p.color} shadow-lg relative`}>
              {p.isAI && (
                <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  IA
                </div>
              )}
              <div className="text-4xl mb-2">{p.avatar}</div>
              <div className="font-bold text-white">{p.name}</div>
              <div className="text-xs text-white/80">Joueur {i + 1}</div>
            </div>
          ))}
        </div>
        
        {/* Sélecteur de difficulté IA */}
        {players[1]?.isAI && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Difficulté de l'IA</div>
            <div className="flex justify-center gap-2">
              {(['easy', 'medium', 'hard'] as AISkill[]).map((level) => (
                <div 
                  key={level}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    aiSkill === level 
                      ? level === 'easy' ? 'bg-green-500 text-white' 
                        : level === 'medium' ? 'bg-yellow-500 text-black' 
                        : 'bg-red-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {level === 'easy' ? 'Facile' : level === 'medium' ? 'Moyen' : 'Difficile'}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <button
          onClick={startDuel}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl font-black text-lg text-white uppercase tracking-widest shadow-[0_4px_20px_rgba(34,197,94,0.4)] active:scale-[0.98] transition-transform"
        >
          🎮 LANCER LE DUEL
        </button>
        
        <p className="text-gray-400 text-sm mt-4">
          {players[1]?.isAI 
            ? 'Affrontez l\'IA en shiftant au bon moment !' 
            : 'Espace/Entrée pour jouer • Tour par tour'}
        </p>
      </div>
    );
  }

  // --- RENDU COURSE IA (écran d'attente) ---
  if (gameState === 'AI_RACING') {
    const aiPlayer = players[1];
    return (
      <div className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 p-6 text-center">
        <div className={`flex items-center justify-center gap-3 mb-6 py-3 px-4 rounded-xl bg-gradient-to-r ${aiPlayer.color}`}>
          <span className="text-3xl">{aiPlayer.avatar}</span>
          <span className="font-black text-white text-xl">{aiPlayer.name}</span>
          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">IA</span>
        </div>
        
        <div className="relative h-48 flex flex-col items-center justify-center">
          {/* Animation de course IA */}
          <div className="text-6xl mb-4 animate-bounce">🏍️</div>
          <div className="text-xl font-bold text-white mb-4">Course en cours...</div>
          
          {/* Barre de progression stylisée */}
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-red-500 animate-pulse"
              style={{ 
                width: '60%',
                animation: 'progress 2s ease-in-out infinite'
              }}
            />
          </div>
          
          {/* Indicateur de rapport */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-gray-400">Rapport:</span>
            <span className="text-2xl font-black text-yellow-400">{Math.min(aiCurrentGear.current + 1, 5)}/5</span>
          </div>
        </div>
        
        <div className="mt-4 text-gray-400 text-sm">
          L'IA termine sa course...
        </div>
        
        <style jsx>{`
          @keyframes progress {
            0%, 100% { width: 30%; }
            50% { width: 90%; }
          }
        `}</style>
      </div>
    );
  }

  // --- RENDU TRANSITION ---
  if (gameState === 'TRANSITION') {
    const nextPlayer = players[1];
    return (
      <div className="w-full max-w-md mx-auto h-96 bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col items-center justify-center text-center p-6">
        <div className="text-6xl mb-4 animate-bounce">{nextPlayer.avatar}</div>
        <h3 className="text-2xl font-black text-white mb-2">À ton tour !</h3>
        <p className="text-gray-300 text-lg">{nextPlayer.name}</p>
        <div className="mt-6 flex gap-2">
          {[1,2,3].map(n => (
            <div key={n} className="w-3 h-3 bg-white rounded-full animate-[ping_1s_ease-in-out_infinite]" style={{ animationDelay: `${n*0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // --- RENDU RÉSULTATS ---
  if (gameState === 'RESULTS') {
    const sortedResults = [...results].sort((a, b) => a.time - b.time);
    const winner = sortedResults[0];
    const loser = sortedResults[1];
    
    return (
      <div className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 p-6">
        {/* En-tête vainqueur */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 animate-[bounce_1s_ease-in-out_infinite]">🏆</div>
          <h2 className="text-2xl font-black text-yellow-400">VAINQUEUR</h2>
          <div className={`text-3xl font-black bg-gradient-to-r ${winner.player.color} bg-clip-text text-transparent flex items-center justify-center gap-2`}>
            <span>{winner.player.avatar}</span>
            <span>{winner.player.name}</span>
            {winner.player.isAI && <span className="text-sm bg-purple-600 text-white px-2 py-0.5 rounded-full">IA</span>}
          </div>
          <div className="text-gray-400 mt-1">{winner.time.toFixed(2)}s vs {loser?.time.toFixed(2)}s</div>
          {winner.player.isAI === false && (
            <div className="mt-2 text-green-400 font-semibold animate-pulse">
              🎉 Félicitations !
            </div>
          )}
        </div>

        {/* Cartes comparaison */}
        <div className="space-y-4 mb-6">
          {sortedResults.map((r, i) => (
            <div 
              key={r.player.id}
              className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                i === 0 
                  ? 'border-yellow-500 bg-yellow-500/10' 
                  : 'border-gray-600 bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${r.player.color} flex items-center justify-center text-xl font-bold text-white relative`}>
                  {r.player.avatar}
                  {r.player.isAI && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-[8px] text-white">🤖</div>
                  )}
                </div>
                <div>
                  <div className={`font-bold ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>
                    {r.player.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Shift: {r.bestShift || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-black ${i === 0 ? 'text-green-400' : 'text-gray-300'}`}>
                  {r.time.toFixed(2)}s
                </div>
                <div className="text-xs text-gray-500">{r.distance}m</div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={startDuel}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 rounded-xl font-black text-white uppercase tracking-widest active:scale-[0.98] transition-transform"
          >
            🔄 Nouvelle Partie
          </button>
          <button
            onClick={() => onDuelComplete?.(results)}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold text-gray-200 transition-colors"
          >
            ✅ Valider les résultats
          </button>
        </div>
      </div>
    );
  }

  // --- RENDU COURSE (plein écran joueur actuel) ---
  const playerColor = currentPlayer.color;
  
  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 font-sans select-none">
      
      {/* Header joueur */}
      <div className={`px-4 py-2 bg-gradient-to-r ${playerColor} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{currentPlayer.avatar}</span>
          <span className="font-bold text-white">{currentPlayer.name}</span>
          {currentPlayer.isAI && <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">IA</span>}
        </div>
        <div className="text-white/90 text-sm font-mono">
          {gear < GEAR_COUNT ? `Rapport ${gear}/5` : 'Dernière ligne droite !'}
        </div>
      </div>
      
      {/* Zone de course 3D */}
      <div className="relative h-72 bg-gray-900 overflow-hidden">
        {/* Ciel + nuages */}
        <div className="absolute top-0 w-full h-2/3 bg-gradient-to-b from-sky-900 via-purple-900 to-gray-900">
          <div 
            className="absolute w-full h-full opacity-30"
            style={{ 
              backgroundImage: 'radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)',
              backgroundSize: '200px 100px',
              backgroundPosition: `${cloudOffset.current}px 30px, ${cloudOffset.current * 0.5 + 100}px 60px`
            }}
          />
        </div>

        {/* Route perspective */}
        <div 
          className="absolute bottom-0 w-full h-2/3 origin-bottom"
          style={{ transform: 'perspective(600px) rotateX(55deg)', transformStyle: 'preserve-3d' }}
        >
          <div 
            className="w-[200%] h-full mx-[-50%] bg-[#1a1a2e]"
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 49%, rgba(255,255,255,0.3) 49%, rgba(255,255,255,0.3) 51%, transparent 51%),
                repeating-linear-gradient(to bottom, #16213e 0px, #16213e 40px, #1a1a3a 40px, #1a1a3a 80px)
              `,
              backgroundSize: '100% 80px, 100% 80px',
              backgroundPosition: `center ${roadOffset.current}px`,
            }}
          />
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-2 h-full"
            style={{
              backgroundImage: 'linear-gradient(to bottom, #fff 50%, transparent 50%)',
              backgroundSize: '100% 60px',
              backgroundPosition: `0 ${roadOffset.current}px`
            }}
          />
          <div className="absolute left-0 w-8 h-full" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #dc2626 0px, #dc2626 15px, #fff 15px, #fff 30px)',
            backgroundSize: '100% 30px',
            backgroundPosition: `0 ${barrierOffset.current}px`
          }} />
          <div className="absolute right-0 w-8 h-full" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #dc2626 0px, #dc2626 15px, #fff 15px, #fff 30px)',
            backgroundSize: '100% 30px',
            backgroundPosition: `0 ${barrierOffset.current}px`
          }} />
        </div>

        {/* Speed lines */}
        <div 
          className="absolute inset-0 pointer-events-none z-15"
          style={{
            opacity: speedLinesOpacity,
            backgroundImage: 'repeating-linear-gradient(180deg, transparent 0px, rgba(255,255,255,0.05) 2px, transparent 4px)',
            backgroundSize: '100% 20px',
            animation: gameState === 'RACING' ? 'speedLines 0.05s linear infinite' : 'none'
          }}
        />

        {/* Moto SVG */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 h-40 z-20">
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
            <ellipse cx="100" cy="180" rx={40 + displaySpeed * 0.05} ry={8 + displaySpeed * 0.02} fill="black" opacity={0.3 + displaySpeed * 0.002} />
            <g style={{ transformOrigin: '100px 160px', transform: `rotate(${roadOffset.current * 2}deg)` }}>
              <circle cx="100" cy="160" r="22" fill="#1f2937" stroke="#4b5563" strokeWidth="3" />
              <circle cx="100" cy="160" r="8" fill="#9ca3af" />
              {[0, 60, 120].map(angle => (
                <line key={angle} x1="100" y1="160" x2={100 + 18 * Math.cos(angle * Math.PI / 180)} y2={160 + 18 * Math.sin(angle * Math.PI / 180)} stroke="#6b7280" strokeWidth="2" />
              ))}
            </g>
            <path d="M70 140 Q100 120 130 140 L125 155 Q100 145 75 155 Z" fill={currentPlayer.id === 1 ? '#3b82f6' : '#ef4444'} />
            <path d="M75 155 Q100 150 125 155 L120 165 Q100 160 80 165 Z" fill={currentPlayer.id === 1 ? '#2563eb' : '#dc2626'} />
            {logicSpeed.current > 80 && (
              <><ellipse cx="69" cy="172" rx="6" ry="10" fill="#fbbf24" opacity="0.8" className="animate-pulse" /><ellipse cx="131" cy="172" rx="6" ry="10" fill="#fbbf24" opacity="0.8" className="animate-pulse" /></>
            )}
            <rect x="65" y="145" width="8" height="25" rx="2" fill="#6b7280" />
            <rect x="127" y="145" width="8" height="25" rx="2" fill="#6b7280" />
            <rect x="85" y="130" width="30" height="12" rx="3" fill="#ef4444" className="animate-pulse" />
            <ellipse cx="100" cy="100" rx="18" ry="22" fill="#1f2937" />
            <circle cx="100" cy="82" r="16" fill="#111827" stroke="#4b5563" strokeWidth="2" />
            <ellipse cx="100" cy="80" rx="10" ry="6" fill="#60a5fa" opacity="0.6" />
            {particles.current.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3 + p.life * 4} fill={`rgba(251, 191, 36, ${p.life * 0.8})`} />
            ))}
          </svg>
          {(shiftQuality === 'BAD' || displaySpeed > 120) && (
            <div className={`absolute inset-0 ${displaySpeed > 120 ? 'animate-[shake_0.05s_ease-in-out_infinite]' : 'animate-[shake_0.1s_ease-in-out_3]'}`} />
          )}
        </div>

        {/* Countdown overlay */}
        {gameState === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
            <div className="text-8xl font-black text-white animate-[ping_0.8s_ease-in-out_infinite] drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        )}

        {/* Shift message */}
        {shiftQuality && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-xl font-black tracking-wider animate-bounce z-30 shadow-2xl text-white
            ${shiftQuality === 'PERFECT' ? 'bg-green-500' : shiftQuality === 'GOOD' ? 'bg-yellow-500 text-black' : 'bg-red-500'}`}
          >
            {shiftQuality}
          </div>
        )}
      </div>

      {/* Tableau de bord */}
      <div className="p-5 bg-gradient-to-b from-gray-800 to-gray-900 text-white">
        {/* RPM Gauge */}
        <div className="relative w-52 h-28 mx-auto mb-5">
          <svg viewBox="0 0 220 120" className="w-full h-full">
            <path d="M20,100 A90,90 0 0,1 200,100" fill="none" stroke="#374151" strokeWidth="12" strokeLinecap="round" />
            <path d="M20,100 A90,90 0 0,1 110,20" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray="140" opacity="0.7" />
            <path d="M110,20 A90,90 0 0,1 170,40" fill="none" stroke="#eab308" strokeWidth="12" strokeDasharray="70" strokeDashoffset="140" opacity="0.7" />
            <path d="M170,40 A90,90 0 0,1 200,100" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray="50" strokeDashoffset="210" opacity="0.7" />
            <g transform="translate(110, 100)">
              <line x1="0" y1="0" x2="0" y2="-65" stroke="#f87171" strokeWidth="5" strokeLinecap="round"
                style={{ transform: `rotate(${rpmAngle}deg)`, transformOrigin: '0 0', transition: 'transform 0.04s ease-out' }} />
              <circle cx="0" cy="0" r="8" fill="#fff" /><circle cx="0" cy="0" r="4" fill="#ef4444" />
            </g>
            <text x="20" y="115" fill="#9ca3af" fontSize="10" fontWeight="bold">0</text>
            <text x="200" y="115" fill="#9ca3af" fontSize="10" fontWeight="bold" textAnchor="end">8</text>
            <text x="110" y="115" fill="#fbbf24" fontSize="9" fontWeight="black" textAnchor="middle">x1000 RPM</text>
          </svg>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-700/50 rounded-xl p-3 text-center border border-gray-600">
            <div className="text-gray-400 text-xs font-semibold">VITESSE</div>
            <div className="text-2xl font-black text-white">{Math.floor(displaySpeed)} <span className="text-sm text-gray-400">km/h</span></div>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-3 text-center border border-gray-600">
            <div className="text-gray-400 text-xs font-semibold">RAPPORT</div>
            <div className={`text-4xl font-black ${gear >= 5 ? 'text-purple-400' : 'text-yellow-400'}`}>{gear === 0 ? 'N' : gear}</div>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-3 text-center border border-gray-600">
            <div className="text-gray-400 text-xs font-semibold">DISTANCE</div>
            <div className="text-2xl font-black text-white">{displayDistance} <span className="text-sm text-gray-400">m</span></div>
          </div>
        </div>

        {/* Shift bar */}
        <div className="relative h-10 bg-gray-700 rounded-full overflow-hidden border-2 border-gray-600 mb-4">
          <div className="absolute left-[45%] w-[45%] h-full bg-yellow-500/20" />
          <div className="absolute left-[62%] w-[16%] h-full bg-green-500/40 border-x-2 border-green-300" />
          <div className="absolute top-1 bottom-1 w-1.5 bg-white rounded-full shadow-[0_0_12px_white]" style={{ left: `${shiftBarPos.current}%` }} />
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-red-500/50" />
        </div>

        {/* Action button */}
        <button
          onClick={gameState === 'RACING' ? executeShiftGear : undefined}
          disabled={gameState === 'COUNTDOWN'}
          className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-150 active:scale-[0.98] disabled:opacity-50 bg-gradient-to-r ${playerColor} hover:opacity-90 shadow-[0_4px_20px_rgba(0,0,0,0.3)]`}
        >
          {gameState === 'COUNTDOWN' ? '⏱ ...' : `⚡ PASSER LA ${gear + 1}ÈME !`}
        </button>
        
        <div className="text-center mt-3 text-gray-500 text-xs">
          Clique ou Espace/Entrée pour shift • Zone verte = Perfect
        </div>
      </div>

      <style jsx>{`
        @keyframes speedLines { from { background-position: 0 0; } to { background-position: 0 20px; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px) rotate(-0.5deg); } 75% { transform: translateX(2px) rotate(0.5deg); } }
      `}</style>
    </div>
  );
}
