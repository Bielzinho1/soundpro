import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search as SearchIcon, Trophy } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import type { PlayableTrack } from "@/types/player";

interface Tile {
  lane: number;
  y: number;
  hit: boolean;
}

const LANES = 4;
const TILE_HEIGHT_RATIO = 0.22;

const Game = () => {
  const { playTrack, currentTrack, playPause, isPlaying } = usePlayer();
  const { user } = useAuth();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlayableTrack[]>([]);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tilesRef = useRef<Tile[]>([]);
  const runningRef = useRef(false);
  const scoreRef = useRef(0);
  const speedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("game_scores")
      .select("score")
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setBest(data?.score ?? 0));
  }, [user]);

  const endGame = useCallback(async () => {
    runningRef.current = false;
    setRunning(false);
    setGameOver(true);

    const finalScore = scoreRef.current;
    setBest((previous) => Math.max(previous, finalScore));

    if (user && finalScore > 0) {
      await supabase.from("game_scores").insert({
        user_id: user.id,
        score: finalScore,
        track_title: currentTrack?.title ?? "",
        track_artist: currentTrack?.artist ?? "",
      });
    }
  }, [user, currentTrack]);

  const loop = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !runningRef.current) return;

      const delta = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 48) : 16;
      lastTimeRef.current = time;

      const width = canvas.width;
      const height = canvas.height;
      const laneWidth = width / LANES;
      const tileHeight = height * TILE_HEIGHT_RATIO;

      speedRef.current = Math.min(0.85, speedRef.current + delta * 0.000012);

      if (time - lastSpawnRef.current > Math.max(320, 700 - scoreRef.current * 6)) {
        lastSpawnRef.current = time;
        tilesRef.current.push({ lane: Math.floor(Math.random() * LANES), y: -tileHeight, hit: false });
      }

      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      for (let lane = 1; lane < LANES; lane += 1) {
        ctx.beginPath();
        ctx.moveTo(lane * laneWidth, 0);
        ctx.lineTo(lane * laneWidth, height);
        ctx.stroke();
      }

      let missed = false;

      tilesRef.current = tilesRef.current.filter((tile) => {
        tile.y += speedRef.current * delta;

        if (!tile.hit && tile.y > height) {
          missed = true;
          return false;
        }

        if (tile.hit) return false;

        ctx.fillStyle = "#1DB954";
        ctx.beginPath();
        const radius = 10;
        const x = tile.lane * laneWidth + 4;
        const w = laneWidth - 8;
        ctx.roundRect(x, tile.y, w, tileHeight, radius);
        ctx.fill();

        return true;
      });

      if (missed) {
        void endGame();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    },
    [endGame]
  );

  const startGame = () => {
    if (!currentTrack) {
      toast({ title: "Escolha uma música", description: "Busque e selecione a música do jogo." });
      return;
    }

    tilesRef.current = [];
    scoreRef.current = 0;
    speedRef.current = 0.35;
    lastSpawnRef.current = 0;
    lastTimeRef.current = 0;
    setScore(0);
    setGameOver(false);
    setRunning(true);
    runningRef.current = true;

    if (!isPlaying) playPause();

    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const handleTap = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!runningRef.current) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const laneWidth = rect.width / LANES;
    const tileHeight = rect.height * TILE_HEIGHT_RATIO;
    const lane = Math.floor(x / laneWidth);

    const target = tilesRef.current.find(
      (tile) => tile.lane === lane && y >= tile.y && y <= tile.y + tileHeight
    );

    if (!target) {
      void endGame();
      return;
    }

    target.hit = true;
    scoreRef.current += 1;
    setScore(scoreRef.current);
  };

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);

    const { data, error } = await supabase.functions.invoke("search-youtube-multiple", {
      body: { query: query.trim(), maxResults: 6 },
    });

    setSearching(false);

    if (error) {
      toast({ variant: "destructive", title: "Erro na busca" });
      return;
    }

    setResults(Array.isArray(data?.results) ? data.results : []);
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="border-b border-border p-4">
        <h1 className="text-2xl font-bold text-foreground">Piano Tiles</h1>
        <p className="text-sm text-muted-foreground">Toque nas teclas verdes no ritmo da sua música</p>
      </header>

      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void search()}
            placeholder="Buscar música para jogar"
          />
          <Button onClick={() => void search()} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-1 rounded-lg border border-border bg-card p-2">
            {results.map((track) => (
              <button
                key={track.videoId}
                onClick={() => {
                  void playTrack(track, [track], 0);
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-card p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {currentTrack ? currentTrack.title : "Nenhuma música escolhida"}
            </p>
            <p className="text-xs text-muted-foreground">Pontos: {score}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-primary">
            <Trophy className="h-4 w-4" /> {best}
          </div>
        </div>

        <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-border">
          <canvas
            ref={canvasRef}
            onPointerDown={handleTap}
            className="h-full w-full touch-none"
          />

          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85">
              {gameOver && <p className="text-lg font-bold text-foreground">Fim de jogo — {score} pontos</p>}
              <Button onClick={startGame}>{gameOver ? "Jogar de novo" : "Começar"}</Button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Game;
