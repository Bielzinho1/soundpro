import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Music, Trash2, Play, Pause, SkipForward, SkipBack, Loader2, Mic2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";

interface Playlist {
  id: string;
  title: string;
  description: string;
  mood: string;
  tracks: any[];
  created_at: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const playerDivRef = useState<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadPlaylists();
  }, [user]);

  const loadPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPlaylists((data || []) as Playlist[]);
    } catch {
      toast({ variant: "destructive", title: "Erro ao carregar playlists" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("playlists").delete().eq("id", id);
      if (error) throw error;
      setPlaylists(playlists.filter((p) => p.id !== id));
      if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
      toast({ title: "Playlist excluída" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const currentTrack = selectedPlaylist?.tracks?.[currentTrackIndex];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-foreground">Biblioteca</h1>
          <div className="flex items-center gap-2">
            <Button onClick={signOut} variant="ghost" size="sm" className="text-muted-foreground text-xs">
              Sair
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
      </div>

      <div className="px-4 space-y-4 mt-2">
        {playlists.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Music className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhuma playlist ainda</p>
            <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground rounded-full px-6">
              Criar Playlist
            </Button>
          </div>
        ) : (
          playlists.map((playlist) => (
            <div key={playlist.id} className="bg-card rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium uppercase">
                    {playlist.mood}
                  </span>
                  <h3 className="font-bold text-foreground mt-1 truncate">{playlist.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{playlist.description}</p>
                </div>
                <button
                  onClick={() => handleDelete(playlist.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Tracks */}
              <div className="space-y-1">
                {playlist.tracks?.map((track: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedPlaylist(playlist);
                      setCurrentTrackIndex(idx);
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                      selectedPlaylist?.id === playlist.id && currentTrackIndex === idx
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${
                        selectedPlaylist?.id === playlist.id && currentTrackIndex === idx
                          ? "text-primary font-medium"
                          : "text-foreground"
                      }`}>
                        {track.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground">
                {new Date(playlist.created_at).toLocaleDateString("pt-BR")} • {playlist.tracks?.length || 0} músicas
              </p>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
