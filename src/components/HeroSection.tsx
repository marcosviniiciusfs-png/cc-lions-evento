import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import raffleHero from "@/assets/atletico-raffle-hero.jpg";

interface HeroSectionProps {
  onSimulateClick: () => void;
}

const HeroSection = ({ onSimulateClick }: HeroSectionProps) => {
  const highlights = [
    "Camisa autografada",
    "Ingresso para o jogo",
    "Cadastro gratuito",
    "Sorteio especial",
  ];

  return (
    <section
      id="inicio"
      className="relative min-h-[calc(92svh-7rem)] overflow-hidden bg-black text-white"
    >
      <img
        src={raffleHero}
        alt="Camisa alvinegra autografada e ingresso de jogo em clima de sorteio"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/20" />

      <div className="container relative mx-auto flex min-h-[calc(92svh-7rem)] items-center px-4 py-16 md:py-20">
        <div className="max-w-3xl space-y-7 animate-fade-in">
          <p className="w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white/90 backdrop-blur">
            Sorteio CC Lions Evento
          </p>

          <div className="space-y-5">
            <h1 className="text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
              Concorra a uma camisa do Atletico Mineiro autografada e a um ingresso para o jogo
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-relaxed text-white/80 md:text-xl">
              Cadastre seus dados para participar do sorteio especial. A inscricao e gratuita e leva menos de um minuto.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {highlights.map((highlight) => (
              <div key={highlight} className="flex items-center gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-black">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-white/90">{highlight}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={onSimulateClick}
            size="lg"
            className="bg-white px-8 py-6 text-lg font-semibold text-black shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
          >
            Quero participar do sorteio
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
