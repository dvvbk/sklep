import Link from "next/link";
import { ArrowRight, Fish } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, white 2px, transparent 0)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Floating fish emoji */}
      <div className="absolute top-8 right-8 text-6xl opacity-20 animate-bounce">🐠</div>
      <div className="absolute bottom-8 right-32 text-4xl opacity-15">🦈</div>
      <div className="absolute top-24 right-48 text-3xl opacity-20">🎣</div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Fish className="w-4 h-4" />
            Sklep dla pasjonatów wędkarstwa
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Złota Rybka
            <span className="block text-primary-200 text-3xl sm:text-4xl font-normal mt-2">
              Twój partner w wędkarstwie
            </span>
          </h1>

          <p className="text-lg text-primary-100 leading-relaxed mb-10 max-w-xl">
            Odkryj nasz szeroki wybór wędek, kołowrotków, przynęt i akcesoriów.
            Sprzęt najwyższej jakości od renomowanych marek w jednym miejscu.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 transition-colors shadow-lg text-base"
            >
              Przeglądaj produkty
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-base"
            >
              Załóż konto
            </Link>
          </div>

          <div className="flex items-center gap-8 mt-12">
            {[
              { value: "500+", label: "Produktów" },
              { value: "50+", label: "Marek" },
              { value: "10k+", label: "Zadowolonych klientów" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-primary-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
