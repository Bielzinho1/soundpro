import { Hero } from "@/components/Hero";
import { PlaylistCard } from "@/components/PlaylistCard";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";

const featuredPlaylists = [
  {
    title: "Energia Total",
    description: "Músicas eletrônicas e batidões para dar aquela energia",
    trackCount: 45,
    mood: "Energia",
  },
  {
    title: "Vibe Noturna",
    description: "Músicas chill para relaxar à noite",
    trackCount: 32,
    mood: "Chill",
  },
  {
    title: "Treino Pesado",
    description: "Rock e rap pesado para treinar com intensidade",
    trackCount: 38,
    mood: "Treino",
  },
  {
    title: "Nostalgia 2000",
    description: "Os maiores hits dos anos 2000 que marcaram época",
    trackCount: 50,
    mood: "Nostalgia",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      {/* Featured Playlists */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Playlists em Alta
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Descobertas mais recentes criadas pela nossa comunidade
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {featuredPlaylists.map((playlist, index) => (
              <div
                key={index}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <PlaylistCard {...playlist} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  );
};

export default Index;
