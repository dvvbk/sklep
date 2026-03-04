"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminClient } from "@/lib/grpc";
import { useAuthStore } from "@/lib/store";
import LoadingSpinner from "@/components/LoadingSpinner";
import { User, ShieldCheck, Mail, MapPin } from "lucide-react";

export default function AdminUsersPage() {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => adminClient.listUsers({ token: token!, page, pageSize: 20 }),
    enabled: !!token && mounted,
  });

  if (!mounted || isLoading) return <LoadingSpinner />;

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Użytkownicy ({total})</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Użytkownik</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Lokalizacja</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Rola</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-gray-900">
                      {u.firstName} {u.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {u.email}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {u.city ? `${u.city}, ${u.postalCode}` : "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-bold border border-primary-100">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      Klient
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                  {u.id}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Brak użytkowników
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-50"
          >
            Poprzednia
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-50"
          >
            Następna
          </button>
        </div>
      )}
    </div>
  );
}
