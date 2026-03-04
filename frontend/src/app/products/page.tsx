"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productClient } from "@/lib/grpc";
import ProductCard from "@/components/ProductCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Search, SlidersHorizontal } from "lucide-react";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productClient.listCategories({}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", { search, categoryId, page, sortBy, sortOrder, minPrice, maxPrice }],
    queryFn: () =>
      search
        ? productClient.searchProducts({ query: search, page, pageSize: 12 })
        : productClient.listProducts({
            page,
            pageSize: 12,
            categoryId,
            sortBy,
            sortOrder,
            minPrice,
            maxPrice,
          }),
  });

  const products = "products" in (data ?? {}) ? (data as any).products : [];
  const total = "total" in (data ?? {}) ? (data as any).total : 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wszystkie produkty</h1>
        <p className="text-gray-500">
          {total > 0 ? `Znaleziono ${total} produktów` : "Szukaj wśród setek produktów"}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <aside className="lg:w-64 shrink-0">
          <div className="card p-5 space-y-6 sticky top-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filtry
              </h3>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Szukaj
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Nazwa, marka..."
                  className="input-field pl-9"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kategoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                className="input-field"
              >
                <option value="">Wszystkie kategorie</option>
                {categoriesData?.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cena (PLN)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minPrice || ""}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  placeholder="Od"
                  min="0"
                  className="input-field"
                />
                <input
                  type="number"
                  value={maxPrice || ""}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  placeholder="Do"
                  min="0"
                  className="input-field"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sortowanie
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split("-");
                  setSortBy(by);
                  setSortOrder(order);
                }}
                className="input-field"
              >
                <option value="created_at-DESC">Najnowsze</option>
                <option value="price-ASC">Cena: rosnąco</option>
                <option value="price-DESC">Cena: malejąco</option>
                <option value="rating-DESC">Najwyżej oceniane</option>
                <option value="name-ASC">Nazwa A-Z</option>
              </select>
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                setSearch("");
                setCategoryId("");
                setMinPrice(0);
                setMaxPrice(0);
                setSortBy("created_at");
                setSortOrder("DESC");
                setPage(1);
              }}
              className="btn-secondary w-full"
            >
              Resetuj filtry
            </button>
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          {isLoading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎣</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Brak produktów
              </h3>
              <p className="text-gray-500">
                Zmień kryteria wyszukiwania
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary"
                  >
                    Poprzednia
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={p === page ? "btn-primary" : "btn-secondary"}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary"
                  >
                    Następna
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
