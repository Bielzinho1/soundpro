import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Music, Search, TrendingUp, Mic2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";

const quickSearches = [
  "Pop Brasil 2024",
  "Funk",
  "Sertanejo",
  "Rock",
  "Trap",
  "Lo-fi",
  "MPB",
  "Reggaeton",
];

const moods = [
  { emoji: "🏋️", label: "Treino", color: "from-red-600 to-orange-600" },
  { emoji: "😌", label: "Relaxar", color: "from-blue-600 to-cyan-600" },
  { emoji: "🎉", label: "Festa", color: "from-purple-600 to-pink-600" },
  { emoji: "💔", label: "Sofrência", color: "from-gray-600 to-gray-800" },
  { emoji: "🚗", label: "Viagem", color: "from-green-600 to-emerald-600" },
  { emoji: "📚", label: "Estudar", color: "from-yellow-600 to-amber-600" },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGeneratePlaylist = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;

    if (!user) {
      toast({ title: "Faça login", description: "Crie uma conta para salvar playlists" });
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data: playlistData, error: aiError } = await supabase.functions.invoke(
        "generate-playlist",
        { body: { prompt: finalPrompt } }
      );

      if (aiError) throw aiError;
      if (!playlistData?.title) throw new Error("Resposta inválida");

      await supabase.from("playlists").insert({
        user_id: user.id,
        title: playlistData.title,
        description: playlistData.description,
        mood: playlistData.mood,
        prompt: finalPrompt,
        tracks: playlistData.tracks,
      });

      toast({ title: "🎵 Playlist criada!", description: playlistData.title });
      setPrompt("");
      navigate("/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Tente novamente" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold text-foreground">
            SoundPro
          </h1>
          {!user ? (
            <Button onClick={() => navigate("/auth")} size="sm" variant="outline" className="rounded-full text-xs h-8 px-4">
              Login
            </Button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {user.email?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div
          className="flex items-center gap-3 p-3 rounded-lg bg-card cursor-pointer"
          onClick={() => navigate("/search")}
        >
          <Search className="w-5 h-5 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">O que você quer ouvir?</span>
        </div>
      </div>

      <div className="px-4 space-y-8 mt-4">
        {/* AI Playlist Generator */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Criar playlist com IA</h2>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder='"Músicas pra treinar" ou "Vibe noturna"'
              className="flex-1 bg-card border-border rounded-lg h-11 text-sm"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGeneratePlaylist()}
              disabled={loading}
            />
            <Button
              onClick={() => handleGeneratePlaylist()}
              disabled={loading || !prompt.trim()}
              className="bg-primary text-primary-foreground rounded-lg h-11 px-4"
            >
              {loading ? "..." : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
        </section>

        {/* Moods */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">Seu mood</h2>
          <div className="grid grid-cols-2 gap-3">
            {moods.map((mood) => (
              <button
                key={mood.label}
                onClick={() => handleGeneratePlaylist(`Músicas para ${mood.label.toLowerCase()}`)}
                className={`bg-gradient-to-br ${mood.color} rounded-lg p-4 text-left transition-transform active:scale-95`}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <p className="text-sm font-semibold text-white mt-1">{mood.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Quick searches */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Em alta</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickSearches.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  navigate(`/search?q=${encodeURIComponent(tag)}`);
                }}
                className="px-4 py-2 rounded-full bg-card text-sm text-foreground font-medium hover:bg-muted transition-colors active:scale-95"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* Browse */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">Buscar por gênero</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Pop", color: "bg-pink-700" },
              { name: "Hip Hop", color: "bg-orange-700" },
              { name: "Sertanejo", color: "bg-yellow-700" },
              { name: "Rock", color: "bg-red-800" },
              { name: "Eletrônica", color: "bg-blue-700" },
              { name: "Pagode", color: "bg-green-700" },
            ].map((genre) => (
              <button
                key={genre.name}
                onClick={() => navigate(`/search?q=${encodeURIComponent(genre.name)}`)}
                className={`${genre.color} rounded-lg p-4 text-left font-bold text-white text-sm transition-transform active:scale-95 h-20 flex items-end`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
