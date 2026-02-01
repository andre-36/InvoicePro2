import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  user: {
    role?: 'owner' | 'staff';
    permissions?: string[];
  } | null;
}

export function ProtectedRoute({ children, permission, user }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  const hasPermission = (): boolean => {
    if (!user) return false;
    if (!permission) return true;
    if (user.role === 'owner') return true;
    return user.permissions?.includes(permission) ?? false;
  };

  useEffect(() => {
    if (!hasPermission()) {
      setLocation('/dashboard');
    }
  }, [permission, user]);

  if (!hasPermission()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Akses Ditolak</h2>
          <p className="text-muted-foreground mt-2">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
