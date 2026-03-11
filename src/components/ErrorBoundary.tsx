'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-4">
          <div className="max-w-lg w-full bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400 mb-4">Une erreur est survenue</h2>
            <div className="bg-black/30 rounded p-3 mb-4 overflow-auto">
              <p className="text-red-300 text-sm font-mono whitespace-pre-wrap">
                {this.state.error?.message || 'Erreur inconnue'}
              </p>
              {this.state.error?.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-400 cursor-pointer">Stack trace</summary>
                  <pre className="text-xs text-red-300/70 mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
