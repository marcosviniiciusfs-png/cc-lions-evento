import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Simulator from "@/components/Simulator";
import BenefitsSection from "@/components/BenefitsSection";
import Footer from "@/components/Footer";
import { SimulatorModalProvider, useSimulatorModal } from "@/contexts/SimulatorModalContext";

const IndexContent = () => {
  const { open } = useSimulatorModal();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection onSimulateClick={open} />
        <BenefitsSection />
      </main>
      <Footer />
      <Simulator />
    </div>
  );
};

const Index = () => (
  <SimulatorModalProvider>
    <IndexContent />
  </SimulatorModalProvider>
);

export default Index;
