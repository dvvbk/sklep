"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cartClient, orderClient } from "@/lib/grpc";
import { useAuthStore, useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CheckCircle, ArrowLeft } from "lucide-react";

export default function CheckoutPage() {
  const { token, user } = useAuthStore();
  const { cart, setCart, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");

  const [form, setForm] = useState({
    address: "",
    city: "",
    postalCode: "",
    notes: "",
  });

  useEffect(() => {
    setMounted(true);
    if (user) {
      setForm({
        address: user.address || "",
        city: user.city || "",
        postalCode: user.postalCode || "",
        notes: "",
      });
    }
  }, [user]);

  const { isLoading } = useQuery({
    queryKey: ["cart-checkout", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await cartClient.getCart({ token });
      if (res.cart) setCart(res.cart);
      return res.cart;
    },
    enabled: !!token && mounted,
  });

  if (!mounted) return <LoadingSpinner />;

  if (!token) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Zaloguj się</h2>
        <Link href="/auth/login" className="btn-primary">Zaloguj się</Link>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner />;

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Zamówienie złożone!
        </h1>
        <p className="text-gray-500 mb-2">
          Numer zamówienia: <span className="font-mono font-medium">{orderId.slice(0, 8).toUpperCase()}</span>
        </p>
        <p className="text-gray-500 mb-8">
          Otrzymasz potwierdzenie na email. Dziękujemy za zakupy!
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/orders" className="btn-primary">
            Moje zamówienia
          </Link>
          <Link href="/" className="btn-secondary">
            Strona główna
          </Link>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const shipping = (cart?.total ?? 0) >= 199 ? 0 : 19.99;
  const total = (cart?.total ?? 0) + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Koszyk jest pusty");
      return;
    }

    setPlacing(true);
    try {
      const res = await orderClient.createOrder({
        token: token!,
        shippingAddress: form.address,
        shippingCity: form.city,
        shippingPostalCode: form.postalCode,
        notes: form.notes,
      });

      if (res.order) {
        setOrderId(res.order.id);
        clearCart();
        setSuccess(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Błąd składania zamówienia");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <Link href="/cart" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Wróć do koszyka
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Finalizacja zamówienia</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Dane dostawy</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Adres dostawy *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="ul. Wędkarska 12/3"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Miasto *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Warszawa"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kod pocztowy *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    placeholder="00-001"
                    pattern="[0-9]{2}-[0-9]{3}"
                    className="input-field"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Uwagi do zamówienia
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    placeholder="Np. proszę dzwonić przed dostawą"
                    className="input-field resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Metoda płatności</h2>
              <div className="space-y-3">
                {["Przelew bankowy", "Płatność przy odbiorze", "BLIK", "Karta kredytowa"].map((method) => (
                  <label key={method} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="payment"
                      defaultChecked={method === "Przelew bankowy"}
                      className="text-primary-600"
                    />
                    <span className="font-medium text-gray-700">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <div className="card p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Twoje zamówienie</h2>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600 line-clamp-1 flex-1 mr-2">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900 shrink-0">
                      {formatPrice(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Produkty</span>
                  <span>{formatPrice(cart?.total ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Dostawa</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-green-600">Gratis</span>
                    ) : formatPrice(shipping)}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg text-gray-900">
                  <span>Razem</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={placing || items.length === 0}
                className="btn-primary w-full text-base py-3 mt-6"
              >
                {placing ? "Składanie zamówienia..." : "Złóż zamówienie"}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Klikając "Złóż zamówienie" akceptujesz regulamin sklepu
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
