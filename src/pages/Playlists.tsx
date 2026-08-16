import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Music, Play, Share2, Trash2, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import type { PlayableTrack } from "@/types/player";

interface Playlist {
  id: string;
  title: string;
  description: string;
  mood: string;
  tracks: any[];
  created_at: string;
  is_public: boolean;
  share_token: string;
  offline_enabled: boolean;
}

const toPlayableTracks = (tracks: any[] = []): PlayableTrack[] =>
  tracks.map((track) => ({
    title: track.title || "Faixa sem nome",
    artist: track.artist || "Artista desconhecido",
    searchQuery: track.searchQuery,
    videoId: track.videoId,
    thumbnail: track.thumbnail,
  }));

const Playlists = () => {
  const { user, loading: authLoading } = useAuth();
  const { replaceQueue } = usePlayer();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [playlistsResult, profileResult] = await Promise.all([
        supabase.from("playlists").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("is_premium").eq("user_id", user.id).maybeSingle(),
      ]);

      if (playlistsResult.data) setPlaylists(playlistsResult.data as unknown as Playlist[]);
      setIsPremium(Boolean(profileResult.data?.is_premium));
      setLoading(false);
    };

    void load();
  }, [user]);

  const updatePlaylist = async (id: string, patch: Partial<Playlist>) => {
    setPlaylists((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    const { error } = await supabase.from("playlists").update(patch as any).eq("id", id);
    if (error) toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
  };

  const share = async (playlist: Playlist) => {
    if (!playlist.is_public) await updatePlaylist(playlist.id, { is_public: true });

    const link = `${window.location.origin}/p/${playlist.share_token}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: playlist.title, text: "Ouça essa playlist no SoundPro", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        toast({ title: "Link copiado!", description: link });
      }
    } catch {
      toast({ title: "Link da playlist", description: link });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
      return;
    }
    setPlaylists((previous) => previous.filter((item) => item.id !== id));
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="border-b border-border p-4">
        <h1 className="text-2xl font-bold text-foreground">Minhas playlists</h1>
        <p className="text-sm text-muted-foreground">Ouça, compartilhe e salve para o modo offline</p>
      </header>

      <div className="space-y-4 p-4">
        {playlists.length === 0 ? (
          <div className="py-16 text-center">
            <Music className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Você ainda não criou playlists.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Criar com IA
            </Button>
          </div>
        ) : (
          playlists.map((playlist) => (
            <div key={playlist.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-foreground">{playlist.title}</h2>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{playlist.description}</p>
                </div>
                <button
                  onClick={() => void handleDelete(playlist.id)}
                  className="p-2 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Excluir playlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                {playlist.tracks?.map((track: any, index: number) => (
                  <button
                    key={`${playlist.id}-${index}`}
                    onClick={() => void replaceQueue(toPlayableTracks(playlist.tracks), index)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="w-5 text-right text-xs text-muted-foreground">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{track.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                    </div>
                    <Play className="h-4 w-4 text-primary" />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <Button size="sm" variant="outline" onClick={() => void share(playlist)}>
                  <Share2 className="mr-1 h-4 w-4" />
                  Compartilhar
                </Button>

                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Offline</span>
                  <Switch
                    checked={playlist.offline_enabled}
                    onCheckedChange={(checked) => {
                      if (!isPremium) {
                        toast({
                          title: "Recurso Premium",
                          description: "Assine o Premium para salvar playlists offline.",
                        });
                        return;
                      }
                      void updatePlaylist(playlist.id, { offline_enabled: checked });
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Playlists;
