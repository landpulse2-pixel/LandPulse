'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, CheckCircle, XCircle, Loader2, Bug, RefreshCw } from 'lucide-react';

interface MigrationResult {
  success: boolean;
  message: string;
  results?: string[];
  error?: string;
  details?: string;
  currentColumns?: Array<{ column_name: string; data_type: string }>;
}

interface DiagnosticResult {
  userColumns?: Array<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>;
  tables?: Array<{ table_name: string }>;
  userIndexes?: Array<{ indexname: string; indexdef: string }>;
  sampleUser?: any;
  error?: string;
  details?: string;
}

export function MigrateButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);

  const runMigration = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/migrate', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Erreur de connexion',
        error: 'Network error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagnostic(null);

    try {
      const response = await fetch('/api/admin/diagnostic');
      const data = await response.json();
      setDiagnostic(data);
    } catch (error) {
      setDiagnostic({
        error: 'Network error',
        details: 'Impossible de contacter le serveur',
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const forceMigration = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/diagnostic', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
      
      // Refresh diagnostic after force migration
      setTimeout(runDiagnostic, 500);
    } catch (error) {
      setResult({
        success: false,
        message: 'Erreur de connexion',
        error: 'Network error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card border-blue-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-400" />
          Migration Base de Données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cliquez sur "Lancer la Migration" pour synchroniser la base de données.
          Utilisez "Diagnostic" pour voir l'état actuel.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runMigration}
            disabled={isLoading || isDiagnosing}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Migration...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Lancer la Migration
              </>
            )}
          </Button>

          <Button
            onClick={runDiagnostic}
            disabled={isLoading || isDiagnosing}
            variant="outline"
            className="border-purple-500/30"
          >
            {isDiagnosing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse...
              </>
            ) : (
              <>
                <Bug className="h-4 w-4 mr-2" />
                Diagnostic
              </>
            )}
          </Button>

          <Button
            onClick={forceMigration}
            disabled={isLoading || isDiagnosing}
            variant="outline"
            className="border-orange-500/30 text-orange-400"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Force...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Forcer Colonnes
              </>
            )}
          </Button>
        </div>

        {/* Migration Result */}
        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </span>
            </div>
            
            {result.results && result.results.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Détails :</p>
                <ul className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                  {result.results.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-400">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.currentColumns && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">Colonnes User :</p>
                <div className="flex flex-wrap gap-1">
                  {result.currentColumns.map((col, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {col.column_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.error && (
              <p className="text-xs text-red-300 mt-2">
                Erreur: {result.details || result.error}
              </p>
            )}
          </div>
        )}

        {/* Diagnostic Result */}
        {diagnostic && !diagnostic.error && (
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="mb-3">
              <p className="text-sm font-medium text-purple-400">Tables dans la base :</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {diagnostic.tables?.map((t, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-700/50">
                    {t.table_name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium text-purple-400">Colonnes User :</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {diagnostic.userColumns?.map((c, i) => (
                  <span 
                    key={i} 
                    className={`text-xs px-2 py-0.5 rounded ${
                      c.column_name === 'username' || c.column_name === 'avatarUrl'
                        ? 'bg-green-500/30 text-green-300'
                        : 'bg-gray-700/50'
                    }`}
                  >
                    {c.column_name}: {c.data_type}
                  </span>
                ))}
              </div>
            </div>

            {diagnostic.sampleUser && (
              <div>
                <p className="text-sm font-medium text-purple-400">Exemple utilisateur :</p>
                <pre className="text-xs mt-1 p-2 rounded bg-black/30 overflow-x-auto">
                  {JSON.stringify(diagnostic.sampleUser, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {diagnostic?.error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{diagnostic.error}</p>
            {diagnostic.details && (
              <p className="text-xs text-red-300 mt-1">{diagnostic.details}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
