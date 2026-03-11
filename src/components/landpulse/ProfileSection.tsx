'use client';

import { useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Camera,
  Save,
  Loader2,
  Check,
  X,
  Pencil,
} from 'lucide-react';

export function ProfileSection() {
  const { user, setUser } = useGameStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 2MB');
      return;
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    // Créer un preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload vers le serveur
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet', user?.walletAddress || '');

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.avatarUrl) {
        setUser({
          ...user!,
          avatarUrl: data.avatarUrl,
        });
        setSuccess('Avatar mis à jour !');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de l\'upload');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setError('Le pseudo ne peut pas être vide');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError('Le pseudo doit faire entre 3 et 20 caractères');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Le pseudo ne peut contenir que des lettres, chiffres et _');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: user?.walletAddress,
          username: username.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser({
          ...user!,
          username: username.trim(),
        });
        setIsEditing(false);
        setSuccess('Pseudo mis à jour !');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setUsername(user?.username || '');
    setIsEditing(false);
    setError('');
  };

  // Générer les initiales pour l'avatar par défaut
  const getInitials = () => {
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return user?.walletAddress?.slice(0, 2).toUpperCase() || '??';
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-purple-400" />
          Mon Profil
        </CardTitle>
        <CardDescription>
          Personnalisez votre profil public
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-purple-500/30 cursor-pointer hover:border-purple-500/60 transition-colors">
              <AvatarImage src={avatarPreview} alt="Avatar" />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-xl font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              disabled={isLoading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-400 flex items-center justify-center transition-colors"
            >
              <Camera className="h-4 w-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cliquez pour changer d'avatar (max 2MB)
          </p>
        </div>

        {/* Pseudo */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Pseudo public</label>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre pseudo"
                maxLength={20}
                className="bg-background/50"
              />
              <Button
                size="icon"
                onClick={handleSaveUsername}
                disabled={isLoading}
                className="bg-green-500 hover:bg-green-400"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-purple-500/20">
              <span className="font-medium">
                {user?.username || `Joueur_${user?.walletAddress?.slice(0, 4)}`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="text-purple-400 hover:text-purple-300"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="p-2 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-2 rounded bg-green-500/20 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground p-2 rounded bg-background/20">
          💡 Votre pseudo est visible par les autres joueurs. Votre adresse wallet reste privée.
        </div>
      </CardContent>
    </Card>
  );
}
