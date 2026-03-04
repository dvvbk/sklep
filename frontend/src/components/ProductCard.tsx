"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cartClient } from "@/lib/grpc";
import { useAuthStore, useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { ShoppingCart, Star } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: number;
  categoryName: string;
  stock: number;
  imageUrls: string[];
  brand: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
}

export default function ProductCard({ product }: { product: Product }) {
  const [adding, setAdding] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { token } = useAuthStore();
  const { setCart } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const imageUrl =
    product.imageUrls[0] ||
    "https://images.unsplash.com/photo-1551887373-3c5bd224f6e2?w=400";

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      toast.error("Zaloguj się aby dodać do koszyka");
      router.push("/auth/login");
      return;
    }

    setAdding(true);
    try {
      const res = await cartClient.addItem({
        token,
        productId: product.id,
        quantity: 1,
      });
      if (res.cart) setCart(res.cart);
      toast.success("Dodano do koszyka!");
    } catch (err: any) {
      toast.error(err.message || "Błąd dodawania do koszyka");
    } finally {
      setAdding(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/products/${product.id}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="card group hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.featured && (
          <div className="absolute top-2 left-2">
            <span className="badge bg-gold-500 text-white font-medium px-2 py-1 text-xs">
              ⭐ Polecany
            </span>
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-900 font-semibold px-3 py-1.5 rounded-full text-sm">
              Niedostępny
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-1">
          <span className="text-xs text-primary-600 font-medium">{product.categoryName}</span>
          {product.brand && (
            <span className="text-xs text-gray-400 ml-2">• {product.brand}</span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 flex-1">
          {product.name}
        </h3>

        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= Math.round(product.rating)
                    ? "fill-gold-400 text-gold-400"
                    : "text-gray-200"
                }`}
              />
            ))}
            <span className="text-xs text-gray-400 ml-1">({product.reviewCount})</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>

          {mounted && (
            <button
              onClick={handleAddToCart}
              disabled={adding || product.stock === 0}
              className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Dodaj do koszyka"
            >
              <ShoppingCart className={`w-4 h-4 ${adding ? "animate-bounce" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
