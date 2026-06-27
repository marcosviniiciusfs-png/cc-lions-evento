import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ThankYou = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-6">
            <CheckCircle className="h-16 w-16 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Cadastro confirmado!
          </h1>
          <p className="text-lg text-muted-foreground">
            Seus dados foram registrados para o sorteio da camisa oficial do Atlético Mineiro e de um ingresso pra um jogo do Atlético Mineiro.
          </p>
        </div>

        <div className="pt-4">
          <Link to="/">
            <Button className="bg-primary hover:bg-primary-hover">
              Voltar para o sorteio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
