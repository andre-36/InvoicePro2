import { Menu, Store, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
}

type StoreType = {
  id: number;
  name: string;
};

export function Header({ toggleSidebar, user, currentStoreId, onStoreChange }: HeaderProps) {
  const { data: stores } = useQuery<StoreType[]>({
    queryKey: ['/api/stores'],
  });

  const currentStore = stores?.find(s => s.id === currentStoreId);
  const isOwner = user?.role === 'owner';

  return (
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
    </div>
  );
}
