import { Card } from "@/components/ui/card";
import { Music, Play, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaylistCardProps {
  title: string;
  description: string;
  trackCount: number;
  mood: string;
}

export const PlaylistCard = ({ title, description, trackCount, mood }: PlaylistCardProps) => {
  return (
    <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card cursor-pointer">
      <div className="absolute inset-0 bg-gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative p-6 space-y-4">
        {/* Icon */}
        <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Music className="w-8 h-8 text-primary-foreground" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
              {mood}
            </span>
            <span className="text-xs text-muted-foreground">
              {trackCount} músicas
            </span>
          </div>
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="hero" className="flex-1">
            <Play className="w-4 h-4 mr-1" />
            Ouvir
          </Button>
          <Button size="sm" variant="outline" className="border-primary/30">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
