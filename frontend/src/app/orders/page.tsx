"use client";

import { useQuery } from "@tanstack/react-query";
import { orderClient } from "@/lib/grpc";
import { useAuthStore } from "@/lib/store";
import { formatPrice, formatDate, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function OrdersPage() {
  const { token } = useAuthStore();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", token],
    queryFn: () => orderClient.listOrders({ token: token!, page: 1, pageSize: 20 }),
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Zaloguj się</h2>
        <p className="text-gray-500 mb-6">Aby zobaczyć swoje zamówienia, musisz być zalogowany</p>
        <Link href="/auth/login" className="btn-primary">Zaloguj się</Link>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner />;

  const orders = data?.orders ?? [];

  if (orders.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Brak zamówień</h2>
        <p className="text-gray-500 mb-6">Nie złożyłeś jeszcze żadnego zamówienia</p>
        <Link href="/products" className="btn-primary">Przeglądaj produkty</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Moje zamówienia</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="card overflow-hidden">
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
            >
              <div className="flex items-center gap-6">
                <div>
                  <p className="font-semibold text-gray-900">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <span className={`badge ${getOrderStatusColor(order.status)}`}>
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
                  <p className="text-sm text-gray-500">{order.items.length} produktów</p>
                </div>
                {expandedOrder === order.id
                  ? <ChevronUp className="w-5 h-5 text-gray-400" />
                  : <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </div>

            {expandedOrder === order.id && (
              <div className="border-t p-5 bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Produkty</h4>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatPrice(item.subtotal)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-semibold text-gray-900">
                        <span>Razem</span>
                        <span>{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Adres dostawy</h4>
                    <address className="text-sm text-gray-600 not-italic space-y-1">
                      <p>{order.shippingAddress}</p>
                      <p>{order.shippingPostalCode} {order.shippingCity}</p>
                    </address>
                    {order.notes && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-500 uppercase">Uwagi</p>
                        <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
