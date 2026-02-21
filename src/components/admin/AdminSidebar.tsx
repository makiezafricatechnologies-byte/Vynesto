'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingBag,
  Tags,
  Image as ImageIcon,
  Calendar,
  Zap,
  Megaphone,
  ClipboardList,
  Users,
  GitBranch,
  UserCircle,
  Briefcase,
  Settings,
  Building2
} from 'lucide-react';

const menuItems = [
  { href: '/admin/business', label: 'Business Info', icon: Building2 },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/carousel', label: 'Carousel Hub', icon: ImageIcon },
  { href: '/admin/templates', label: 'Monthly Templates', icon: Calendar },
  { href: '/admin/flash', label: 'Flash Sales', icon: Zap },
  { href: '/admin/promotions', label: 'Promotions', icon: Megaphone },
  { href: '/admin/inventory', label: 'Inventory', icon: ClipboardList },
  { href: '/admin/crm', label: 'CRM Marketing', icon: Users },
  { href: '/admin/branches', label: 'Branches', icon: GitBranch },
  { href: '/admin/staff', label: 'Staff Portal', icon: UserCircle },
  { href: '/admin/projects', label: 'Projects', icon: Briefcase },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex-col w-64 bg-card border-r shadow-sm", className)}>
      <div className="p-6">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6" />
          Frewsie Admin
        </h2>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
