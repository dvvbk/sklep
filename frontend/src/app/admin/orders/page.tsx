"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient, orderClient } from "@/lib/grpc";
import { useAuthStore } from "@/lib/store";
import { formatPrice, formatDate, getOrderStatusLabel, getOrderStatusColor } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";
import { OrderStatus, Order } from "@/gen/golden_fish/v1/orders_pb";
import { Eye, X, Package, MapPin, ClipboardList } from "lucide-react";

const STATUS_OPTIONS = [
  { value: OrderStatus.PENDING, label: "Oczekujące" },
  { value: OrderStatus.CONFIRMED, label: "Potwierdzone" },
  { value: OrderStatus.SHIPPED, label: "Wysłane" },
  { value: OrderStatus.DELIVERED, label: "Dostarczone" },
  { value: OrderStatus.CANCELLED, label: "Anulowane" },
];

export default function AdminOrdersPage() {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", page],
    queryFn: () => adminClient.listAllOrders({ token: token!, page, pageSize: 20 }),
    enabled: !!token && mounted,
  });

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      orderClient.updateOrderStatus({ token: token!, orderId, status }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status zaktualizowany");
      if (selectedOrder && selectedOrder.id === res.order?.id) {
        setSelectedOrder(res.order as any);
      }
    },
    onError: () => toast.error("Błąd aktualizacji statusu"),
  });

  if (!mounted || isLoading) return <LoadingSpinner />;

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Zamówienia ({total})</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="px-4 py-3 font-medium text-gray-600">Użytkownik</th>
              <th className="px-4 py-3 font-medium text-gray-600">Data</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Kwota</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-center">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                  #{order.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-gray-600 text-[10px] font-mono">
                  {order.userId.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatPrice(order.total)}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      updateStatus.mutate({
                        orderId: order.id,
                        status: Number(e.target.value) as OrderStatus,
                      })
                    }
                    className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 cursor-pointer shadow-sm transition-all hover:brightness-95 ${getOrderStatusColor(order.status)}`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-white text-gray-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="Szczegóły"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Brak zamówień
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-4 text-xs disabled:opacity-50"
          >
            Poprzednia
          </button>
          <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-4 text-xs disabled:opacity-50"
          >
            Następna
          </button>
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    Zamówienie #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <p className="text-xs text-gray-500">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Order Items */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-600" />
                  Produkty ({selectedOrder.items.length})
                </h3>
                <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-200 overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-100/50 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.productName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                  <div className="p-4 bg-white/50 flex justify-between items-center font-bold text-gray-900">
                    <span className="text-sm">Razem do zapłaty</span>
                    <span className="text-lg text-primary-600">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    Adres dostawy
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <address className="text-sm text-gray-600 not-italic space-y-1.5">
                      <p className="font-medium text-gray-900">Adres docelowy:</p>
                      <p>{selectedOrder.shippingAddress}</p>
                      <p className="flex items-center gap-2">
                        <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {selectedOrder.shippingPostalCode}
                        </span>
                        {selectedOrder.shippingCity}
                      </p>
                    </address>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Informacje dodatkowe</h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[5rem]">
                    {selectedOrder.notes ? (
                      <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                    ) : (
                      <p className="text-xs italic text-gray-400">Brak uwag do zamówienia</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Status update */}
            <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) =>
                    updateStatus.mutate({
                      orderId: selectedOrder.id,
                      status: Number(e.target.value) as OrderStatus,
                    })
                  }
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer shadow-sm transition-all hover:brightness-95 ${getOrderStatusColor(selectedOrder.status)}`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white text-gray-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                UserID: {selectedOrder.userId}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
