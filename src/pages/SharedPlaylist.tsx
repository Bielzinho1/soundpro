import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { Loader2, Music, Play } from "lucide-react";
import type { PlayableTrack } from "@/types/player";

const SharedPlaylist = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { replaceQueue } = usePlayer();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("playlists")
        .select("title, description, tracks, mood")
        .eq("share_token", token as string)
        .eq("is_public", true)
        .maybeSingle();

      setPlaylist(data);
      setLoading(false);
    };

    void load();
  }, [token]);

  const tracks: PlayableTrack[] = (playlist?.tracks || []).map((track: any) => ({
    title: track.title || "Faixa sem nome",
    artist: track.artist || "Artista desconhecido",
    searchQuery: track.searchQuery,
    videoId: track.videoId,
    thumbnail: track.thumbnail,
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <Music className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Playlist não encontrada</h1>
        <p className="text-sm text-muted-foreground">O link pode ter expirado ou não é mais público.</p>
        <Button onClick={() => navigate("/")}>Ir para o SoundPro</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="space-y-1 border-b border-border p-6">
        <p className="text-xs uppercase tracking-wide text-primary">Playlist compartilhada</p>
        <h1 className="text-2xl font-bold text-foreground">{playlist.title}</h1>
        <p className="text-sm text-muted-foreground">{playlist.description}</p>
        <Button className="mt-3" onClick={() => void replaceQueue(tracks, 0)}>
          <Play className="mr-1 h-4 w-4" />
          Tocar tudo
        </Button>
      </header>

      <div className="space-y-1 p-4">
        {tracks.map((track, index) => (
          <button
            key={`${track.title}-${index}`}
            onClick={() => void replaceQueue(tracks, index)}
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
    </div>
  );
};

export default SharedPlaylist;
