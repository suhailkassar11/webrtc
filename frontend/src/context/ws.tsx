import { createContext, useContext, useMemo, type ReactNode } from "react";

interface SocketContextType {
  socket: WebSocket | null;
}

// Create context with default value
const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: SocketProviderProps) => {

  const socket = useMemo(() => new WebSocket("ws://192.168.0.103:8080/ws"), [])

  return (
    <SocketContext.Provider value={{
      socket
    }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook

