'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'IDLE' | 'COUNTDOWN' | 'RACING' | 'FINISHED';
type ShiftQuality = 'PERFECT' | 'GOOD' | 'BAD' | null;

export default function DragRaceGame({ onGameComplete }: { onGameComplete?: (result: { time: number; distance: number }) => void }) {
  // --- ÉTATS UI (déclenchent des re-renders) ---
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [gear, setGear] = useState(0);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [displayRPM, setDisplayRPM] = useState(0); // ✅ NOUVEAU: State pour l'affichage RPM
  const [shiftQuality, setShiftQuality] = useState<ShiftQuality>(null);
  const [countdown, setCountdown] = useState(3);
  const [finalTime, setFinalTime] = useState(0);

  // --- RÉFÉRENCES LOGIQUE (pas de re-render) ---
  const requestRef = useRef<number>();
  const logicRPM = useRef(0); // Valeur logique pour la physique
  const logicSpeed = useRef(0);
  const logicDistance = useRef(0);
  const shiftBarPos = useRef(0);
  const lastTime = useRef(0);
  const startTime = useRef(0);
  const gearShifted = useRef(false); // ✅ Pour éviter les doubles shifts

  // --- CONFIG ---
  const MAX_RPM = 8000;
  const GEAR_COUNT = 5;
  const FINISH_LINE = 400;

  // --- BOUCLE D'ANIMATION PRINCIPALE ---
  const updateGame = useCallback((time: number) => {
    if (gameState !== 'RACING') return;

    const deltaTime = time - lastTime.current;
    lastTime.current = time;

    // 1. RPM monte progressivement
    const rpmRiseRate = gear === 0 ? 30 : 80 + (gear * 25);
    logicRPM.current = Math.min(logicRPM.current + rpmRiseRate, MAX_RPM + 2000); // Dépassement pour effet "rouge"

    // 2. Vitesse dépend du RPM et du rapport
    const optimalRPM = 6500;
    const rpmEfficiency = 1 - Math.abs(logicRPM.current - optimalRPM) / optimalRPM;
    const acceleration = gear === 0 ? 0.02 : (0.15 + gear * 0.03) * Math.max(0.3, rpmEfficiency);
    
    if (logicRPM.current > 1500 && !gearShifted.current) {
      logicSpeed.current = Math.min(logicSpeed.current + acceleration, 150 + gear * 30);
    } else {
      logicSpeed.current *= 0.995; // Décélération légère
    }

    // 3. Distance
    logicDistance.current += logicSpeed.current * 0.016; // ~60fps

    // 4. Barre de shift
    const shiftSpeed = gear === 0 ? 0.3 : 0.8 + (gear * 0.4);
    shiftBarPos.current = (shiftBarPos.current + shiftSpeed) % 100;

    // 5. ✅ MISE À JOUR AFFICHAGE (lissage pour fluidité)
    // Lissage du RPM affiché (effet d'inertie de l'aiguille)
    setDisplayRPM(prev => prev + (logicRPM.current - prev) * 0.1);
    setDisplaySpeed(prev => prev + (logicSpeed.current - prev) * 0.1);
    setDisplayDistance(Math.floor(logicDistance.current));

    // 6. Fin de course
    if (logicDistance.current >= FINISH_LINE) {
      setGameState('FINISHED');
      const raceTime = (time - startTime.current) / 1000;
      setFinalTime(raceTime);
      onGameComplete?.({ time: raceTime, distance: FINISH_LINE });
      cancelAnimationFrame(requestRef.current!);
      return;
    }

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, gear, onGameComplete]);

  // Gestion de la boucle d'animation
  useEffect(() => {
    if (gameState === 'RACING') {
      lastTime.current = performance.now();
      startTime.current = lastTime.current;
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, updateGame]);

  // ✅ Countdown avant départ
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
  const startGame = () => {
    setGameState('COUNTDOWN');
    setCountdown(3);
    setGear(0);
    logicRPM.current = 0;
    logicSpeed.current = 0;
    logicDistance.current = 0;
    shiftBarPos.current = 0;
    setDisplayRPM(0);
    setDisplaySpeed(0);
    setDisplayDistance(0);
  };

  const shiftGear = () => {
    if (gameState !== 'RACING' || gear >= GEAR_COUNT || gearShifted.current) return;
    
    gearShifted.current = true; // ✅ Bloque les doubles clics

    const pos = shiftBarPos.current;
    let quality: ShiftQuality = 'BAD';
    let newRPM = 1500; // Valeur de base après shift

    if (pos >= 62 && pos <= 78) {
      quality = 'PERFECT';
      newRPM = 6000; // ✅ RPM retombe dans la zone optimale
      logicSpeed.current += 8;
    } else if (pos >= 45 && pos <= 90) {
      quality = 'GOOD';
      newRPM = 4500;
      logicSpeed.current += 3;
    } else {
      quality = 'BAD';
      newRPM = 2000;
      logicSpeed.current *= 0.85; // Pénalité
    }

    // ✅ Mise à jour IMMÉDIATE du RPM logique ET affiché
    logicRPM.current = newRPM;
    setDisplayRPM(newRPM); // ✅ Force la mise à jour visuelle de l'aiguille
    
    setShiftQuality(quality);
    setGear(g => g + 1);
    
    // Reset pour prochain shift après un court délai
    setTimeout(() => { gearShifted.current = false; }, 300);
    
    // Message temporaire
    setTimeout(() => setShiftQuality(null), 800);
  };

  // Gestion clavier
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        gameState === 'RACING' ? shiftGear() : startGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  // --- CALCULS VISUELS ---
  const rpmAngle = (displayRPM / MAX_RPM) * 180 - 90; // -90° à +90°
  const roadOffset = logicDistance.current * 3; // Parallaxe route

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 font-sans select-none">
      
      {/* === ZONE DE COURSE 3D === */}
      <div className="relative h-72 bg-gray-900 overflow-hidden">
        {/* Ciel dégradé */}
        <div className="absolute top-0 w-full h-2/3 bg-gradient-to-b from-sky-900 via-purple-900 to-gray-900" />
        
        {/* Soleil/Lune */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-yellow-200 rounded-full blur-sm opacity-60" />

        {/* Route en perspective 3D CORRECTE */}
        <div 
          className="absolute bottom-0 w-full h-2/3 origin-bottom"
          style={{ 
            transform: 'perspective(600px) rotateX(55deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Surface route */}
          <div 
            className="w-[200%] h-full mx-[-50%] bg-[#1a1a2e]"
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 49%, #fff 49%, #fff 51%, transparent 51%),
                linear-gradient(#16213e 1px, transparent 1px)
              `,
              backgroundSize: '100% 100px, 100% 50px',
              backgroundPosition: `center ${roadOffset}px`,
              animation: gameState === 'RACING' ? 'roadMove 0.1s linear infinite' : 'none'
            }}
          />
          {/* Ligne centrale pointillée */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-2 h-full"
            style={{
              backgroundImage: 'linear-gradient(to bottom, #fff 50%, transparent 50%)',
              backgroundSize: '100% 80px',
              backgroundPosition: `0 ${roadOffset}px`
            }}
          />
          {/* Bordures rouges/blanches */}
          <div className="absolute left-0 w-6 h-full bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_20px,#fff_20px,#fff_40px)]" />
          <div className="absolute right-0 w-6 h-full bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_20px,#fff_20px,#fff_40px)]" />
        </div>

        {/* === MOTO VUE ARRIÈRE (SVG réaliste) === */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 h-40 z-20">
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
            {/* Ombre au sol */}
            <ellipse cx="100" cy="180" rx="40" ry="8" fill="black" opacity="0.4" />
            
            {/* Roue arrière */}
            <circle cx="100" cy="160" r="22" fill="#1f2937" stroke="#4b5563" strokeWidth="3" />
            <circle cx="100" cy="160" r="8" fill="#9ca3af" />
            <circle cx="100" cy="160" r="3" fill="#374151" />
            {/* Rayons roue */}
            {[0, 45, 90, 135].map(angle => (
              <line 
                key={angle}
                x1="100" y1="160" 
                x2={100 + 18 * Math.cos(angle * Math.PI / 180)} 
                y2={160 + 18 * Math.sin(angle * Math.PI / 180)}
                stroke="#6b7280" strokeWidth="2"
              />
            ))}
            
            {/* Châssis arrière */}
            <path d="M70 140 Q100 120 130 140 L125 155 Q100 145 75 155 Z" fill="#dc2626" />
            <path d="M75 155 Q100 150 125 155 L120 165 Q100 160 80 165 Z" fill="#991b1b" />
            
            {/* Échappements (x2) */}
            <rect x="65" y="145" width="8" height="25" rx="2" fill="#6b7280" />
            <rect x="127" y="145" width="8" height="25" rx="2" fill="#6b7280" />
            <circle cx="69" cy="168" r="5" fill="#374151" />
            <circle cx="131" cy="168" r="5" fill="#374151" />
            
            {/* Feu arrière */}
            <rect x="85" y="130" width="30" height="12" rx="3" fill="#ef4444" className="animate-pulse" />
            <rect x="88" y="133" width="24" height="6" rx="1" fill="#fca5a5" opacity="0.8" />
            
            {/* Pilote (vue dos) */}
            <ellipse cx="100" cy="100" rx="18" ry="22" fill="#1f2937" />
            <ellipse cx="100" cy="95" rx="14" ry="12" fill="#374151" />
            {/* Casque */}
            <circle cx="100" cy="82" r="16" fill="#111827" stroke="#4b5563" strokeWidth="2" />
            <path d="M90 78 Q100 72 110 78" fill="none" stroke="#fbbf24" strokeWidth="2" />
            {/* Visière reflet */}
            <ellipse cx="100" cy="80" rx="10" ry="6" fill="#60a5fa" opacity="0.6" />
            
            {/* Effet de vitesse (lignes floues) */}
            {gameState === 'RACING' && displaySpeed > 50 && (
              <g className="animate-pulse">
                <line x1="50" y1="180" x2="30" y2="195" stroke="#fbbf24" strokeWidth="2" opacity="0.6" />
                <line x1="150" y1="180" x2="170" y2="195" stroke="#fbbf24" strokeWidth="2" opacity="0.6" />
              </g>
            )}
          </svg>
          
          {/* Vibration si mauvais shift */}
          {shiftQuality === 'BAD' && (
            <div className="absolute inset-0 animate-[shake_0.3s_ease-in-out_infinite]" />
          )}
        </div>

        {/* Overlay Countdown */}
        {gameState === 'COUNTDOWN' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <div className="text-8xl font-black text-white animate-[ping_1s_ease-in-out_infinite]">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        )}

        {/* Message shift */}
        {shiftQuality && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-xl font-black tracking-wider animate-bounce z-30
            ${shiftQuality === 'PERFECT' ? 'bg-green-500/90 text-white shadow-[0_0_20px_#22c55e]' : 
              shiftQuality === 'GOOD' ? 'bg-yellow-500/90 text-black shadow-[0_0_20px_#eab308]' : 
              'bg-red-500/90 text-white shadow-[0_0_20px_#ef4444]'}`}
          >
            {shiftQuality}
          </div>
        )}
      </div>

      {/* === TABLEAU DE BORD === */}
      <div className="p-5 bg-gradient-to-b from-gray-800 to-gray-900 text-white">
        
        {/* Compte-tours SVG CORRIGÉ */}
        <div className="relative w-52 h-28 mx-auto mb-5">
          <svg viewBox="0 0 220 120" className="w-full h-full">
            {/* Fond arc */}
            <path d="M20,100 A90,90 0 0,1 200,100" fill="none" stroke="#374151" strokeWidth="12" strokeLinecap="round" />
            
            {/* Zones de couleur */}
            <path d="M20,100 A90,90 0 0,1 110,20" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray="140" opacity="0.7" />
            <path d="M110,20 A90,90 0 0,1 170,40" fill="none" stroke="#eab308" strokeWidth="12" strokeDasharray="70" strokeDashoffset="140" opacity="0.7" />
            <path d="M170,40 A90,90 0 0,1 200,100" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray="50" strokeDashoffset="210" opacity="0.7" />
            
            {/* Graduations */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
              const angle = (i / 8) * 180 - 90;
              const rad = angle * Math.PI / 180;
              const x1 = 110 + 75 * Math.cos(rad);
              const y1 = 100 + 75 * Math.sin(rad);
              const x2 = 110 + 85 * Math.cos(rad);
              const y2 = 100 + 85 * Math.sin(rad);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9ca3af" strokeWidth="2" />
              );
            })}
            
            {/* ✅ AIGUILLE avec rotation fluide via state */}
            <g transform="translate(110, 100)">
              <line 
                x1="0" y1="0" x2="0" y2="-65" 
                stroke="#f87171" 
                strokeWidth="5" 
                strokeLinecap="round"
                style={{ 
                  transform: `rotate(${rpmAngle}deg)`,
                  transformOrigin: '0 0',
                  transition: 'transform 0.05s ease-out' // ✅ Lissage visuel
                }}
              />
              <circle cx="0" cy="0" r="8" fill="#fff" />
              <circle cx="0" cy="0" r="4" fill="#ef4444" />
            </g>
            
            {/* Labels */}
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
            <div className={`text-4xl font-black ${gear >= 5 ? 'text-purple-400' : 'text-yellow-400'}`}>
              {gear === 0 ? 'N' : gear}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-xl p-3 text-center border border-gray-600">
            <div className="text-gray-400 text-xs font-semibold">DISTANCE</div>
            <div className="text-2xl font-black text-white">{displayDistance} <span className="text-sm text-gray-400">m</span></div>
          </div>
        </div>

        {/* Barre de Shift */}
        <div className="relative h-10 bg-gray-700 rounded-full overflow-hidden border-2 border-gray-600 mb-4">
          {/* Zones */}
          <div className="absolute left-[45%] w-[45%] h-full bg-yellow-500/20" />
          <div className="absolute left-[62%] w-[16%] h-full bg-green-500/40 border-x-2 border-green-300" />
          
          {/* Curseur */}
          <div 
            className="absolute top-1 bottom-1 w-1.5 bg-white rounded-full shadow-[0_0_12px_white] transition-none"
            style={{ left: `${shiftBarPos.current}%` }}
          />
          
          {/* Marqueur central */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-red-500/50" />
        </div>

        {/* Bouton principal */}
        <button
          onClick={gameState === 'IDLE' || gameState === 'FINISHED' ? startGame : shiftGear}
          disabled={gameState === 'COUNTDOWN'}
          className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
            ${gameState === 'RACING' 
              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_4px_20px_rgba(220,38,38,0.4)]' 
              : gameState === 'FINISHED'
                ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-[0_4px_20px_rgba(37,99,235,0.4)]'
            }`}
        >
          {gameState === 'IDLE' && '🏁 Démarrer la course'}
          {gameState === 'COUNTDOWN' && '⏱ Préparez-vous...'}
          {gameState === 'RACING' && `⚡ PASSER LA ${gear + 1}ÈME !`}
          {gameState === 'FINISHED' && '🔄 Rejouer'}
        </button>

        {/* Résultat final */}
        {gameState === 'FINISHED' && (
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 text-center">
            <div className="text-yellow-300 font-semibold">Course terminée !</div>
            <div className="text-3xl font-black text-white mt-1">{finalTime.toFixed(2)}s</div>
            <div className="text-gray-400 text-sm mt-1">sur {FINISH_LINE} mètres</div>
          </div>
        )}
        
        <div className="text-center mt-3 text-gray-500 text-xs">
          Espace/Entrée pour jouer • Cliquez dans la zone verte pour un shift parfait
        </div>
      </div>

      {/* Styles animations */}
      <style jsx>{`
        @keyframes roadMove {
          from { background-position: center 0; }
          to { background-position: center 100px; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px) rotate(-1deg); }
          75% { transform: translateX(3px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}
