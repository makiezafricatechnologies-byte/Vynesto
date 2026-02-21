'use client';

import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Bell, Menu, User } from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { AdminSidebar } from './AdminSidebar';

export function AdminHeader() {
  const { user } = useUser();

  return (
    <header className="h-16 bg-card border-b px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <AdminSidebar className="w-full border-r-0 h-full" />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold hidden md:block">Command Center</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-medium leading-none">{user?.displayName || 'Admin User'}</p>
            <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
