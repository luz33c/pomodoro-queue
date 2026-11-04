import { useAuth as useClerkAuth } from "@clerk/tanstack-react-start";
import { createContext, useContext, useEffect } from "react";

import { clearIdentity, log, setIdentity } from "@uni-stack/logger/client";

type LoggerContextValue = {
  logger: typeof log;
};

const LoggerContext = createContext<LoggerContextValue | null>(null);

export function LoggerProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      setIdentity({ user: { id: userId } });
    } else {
      setIdentity({ user: { id: "anonymous" } });
    }

    return () => {
      clearIdentity();
    };
  }, [isLoaded, isSignedIn, userId]);

  return <LoggerContext.Provider value={{ logger: log }}>{children}</LoggerContext.Provider>;
}

export function useLogger(): typeof log {
  const context = useContext(LoggerContext);
  if (!context) {
    log.warn("logger-provider", "Called outside of LoggerProvider");
    return log;
  }
  return context.logger;
}
