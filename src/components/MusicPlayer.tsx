import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

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

export const MusicPlayer = ({ tracks, currentTrackIndex, onTrackChange }: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([70]);

  const currentTrack = tracks[currentTrackIndex];

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
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
            >
              {isPlaying ? (
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