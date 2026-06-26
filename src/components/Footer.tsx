import { Instagram, Mail, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer id="contato" className="bg-black text-white">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-3">
            <p className="text-xl font-black uppercase tracking-wide">CC Lions Evento</p>
            <p className="max-w-md text-sm leading-relaxed text-white/70">
              Cadastro de interessados para o sorteio de uma camisa autografada e um ingresso para jogo do Atletico Mineiro.
            </p>
            <p className="max-w-md text-xs leading-relaxed text-white/60">
              Sorteio promocional independente. Marcas citadas pertencem aos seus respectivos titulares.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">Contato</h3>
            <div className="space-y-3 text-sm text-white/80">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>Telefone informado no cadastro</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>Organizacao CC Lions Evento</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">Redes</h3>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 transition-colors hover:text-white"
                aria-label="Instagram"
              >
                <Instagram className="h-7 w-7" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
          <p>© 2026 CC Lions Evento. Todos os direitos reservados.</p>
          <div className="flex gap-5">
            <button className="transition-colors hover:text-white">Politica de Privacidade</button>
            <button className="transition-colors hover:text-white">Termos de Uso</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
