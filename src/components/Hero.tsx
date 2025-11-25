import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-music.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 text-center animate-fade-in">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary animate-pulse-glow" />
            <span className="text-sm font-medium text-foreground">Descubra músicas novas com IA</span>
          </div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent leading-tight">
            SoundPro IA
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Playlists personalizadas criadas automaticamente pela IA.
            <br />
            Descubra sua próxima música favorita em segundos.
          </p>

          {/* AI Input */}
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-3 p-2 rounded-2xl bg-card backdrop-blur-sm border-2 border-primary/30 shadow-card hover:border-primary/50 transition-all">
              <Input
                placeholder='Digite: "Quero músicas pra treinar" ou "Quero vibe triste"...'
                className="flex-1 border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              />
              <Button variant="hero" size="lg" className="px-8 animate-pulse-glow">
                <Sparkles className="w-4 h-4 mr-2" />
                Criar Playlist
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              A IA analisa suas preferências e cria playlists únicas para você
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
            <div className="space-y-2">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">10K+</p>
              <p className="text-sm text-muted-foreground">Playlists Criadas</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">50K+</p>
              <p className="text-sm text-muted-foreground">Músicas Descobertas</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">1K+</p>
              <p className="text-sm text-muted-foreground">Usuários Ativos</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
