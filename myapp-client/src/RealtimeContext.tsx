import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const HUB_URL = `${import.meta.env.VITE_API_URL ?? ''}/hubs/tickets`;

interface RealtimeContextValue {
  connection: HubConnection | null;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ connection: null, connected: false });

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!user) {
      connectionRef.current?.stop();
      connectionRef.current = null;
      setConnected(false);
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection
      .start()
      .then(() => setConnected(true))
      .catch(() => setConnected(false));

    connection.onreconnected(() => setConnected(true));
    connection.onclose(() => setConnected(false));

    connectionRef.current = connection;
    forceRender((n) => n + 1);

    return () => {
      connection.stop();
    };
  
  }, [user?.userId]);

  return (
    <RealtimeContext.Provider value={{ connection: connectionRef.current, connected }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
