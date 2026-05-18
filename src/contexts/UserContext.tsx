import React, { createContext, useContext, useState } from "react";

export type UserProfile = {
  id?: string;
  name?: string;
  [key: string]: unknown;
};

type UserContextValue = {
  user: UserProfile | null;
  setUser: (next: UserProfile | null) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export const UserProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const updateUser = (patch: Partial<UserProfile>) => {
    setUser((current) => (current ? { ...current, ...patch } : { ...patch }));
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
};

export default UserProvider;
