import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, connecte: false, email: null, emailVerifie: false });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await authApi.me();
      setState({
        loading: false,
        connecte: !!data.authenticated,
        email: data.email || null,
        emailVerifie: !!data.emailVerifie,
      });
    } catch {
      setState({ loading: false, connecte: false, email: null, emailVerifie: false });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ loading: false, connecte: false, email: null, emailVerifie: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refresh, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>.");
  return ctx;
}
