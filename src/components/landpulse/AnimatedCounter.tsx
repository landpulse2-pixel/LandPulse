'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  duration?: number; // Animation duration in ms
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (value: number) => string;
}

/**
 * AnimatedCounter - Smoothly animates number changes
 * Uses requestAnimationFrame for smooth 60fps animations
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 500,
  prefix = '',
  suffix = '',
  className = '',
  formatFn,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel any running animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (value - startValue) * easeOut;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = formatFn 
    ? formatFn(displayValue)
    : displayValue.toFixed(decimals);

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}

// Global state to persist counter across tab changes and re-renders
// Key: counter ID, Value: { startTime, baseValue, lastKnownServerValue }
const counterGlobalState = new Map<string, { 
  startTime: number; 
  baseValue: number;
  lastServerValue: number;
}>();

interface RealTimeCounterProps {
  baseValue: number;
  ratePerSecond: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (value: number) => string;
  updateInterval?: number; // How often to update display (ms)
  id?: string; // Unique ID to persist state across tab changes
}

/**
 * RealTimeCounter - Shows a counter that increments in real-time
 * NEVER resets once started - only syncs up if server value is higher
 */
export function RealTimeCounter({
  baseValue = 0,
  ratePerSecond = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatFn,
  updateInterval = 50,
  id = 'default',
}: RealTimeCounterProps) {
  // Ensure baseValue is a valid number
  const safeBaseValue = typeof baseValue === 'number' && !isNaN(baseValue) ? baseValue : 0;
  const safeRatePerSecond = typeof ratePerSecond === 'number' && !isNaN(ratePerSecond) ? ratePerSecond : 0;
  
  // Use ref to track start time and base - avoids hydration issues
  const startTimeRef = useRef<number | null>(null);
  const baseValueRef = useRef(safeBaseValue);
  
  // Initialize start time on first client render
  if (startTimeRef.current === null && typeof window !== 'undefined') {
    startTimeRef.current = Date.now();
    baseValueRef.current = safeBaseValue;
  }
  
  const [displayValue, setDisplayValue] = useState(safeBaseValue);

  // Real-time increment loop - NEVER stops
  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      baseValueRef.current = safeBaseValue;
    }

    const updateDisplay = () => {
      if (startTimeRef.current === null) return;
      
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      setDisplayValue(baseValueRef.current + (safeRatePerSecond * elapsed));
    };

    // Update immediately
    updateDisplay();

    // Set up interval for continuous updates
    const interval = setInterval(updateDisplay, updateInterval);

    return () => clearInterval(interval);
  }, [safeRatePerSecond, updateInterval]);

  // Sync with server - but NEVER reset downwards
  useEffect(() => {
    if (startTimeRef.current !== null) {
      const currentCalculatedValue = baseValueRef.current + (safeRatePerSecond * ((Date.now() - startTimeRef.current) / 1000));
      
      if (safeBaseValue > currentCalculatedValue + 1) {
        // Server has more points - sync up
        startTimeRef.current = Date.now();
        baseValueRef.current = safeBaseValue;
      }
    }
  }, [safeBaseValue, safeRatePerSecond]);

  const formattedValue = formatFn 
    ? formatFn(displayValue)
    : displayValue.toFixed(decimals);

  return (
    <span className={`${className} tabular-nums`}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}

interface RollingDigitsProps {
  value: number;
  decimals?: number;
  className?: string;
}

export function RollingDigits({
  value,
  decimals = 0,
  className = '',
}: RollingDigitsProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = displayValue;
    const duration = 300;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 2);
      const currentValue = startValue + (value - startValue) * easeOut;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  const str = displayValue.toFixed(decimals);
  
  return (
    <span className={`${className} inline-flex overflow-hidden`}>
      {str.split('').map((char, i) => (
        <span 
          key={i} 
          className="inline-block transition-transform duration-200"
          style={{ 
            fontVariantNumeric: 'tabular-nums',
            minWidth: char === '.' ? '0.3em' : '0.6em',
            textAlign: 'center',
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

/**
 * formatCompactNumber - Formats large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}
