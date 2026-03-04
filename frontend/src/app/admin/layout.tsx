"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { ShieldCheck, Package, Tag, ClipboardList, Users } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.replace("/");
    }
  }, [isAuthenticated, isAdmin, router]);

  if (!isAuthenticated() || !isAdmin()) return null;

  const links = [
    { href: "/admin/orders", label: "Zamówienia", icon: ClipboardList },
    { href: "/admin/products", label: "Produkty", icon: Package },
    { href: "/admin/categories", label: "Kategorie", icon: Tag },
    { href: "/admin/users", label: "Użytkownicy", icon: Users },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-56 border-r border-gray-200 bg-white shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-primary-600 font-semibold">
            <ShieldCheck className="w-5 h-5" />
            Panel admina
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
