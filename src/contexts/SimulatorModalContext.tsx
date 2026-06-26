import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type SimulatorModalContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SimulatorModalContext = createContext<SimulatorModalContextValue | null>(null);

export const SimulatorModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") {
      fbq("track", "InitiateCheckout");
    }
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SimulatorModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </SimulatorModalContext.Provider>
  );
};

export const useSimulatorModal = () => {
  const ctx = useContext(SimulatorModalContext);
  if (!ctx) throw new Error("useSimulatorModal must be used within SimulatorModalProvider");
  return ctx;
};
