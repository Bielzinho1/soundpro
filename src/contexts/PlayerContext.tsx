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
  loadingLyrics: boolean;
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
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const checkPlayer = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(checkPlayer);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);
    window.onYouTubeIframeAPIReady = () => resolve();
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
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [volume, setVolume] = useState([70]);
  const [playerReady, setPlayerReady] = useState(false);

  
  const playerRef = useRef<any>(null);
  const pendingTrackRef = useRef<PlayableTrack | null>(null);
  const queueRef = useRef<PlayableTrack[]>([]);
  const currentIndexRef = useRef(-1);
  const volumeRef = useRef(70);
  const playRequestIdRef = useRef(0);
  const lyricsRequestIdRef = useRef(0);
  const resolvedTrackCacheRef = useRef(new Map<string, PlayableTrack>());
  const lyricsCacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    volumeRef.current = volume[0];
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume?.(volume[0]);
    }
  }, [playerReady, volume]);

  const resolveTrack = useCallback(async (track: PlayableTrack) => {
    const cacheKey = getTrackCacheKey(track);
    const cachedTrack = resolvedTrackCacheRef.current.get(cacheKey);

    if (cachedTrack) {
      return { ...track, ...cachedTrack };
    }

    if (track.videoId) {
      resolvedTrackCacheRef.current.set(cacheKey, track);
      return track;
    }

    const query = track.searchQuery?.trim() || `${track.artist} ${track.title}`.trim();
    const { data, error } = await supabase.functions.invoke("search-youtube-multiple", {
      body: { query, maxResults: 5 },
    });

    if (error) throw error;

    const firstMatch = Array.isArray(data?.results) ? data.results[0] : null;
    if (!firstMatch?.videoId) {
      throw new Error("Música não encontrada");
    }

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

  const loadResolvedTrack = useCallback(
    (track: PlayableTrack) => {
      pendingTrackRef.current = track;

      if (!playerRef.current || !playerReady || !track.videoId) return;

      playerRef.current.loadVideoById(track.videoId);
      playerRef.current.unMute?.();
      playerRef.current.setVolume?.(volumeRef.current);
      playerRef.current.playVideo();
    },
    [playerReady]
  );

  const playTrack = useCallback(
    async (track: PlayableTrack, nextQueue: PlayableTrack[] = [track], startIndex = 0) => {
      if (!nextQueue.length) return;

      const safeIndex = Math.max(0, Math.min(startIndex, nextQueue.length - 1));
      const requestId = ++playRequestIdRef.current;

      setLoadingPlayer(true);

      try {
        const resolvedTrack = await resolveTrack(track);

        if (requestId !== playRequestIdRef.current) return;

        const queueWithResolved = nextQueue.map((item, index) =>
          index === safeIndex ? { ...item, ...resolvedTrack } : item
        );

        setQueue(queueWithResolved);
        setCurrentIndex(safeIndex);
        setCurrentTrack(resolvedTrack);
        loadResolvedTrack(resolvedTrack);
      } catch (error) {
        console.error("Erro ao reproduzir música:", error);
        setLoadingPlayer(false);
        setIsPlaying(false);
        toast({
          variant: "destructive",
          title: "Erro ao reproduzir",
          description: "Não foi possível tocar essa música agora.",
        });
      }
    },
    [loadResolvedTrack, resolveTrack, toast]
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

    if (!previousTrack) return;

    await playTrack(previousTrack, queueRef.current, previousIndex);
  }, [playTrack]);

  const playPause = useCallback(() => {
    if (!playerRef.current || !playerReady) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      return;
    }

    playerRef.current.playVideo();
  }, [isPlaying, playerReady]);

  useEffect(() => {
    let disposed = false;

    // Create container outside React's tree to avoid DOM conflicts
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
          },
          events: {
            onReady: (event: any) => {
              if (disposed) return;

              playerRef.current = event.target;
              event.target.setVolume(volumeRef.current);
              setPlayerReady(true);

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
                void playNext();
              }
            },
            onError: () => {
              setLoadingPlayer(false);
              setIsPlaying(false);
              toast({
                variant: "destructive",
                title: "Erro ao reproduzir",
                description: "Tentando a próxima faixa da fila.",
              });
              void playNext();
            },
          },
        });

        playerRef.current = instance;
      })
      .catch((error) => {
        console.error("Erro ao carregar player do YouTube:", error);
        toast({
          variant: "destructive",
          title: "Erro no player",
          description: "Não foi possível iniciar o player agora.",
        });
      });

    return () => {
      disposed = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
      container.remove();
    };
  }, [playNext, toast]);

  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null);
      setLoadingLyrics(false);
      return;
    }

    const cacheKey = getLyricsCacheKey(currentTrack);
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

        const nextLyrics = typeof data?.lyrics === "string" && data.lyrics.trim()
          ? data.lyrics
          : "Letra não disponível.";

        lyricsCacheRef.current.set(cacheKey, nextLyrics);
        setLyrics(nextLyrics);
      })
      .catch((error) => {
        console.error("Erro ao buscar letra:", error);
        if (requestId !== lyricsRequestIdRef.current) return;
        setLyrics("Letra não disponível.");
      })
      .finally(() => {
        if (requestId === lyricsRequestIdRef.current) {
          setLoadingLyrics(false);
        }
      });
  }, [currentTrack]);

  const value = useMemo<PlayerContextType>(
    () => ({
      queue,
      currentTrack,
      currentIndex,
      isPlaying,
      loadingPlayer,
      lyrics,
      loadingLyrics,
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
      setVolume,
    }),
    [
      currentIndex,
      currentTrack,
      isPlaying,
      loadingLyrics,
      loadingPlayer,
      lyrics,
      playNext,
      playPause,
      playPrevious,
      playTrack,
      queue,
      replaceQueue,
      showLyrics,
      volume,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }

  return context;
};