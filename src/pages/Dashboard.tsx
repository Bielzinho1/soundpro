import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, LogOut, Trash2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MusicPlayer } from "@/components/MusicPlayer";

interface Playlist {
  id: string;
  title: string;
  description: string;
  mood: string;
  tracks: any[];
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadPlaylists();
    }
  }, [user]);

  const loadPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlaylists((data || []) as Playlist[]);
    } catch (error) {
      console.error("Erro ao carregar playlists:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar suas playlists",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      const { error } = await supabase.from("playlists").delete().eq("id", id);

      if (error) throw error;

      setPlaylists(playlists.filter((p) => p.id !== id));
      if (selectedPlaylist?.id === id) {
        setSelectedPlaylist(null);
      }

      toast({
        title: "Playlist excluída",
        description: "Sua playlist foi removida com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir playlist:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a playlist",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-primary animate-pulse mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Music className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Minhas Playlists
              </h1>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => navigate("/")} variant="outline">
              Criar Nova
            </Button>
            <Button onClick={signOut} variant="ghost">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {playlists.length === 0 ? (
          <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Nenhuma playlist ainda</h2>
            <p className="text-muted-foreground mb-6">
              Crie sua primeira playlist usando IA!
            </p>
            <Button onClick={() => navigate("/")} variant="hero">
              Criar Playlist
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="p-6 bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <Music className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-medium inline-block">
                    {playlist.mood}
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    {playlist.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {playlist.description}
                  </p>
                  
                  {/* Lista de músicas */}
                  <div className="border-t border-border pt-3 mt-3 space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {playlist.tracks?.length || 0} Músicas
                    </p>
                    {playlist.tracks?.slice(0, 5).map((track: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedPlaylist(playlist);
                          setCurrentTrackIndex(idx);
                        }}
                        className="w-full text-left p-2 rounded hover:bg-accent/50 transition-colors group/track"
                      >
                        <p className="text-sm font-medium text-foreground truncate group-hover/track:text-primary">
                          {track.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist}
                        </p>
                      </button>
                    ))}
                    {playlist.tracks?.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{playlist.tracks.length - 5} músicas
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => {
                      setSelectedPlaylist(playlist);
                      setCurrentTrackIndex(0);
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Tocar Playlist
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    {new Date(playlist.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Music Player */}
      {selectedPlaylist && (
        <MusicPlayer
          tracks={selectedPlaylist.tracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={setCurrentTrackIndex}
        />
      )}
    </div>
  );
};

export default Dashboard;