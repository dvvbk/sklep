"use client";

import { useState } from "react";
import { userClient, cartClient } from "@/lib/grpc";
import { useAuthStore, useCartStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Eye, EyeOff, Fish } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { setCart } = useCartStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await userClient.login({ email, password });
      if (res.user && res.token) {
        setAuth(res.user, res.token);
        // Load cart
        try {
          const cartRes = await cartClient.getCart({ token: res.token });
          if (cartRes.cart) setCart(cartRes.cart);
        } catch {}
        toast.success(`Witaj, ${res.user.firstName}! 🎣`);
        router.push("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Nieprawidłowy email lub hasło");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
            <Fish className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Złota Rybka</h1>
          <p className="text-gray-500 mt-2">Zaloguj się do swojego konta</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Hasło
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? "Logowanie..." : "Zaloguj się"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Nie masz konta?{" "}
            <Link href="/auth/register" className="font-medium text-primary-600 hover:text-primary-700">
              Zarejestruj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
