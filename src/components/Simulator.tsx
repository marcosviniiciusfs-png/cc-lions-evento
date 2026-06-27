import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import InputMask from "react-input-mask";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSimulatorModal } from "@/contexts/SimulatorModalContext";

const WORKER_URL = "https://cc-lions-evento-lead.marcosviniicius-fs.workers.dev/";

type FormData = {
  fullName: string;
  whatsapp: string;
  city: string;
  neighborhoodCondo: string;
  instagramHandle: string;
};

const emptyForm: FormData = {
  fullName: "",
  whatsapp: "",
  city: "",
  neighborhoodCondo: "",
  instagramHandle: "",
};

const RequiredMark = () => <span className="ml-1 text-destructive">*</span>;

const Simulator = () => {
  const { isOpen, close } = useSimulatorModal();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: keyof FormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const validate = (): string | null => {
    if (!formData.fullName.trim()) return "Informe o seu nome.";
    if (formData.whatsapp.replace(/\D/g, "").length !== 11) return "Telefone inválido. Use (DDD) 9XXXX-XXXX.";
    if (!formData.city.trim()) return "Informe a sua cidade.";
    if (!formData.neighborhoodCondo.trim()) return "Informe o seu bairro ou condomínio.";
    if (!formData.instagramHandle.trim()) return "Informe o seu @ do Instagram.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const error = validate();
    if (error) {
      toast({
        title: "Verifique os dados",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const eventId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const today = new Date().toISOString().split("T")[0];

    const getCookie = (name: string): string | undefined => {
      const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : undefined;
    };

    const payload = {
      ...formData,
      fullName: formData.fullName.trim(),
      city: formData.city.trim(),
      neighborhoodCondo: formData.neighborhoodCondo.trim(),
      instagramHandle: formData.instagramHandle.trim(),
      campaign: "sorteio_camisa_oficial_ingresso_atletico_mineiro",
      prizes: ["camisa_oficial_atletico_mineiro", "ingresso_jogo_atletico_mineiro"],
      data_entrada: today,
      event_id: eventId,
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
      source_url: window.location.href,
    };

    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") {
      fbq("track", "Lead", {}, { eventID: eventId });
    }

    try {
      fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => console.error("Worker dispatch failed:", err));
    } catch (err) {
      console.error("Worker dispatch threw:", err);
    }

    setFormData(emptyForm);
    setIsSubmitting(false);
    close();
    navigate("/obrigado");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : close())}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">
            Inscrição para o sorteio
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para concorrer à camisa oficial do Atlético Mineiro e a um ingresso pra um jogo do Atlético Mineiro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">
              Qual o seu nome?
              <RequiredMark />
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder="Digite seu nome"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">
              Qual o seu telefone?
              <RequiredMark />
            </Label>
            <InputMask
              mask="(99) 99999-9999"
              value={formData.whatsapp}
              onChange={(e) => setField("whatsapp", e.target.value)}
            >
              {/* @ts-ignore */}
              {(inputProps: any) => (
                <Input
                  {...inputProps}
                  id="whatsapp"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(DDD) 9XXXX-XXXX"
                  autoComplete="tel"
                />
              )}
            </InputMask>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">
              Qual a sua cidade?
              <RequiredMark />
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setField("city", e.target.value)}
              placeholder="Digite a sua cidade"
              autoComplete="address-level2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhoodCondo">
              Qual é o seu bairro/condomínio?
              <RequiredMark />
            </Label>
            <Input
              id="neighborhoodCondo"
              value={formData.neighborhoodCondo}
              onChange={(e) => setField("neighborhoodCondo", e.target.value)}
              placeholder="Digite o bairro ou condomínio"
              autoComplete="address-level3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagramHandle">
              Qual é o seu @ do Instagram?
              <RequiredMark />
            </Label>
            <Input
              id="instagramHandle"
              value={formData.instagramHandle}
              onChange={(e) => setField("instagramHandle", e.target.value)}
              placeholder="@seuinstagram"
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 text-base font-semibold"
          >
            {isSubmitting ? "Enviando..." : "Participar do sorteio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Simulator;
