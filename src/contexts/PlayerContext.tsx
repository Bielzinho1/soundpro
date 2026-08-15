import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PlayableTrack } from "@/types/player";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface PlayerContextType {
  queue: PlayableTrack[];
  currentTrack: PlayableTrack | null;
  currentIndex: number;
  isPlaying: boolean;
  loadingPlayer: boolean;
  lyrics: string | null;
  translatedLyrics: string | null;
  loadingLyrics: boolean;
  loadingTranslation: boolean;
  showTranslation: boolean;
  showLyrics: boolean;
  volume: number[];
  hasNext: boolean;
  hasPrevious: boolean;
  playTrack: (track: PlayableTrack, nextQueue?: PlayableTrack[], startIndex?: number) => Promise<void>;
  replaceQueue: (nextQueue: PlayableTrack[], startIndex?: number) => Promise<void>;
  playPause: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setShowLyrics: (show: boolean) => void;
  toggleTranslation: () => void;
  setVolume: (value: number[]) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

let youtubeApiPromise: Promise<void> | null = null;

const normalizeText = (value?: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getTrackCacheKey = (track: PlayableTrack) =>
  [track.videoId, track.searchQuery, track.artist, track.title].filter(Boolean).join("::").toLowerCase();

const getLyricsCacheKey = (track: PlayableTrack) => `${normalizeText(track.title)}::${normalizeText(track.artist)}`;

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<void>((resolve) => {
    const finish = () => resolve();

    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const checkPlayer = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(checkPlayer);
          finish();
        }
      }, 50);
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      finish();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);
  });

  return youtubeApiPromise;
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [queue, setQueue] = useState<PlayableTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<PlayableTrack | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [translatedLyrics, setTranslatedLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [volume, setVolume] = useState([70]);

  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const pendingTrackRef = useRef<PlayableTrack | null>(null);
  const queueRef = useRef<PlayableTrack[]>([]);
  const currentIndexRef = useRef(-1);
  const volumeRef = useRef(70);
  const playRequestIdRef = useRef(0);
  const lyricsRequestIdRef = useRef(0);
  const translationRequestIdRef = useRef(0);
  const resolvedTrackCacheRef = useRef(new Map<string, PlayableTrack>());
  const lyricsCacheRef = useRef(new Map<string, string>());
  const translationCacheRef = useRef(new Map<string, string>());
  const playNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    volumeRef.current = volume[0];
    if (playerRef.current && playerReadyRef.current) {
      playerRef.current.setVolume?.(volume[0]);
    }
  }, [volume]);

  const resolveTrack = useCallback(async (track: PlayableTrack) => {
    const cacheKey = getTrackCacheKey(track);
    const cachedTrack = resolvedTrackCacheRef.current.get(cacheKey);

    if (cachedTrack) return { ...track, ...cachedTrack };

    if (track.videoId) {
      resolvedTrackCacheRef.current.set(cacheKey, track);
      return track;
    }

    const query = track.searchQuery?.trim() || `${track.artist} ${track.title}`.trim();
    const { data, error } = await supabase.functions.invoke("search-youtube-multiple", {
      body: { query, maxResults: 3 },
    });

    if (error) throw error;

    const firstMatch = Array.isArray(data?.results) ? data.results[0] : null;
    if (!firstMatch?.videoId) throw new Error("Música não encontrada");

    const resolvedTrack: PlayableTrack = {
      ...track,
      title: track.title || firstMatch.title,
      artist: track.artist || firstMatch.artist,
      thumbnail: track.thumbnail || firstMatch.thumbnail,
      videoId: firstMatch.videoId,
    };

    resolvedTrackCacheRef.current.set(cacheKey, resolvedTrack);
    return resolvedTrack;
  }, []);

  // Pré-carrega o videoId da próxima faixa para trocar sem espera
  const prefetchNext = useCallback(
    (index: number) => {
      const nextTrack = queueRef.current[index + 1];
      if (!nextTrack || nextTrack.videoId) return;
      void resolveTrack(nextTrack).catch(() => undefined);
    },
    [resolveTrack]
  );

  const loadResolvedTrack = useCallback((track: PlayableTrack) => {
    pendingTrackRef.current = track;

    if (!playerRef.current || !playerReadyRef.current || !track.videoId) return;

    playerRef.current.loadVideoById({ videoId: track.videoId, startSeconds: 0 });
    playerRef.current.unMute?.();
    playerRef.current.setVolume?.(volumeRef.current);
    playerRef.current.playVideo?.();
  }, []);

  const playTrack = useCallback(
    async (track: PlayableTrack, nextQueue: PlayableTrack[] = [track], startIndex = 0) => {
      if (!nextQueue.length) return;

      const safeIndex = Math.max(0, Math.min(startIndex, nextQueue.length - 1));
      const requestId = ++playRequestIdRef.current;

      setLoadingPlayer(true);
      // feedback imediato na UI, antes mesmo de resolver o vídeo
      setQueue(nextQueue);
      setCurrentIndex(safeIndex);
      setCurrentTrack((previous) => ({ ...track, videoId: track.videoId ?? previous?.videoId }));

      try {
        const resolvedTrack = await resolveTrack(track);

        if (requestId !== playRequestIdRef.current) return;

        const queueWithResolved = nextQueue.map((item, index) =>
          index === safeIndex ? { ...item, ...resolvedTrack } : item
        );

        queueRef.current = queueWithResolved;
        setQueue(queueWithResolved);
        setCurrentTrack(resolvedTrack);
        loadResolvedTrack(resolvedTrack);
        prefetchNext(safeIndex);
      } catch (error) {
        console.error("Erro ao reproduzir música:", error);
        if (requestId !== playRequestIdRef.current) return;
        setLoadingPlayer(false);
        setIsPlaying(false);
        toast({
          variant: "destructive",
          title: "Erro ao reproduzir",
          description: "Não foi possível tocar essa música agora.",
        });
      }
    },
    [loadResolvedTrack, prefetchNext, resolveTrack, toast]
  );

  const replaceQueue = useCallback(
    async (nextQueue: PlayableTrack[], startIndex = 0) => {
      if (!nextQueue.length) return;
      const safeIndex = Math.max(0, Math.min(startIndex, nextQueue.length - 1));
      await playTrack(nextQueue[safeIndex], nextQueue, safeIndex);
    },
    [playTrack]
  );

  const playNext = useCallback(async () => {
    const nextIndex = currentIndexRef.current + 1;
    const nextTrack = queueRef.current[nextIndex];

    if (!nextTrack) {
      setIsPlaying(false);
      setLoadingPlayer(false);
      return;
    }

    await playTrack(nextTrack, queueRef.current, nextIndex);
  }, [playTrack]);

  const playPrevious = useCallback(async () => {
    const previousIndex = currentIndexRef.current - 1;
    const previousTrack = queueRef.current[previousIndex];

    // Igual ao Spotify: volta ao início se já passou de 4s
    const elapsed = playerRef.current?.getCurrentTime?.() ?? 0;
    if (elapsed > 4 && playerReadyRef.current) {
      playerRef.current.seekTo?.(0, true);
      playerRef.current.playVideo?.();
      return;
    }

    if (!previousTrack) {
      playerRef.current?.seekTo?.(0, true);
      return;
    }

    await playTrack(previousTrack, queueRef.current, previousIndex);
  }, [playTrack]);

  useEffect(() => {
    playNextRef.current = () => void playNext();
  }, [playNext]);

  const playPause = useCallback(() => {
    if (!playerRef.current || !playerReadyRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      return;
    }

    playerRef.current.playVideo();
  }, [isPlaying]);

  // Player criado UMA única vez — evita reinicializações que atrasavam a troca de faixa
  useEffect(() => {
    let disposed = false;

    const container = document.createElement("div");
    container.style.width = "0";
    container.style.height = "0";
    container.style.overflow = "hidden";
    container.style.position = "absolute";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);

    void loadYouTubeApi()
      .then(() => {
        if (disposed) return;

        const instance = new window.YT.Player(container, {
          height: "0",
          width: "0",
          playerVars: {
            autoplay: 0,
            controls: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (disposed) return;

              playerRef.current = event.target;
              playerReadyRef.current = true;
              event.target.setVolume(volumeRef.current);

              const pendingTrack = pendingTrackRef.current;
              if (pendingTrack?.videoId) {
                event.target.loadVideoById(pendingTrack.videoId);
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.BUFFERING) {
                setLoadingPlayer(true);
                return;
              }

              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setLoadingPlayer(false);
                return;
              }

              if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                setLoadingPlayer(false);
                return;
              }

              if (event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                setLoadingPlayer(false);
                playNextRef.current();
              }
            },
            onError: () => {
              setLoadingPlayer(false);
              setIsPlaying(false);
              playNextRef.current();
            },
          },
        });

        playerRef.current = instance;
      })
      .catch((error) => {
        console.error("Erro ao carregar player do YouTube:", error);
      });

    return () => {
      disposed = true;
      playerReadyRef.current = false;
      playerRef.current?.destroy?.();
      playerRef.current = null;
      container.remove();
    };
  }, []);

  // Controles de mídia do sistema (tela de bloqueio / fones)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: "SoundPro",
      artwork: currentTrack.thumbnail
        ? [{ src: currentTrack.thumbnail, sizes: "512x512", type: "image/png" }]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => playerRef.current?.playVideo?.());
    navigator.mediaSession.setActionHandler("pause", () => playerRef.current?.pauseVideo?.());
    navigator.mediaSession.setActionHandler("nexttrack", () => playNextRef.current());
    navigator.mediaSession.setActionHandler("previoustrack", () => void playPrevious());
  }, [currentTrack, playPrevious]);

  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      setTranslatedLyrics(null);
      setLoadingLyrics(false);
      return;
    }

    const cacheKey = getLyricsCacheKey(currentTrack);
    setTranslatedLyrics(translationCacheRef.current.get(cacheKey) ?? null);

    const cachedLyrics = lyricsCacheRef.current.get(cacheKey);
    if (cachedLyrics) {
      setLyrics(cachedLyrics);
      setLoadingLyrics(false);
      return;
    }

    const requestId = ++lyricsRequestIdRef.current;

    setLoadingLyrics(true);
    setLyrics(null);

    void supabase.functions
      .invoke("search-lyrics", {
        body: { title: currentTrack.title, artist: currentTrack.artist },
      })
      .then(({ data, error }) => {
        if (requestId !== lyricsRequestIdRef.current) return;
        if (error) throw error;

        const nextLyrics =
          typeof data?.lyrics === "string" && data.lyrics.trim() ? data.lyrics : "Letra não disponível.";

        lyricsCacheRef.current.set(cacheKey, nextLyrics);
        setLyrics(nextLyrics);
      })
      .catch((error) => {
        console.error("Erro ao buscar letra:", error);
        if (requestId !== lyricsRequestIdRef.current) return;
        setLyrics("Letra não disponível.");
      })
      .finally(() => {
        if (requestId === lyricsRequestIdRef.current) setLoadingLyrics(false);
      });
  }, [currentTrack]);

  const toggleTranslation = useCallback(() => {
    if (!currentTrack || !lyrics || lyrics === "Letra não disponível.") return;

    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    setShowTranslation(true);

    const cacheKey = getLyricsCacheKey(currentTrack);
    const cached = translationCacheRef.current.get(cacheKey);
    if (cached) {
      setTranslatedLyrics(cached);
      return;
    }

    const requestId = ++translationRequestIdRef.current;
    setLoadingTranslation(true);

    void supabase.functions
      .invoke("search-lyrics", {
        body: {
          title: currentTrack.title,
          artist: currentTrack.artist,
          translate: true,
          lyrics,
        },
      })
      .then(({ data, error }) => {
        if (requestId !== translationRequestIdRef.current) return;
        if (error) throw error;

        const translation =
          typeof data?.translation === "string" && data.translation.trim()
            ? data.translation
            : "Tradução não disponível.";

        translationCacheRef.current.set(cacheKey, translation);
        setTranslatedLyrics(translation);
      })
      .catch((error) => {
        console.error("Erro ao traduzir letra:", error);
        if (requestId !== translationRequestIdRef.current) return;
        setTranslatedLyrics("Tradução não disponível.");
      })
      .finally(() => {
        if (requestId === translationRequestIdRef.current) setLoadingTranslation(false);
      });
  }, [currentTrack, lyrics, showTranslation]);

  const value = useMemo<PlayerContextType>(
    () => ({
      queue,
      currentTrack,
      currentIndex,
      isPlaying,
      loadingPlayer,
      lyrics,
      translatedLyrics,
      loadingLyrics,
      loadingTranslation,
      showTranslation,
      showLyrics,
      volume,
      hasNext: currentIndex >= 0 && currentIndex < queue.length - 1,
      hasPrevious: currentIndex > 0,
      playTrack,
      replaceQueue,
      playPause,
      playNext,
      playPrevious,
      setShowLyrics,
      toggleTranslation,
      setVolume,
    }),
    [
      currentIndex,
      currentTrack,
      isPlaying,
      loadingLyrics,
      loadingPlayer,
      loadingTranslation,
      lyrics,
      playNext,
      playPause,
      playPrevious,
      playTrack,
      queue,
      replaceQueue,
      showLyrics,
      showTranslation,
      toggleTranslation,
      translatedLyrics,
      volume,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }

  return context;
};
