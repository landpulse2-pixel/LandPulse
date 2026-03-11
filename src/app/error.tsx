'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-4">
      <div className="max-w-lg w-full bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-400 mb-4">Une erreur est survenue</h2>
        <div className="bg-black/30 rounded p-3 mb-4 overflow-auto">
          <p className="text-red-300 text-sm font-mono whitespace-pre-wrap">
            {error?.message || 'Erreur inconnue'}
          </p>
          {error?.digest && (
            <p className="text-xs text-red-400/70 mt-2">Digest: {error.digest}</p>
          )}
          {error?.stack && (
            <details className="mt-2">
              <summary className="text-xs text-red-400 cursor-pointer">Stack trace</summary>
              <pre className="text-xs text-red-300/70 mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
          >
            Réessayer
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
