import { createContext, useContext, useState, type ReactNode } from "react";

interface TutorialContextValue {
  enabled: boolean;
  toggle: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  return (
    <TutorialContext.Provider value={{ enabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
