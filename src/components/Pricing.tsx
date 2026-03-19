import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Zap, Crown } from "lucide-react";

const WHATSAPP_LINK = "https://wa.me/5541992945393?text=Olá! Quero assinar o SoundPro Premium!";

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    description: "Perfeito para começar",
    features: [
      "3 playlists por dia",
      "IA básica",
      "Compartilhamento",
      "Anúncios",
    ],
    cta: "Começar Grátis",
    variant: "outline" as const,
  },
  {
    name: "Premium",
    price: "R$ 9",
    period: "/mês",
    description: "Para os amantes de música",
    features: [
      "Playlists ilimitadas",
      "IA avançada",
      "Sem anúncios",
      "Filtros personalizados",
      "Recomendações diárias",
      "Acesso antecipado a recursos",
    ],
    cta: "Assinar Premium",
    variant: "premium" as const,
    popular: true,
  },
];

export const Pricing = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Planos e Preços
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano perfeito para você
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative p-8 bg-card/50 backdrop-blur-sm border-2 transition-all duration-300 hover:shadow-card ${
                plan.popular ? "border-primary shadow-glow" : "border-border hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 shadow-glow">
                  <Zap className="w-4 h-4" />
                  Mais Popular
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button variant={plan.variant} size="lg" className="w-full">
                  {plan.cta}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
