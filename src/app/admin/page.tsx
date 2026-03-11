'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Trash2, CheckCircle, Home, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fix houses
  const [fixLoading, setFixLoading] = useState(false);
  const [fixPreview, setFixPreview] = useState<Record<string, unknown> | null>(null);
  const [fixResult, setFixResult] = useState<Record<string, unknown> | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  const handleCleanup = async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les données ?\n\nCette action est irréversible!')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/cleanup-test', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
        setLoading(false);
      }
  };

  // Preview houses to fix
  const handlePreviewHouses = async () => {
    setFixLoading(true);
    setFixError(null);
    setFixPreview(null);

    try {
      const response = await fetch('/api/admin/fix-houses');
      const data = await response.json();

      if (data.total !== undefined) {
        setFixPreview(data);
      } else {
        setFixError(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      setFixError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setFixLoading(false);
    }
  };

  // Fix houses
  const handleFixHouses = async () => {
    if (!confirm('⚠️ Corriger les maisons pour n\'occuper qu\'1 parcelle ?\n\nLes parcelles excédentaires seront libérées.')) {
      return;
    }

    setFixLoading(true);
    setFixError(null);
    setFixResult(null);

    try {
      const response = await fetch('/api/admin/fix-houses', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setFixResult(data);
        setFixPreview(null);
      } else {
        setFixError(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      setFixError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setFixLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Fix Houses Card */}
        <Card className="glass-card border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Home className="h-5 w-5" />
              Correction Maisons (1 parcelle)
            </CardTitle>
            <CardDescription>
              Corrige les maisons qui occupent plus d&apos;1 parcelle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="flex gap-3">
              <Button
                onClick={handlePreviewHouses}
                disabled={fixLoading}
                variant="outline"
                className="flex-1"
              >
                {fixLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Prévisualiser
              </Button>

              <Button
                onClick={handleFixHouses}
                disabled={fixLoading || !fixPreview}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {fixLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Corriger les maisons
              </Button>
            </div>

            {fixError && (
              <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-400">❌ {fixError}</p>
              </div>
            )}

            {fixPreview && (
              <div className="p-4 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <h4 className="font-semibold text-blue-400 mb-2">📊 Aperçu</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{fixPreview.total as number}</div>
                    <div className="text-xs text-blue-300">Total maisons</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">{fixPreview.toFixCount as number}</div>
                    <div className="text-xs text-blue-300">À corriger</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{fixPreview.alreadyOkCount as number}</div>
                    <div className="text-xs text-blue-300">Déjà OK</div>
                  </div>
                </div>
                {(fixPreview.toFixCount as number) > 0 && (
                  <p className="text-sm text-yellow-300 mt-3">
                    ⚠️ {(fixPreview.toFixCount as number)} maison(s) vont être corrigées
                  </p>
                )}
              </div>
            )}

            {fixResult && (
              <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Correction réussie!</span>
                </div>
                <p className="text-green-300">{fixResult.message as string}</p>
                <pre className="text-xs text-green-200 mt-2 overflow-auto">
                  {JSON.stringify(fixResult.results, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cleanup Card */}
        <Card className="glass-card border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Zone Admin - Nettoyage Base de Données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300">
                ⚠️ <strong>Attention:</strong> Cette action va supprimer:
              </p>
              <ul className="text-sm text-red-300 mt-2 list-disc list-inside">
                <li>Toutes les parcelles</li>
                <li>Tous les bâtiments (château, maisons...)</li>
                <li>Toutes les transactions</li>
                <li>Réinitialiser vos PulseBucks à 20,000 PB</li>
              </ul>
            </div>

            <Button
              onClick={handleCleanup}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Nettoyage en cours...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Nettoyer la base de données
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-400">❌ {error}</p>
              </div>
            )}

            {result && (
              <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Nettoyage réussi!</span>
                </div>
                <pre className="text-xs text-green-300 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
