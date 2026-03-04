"use client";

import { useQuery } from "@tanstack/react-query";
import { productClient } from "@/lib/grpc";
import ProductCard from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";
import HeroSection from "@/components/HeroSection";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function HomePage() {
  const { data: featuredData, isLoading: loadingFeatured } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => productClient.getFeaturedProducts({ limit: 8 }),
  });

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productClient.listCategories({}),
  });

  return (
    <div className="min-h-screen">
      <HeroSection />

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Kategorie produktów
          </h2>
          <p className="text-gray-500">
            Znajdź sprzęt dopasowany do Twojego stylu wędkowania
          </p>
        </div>

        {loadingCategories ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoriesData?.categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>

      {/* Featured products */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Polecane produkty
            </h2>
            <p className="text-gray-500">
              Bestsellery wybrane przez naszych wędkarzy
            </p>
          </div>

          {loadingFeatured ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredData?.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust badges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: "🚚", title: "Darmowa dostawa", desc: "Zamówienia powyżej 199 zł" },
            { icon: "🔒", title: "Bezpieczne płatności", desc: "SSL i szyfrowanie danych" },
            { icon: "↩️", title: "Zwroty do 30 dni", desc: "Bez pytania o powód" },
            { icon: "🏆", title: "Oryginalny sprzęt", desc: "Tylko sprawdzone marki" },
          ].map((badge) => (
            <div key={badge.title} className="flex items-start gap-4 p-6 card">
              <span className="text-3xl">{badge.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{badge.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
