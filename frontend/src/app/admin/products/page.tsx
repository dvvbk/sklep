"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient, productClient } from "@/lib/grpc";
import { useAuthStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { Product } from "@/gen/golden_fish/v1/products_pb";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  stock: string;
  brand: string;
  weightKg: string;
  imageUrls: string;
  featured: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  stock: "",
  brand: "",
  weightKg: "",
  imageUrls: "",
  featured: false,
};

function productToForm(p: Product): ProductForm {
  return {
    name: p.name,
    description: p.description,
    price: String(p.price),
    categoryId: p.categoryId,
    stock: String(p.stock),
    brand: p.brand,
    weightKg: String(p.weightKg),
    imageUrls: p.imageUrls.join("\n"),
    featured: p.featured,
  };
}

export default function AdminProductsPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; editing: Product | null }>({
    open: false,
    editing: null,
  });
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", page],
    queryFn: () => productClient.listProducts({ page, pageSize: 20 }),
  });

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productClient.listCategories({}),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminClient.createProduct({
        token: token!,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        categoryId: form.categoryId,
        stock: parseInt(form.stock),
        brand: form.brand,
        weightKg: parseFloat(form.weightKg) || 0,
        imageUrls: form.imageUrls.split("\n").map((s) => s.trim()).filter(Boolean),
        featured: form.featured,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produkt dodany");
      closeModal();
    },
    onError: () => toast.error("Błąd dodawania produktu"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      adminClient.updateProduct({
        token: token!,
        id: modal.editing!.id,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        categoryId: form.categoryId,
        stock: parseInt(form.stock),
        brand: form.brand,
        weightKg: parseFloat(form.weightKg) || 0,
        imageUrls: form.imageUrls.split("\n").map((s) => s.trim()).filter(Boolean),
        featured: form.featured,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produkt zaktualizowany");
      closeModal();
    },
    onError: () => toast.error("Błąd aktualizacji produktu"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminClient.deleteProduct({ token: token!, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produkt usunięty");
    },
    onError: () => toast.error("Błąd usuwania produktu"),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ open: true, editing: null });
  };

  const openEdit = (p: Product) => {
    setForm(productToForm(p));
    setModal({ open: true, editing: p });
  };

  const closeModal = () => setModal({ open: false, editing: null });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingSpinner />;

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const categories = catData?.categories ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produkty ({total})</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Dodaj produkt
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nazwa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Marka</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Cena</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Stan</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Polecany</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.brand}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatPrice(p.price)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{p.stock} szt.</td>
                <td className="px-4 py-3 text-center">
                  {p.featured ? (
                    <span className="text-yellow-500">★</span>
                  ) : (
                    <span className="text-gray-300">★</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Usunąć produkt "${p.name}"?`)) deleteMutation.mutate(p.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Brak produktów
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
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-50"
          >
            Następna
          </button>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {modal.editing ? "Edytuj produkt" : "Dodaj produkt"}
              </h2>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cena (PLN) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stan magazynowy *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria *</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Wybierz kategorię</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                  <input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waga (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zdjęcia (URL, jeden na linię)
                </label>
                <textarea
                  rows={3}
                  value={form.imageUrls}
                  onChange={(e) => setForm({ ...form, imageUrls: e.target.value })}
                  className="input-field w-full font-mono text-xs"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="featured"
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  Produkt polecany
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary flex-1"
                >
                  Anuluj
                </button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? "Zapisywanie…" : modal.editing ? "Zapisz" : "Dodaj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
