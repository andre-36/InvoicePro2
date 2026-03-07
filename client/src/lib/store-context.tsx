import { createContext, useContext, useState, useEffect } from "react";

type StoreContextType = {
  currentStoreId: number;
  setCurrentStoreId: (id: number) => void;
};

const StoreContext = createContext<StoreContextType>({
  currentStoreId: 1,
  setCurrentStoreId: () => {},
});

interface StoreProviderProps {
  user: { id: number; role: string; storeId: number | null };
  children: React.ReactNode;
}

export function StoreProvider({ user, children }: StoreProviderProps) {
  const getInitialStoreId = () => {
    if (user.role === 'staff' && user.storeId) return user.storeId;
    return 1;
  };

  const [currentStoreId, setCurrentStoreId] = useState<number>(getInitialStoreId);

  useEffect(() => {
    if (user.role === 'staff' && user.storeId) {
      setCurrentStoreId(user.storeId);
    }
  }, [user.id, user.storeId]);

  return (
    <StoreContext.Provider value={{ currentStoreId, setCurrentStoreId }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
