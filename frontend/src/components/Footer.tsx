import Link from "next/link";
import { Fish, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <Fish className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">Złota Rybka</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Sklep wędkarski z wieloletnią tradycją. Oferujemy sprzęt najwyższej jakości
              dla wędkarzy na każdym poziomie.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-white mb-4">Kategorie</h3>
            <ul className="space-y-2 text-sm">
              {["Wędki", "Kołowrotki", "Żyłki i Plecionki", "Przynęty", "Haczyki", "Akcesoria"].map((cat) => (
                <li key={cat}>
                  <Link href="/products" className="hover:text-white transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-white mb-4">Informacje</h3>
            <ul className="space-y-2 text-sm">
              {["O nas", "Regulamin", "Polityka prywatności", "Dostawa i zwroty", "FAQ"].map((item) => (
                <li key={item}>
                  <Link href="#" className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">Kontakt</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-primary-400 shrink-0" />
                <span>ul. Wędkarska 42<br />00-001 Warszawa</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-primary-400 shrink-0" />
                <span>+48 22 123 45 67</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-primary-400 shrink-0" />
                <a href="mailto:sklep@zlota-rybka.pl" className="hover:text-white transition-colors">
                  sklep@zlota-rybka.pl
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Złota Rybka. Wszelkie prawa zastrzeżone.
          </p>
          <p className="text-xs text-gray-600">
            Powered by Go gRPC · Next.js · Bun
          </p>
        </div>
      </div>
    </footer>
  );
}
