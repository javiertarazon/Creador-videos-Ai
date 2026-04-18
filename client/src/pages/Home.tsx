import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

/**
 * Página de inicio que redirige automáticamente al dashboard
 */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse">
          <h1 className="text-2xl font-bold text-foreground mb-4">ProVideoGen</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    </div>
  );
}
