"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cartClient } from "@/lib/grpc";
import { useAuthStore, useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { token } = useAuthStore();
  const { cart, setCart } = useCartStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { isLoading } = useQuery({
    queryKey: ["cart", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await cartClient.getCart({ token });
      if (res.cart) setCart(res.cart);
      return res.cart;
    },
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartClient.updateItem({ token: token!, productId, quantity }),
    onSuccess: (res) => {
      if (res.cart) setCart(res.cart);
    },
    onError: () => toast.error("Błąd aktualizacji koszyka"),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) =>
      cartClient.removeItem({ token: token!, productId }),
    onSuccess: (res) => {
      if (res.cart) setCart(res.cart);
      toast.success("Usunięto z koszyka");
    },
    onError: () => toast.error("Błąd usuwania produktu"),
  });

  if (!token) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Zaloguj się</h2>
        <p className="text-gray-500 mb-6">Aby zobaczyć zawartość koszyka, musisz być zalogowany</p>
        <Link href="/auth/login" className="btn-primary">
          Zaloguj się
        </Link>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner />;

  const items = cart?.items ?? [];
  const shipping = (cart?.total ?? 0) >= 199 ? 0 : 19.99;
  const total = (cart?.total ?? 0) + shipping;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koszyk jest pusty</h2>
        <p className="text-gray-500 mb-6">Dodaj produkty, aby kontynuować zakupy</p>
        <Link href="/products" className="btn-primary">
          <ShoppingBag className="w-4 h-4" />
          Przeglądaj produkty
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Koszyk</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="card p-4 flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🎣</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.productId}`}
                  className="font-semibold text-gray-900 hover:text-primary-600 line-clamp-2"
                >
                  {item.productName}
                </Link>
                <p className="text-primary-600 font-medium mt-1">
                  {formatPrice(item.price)}
                </p>
              </div>

              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden shrink-0">
                <button
                  onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity - 1 })}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  −
                </button>
                <span className="px-3 py-2 font-medium text-gray-900 min-w-[2.5rem] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity + 1 })}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">{formatPrice(item.subtotal)}</p>
                <button
                  onClick={() => removeMutation.mutate(item.productId)}
                  className="text-red-500 hover:text-red-700 mt-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div>
          <div className="card p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Podsumowanie</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Produkty ({cart?.itemCount ?? 0} szt.)</span>
                <span>{formatPrice(cart?.total ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Dostawa</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-green-600 font-medium">Gratis</span>
                  ) : (
                    formatPrice(shipping)
                  )}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-gray-400">
                  Brakuje {formatPrice(199 - (cart?.total ?? 0))} do darmowej dostawy
                </p>
              )}
              <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
                <span>Razem</span>
                <span className="text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/checkout")}
              className="btn-primary w-full text-base py-3"
            >
              Przejdź do kasy
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/products"
              className="btn-secondary w-full text-center mt-3 text-base py-3"
            >
              Kontynuuj zakupy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
