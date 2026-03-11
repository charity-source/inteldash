"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface RefreshContextType {
  refreshTrigger: number;
  isRefreshing: boolean;
  refresh: () => void;
}

const RefreshContext = createContext<RefreshContextType>({
  refreshTrigger: 0,
  isRefreshing: false,
  refresh: () => {},
});

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  return (
    <RefreshContext.Provider value={{ refreshTrigger, isRefreshing, refresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
