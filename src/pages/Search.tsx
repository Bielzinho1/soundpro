import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Search as SearchIcon,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Music,
  Mic2,
  LogOut,
  Home,
  ListMusic,
  Crown,
  Loader2,
  Plus,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface SearchResult {
  title: string;
  artist: string;
  videoId: string;
  thumbnail: string;
}

const WHATSAPP_LINK = "https://wa.me/5541992945393?text=Olá! Quero assinar o SoundPro Premium!";

const Search = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SearchResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([70]);
  const [player, setPlayer] = useState<any>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const loadYouTubeAPI = () => {
    return new Promise<void>((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
      window.onYouTubeIframeAPIReady = () => resolve();
    });
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);

    try {
      const YOUTUBE_API_KEY_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&type=video&videoCategoryId=10&q=${encodeURIComponent(query)}&key=`;
      
      const { data, error } = await supabase.functions.invoke("search-youtube-multiple", {
        body: { query, maxResults: 10 },
      });

      if (error) throw error;

      if (data?.results) {
        setResults(data.results);
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      toast({
        variant: "destructive",
        title: "Erro na busca",
        description: "Não foi possível buscar músicas. Tente novamente.",
      });
    } finally {
      setSearching(false);
    }
  };

  const playTrack = async (track: SearchResult) => {
    setCurrentTrack(track);
    setLoadingPlayer(true);
    setLyrics(null);

    try {
      await loadYouTubeAPI();

      if (player) {
        player.loadVideoById(track.videoId);
        player.unMute();
        player.setVolume(volume[0]);
        player.playVideo();
        setLoadingPlayer(false);
        setIsPlaying(true);
      } else {
        const newPlayer = new window.YT.Player(playerRef.current, {
          height: "0",
          width: "0",
          videoId: track.videoId,
          playerVars: { autoplay: 1, controls: 0 },
          events: {
            onReady: (event: any) => {
              event.target.unMute();
              event.target.setVolume(volume[0]);
              event.target.playVideo();
              setPlayer(event.target);
              setIsPlaying(true);
              setLoadingPlayer(false);
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
              else if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
            },
            onError: () => {
              toast({ variant: "destructive", title: "Erro ao reproduzir" });
              setLoadingPlayer(false);
            },
          },
        });
      }

      // Fetch lyrics
      fetchLyrics(track);
    } catch (error) {
      console.error("Erro ao tocar:", error);
      setLoadingPlayer(false);
    }
  };

  const fetchLyrics = async (track: SearchResult) => {
    setLoadingLyrics(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-lyrics", {
        body: { title: track.title, artist: track.artist },
      });

      if (error) throw error;
      if (data?.lyrics) {
        setLyrics(data.lyrics);
      }
    } catch (error) {
      console.error("Erro ao buscar letra:", error);
      setLyrics("Letra não disponível no momento.");
    } finally {
      setLoadingLyrics(false);
    }
  };

  const handlePlayPause = () => {
    if (!player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  };

  const playNext = () => {
    if (!currentTrack || results.length === 0) return;
    const idx = results.findIndex((r) => r.videoId === currentTrack.videoId);
    if (idx < results.length - 1) playTrack(results[idx + 1]);
  };

  const playPrev = () => {
    if (!currentTrack || results.length === 0) return;
    const idx = results.findIndex((r) => r.videoId === currentTrack.videoId);
    if (idx > 0) playTrack(results[idx - 1]);
  };

  useEffect(() => {
    if (player) player.setVolume(volume[0]);
  }, [volume, player]);

  const handleAddToPlaylist = () => {
    if (!user) {
      toast({ title: "Faça login", description: "Você precisa estar logado para criar playlists" });
      navigate("/auth");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent hidden sm:block">
              SoundPro IA
            </span>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => navigate("/")} variant="ghost" size="sm">
              <Home className="w-4 h-4" />
            </Button>
            {user && (
              <Button onClick={() => navigate("/dashboard")} variant="ghost" size="sm">
                <ListMusic className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={() => window.open(WHATSAPP_LINK, "_blank")}
              variant="premium"
              size="sm"
            >
              <Crown className="w-4 h-4 mr-1" />
              Premium
            </Button>
            {user ? (
              <Button onClick={signOut} variant="ghost" size="sm">
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")} variant="outline" size="sm">
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 p-2 rounded-2xl bg-card border-2 border-primary/30 hover:border-primary/50 transition-all">
            <Input
              placeholder="Pesquise qualquer música ou artista..."
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button variant="hero" onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SearchIcon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 flex-1 pb-32">
        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Results */}
          <div className="space-y-3">
            {results.length > 0 && (
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <SearchIcon className="w-5 h-5 text-primary" />
                Resultados
              </h2>
            )}
            {results.map((result, idx) => (
              <Card
                key={result.videoId}
                className={`p-3 flex items-center gap-3 cursor-pointer transition-all hover:border-primary/50 ${
                  currentTrack?.videoId === result.videoId
                    ? "border-primary bg-primary/10"
                    : "bg-card/50"
                }`}
                onClick={() => playTrack(result)}
              >
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">
                    {result.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.artist}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    playTrack(result);
                  }}
                >
                  {currentTrack?.videoId === result.videoId && isPlaying ? (
                    <Pause className="w-4 h-4 text-primary" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </Card>
            ))}

            {results.length === 0 && !searching && (
              <div className="text-center py-16 space-y-4">
                <Mic2 className="w-16 h-16 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  Pesquise qualquer música para ouvir e ver a letra
                </p>
              </div>
            )}

            {searching && (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                <p className="text-muted-foreground mt-4">Buscando músicas...</p>
              </div>
            )}
          </div>

          {/* Lyrics Panel */}
          <div>
            {currentTrack && (
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20 sticky top-20">
                <div className="flex items-center gap-3 mb-4">
                  <Mic2 className="w-5 h-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">
                      {currentTrack.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2">
                  {loadingLyrics ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground mt-3">
                        Buscando letra...
                      </p>
                    </div>
                  ) : lyrics ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-7">
                      {lyrics}
                    </pre>
                  ) : null}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Hidden YouTube Player */}
      <div ref={playerRef} style={{ display: "none" }} />

      {/* Bottom Player */}
      {currentTrack && (
        <Card className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t-2 border-primary/30 shadow-glow z-50">
          <div className="container mx-auto">
            <div className="flex items-center gap-4">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-12 h-12 rounded-lg object-cover hidden sm:block"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate text-sm">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentTrack.artist}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={playPrev}>
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="hero"
                  className="w-10 h-10"
                  onClick={handlePlayPause}
                  disabled={loadingPlayer}
                >
                  {loadingPlayer ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
                <Button size="icon" variant="ghost" onClick={playNext}>
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              <div className="hidden md:flex items-center gap-2 w-28">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Search;
