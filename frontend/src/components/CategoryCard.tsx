import Link from "next/link";

interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
  slug: string;
}

export default function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/products?categoryId=${category.id}`}
      className="group flex flex-col items-center p-4 rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 hover:shadow-md transition-all duration-200 text-center"
    >
      <span className="text-3xl mb-2">{category.icon}</span>
      <span className="font-semibold text-sm text-gray-900 group-hover:text-primary-700 transition-colors">
        {category.name}
      </span>
      {category.productCount > 0 && (
        <span className="text-xs text-gray-400 mt-0.5">
          {category.productCount} produktów
        </span>
      )}
    </Link>
  );
}
