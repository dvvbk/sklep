"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient, productClient } from "@/lib/grpc";
import { useAuthStore } from "@/lib/store";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { Category } from "@/gen/golden_fish/v1/products_pb";

type CategoryForm = {
  name: string;
  description: string;
  slug: string;
  icon: string;
};

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  slug: "",
  icon: "🎣",
};

function categoryToForm(c: Category): CategoryForm {
  return {
    name: c.name,
    description: c.description,
    slug: c.slug,
    icon: c.icon,
  };
}

export default function AdminCategoriesPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: Category | null }>({
    open: false,
    editing: null,
  });
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productClient.listCategories({}),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminClient.createCategory({ token: token!, ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategoria dodana");
      closeModal();
    },
    onError: () => toast.error("Błąd dodawania kategorii"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      adminClient.updateCategory({ token: token!, id: modal.editing!.id, ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategoria zaktualizowana");
      closeModal();
    },
    onError: () => toast.error("Błąd aktualizacji kategorii"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminClient.deleteCategory({ token: token!, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategoria usunięta");
    },
    onError: () => toast.error("Błąd usuwania kategorii"),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ open: true, editing: null });
  };

  const openEdit = (c: Category) => {
    setForm(categoryToForm(c));
    setModal({ open: true, editing: c });
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

  const categories = data?.categories ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kategorie ({categories.length})</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Dodaj kategorię
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ikona</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nazwa</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Produkty</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xl">{c.icon}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3 text-right text-gray-600">{c.productCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Usunąć kategorię "${c.name}"?`)) deleteMutation.mutate(c.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Brak kategorii
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {modal.editing ? "Edytuj kategorię" : "Dodaj kategorię"}
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
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="input-field w-full font-mono"
                  placeholder="np. wedki"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ikona (emoji)</label>
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="input-field w-full"
                  placeholder="🎣"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
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
