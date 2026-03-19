import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search as SearchIcon,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Mic2,
  Loader2,
  ArrowLeft,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";

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

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SearchResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([70]);
  const [player, setPlayer] = useState<any>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      doSearch(q);
    } else {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  const loadYouTubeAPI = () => {
    return new Promise<void>((resolve) => {
      if (window.YT && window.YT.Player) { resolve(); return; }
      if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const check = setInterval(() => {
          if (window.YT && window.YT.Player) { clearInterval(check); resolve(); }
        }, 100);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
      window.onYouTubeIframeAPIReady = () => resolve();
    });
  };

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("search-youtube-multiple", {
        body: { query: q, maxResults: 15 },
      });
      if (error) throw error;
      if (data?.results) setResults(data.results);
    } catch {
      toast({ variant: "destructive", title: "Erro na busca" });
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = () => doSearch(query);

  const playTrack = async (track: SearchResult) => {
    setCurrentTrack(track);
    setLoadingPlayer(true);
    setLyrics(null);
    setShowLyrics(false);

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
              else if (event.data === window.YT.PlayerState.ENDED) playNext();
            },
            onError: () => {
              toast({ variant: "destructive", title: "Erro ao reproduzir" });
              setLoadingPlayer(false);
            },
          },
        });
      }

      fetchLyrics(track);
    } catch {
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
      if (data?.lyrics) setLyrics(data.lyrics);
    } catch {
      setLyrics("Letra não disponível.");
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
    if (!currentTrack || !results.length) return;
    const idx = results.findIndex((r) => r.videoId === currentTrack.videoId);
    if (idx < results.length - 1) playTrack(results[idx + 1]);
  };

  const playPrev = () => {
    if (!currentTrack || !results.length) return;
    const idx = results.findIndex((r) => r.videoId === currentTrack.videoId);
    if (idx > 0) playTrack(results[idx - 1]);
  };

  useEffect(() => {
    if (player) player.setVolume(volume[0]);
  }, [volume, player]);

  const bottomPadding = currentTrack ? "pb-40" : "pb-20";

  return (
    <div className={`min-h-screen bg-background ${bottomPadding}`}>
      {/* Lyrics Full Screen Overlay */}
      {showLyrics && currentTrack && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={() => setShowLyrics(false)}>
              <ChevronDown className="w-6 h-6 text-foreground" />
            </button>
            <div className="text-center flex-1 mx-4">
              <p className="font-bold text-foreground text-sm truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
            <Mic2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {loadingLyrics ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm mt-3">Buscando letra...</p>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-lg text-foreground/90 leading-8 text-center">
                {lyrics || "Letra não disponível."}
              </pre>
            )}
          </div>
          {/* Mini controls in lyrics view */}
          <div className="p-4 border-t border-border flex items-center justify-center gap-6">
            <button onClick={playPrev}><SkipBack className="w-5 h-5 text-foreground" /></button>
            <button
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-6 h-6 text-primary-foreground" /> : <Play className="w-6 h-6 text-primary-foreground ml-0.5" />}
            </button>
            <button onClick={playNext}><SkipForward className="w-5 h-5 text-foreground" /></button>
          </div>
        </div>
      )}

      {/* Search Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-card rounded-lg px-3 h-10">
            <SearchIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Músicas, artistas ou bandas"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            {query && (
              <button onClick={() => { setQuery(""); setResults([]); }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-4">
        {searching && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm mt-3">Buscando...</p>
          </div>
        )}

        {!searching && results.length === 0 && query && (
          <div className="flex flex-col items-center py-20">
            <SearchIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">Nenhum resultado</p>
          </div>
        )}

        {!searching && results.length === 0 && !query && (
          <div className="flex flex-col items-center py-20">
            <SearchIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Pesquise uma música ou artista</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1 mt-2">
            {results.map((result) => {
              const isActive = currentTrack?.videoId === result.videoId;
              return (
                <button
                  key={result.videoId}
                  onClick={() => playTrack(result)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
                    isActive ? "bg-card" : "hover:bg-card/50 active:bg-card"
                  }`}
                >
                  <img
                    src={result.thumbnail}
                    alt=""
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {result.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.artist}
                    </p>
                  </div>
                  {isActive && isPlaying && (
                    <div className="flex gap-0.5 items-end h-4">
                      <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '60%' }} />
                      <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.1s' }} />
                      <div className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.2s' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden YouTube Player */}
      <div ref={playerRef} style={{ display: "none" }} />

      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="fixed bottom-[52px] left-0 right-0 z-50">
          <div className="mx-2 bg-card rounded-lg shadow-card overflow-hidden">
            <button
              onClick={() => setShowLyrics(true)}
              className="w-full flex items-center gap-3 p-2"
            >
              <img
                src={currentTrack.thumbnail}
                alt=""
                className="w-11 h-11 rounded object-cover"
              />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground truncate">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentTrack.artist}
                </p>
              </div>
              <div className="flex items-center gap-1 pr-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowLyrics(true); }}
                  className="p-2"
                >
                  <Mic2 className="w-5 h-5 text-primary" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                  className="p-2"
                >
                  {loadingPlayer ? (
                    <Loader2 className="w-5 h-5 text-foreground animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 text-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-foreground ml-0.5" />
                  )}
                </button>
              </div>
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Search;
