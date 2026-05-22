import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, getToken, saveToken } from '../../services/api/tokenStorage';
import { authService } from '../../features/auth/services/authService';
import type { User } from '../../shared/types/api';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = await getToken();
        if (token) {
          const currentUser = await authService.me();
          setUser(currentUser);
        }
      } catch {
        await clearToken();
        setUser(null);
      } finally {
        setInitializing(false);
      }
    }
    bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    initializing,
    signIn: async (email, password) => {
      const response = await authService.login({ email, password });
      await saveToken(response.token);
      setUser(response.user);
    },
    register: async (name, email, password) => {
      const response = await authService.register({ name, email, password });
      await saveToken(response.token);
      setUser(response.user);
    },
    signOut: async () => {
      await clearToken();
      setUser(null);
    },
  }), [initializing, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
