import { ChevronDown, Loader2, Mic2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

const controlButtonClassName =
  "rounded-full p-2 text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

export const GlobalPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    isTrackLoading,
    lyrics,
    loadingLyrics,
    showLyrics,
    canPlayNext,
    canPlayPrevious,
    playNext,
    playPrevious,
    togglePlayPause,
    openLyrics,
    closeLyrics,
  } = usePlayer();

  if (!currentTrack) return null;

  return (
    <>
      {showLyrics && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <button onClick={closeLyrics} className="rounded-full p-2 text-foreground transition-colors hover:bg-muted">
              <ChevronDown className="h-6 w-6" />
            </button>

            <div className="mx-4 flex-1 text-center">
              <p className="truncate text-sm font-semibold text-foreground">{currentTrack.title}</p>
              <p className="truncate text-xs text-muted-foreground">{currentTrack.artist}</p>
            </div>

            <div className="rounded-full bg-primary/15 p-2 text-primary">
              <Mic2 className="h-5 w-5" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8">
            {loadingLyrics ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Buscando letra…</p>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-center font-sans text-lg leading-8 text-foreground/90">
                {lyrics || "Letra não disponível."}
              </pre>
            )}
          </div>

          <div className="border-t border-border px-4 py-4">
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => void playPrevious()} disabled={!canPlayPrevious} className={controlButtonClassName}>
                <SkipBack className="h-6 w-6" />
              </button>

              <button
                onClick={togglePlayPause}
                className="rounded-full bg-primary p-4 text-primary-foreground shadow-glow transition-transform active:scale-95"
              >
                {isTrackLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="ml-0.5 h-6 w-6" />
                )}
              </button>

              <button onClick={() => void playNext()} disabled={!canPlayNext} className={controlButtonClassName}>
                <SkipForward className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[56px] z-50 px-2">
        <div className="rounded-2xl border border-border bg-card/95 shadow-card backdrop-blur-md">
          <div className="flex items-center gap-3 p-3">
            <button onClick={openLyrics} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              {currentTrack.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={`Capa da música ${currentTrack.title}`}
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-secondary" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{currentTrack.title}</p>
                <p className="truncate text-xs text-muted-foreground">{currentTrack.artist}</p>
              </div>
            </button>

            <div className="flex items-center gap-1">
              <button onClick={openLyrics} className="rounded-full p-2 text-primary transition-colors hover:bg-muted">
                <Mic2 className="h-5 w-5" />
              </button>
              <button onClick={() => void playPrevious()} disabled={!canPlayPrevious} className={controlButtonClassName}>
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={togglePlayPause}
                className="rounded-full bg-primary p-3 text-primary-foreground transition-transform active:scale-95"
              >
                {isTrackLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" />
                )}
              </button>
              <button onClick={() => void playNext()} disabled={!canPlayNext} className={controlButtonClassName}>
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};