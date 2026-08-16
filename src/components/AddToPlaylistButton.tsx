import { useState } from "react";
import { Plus, Check, Loader2, ListMusic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { PlayableTrack } from "@/types/player";

interface PlaylistRow {
  id: string;
  title: string;
  tracks: any[];
}

export const AddToPlaylistButton = ({ track }: { track: PlayableTrack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const loadPlaylists = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("playlists")
      .select("id, title, tracks")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPlaylists((data as unknown as PlaylistRow[]) ?? []);
    setLoading(false);
  };

  const handleOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      toast({ title: "Entre na sua conta", description: "Faça login para criar playlists." });
      return;
    }
    setOpen(true);
    void loadPlaylists();
  };

  const trackPayload = {
    title: track.title,
    artist: track.artist,
    videoId: track.videoId,
    thumbnail: track.thumbnail,
    searchQuery: track.searchQuery ?? `${track.artist} ${track.title}`,
  };

  const addToPlaylist = async (playlist: PlaylistRow) => {
    setSaving(playlist.id);
    const nextTracks = [...(playlist.tracks ?? []), trackPayload];
    const { error } = await supabase
      .from("playlists")
      .update({ tracks: nextTracks as any })
      .eq("id", playlist.id);
    setSaving(null);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      return;
    }

    setPlaylists((prev) => prev.map((p) => (p.id === playlist.id ? { ...p, tracks: nextTracks } : p)));
    toast({ title: "Adicionada!", description: `"${track.title}" foi para ${playlist.title}.` });
    setOpen(false);
  };

  const createPlaylist = async () => {
    if (!user || !newTitle.trim()) return;
    setSaving("new");
    const { data, error } = await supabase
      .from("playlists")
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        description: "Playlist personalizada",
        mood: "",
        prompt: "",
        tracks: [trackPayload] as any,
      })
      .select("id, title, tracks")
      .single();
    setSaving(null);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao criar", description: error.message });
      return;
    }

    setPlaylists((prev) => [data as unknown as PlaylistRow, ...prev]);
    setNewTitle("");
    toast({ title: "Playlist criada!", description: `"${track.title}" adicionada em ${data?.title}.` });
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Adicionar à playlist"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
      >
        <Plus className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar à playlist</DialogTitle>
            <DialogDescription className="truncate">
              {track.title} — {track.artist}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              placeholder="Nova playlist..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void createPlaylist()}
            />
            <Button onClick={() => void createPlaylist()} disabled={!newTitle.trim() || saving === "new"}>
              {saving === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}

            {!loading && playlists.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Você ainda não tem playlists. Crie uma acima.
              </p>
            )}

            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => void addToPlaylist(playlist)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted"
              >
                <ListMusic className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{playlist.title}</span>
                <span className="text-xs text-muted-foreground">{playlist.tracks?.length ?? 0}</span>
                {saving === playlist.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Check className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
