import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulatorModal } from "@/contexts/SimulatorModalContext";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { open: openSimulator } = useSimulatorModal();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  const triggerSimulator = () => {
    openSimulator();
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-black/90 text-white shadow-sm backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <button
          onClick={() => scrollToSection("inicio")}
          className="flex flex-col text-left leading-tight"
          aria-label="Voltar ao inicio"
        >
          <span className="text-lg font-black uppercase tracking-wide">CC Lions Evento</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Sorteio do Galo
          </span>
        </button>

        <nav className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => scrollToSection("inicio")}
            className="text-white/90 transition-colors hover:text-white"
          >
            Inicio
          </button>
          <button
            onClick={() => scrollToSection("beneficios")}
            className="text-white/90 transition-colors hover:text-white"
          >
            Premios
          </button>
          <button
            onClick={triggerSimulator}
            className="text-white/90 transition-colors hover:text-white"
          >
            Participar
          </button>
          <button
            onClick={() => scrollToSection("contato")}
            className="text-white/90 transition-colors hover:text-white"
          >
            Contato
          </button>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-white/10 bg-black md:hidden">
          <nav className="container mx-auto flex flex-col gap-2 px-4 py-4">
            <button
              onClick={() => scrollToSection("inicio")}
              className="py-2 text-left text-white/90 transition-colors hover:text-white"
            >
              Inicio
            </button>
            <button
              onClick={() => scrollToSection("beneficios")}
              className="py-2 text-left text-white/90 transition-colors hover:text-white"
            >
              Premios
            </button>
            <button
              onClick={triggerSimulator}
              className="py-2 text-left text-white/90 transition-colors hover:text-white"
            >
              Participar
            </button>
            <button
              onClick={() => scrollToSection("contato")}
              className="py-2 text-left text-white/90 transition-colors hover:text-white"
            >
              Contato
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
