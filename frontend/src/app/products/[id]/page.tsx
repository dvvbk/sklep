"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productClient, cartClient } from "@/lib/grpc";
import { useAuthStore, useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ShoppingCart, Star, Package, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ProductPage({ params }: { params: { id: string } }) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const router = useRouter();
  const { token } = useAuthStore();
  const { setCart } = useCartStore();

  const { data, isLoading } = useQuery({
    queryKey: ["product", params.id],
    queryFn: () => productClient.getProduct({ id: params.id }),
  });

  const product = data?.product;

  const handleAddToCart = async () => {
    if (!token) {
      toast.error("Zaloguj się aby dodać do koszyka");
      router.push("/auth/login");
      return;
    }

    if (!product) return;

    setAdding(true);
    try {
      const res = await cartClient.addItem({
        token,
        productId: product.id,
        quantity,
      });
      if (res.cart) setCart(res.cart);
      toast.success(`${product.name} dodano do koszyka!`);
    } catch (err: any) {
      toast.error(err.message || "Nie udało się dodać do koszyka");
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!product) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">😞</div>
      <p className="text-gray-500">Produkt nie został znaleziony</p>
      <Link href="/products" className="btn-primary mt-4 inline-flex">
        Wróć do produktów
      </Link>
    </div>
  );

  const images = product.imageUrls.length > 0
    ? product.imageUrls
    : ["https://images.unsplash.com/photo-1551887373-3c5bd224f6e2?w=600"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-primary-600">Strona główna</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/products" className="hover:text-primary-600">Produkty</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square relative rounded-2xl overflow-hidden bg-gray-100">
            <Image
              src={images[activeImage]}
              alt={product.name}
              fill
              className="object-cover"
            />
            {product.featured && (
              <div className="absolute top-4 left-4">
                <span className="badge bg-gold-500 text-white font-semibold px-3 py-1">
                  ⭐ Polecany
                </span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    idx === activeImage ? "border-primary-500" : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          <div className="mb-2">
            <span className="text-sm font-medium text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
              {product.categoryName}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mt-3 mb-2">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 mb-4">
            {product.brand && (
              <span className="text-sm text-gray-500">
                Marka: <span className="font-medium text-gray-700">{product.brand}</span>
              </span>
            )}
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-gold-400 text-gold-400" />
                <span className="font-medium">{product.rating.toFixed(1)}</span>
                <span className="text-gray-400">({product.reviewCount} opinii)</span>
              </div>
            )}
          </div>

          <div className="text-4xl font-bold text-gray-900 mb-6">
            {formatPrice(product.price)}
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

          {/* Attributes */}
          {Object.keys(product.attributes).length > 0 && (
            <div className="card p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Specyfikacja</h3>
              <dl className="space-y-2">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <dt className="text-gray-500 capitalize">{key}</dt>
                    <dd className="font-medium text-gray-700">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Stock status */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <Package className="w-4 h-4" />
            {product.stock > 0 ? (
              <span className="text-green-600 font-medium">
                Dostępny ({product.stock} szt.)
              </span>
            ) : (
              <span className="text-red-600 font-medium">Brak w magazynie</span>
            )}
          </div>

          {/* Add to cart */}
          <div className="flex gap-4">
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 hover:bg-gray-50 transition-colors text-lg font-semibold"
              >
                −
              </button>
              <span className="px-4 py-3 font-semibold text-gray-900 min-w-[3rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="px-4 py-3 hover:bg-gray-50 transition-colors text-lg font-semibold"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding || product.stock === 0}
              className="btn-primary flex-1 text-base py-3"
            >
              <ShoppingCart className="w-5 h-5" />
              {adding ? "Dodawanie..." : "Dodaj do koszyka"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
