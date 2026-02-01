import { Menu, Store, ChevronDown, User, Key, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface HeaderProps {
  toggleSidebar: () => void;
  user?: {
    id?: number;
    username?: string;
    role?: 'owner' | 'staff';
    storeId?: number | null;
  };
  currentStoreId?: number;
  onStoreChange?: (storeId: number) => void;
  onLogout?: () => void;
}

type StoreType = {
  id: number;
  name: string;
};

export function Header({ toggleSidebar, user, currentStoreId, onStoreChange, onLogout }: HeaderProps) {
  const { toast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: stores } = useQuery<StoreType[]>({
    queryKey: ['/api/stores'],
  });

  const currentStore = stores?.find(s => s.id === currentStoreId);
  const isOwner = user?.role === 'owner';
  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U';

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Error", description: "Mohon isi semua field", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password baru tidak cocok", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast({ title: "Berhasil", description: "Password berhasil diubah" });
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal mengubah password", 
        variant: "destructive" 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      onLogout?.();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between h-14 px-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          {isOwner && stores && stores.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Store className="h-4 w-4" />
                  <span>{currentStore?.name || 'Pilih Cabang'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {stores.map((store) => (
                  <DropdownMenuItem
                    key={store.id}
                    onClick={() => onStoreChange?.(store.id)}
                    className={currentStoreId === store.id ? 'bg-accent' : ''}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    {store.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!isOwner && user?.storeId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              <span>Cabang: {stores?.find(s => s.id === user.storeId)?.name || `#${user.storeId}`}</span>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">
                {user?.username || 'User'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="h-4 w-4 mr-2" />
              Profil Saya
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
              <Key className="h-4 w-4 mr-2" />
              Ganti Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profil Saya</DialogTitle>
            <DialogDescription>Informasi akun Anda</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{user?.username}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {user?.role === 'owner' ? 'Pemilik' : 'Staff'}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Username</span>
                <span className="font-medium">{user?.username}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium capitalize">
                  {user?.role === 'owner' ? 'Pemilik' : 'Staff'}
                </span>
              </div>
              {!isOwner && user?.storeId && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Cabang</span>
                  <span className="font-medium">
                    {stores?.find(s => s.id === user.storeId)?.name || `#${user.storeId}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
            <DialogDescription>Masukkan password lama dan password baru Anda</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>
            <Button 
              onClick={handleChangePassword} 
              className="w-full"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
