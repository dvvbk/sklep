"use client";

import Link from "next/link";
import { useAuthStore, useCartStore } from "@/lib/store";
import { ShoppingCart, User, LogOut, Fish, Menu, X, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Header() {
  const { user, token, clearAuth, isAuthenticated, isAdmin } = useAuthStore();
  const { itemCount } = useCartStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = itemCount();

  const handleLogout = () => {
    clearAuth();
    toast.success("Wylogowano pomyślnie");
    router.push("/");
    setUserMenuOpen(false);
  };

  const navLinks = [
    { href: "/products", label: "Produkty" },
    { href: "/products?category=wedki", label: "Wędki" },
    { href: "/products?category=kolowrotki", label: "Kołowrotki" },
    { href: "/products?category=przynety", label: "Przynęty" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-gray-900 hover:text-primary-600 transition-colors">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <Fish className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:block">
              Złota Rybka
              <span className="text-xs font-normal text-gray-400 block -mt-1">Sklep Wędkarski</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {mounted && count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>

            {/* User */}
            {mounted && isAuthenticated() ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="hidden sm:block">{user?.firstName}</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Moje zamówienia
                      </Link>
                      {isAdmin() && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50 border-t border-gray-100"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Panel admina
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                      >
                        <LogOut className="w-4 h-4" />
                        Wyloguj się
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : mounted ? (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-secondary py-2 text-sm hidden sm:inline-flex">
                  Zaloguj się
                </Link>
                <Link href="/auth/register" className="btn-primary py-2 text-sm">
                  Rejestracja
                </Link>
              </div>
            ) : (
              <div className="w-24 h-10" /> // Placeholder
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              {link.label}
            </Link>
          ))}
          {mounted && !isAuthenticated() && (
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Zaloguj się
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
