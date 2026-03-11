'use client';

import { Button } from '@/components/ui/button';
import { WalletConnect } from './WalletConnect';
import {
  Map,
  Building2,
  Coins,
  Sparkles,
  TrendingUp,
  Users,
  Shield,
  Zap
} from 'lucide-react';

export function LandingPage() {
  const features = [
    {
      icon: Map,
      title: 'Carte Mondiale',
      description: 'Explorez et achetez des parcelles virtuelles sur une carte interactive stylisée',
    },
    {
      icon: Building2,
      title: 'Construisez',
      description: 'Érigez des bâtiments sur vos terres pour générer des revenus passifs',
    },
    {
      icon: Coins,
      title: 'Gagnez',
      description: 'Accumulez des PulseBucks et réclamez votre bonus quotidien',
    },
    {
      icon: TrendingUp,
      title: 'Investissez',
      description: 'Développez votre portfolio immobilier virtuel stratégiquement',
    },
  ];

  const stats = [
    { value: '20x20', label: 'Grille Mondiale' },
    { value: '5+', label: 'Types de Bâtiments' },
    { value: '24/7', label: 'Revenus Passifs' },
    { value: '∞', label: 'Possibilités' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center pulse-glow">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -inset-4 gradient-bg opacity-20 blur-2xl rounded-3xl" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">LandPulse</span>
          </h1>

          {/* Slogan */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-4">
            Own virtual land. Earn passively. Build on Solana.
          </p>

          {/* Description */}
          <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-8">
            Un jeu Web3 play-to-earn où vous pouvez acheter des parcelles virtuelles, 
            construire des bâtiments, générer des revenus passifs et participer à des événements communautaires.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <WalletConnect />
            <Button
              variant="outline"
              size="lg"
              className="glass-card border-purple-500/30 text-white hover:bg-purple-500/20"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              En savoir plus
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="glass-card rounded-lg p-4 text-center"
              >
                <div className="text-2xl md:text-3xl font-bold gradient-text">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Comment ça marche</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              LandPulse combine les meilleurs éléments du gaming et de la blockchain 
              pour créer une expérience unique et enrichissante.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card rounded-xl p-6 hover:border-purple-500/40 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section className="py-20 px-4 glass-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Tokenomics</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Un système économique double pensé pour la durabilité et l&apos;engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* PulseBucks Card */}
            <div className="glass-card rounded-xl p-8 border-purple-500/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Coins className="h-7 w-7 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">PulseBucks</h3>
                  <span className="text-xs text-muted-foreground">Monnaie interne</span>
                </div>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  Utilisée pour acheter terrains et bâtiments
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-yellow-400" />
                  Non tradable, reste dans l&apos;écosystème
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-yellow-400" />
                  Gagnée via événements et revenus
                </li>
              </ul>
            </div>

            {/* $PULSE Card */}
            <div className="glass-card rounded-xl p-8 border-pink-500/30 opacity-60">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">$PULSE</h3>
                  <span className="text-xs text-muted-foreground">Phase 2 • Token Solana</span>
                </div>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-pink-400" />
                  Token tradable sur Raydium
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-pink-400" />
                  Récompenses passives réelles
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-pink-400" />
                  Gouvernance DAO (futur)
                </li>
              </ul>
              <div className="mt-4 text-xs text-center text-muted-foreground">
                🚧 Disponible en Phase 2
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-purple-500/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <span className="font-bold gradient-text">LandPulse</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Propulsé par Solana • Phase 1 Beta
          </p>
        </div>
      </footer>
    </div>
  );
}
