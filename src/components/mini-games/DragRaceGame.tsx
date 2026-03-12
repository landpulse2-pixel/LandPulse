'use client';

import React, { useState, useEffect, useRef } from 'react';

// Types pour les états du jeu
type GameStateType = 'IDLE' | 'READY' | 'RACING' | 'FINISHED';
type ShiftQuality = 'PERFECT' | 'GOOD' | 'BAD' | null;

export default function DragRaceGame() {
  // --- ÉTATS DU JEU ---
  const [gameState, setGameState] = useState<GameStateType>('IDLE');
  const [gear, setGear] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [shiftQuality, setShiftQuality] = useState<ShiftQuality>(null);
  const [message, setMessage] = useState("Appuyez sur Démarrer");
  const [rpmDisplay, setRpmDisplay] = useState(0);
  const [shiftBarPos, setShiftBarPos] = useState(0);
  
  // --- RÉFÉRENCES ---
  const requestRef = useRef<number | null>(null);
  const rpmRef = useRef(0);
  const speedRef = useRef(0);
  const distanceRef = useRef(0);
  const shiftBarPosRef = useRef(0);
  const lastTimeRef = useRef(0);
  const gearRef = useRef(0);
  const gameStateRef = useRef<GameStateType>('IDLE');

  // --- CONFIGURATION ---
  const MAX_RPM = 8000;
  const GEAR_COUNT = 5;
  const FINISH_LINE = 400;

  // Garder les refs synchronisées
  useEffect(() => {
    gearRef.current = gear;
  }, [gear]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // --- MOTEUR PHYSIQUE ---
  useEffect(() => {
    if (gameState !== 'RACING') return;

    const updateGame = (time: number) => {
      if (gameStateRef.current !== 'RACING') return;

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // 1. Gestion du RPM
      const currentGear = gearRef.current;
      const rpmIncrease = (currentGear === 0 ? 50 : 150) + (currentGear * 20);
      rpmRef.current = Math.min(rpmRef.current + rpmIncrease, MAX_RPM);

      // 2. Vitesse
      if (rpmRef.current > 2000) {
        speedRef.current += (currentGear === 0 ? 0.05 : 0.2);
      } else {
        speedRef.current *= 0.98;
      }

      // 3. Distance
      distanceRef.current += (speedRef.current * 0.01);

      // 4. Barre de shift
      shiftBarPosRef.current += (currentGear === 0 ? 0.5 : 1.5 + (currentGear * 0.5));
      if (shiftBarPosRef.current > 100) shiftBarPosRef.current = 0;

      // 5. Fin de course
      if (distanceRef.current >= FINISH_LINE) {
        setGameState('FINISHED');
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        return;
      }

      // Mise à jour UI
      setSpeed(Math.floor(speedRef.current));
      setDistance(Math.floor(distanceRef.current));
      setRpmDisplay(Math.floor(rpmRef.current));
      setShiftBarPos(shiftBarPosRef.current);

      requestRef.current = requestAnimationFrame(updateGame);
    };

    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // --- ACTIONS ---
  const startGame = () => {
    setGameState('RACING');
    setGear(1);
    rpmRef.current = 0;
    speedRef.current = 0;
    distanceRef.current = 0;
    shiftBarPosRef.current = 0;
    setMessage("Passez les vitesses !");
  };

  const handleShiftGear = () => {
    if (gameState !== 'RACING') return;

    const currentPos = shiftBarPosRef.current;
    let quality: ShiftQuality = 'BAD';

    if (currentPos >= 60 && currentPos <= 80) {
      quality = 'PERFECT';
      rpmRef.current = 3000;
      speedRef.current += 5;
    } else if (currentPos >= 40 && currentPos <= 90) {
      quality = 'GOOD';
      rpmRef.current = 4000;
    } else {
      quality = 'BAD';
      rpmRef.current = 2000;
      speedRef.current *= 0.8;
    }

    setShiftQuality(quality);

    if (gear < GEAR_COUNT) {
      setGear(g => g + 1);
    }
  };

  const handleAction = () => {
    if (gameState === 'IDLE' || gameState === 'FINISHED') {
      startGame();
    } else {
      handleShiftGear();
    }
  };

  // --- RENDU ---
  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700 font-sans">
      
      {/* ZONE DE JEU */}
      <div className="relative h-64 bg-gray-800 overflow-hidden" style={{ perspective: '800px' }}>
        {/* Ciel */}
        <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-blue-900 to-gray-900"></div>
        
        {/* Route */}
        <div className="absolute bottom-0 w-full h-1/2" style={{ transform: 'rotateX(60deg)', transformOrigin: 'bottom' }}>
          <div 
            className="w-full h-full"
            style={{ 
              backgroundSize: '100px 100%',
              backgroundPosition: `center ${distance * 2}px`,
              backgroundImage: 'linear-gradient(#333 2px, transparent 2px), linear-gradient(90deg, #333 2px, transparent 2px)',
              backgroundColor: '#1a1a1a',
            }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 w-2 h-full opacity-50" style={{
              backgroundImage: 'linear-gradient(to bottom, #FFF 50%, transparent 50%)',
              backgroundSize: '10px 100px',
            }}></div>
            <div className="absolute left-0 w-4 h-full bg-red-600"></div>
            <div className="absolute right-0 w-4 h-full bg-red-600"></div>
          </div>
        </div>

        {/* Moto */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-32 z-10">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
            <path d="M20,70 Q50,80 80,70 L85,60 L50,40 L15,60 Z" fill="#E50914" />
            <circle cx="25" cy="75" r="12" fill="#333" stroke="#555" strokeWidth="2" />
            <circle cx="75" cy="75" r="12" fill="#333" stroke="#555" strokeWidth="2" />
            <circle cx="25" cy="75" r="6" fill="#888" />
            <circle cx="75" cy="75" r="6" fill="#888" />
            <circle cx="50" cy="50" r="8" fill="#FFD700" />
            <path d="M50,50 L50,65" stroke="#333" strokeWidth="4" />
          </svg>
        </div>

        {/* Message */}
        {shiftQuality && (
          <div className={`absolute top-10 left-1/2 -translate-x-1/2 text-2xl font-bold animate-bounce
            ${shiftQuality === 'PERFECT' ? 'text-green-400' : shiftQuality === 'GOOD' ? 'text-yellow-400' : 'text-red-500'}
          `}>
            {shiftQuality}!
          </div>
        )}
      </div>

      {/* TABLEAU DE BORD */}
      <div className="p-4 bg-gray-800 text-white">
        
        {/* Compte-tours */}
        <div className="relative w-48 h-24 mx-auto mb-4">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <path d="M10,90 A80,80 0 0,1 190,90" fill="none" stroke="#333" strokeWidth="10" />
            <path d="M10,90 A80,80 0 0,1 190,90" fill="none" stroke="#10B981" strokeWidth="10" strokeDasharray="100 250" className="opacity-50" />
            <line 
              x1="100" y1="90" 
              x2="100" y2="20" 
              stroke="#EF4444" 
              strokeWidth="4" 
              strokeLinecap="round"
              transform={`rotate(${(rpmDisplay / MAX_RPM) * 180 - 90} 100 90)`}
            />
            <circle cx="100" cy="90" r="5" fill="#FFF" />
          </svg>
          <div className="absolute bottom-0 w-full text-center text-xs font-mono">
            RPM: {rpmDisplay}
          </div>
        </div>

        {/* Infos */}
        <div className="flex justify-between items-center mb-4 px-4">
          <div className="text-center">
            <div className="text-gray-400 text-xs">VITESSE</div>
            <div className="text-2xl font-bold">{speed} <span className="text-sm">km/h</span></div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-xs">RAPPORT</div>
            <div className="text-4xl font-bold text-yellow-500">{gear}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-xs">DISTANCE</div>
            <div className="text-2xl font-bold">{distance} <span className="text-sm">m</span></div>
          </div>
        </div>

        {/* Barre de shift */}
        <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
          <div className="absolute left-[60%] w-[20%] h-full bg-green-500 opacity-50"></div>
          <div className="absolute left-[40%] w-[20%] h-full bg-yellow-500 opacity-30"></div>
          <div className="absolute left-[80%] w-[10%] h-full bg-yellow-500 opacity-30"></div>
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white"
            style={{ left: `${shiftBarPos}%`, boxShadow: '0 0 10px white' }}
          ></div>
        </div>

        {/* Bouton */}
        <button
          onClick={handleAction}
          className={`w-full mt-4 py-4 rounded-lg font-bold text-lg uppercase tracking-wider transition-all
            ${gameState === 'RACING' 
              ? 'bg-red-600 hover:bg-red-700 active:scale-95' 
              : 'bg-green-600 hover:bg-green-700'}
          `}
        >
          {gameState === 'RACING' ? 'PASSER VITESSE !' : gameState === 'FINISHED' ? 'REJOUER' : 'DÉMARRER'}
        </button>
        
        <div className="text-center mt-2 text-gray-400 text-sm">{message}</div>
      </div>
    </div>
  );
}
