import { Sparkles, Music, Share2, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Sparkles,
    title: "Digite sua vibe",
    description: "Descreva o que você quer ouvir: 'músicas pra treinar', 'vibe triste', 'anos 2000', 'batidão'",
  },
  {
    icon: Music,
    title: "IA cria sua playlist",
    description: "Nossa IA analisa milhões de músicas e cria uma playlist perfeita pra você automaticamente",
  },
  {
    icon: Share2,
    title: "Compartilhe",
    description: "Cada playlist vira um link único que você pode compartilhar com amigos",
  },
  {
    icon: TrendingUp,
    title: "Descubra novas músicas",
    description: "A IA aprende suas preferências e recomenda novas playlists todos os dias",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-24 px-4 bg-card/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Como Funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descobrir músicas novas nunca foi tão fácil
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card">
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
