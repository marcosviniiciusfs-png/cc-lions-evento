import { Gift, MessageCircle, Ticket } from "lucide-react";

const BenefitsSection = () => {
  const benefits = [
    {
      icon: Gift,
      title: "Camisa autografada",
      description: "Uma camisa alvinegra autografada pelos jogadores para guardar como item de colecionador.",
    },
    {
      icon: Ticket,
      title: "Ingresso para o jogo",
      description: "O ganhador tambem leva um ingresso para viver a experiencia do Atletico Mineiro de perto.",
    },
    {
      icon: MessageCircle,
      title: "Cadastro rapido",
      description: "Preencha seus dados no popup e deixe seu telefone e Instagram para validarmos sua participacao.",
    },
  ];

  return (
    <section id="beneficios" className="bg-background py-14 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
            Premios do sorteio
          </p>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Cadastre-se para concorrer aos itens oficiais da experiencia atleticana
          </h2>
          <p className="text-lg text-muted-foreground">
            O formulario serve apenas para registrar os interessados no sorteio e organizar o contato com os participantes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <benefit.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">{benefit.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
