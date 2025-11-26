import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Track {
  title: string;
  artist: string;
  searchQuery: string;
}

interface MusicPlayerProps {
  tracks: Track[];
  currentTrackIndex: number;
  onTrackChange: (index: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const MusicPlayer = ({ tracks, currentTrackIndex, onTrackChange }: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([70]);
  const [player, setPlayer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentTrack = tracks[currentTrackIndex];

  // Carrega YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Busca vídeo e inicializa player quando muda a música
  useEffect(() => {
    if (!currentTrack || !window.YT) return;

    const searchAndPlay = async () => {
      setIsLoading(true);
      try {
        console.log('Buscando música:', currentTrack);
        
        // Busca o vídeo no YouTube via backend
        const { data: searchData, error: searchError } = await supabase.functions.invoke(
          'search-youtube',
          {
            body: { query: `${currentTrack.artist} ${currentTrack.title} official audio` }
          }
        );

        if (searchError) {
          console.error('Erro ao buscar:', searchError);
          throw searchError;
        }

        if (!searchData || !searchData.videoId) {
          throw new Error('Vídeo não encontrado');
        }

        const videoId = searchData.videoId;
        console.log('Video ID encontrado:', videoId);

        // Cria ou atualiza o player
        if (player) {
          player.loadVideoById(videoId);
          setIsLoading(false);
        } else if (window.YT && window.YT.Player) {
          const newPlayer = new window.YT.Player(playerRef.current, {
            height: '0',
            width: '0',
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              controls: 0,
            },
            events: {
              onReady: (event: any) => {
                event.target.setVolume(volume[0]);
                setPlayer(event.target);
                setIsPlaying(true);
                setIsLoading(false);
                console.log('Player pronto e tocando');
              },
              onStateChange: (event: any) => {
                if (event.data === window.YT.PlayerState.ENDED) {
                  handleNext();
                }
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false);
                }
              },
              onError: (event: any) => {
                console.error('Erro no player:', event.data);
                toast({
                  variant: "destructive",
                  title: "Erro ao reproduzir",
                  description: "Erro ao carregar o vídeo. Tentando próxima música...",
                });
                setIsLoading(false);
                // Tenta próxima música
                setTimeout(() => handleNext(), 2000);
              }
            },
          });
        }
      } catch (error) {
        console.error('Erro ao buscar música:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao buscar música. Tentando próxima...",
        });
        setIsLoading(false);
        setTimeout(() => handleNext(), 2000);
      }
    };

    searchAndPlay();
  }, [currentTrack]);

  // Atualiza volume
  useEffect(() => {
    if (player) {
      player.setVolume(volume[0]);
    }
  }, [volume, player]);

  const handlePlayPause = () => {
    if (!player) return;
    
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      onTrackChange(currentTrackIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      onTrackChange(currentTrackIndex - 1);
    }
  };

  if (!currentTrack) return null;

  return (
    <Card className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t-2 border-primary/30 shadow-glow z-50">
      <div ref={playerRef} style={{ display: 'none' }}></div>
      <div className="container mx-auto">
        <div className="flex items-center gap-6">
          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">{currentTrack.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentTrackIndex === 0}
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              size="icon"
              variant="hero"
              className="w-12 h-12"
              onClick={handlePlayPause}
              disabled={isLoading || !player}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleNext}
              disabled={currentTrackIndex === tracks.length - 1}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-3 w-32">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>

          {/* Track Counter */}
          <div className="hidden sm:block text-sm text-muted-foreground">
            {currentTrackIndex + 1} / {tracks.length}
          </div>
        </div>
      </div>
    </Card>
  );
};