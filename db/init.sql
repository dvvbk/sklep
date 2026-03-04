-- Złota Rybka - Fishing E-commerce Database Schema
-- PostgreSQL 16

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Categories
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    slug        VARCHAR(100) NOT NULL UNIQUE,
    icon        VARCHAR(50) NOT NULL DEFAULT '🎣',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    address       TEXT,
    city          VARCHAR(100),
    postal_code   VARCHAR(10),
    is_admin      BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(255) NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    price        DECIMAL(10, 2) NOT NULL,
    category_id  UUID NOT NULL REFERENCES categories(id),
    stock        INTEGER NOT NULL DEFAULT 0,
    image_urls   TEXT[] NOT NULL DEFAULT '{}',
    brand        VARCHAR(100) NOT NULL DEFAULT '',
    weight_kg    DECIMAL(8, 3) NOT NULL DEFAULT 0,
    attributes   JSONB NOT NULL DEFAULT '{}',
    featured     BOOLEAN NOT NULL DEFAULT false,
    rating       DECIMAL(3, 1) NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('simple', name || ' ' || description || ' ' || brand));
CREATE INDEX idx_products_trgm ON products USING gin((name || ' ' || brand) gin_trgm_ops);

-- Carts
CREATE TABLE carts (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cart items
CREATE TABLE cart_items (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id      UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    price        DECIMAL(10, 2) NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 1,
    image_url    TEXT NOT NULL DEFAULT '',
    UNIQUE(cart_id, product_id)
);

-- Orders
CREATE TABLE orders (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID NOT NULL REFERENCES users(id),
    total                 DECIMAL(10, 2) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'pending',
    shipping_address      TEXT NOT NULL,
    shipping_city         VARCHAR(100) NOT NULL,
    shipping_postal_code  VARCHAR(10) NOT NULL,
    notes                 TEXT NOT NULL DEFAULT '',
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Order items
CREATE TABLE order_items (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price        DECIMAL(10, 2) NOT NULL,
    quantity     INTEGER NOT NULL,
    subtotal     DECIMAL(10, 2) NOT NULL
);

-- ========== SEED DATA ==========

INSERT INTO users (id, email, password_hash, first_name, last_name, is_admin)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@zlotarybka.pl', '$2b$10$b8jiZzLLT93g2L4T641iZOzIHnsZ24yJafefrJ7xKBNoe69nwj/py', 'Admin', 'Złota Rybka', true);


INSERT INTO categories (id, name, description, slug, icon) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Wędki', 'Wędki spinningowe, gruntowe, karpiowe i inne', 'wedki', '🎣'),
    ('a1000000-0000-0000-0000-000000000002', 'Kołowrotki', 'Kołowrotki do różnych technik wędkowania', 'kolowrotki', '🔄'),
    ('a1000000-0000-0000-0000-000000000003', 'Żyłki i Plecionki', 'Żyłki monofilowe, plecionki fluorocarbon', 'zyłki', '🧵'),
    ('a1000000-0000-0000-0000-000000000004', 'Przynęty', 'Sztuczne i naturalne przynęty wędkarskie', 'przynety', '🐟'),
    ('a1000000-0000-0000-0000-000000000005', 'Haczyki', 'Haczyki do różnych technik i gatunków ryb', 'haczyki', '🪝'),
    ('a1000000-0000-0000-0000-000000000006', 'Akcesoria', 'Akcesoria, sprzęt pomocniczy, odzież', 'akcesoria', '🎒');

INSERT INTO products (name, description, price, category_id, stock, image_urls, brand, weight_kg, attributes, featured, rating, review_count) VALUES
    -- Wędki
    ('Shimano Catana EX 270cm', 'Lekka i wytrzymała wędka spinningowa z blankiem z włókna węglowego. Idealna dla początkujących i zaawansowanych.', 189.99, 'a1000000-0000-0000-0000-000000000001', 45,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Shimano', 0.18,
     '{"długość": "270cm", "akcja": "medium", "ciężar przynęty": "5-25g", "materiał": "węgiel"}', true, 4.7, 128),

    ('Daiwa Ninja X 300cm Karpiowa', 'Profesjonalna wędka karpiowa z wysokiej jakości karbonu. Doskonała do łowienia na dużych zbiornikach.', 349.00, 'a1000000-0000-0000-0000-000000000001', 23,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Daiwa', 0.45,
     '{"długość": "300cm", "akcja": "slow", "test wagi": "3.5lb", "materiał": "high-modulus carbon"}', true, 4.9, 87),

    ('Fox Warrior 390cm Gruntowa', 'Solidna wędka gruntowa do łowienia leszcza i karpia. Posiada wrażliwy szczytówek.', 249.00, 'a1000000-0000-0000-0000-000000000001', 31,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Fox', 0.38,
     '{"długość": "390cm", "sekcji": "3", "akcja": "medium fast"}', false, 4.5, 54),

    ('Abu Garcia Vendetta 210cm Spinning', 'Krótka, szybka wędka do rzucania małymi przynętami w trudnych miejscach.', 279.00, 'a1000000-0000-0000-0000-000000000001', 18,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Abu Garcia', 0.12,
     '{"długość": "210cm", "akcja": "extra fast", "ciężar przynęty": "3-15g"}', false, 4.6, 42),

    -- Kołowrotki
    ('Shimano Stradic FL 2500', 'Flagowy kołowrotek Shimano z systemem HAGANE. Wyjątkowa płynność pracy i wytrzymałość.', 699.00, 'a1000000-0000-0000-0000-000000000002', 34,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Shimano', 0.22,
     '{"rozmiar": "2500", "łożysk": "6+1", "przełożenie": "6.0:1", "pojemność": "0.25/160m"}', true, 4.8, 203),

    ('Daiwa Exceler LT 3000', 'Lekki i wytrzymały kołowrotek serii LT. Idealny do różnych technik wędkowania.', 399.00, 'a1000000-0000-0000-0000-000000000002', 56,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Daiwa', 0.19,
     '{"rozmiar": "3000", "łożysk": "5+1", "przełożenie": "5.3:1", "seria": "LT"}', true, 4.6, 156),

    ('Penn Battle III 6000', 'Morski kołowrotek do trollingu i wędkowania morskiego. Pełnometalowa obudowa.', 549.00, 'a1000000-0000-0000-0000-000000000002', 15,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Penn', 0.56,
     '{"rozmiar": "6000", "łożysk": "5+1", "materiał": "full metal", "zastosowanie": "morskie"}', false, 4.7, 89),

    ('Okuma Ceymar 1000', 'Ekonomiczny kołowrotek dla początkujących. Dobra jakość w przystępnej cenie.', 149.00, 'a1000000-0000-0000-0000-000000000002', 78,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Okuma', 0.16,
     '{"rozmiar": "1000", "łożysk": "4+1", "przełożenie": "5.0:1"}', false, 4.2, 234),

    -- Żyłki i Plecionki
    ('Shimano Kairiki 8 150m 0.10mm', 'Ośmiowłóknista plecionka najwyższej jakości. Wyjątkowa wytrzymałość i wrażliwość.', 79.99, 'a1000000-0000-0000-0000-000000000003', 120,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Shimano', 0.05,
     '{"splot": "8x", "średnica": "0.10mm", "wytrzymałość": "6.5kg", "kolor": "szary"}', true, 4.9, 312),

    ('Daiwa J-Braid X8 300m 0.16mm', 'Japońska plecionka 8-włóknista do precyzyjnych rzutów na duże odległości.', 119.00, 'a1000000-0000-0000-0000-000000000003', 89,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Daiwa', 0.08,
     '{"splot": "8x", "średnica": "0.16mm", "wytrzymałość": "10kg", "długość": "300m"}', true, 4.7, 198),

    ('Berkley Trilene XL 300m 0.25mm', 'Klasyczna żyłka monofilowa do wędkowania gruntowego. Dobra elastyczność.', 34.99, 'a1000000-0000-0000-0000-000000000003', 200,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Berkley', 0.07,
     '{"typ": "monofilament", "średnica": "0.25mm", "wytrzymałość": "5kg"}', false, 4.3, 445),

    -- Przynęty
    ('Rapala Original Floating F11', 'Legendarny wobler pływający. Ponad 80 lat tradycji i miliony złowionych ryb.', 39.99, 'a1000000-0000-0000-0000-000000000004', 145,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Rapala', 0.01,
     '{"typ": "wobler", "długość": "11cm", "waga": "6g", "akcja": "pływający", "głębokość": "0.9-1.5m"}', true, 4.9, 567),

    ('Berkley Gulp Earthworm', 'Sztuczne robaki z zapachu przywabiającego ryby. 100% biodegradowalne.', 24.99, 'a1000000-0000-0000-0000-000000000004', 230,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Berkley', 0.10,
     '{"typ": "guma", "zapach": "naturalny", "ilość": "55szt", "ekologiczne": "tak"}', false, 4.5, 189),

    ('Savage Gear 3D Roach 12.5cm', 'Realistyczna gumowa przynęta imitująca płotkę. Doskonała na sandacze i szczupaki.', 29.99, 'a1000000-0000-0000-0000-000000000004', 98,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Savage Gear', 0.03,
     '{"typ": "guma 3D", "długość": "12.5cm", "waga": "18g", "cel": "sandacz, szczupak"}', true, 4.7, 134),

    ('Strike King Tour Grade Spinnerbait', 'Profesjonalny spinner do połowu okoni i szczupaków w różnych warunkach.', 44.99, 'a1000000-0000-0000-0000-000000000004', 67,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Strike King', 0.04,
     '{"typ": "spinnerbait", "waga": "14g", "kolor": "złoty/chartreuse"}', false, 4.4, 76),

    -- Haczyki
    ('Gamakatsu Trout #10 op. 10szt', 'Ostro naostrzone haczyki do wędkowania na pstrągi. Wykonane ze specjalnej stali.', 14.99, 'a1000000-0000-0000-0000-000000000005', 350,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Gamakatsu', 0.01,
     '{"rozmiar": "#10", "ilość": "10szt", "materiał": "high carbon steel", "typ": "z oczkiem"}', false, 4.8, 423),

    ('Mustad Ultra Point Karpiowy #4 op. 10szt', 'Specjalistyczne haczyki karpiowe z super ostrym grotem i teflon coating.', 19.99, 'a1000000-0000-0000-0000-000000000005', 280,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Mustad', 0.02,
     '{"rozmiar": "#4", "powłoka": "teflon", "typ": "karp", "ilość": "10szt"}', true, 4.9, 312),

    ('Owner Cutting Point #8 op. 5szt', 'Haczyki japońskie najwyższej jakości z ultra-ostrym grotem. Do spinningowania.', 22.99, 'a1000000-0000-0000-0000-000000000005', 190,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Owner', 0.01,
     '{"rozmiar": "#8", "grot": "cutting point", "zastosowanie": "spinning", "ilość": "5szt"}', false, 4.7, 167),

    -- Akcesoria
    ('Prologic C-Series Bank Stick', 'Solidna i regulowana podpórka wędkarska do łowienia karpiowego.', 49.00, 'a1000000-0000-0000-0000-000000000006', 85,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Prologic', 0.45,
     '{"materiał": "aluminium", "regulacja": "50-90cm", "zakończenie": "gwint 3/8"}', false, 4.5, 98),

    ('Delphin Podkasiek Siatkowy Karpiowy', 'Duży podbierak karpiowy z miękką siatką chroniącą ryby.', 129.00, 'a1000000-0000-0000-0000-000000000006', 42,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Delphin', 1.20,
     '{"rozmiar siatki": "55x55cm", "długość rękojeści": "180cm", "materiał siatki": "guma"}', false, 4.6, 73),

    ('Fox Halo Illuminated Bite Alarm', 'Elektroniczny sygnalizator brań z podświetleniem LED i regulowaną czułością.', 189.00, 'a1000000-0000-0000-0000-000000000006', 38,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Fox', 0.09,
     '{"typ": "elektroniczny", "LED": "tak", "zasilanie": "bateria 9V", "regulacja": "czułość, głośność, ton"}', true, 4.8, 156),

    ('Shimano Tribal TX-1 Worek Karpiowy', 'Worek do przetrzymywania ryb wykonany z materiałów przyjaznych rybom.', 89.00, 'a1000000-0000-0000-0000-000000000006', 55,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Shimano', 0.80,
     '{"rozmiar": "120x60cm", "materiał": "PVC-free", "zamknięcie": "suwak YKK"}', false, 4.4, 89),

    ('Mikado Siodełko Boilies Bezpieczne', 'Zestaw bezpiecznych siodełek do montaży karpiowych. 10 sztuk w opakowaniu.', 12.99, 'a1000000-0000-0000-0000-000000000006', 420,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Mikado', 0.05,
     '{"ilość": "10szt", "materiał": "PVA-free", "typ": "bezpieczne siodełko"}', false, 4.3, 234),

    ('Nash Black Box Zestaw Startowy', 'Kompletny zestaw do łowienia karpi dla początkujących wędkarzy karpiowych.', 599.00, 'a1000000-0000-0000-0000-000000000006', 12,
     ARRAY['https://images.unsplash.com/photo-1771924310799-930349452c76?w=600'], 'Nash', 3.50,
     '{"zawartość": "podpórki x2, głowice, sygnalizatory x3, receiver", "materiał": "aluminium CNC"}', true, 4.9, 67);
