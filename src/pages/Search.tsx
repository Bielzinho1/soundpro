import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/contexts/PlayerContext";
import type { PlayableTrack } from "@/types/player";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import {
  Search as SearchIcon,
  Loader2,
  ArrowLeft,
  X,
} from "lucide-react";

const isSameTrack = (current: PlayableTrack | null, candidate: PlayableTrack) => {
  if (!current) return false;
  if (current.videoId && candidate.videoId) return current.videoId === candidate.videoId;
  return current.title === candidate.title && current.artist === candidate.artist;
};

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentTrack, isPlaying, loadingPlayer, playTrack } = usePlayer();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<PlayableTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (q) {
      setQuery(q);
      void doSearch(q);
    } else {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  const doSearch = async (q: string) => {
    const trimmedQuery = q.trim();

    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    setSearching(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("search-youtube-multiple", {
        body: { query: trimmedQuery, maxResults: 15 },
      });

      if (error) throw error;

      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Erro na busca",
        description: "Não foi possível buscar agora.",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = () => {
    void doSearch(query);
  };

  const bottomPadding = currentTrack ? "pb-40" : "pb-20";

  return (
    <div className={`min-h-screen bg-background ${bottomPadding}`}>
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
            {results.map((result, index) => {
              const isActive = isSameTrack(currentTrack, result);

              return (
                <button
                  key={result.videoId}
                  onClick={() => void playTrack(result, results, index)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
                    isActive ? "bg-card" : "hover:bg-card/50 active:bg-card"
                  }`}
                >
                  {result.thumbnail ? (
                    <img
                      src={result.thumbnail}
                      alt={`Capa de ${result.title}`}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <SearchIcon className="h-4 w-4" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {result.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.artist}
                    </p>
                  </div>
                  {isActive && loadingPlayer && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}

                  {isActive && isPlaying && !loadingPlayer && (
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

      <BottomNav />
    </div>
  );
};

export default Search;
