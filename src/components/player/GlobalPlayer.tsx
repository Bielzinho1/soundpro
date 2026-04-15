import { ChevronDown, Loader2, Mic2, Music2, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

export const GlobalPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    loadingPlayer,
    lyrics,
    loadingLyrics,
    showLyrics,
    hasNext,
    hasPrevious,
    playPause,
    playNext,
    playPrevious,
    setShowLyrics,
  } = usePlayer();

  if (!currentTrack) return null;

  return (
    <>
      {showLyrics && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border p-4">
            <button onClick={() => setShowLyrics(false)} className="rounded-full p-2 text-foreground">
              <ChevronDown className="h-6 w-6" />
            </button>

            <div className="mx-4 flex-1 text-center">
              <p className="truncate text-sm font-bold text-foreground">{currentTrack.title}</p>
              <p className="truncate text-xs text-muted-foreground">{currentTrack.artist}</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary">
              <Mic2 className="h-5 w-5" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8">
            {loadingLyrics ? (
              <div className="flex h-full flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Buscando letra certa...</p>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-center font-sans text-base leading-8 text-foreground/90 sm:text-lg">
                {lyrics || "Letra não disponível."}
              </pre>
            )}
          </div>

          <div className="border-t border-border p-4">
            <div className="mx-auto flex max-w-sm items-center justify-center gap-6">
              <button
                onClick={() => void playPrevious()}
                disabled={!hasPrevious}
                className="rounded-full p-2 text-foreground disabled:opacity-40"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={playPause}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                {loadingPlayer ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="ml-0.5 h-6 w-6" />
                )}
              </button>

              <button
                onClick={() => void playNext()}
                disabled={!hasNext}
                className="rounded-full p-2 text-foreground disabled:opacity-40"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-[52px] left-0 right-0 z-[55]">
        <div className="mx-2 overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center gap-2 p-2">
            <button
              onClick={() => setShowLyrics(true)}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              {currentTrack.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={`Capa de ${currentTrack.title}`}
                  className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Music2 className="h-5 w-5" />
                </div>
              )}

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-foreground">{currentTrack.title}</p>
                <p className="truncate text-xs text-muted-foreground">{currentTrack.artist}</p>
              </div>
            </button>

            <div className="flex flex-shrink-0 items-center gap-0.5">
              <button onClick={() => setShowLyrics(true)} className="rounded-full p-1.5 text-primary">
                <Mic2 className="h-5 w-5" />
              </button>

              <button
                onClick={() => void playPrevious()}
                disabled={!hasPrevious}
                className="rounded-full p-1.5 text-foreground disabled:opacity-40"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button onClick={playPause} className="rounded-full p-1.5 text-foreground">
                {loadingPlayer ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => void playNext()}
                disabled={!hasNext}
                className="rounded-full p-1.5 text-foreground disabled:opacity-40"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};