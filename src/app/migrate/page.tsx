'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, Database, RefreshCw } from 'lucide-react';

interface MigrationStatus {
  table: string;
  exists: boolean;
  columns?: string[];
  error?: string;
}

export default function MigratePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<MigrationStatus[]>([]);
  const [message, setMessage] = useState('');
  const [lastAction, setLastAction] = useState('');

  const checkTables = async () => {
    setIsChecking(true);
    setMessage('');
    try {
      const response = await fetch('/api/migrate/check');
      const data = await response.json();
      setStatus(data.tables || []);
      setMessage(data.message || '');
    } catch (error) {
      setMessage('Erreur lors de la vérification des tables');
    } finally {
      setIsChecking(false);
    }
  };

  const runMigration = async () => {
    setIsLoading(true);
    setMessage('');
    setLastAction('');
    try {
      const response = await fetch('/api/migrate/run', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setLastAction('Migration réussie !');
        // Recheck tables after migration
        await checkTables();
      } else {
        setMessage(data.error || 'Erreur lors de la migration');
      }
    } catch (error) {
      setMessage('Erreur lors de la migration');
    } finally {
      setIsLoading(false);
    }
  };

  const seedData = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/migrate/seed', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setMessage('Données initiales créées avec succès !');
      } else {
        setMessage(data.error || 'Erreur lors de l\'initialisation');
      }
    } catch (error) {
      setMessage('Erreur lors de l\'initialisation');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkTables();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="glass-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Database className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Migration Base de Données</CardTitle>
            <CardDescription>
              Vérifiez et migrez les tables de la base de données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status message */}
            {message && (
              <div className={`p-4 rounded-lg ${lastAction.includes('réussie') ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                <p className={lastAction.includes('réussie') ? 'text-green-400' : 'text-red-400'}>{message}</p>
              </div>
            )}

            {/* Tables status */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white mb-4">Statut des tables</h3>
              {status.length > 0 ? (
                status.map((table, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-purple-500/20"
                  >
                    <div className="flex items-center gap-3">
                      {table.exists ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                      <span className="font-medium">{table.table}</span>
                    </div>
                    <Badge variant={table.exists ? 'default' : 'destructive'}>
                      {table.exists ? 'OK' : 'Manquante'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {isChecking ? 'Vérification en cours...' : 'Aucune information'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={checkTables}
                disabled={isChecking}
                variant="outline"
                className="flex-1"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Vérifier
              </Button>
              <Button
                onClick={runMigration}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Exécuter la migration
              </Button>
            </div>

            {/* Seed button */}
            <Button
              onClick={seedData}
              disabled={isLoading}
              variant="outline"
              className="w-full border-yellow-500/30 hover:bg-yellow-500/10"
            >
              🌱 Initialiser les données de test
            </Button>

            {/* Info */}
            <div className="text-xs text-muted-foreground text-center p-4 bg-background/20 rounded-lg">
              <p>Cette page permet de vérifier et créer les tables nécessaires au fonctionnement de LandPulse.</p>
              <p className="mt-1">Cliquez sur "Exécuter la migration" pour créer les tables manquantes.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
