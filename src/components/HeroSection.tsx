import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import raffleHero from "@/assets/arte-da-camisa-do-galo.png";

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
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 85% 45%, rgba(212, 162, 38, 0.28), transparent 32%), linear-gradient(135deg, #020202 0%, #080808 48%, #f4f1e9 100%)",
        }}
      />
      <img
        src={raffleHero}
        alt="Camisa do Atletico Mineiro do sorteio"
        className="absolute bottom-0 right-[-34%] h-[82%] w-auto max-w-none object-contain opacity-45 sm:right-[-18%] md:inset-y-0 md:right-0 md:h-full md:w-[58%] md:object-contain md:object-right md:opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/25 md:via-black/78 md:to-black/5" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black to-transparent" />

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
