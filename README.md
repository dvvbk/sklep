# 🎣 Złota Rybka — Sklep Wędkarski

Nowoczesna aplikacja e-commerce dla branży wędkarskiej zbudowana na architekturze mikroserwisowej z komunikacją **gRPC** / **ConnectRPC**.

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Network                            │
│                                                                 │
│  ┌──────────────┐   gRPC/ConnectRPC    ┌──────────────────┐    │
│  │   Frontend   │ ──────────────────▶  │     Backend      │    │
│  │  Next.js 14  │                      │    Go + gRPC     │    │
│  │  (Bun 1.x)   │                      │  ConnectRPC srv  │    │
│  └──────────────┘                      └────────┬─────────┘    │
│        :3000                                    │              │
│                                         ┌───────▼──────────┐   │
│  ┌──────────────┐                       │   PostgreSQL 16   │   │
│  │    Envoy     │ ◀── grpc-web ──       │   (database)      │   │
│  │  gRPC-Web    │     proxy (opt.)      └──────────────────┘   │
│  │   proxy      │                              :5432            │
│  └──────────────┘                                              │
│        :9090                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Stos technologiczny

| Warstwa       | Technologia                                     |
|---------------|-------------------------------------------------|
| Backend       | Go 1.22, ConnectRPC, gRPC                      |
| Frontend      | Next.js 14 (App Router), TypeScript, Bun 1.x   |
| Styling       | Tailwind CSS v3                                |
| State         | Zustand, TanStack Query v5                     |
| Database      | PostgreSQL 16                                  |
| Proto         | Protocol Buffers v3, buf                       |
| Proxy         | Envoy (gRPC-Web fallback)                      |
| Containers    | Docker, Docker Compose                         |

## Szybki start

### Wymagania

- [Docker](https://docs.docker.com/get-docker/) >= 24
- [Docker Compose](https://docs.docker.com/compose/) >= 2.20

### Uruchomienie

```bash
# Klonowanie i uruchomienie
git clone <repo-url>
cd sklep

# Uruchom wszystkie usługi
make up

# lub bezpośrednio:
docker compose up --build -d
```

Aplikacja będzie dostępna pod adresami:

| Usługa    | URL                     |
|-----------|-------------------------|
| Frontend  | http://localhost:3000   |
| Backend   | http://localhost:8080   |
| Envoy     | http://localhost:9090   |
| Database  | localhost:5432          |

## Struktura projektu

```
sklep/
├── backend/                   # Go gRPC server
│   ├── proto/                 # Definicje Protocol Buffers
│   │   └── golden_fish/v1/
│   │       ├── products.proto
│   │       ├── users.proto
│   │       ├── cart.proto
│   │       ├── orders.proto
│   │       └── admin.proto
│   ├── cmd/server/main.go     # Entry point
│   ├── internal/
│   │   ├── db/                # Połączenie z bazą danych
│   │   ├── handlers/          # Implementacje serwisów gRPC
│   │   └── middleware/        # JWT auth
│   ├── buf.yaml               # Konfiguracja buf
│   ├── buf.gen.yaml           # Generowanie kodu Go
│   └── Dockerfile
│
├── frontend/                  # Next.js + Bun
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   │   ├── page.tsx       # Strona główna
│   │   │   ├── products/      # Lista i szczegóły produktów
│   │   │   ├── cart/          # Koszyk
│   │   │   ├── checkout/      # Finalizacja zamówienia
│   │   │   ├── orders/        # Historia zamówień
│   │   │   ├── auth/          # Logowanie i rejestracja
│   │   │   └── admin/         # Panel administratora
│   │   ├── components/        # Komponenty React
│   │   ├── lib/               # gRPC klienty, store, utils
│   │   └── gen/               # Wygenerowany kod protobuf
│   ├── buf.gen.yaml           # Generowanie kodu TS
│   └── Dockerfile
│
├── db/
│   └── init.sql               # Schemat bazy + dane testowe
├── envoy/
│   └── envoy.yaml             # Konfiguracja Envoy proxy
├── docker-compose.yml
└── Makefile
```

## API (gRPC Services)

### ProductService
| RPC                    | Opis                              |
|------------------------|-----------------------------------|
| `GetProduct`           | Pobierz produkt po ID             |
| `ListProducts`         | Lista produktów z filtrowaniem    |
| `SearchProducts`       | Wyszukiwanie pełnotekstowe        |
| `ListCategories`       | Lista kategorii                   |
| `GetProductsByCategory`| Produkty w kategorii              |
| `GetFeaturedProducts`  | Polecane produkty                 |

### UserService
| RPC             | Opis                    |
|-----------------|-------------------------|
| `Register`      | Rejestracja użytkownika |
| `Login`         | Logowanie (JWT)         |
| `GetProfile`    | Pobierz profil          |
| `UpdateProfile` | Aktualizuj profil       |

### CartService
| RPC          | Opis                     |
|--------------|--------------------------|
| `GetCart`    | Pobierz zawartość koszyka|
| `AddItem`    | Dodaj produkt            |
| `RemoveItem` | Usuń produkt             |
| `UpdateItem` | Zmień ilość              |
| `ClearCart`  | Wyczyść koszyk           |

### OrderService
| RPC                 | Opis                    |
|---------------------|-------------------------|
| `CreateOrder`       | Złóż zamówienie         |
| `GetOrder`          | Pobierz zamówienie      |
| `ListOrders`        | Historia zamówień       |
| `UpdateOrderStatus` | Aktualizuj status       |

### AdminService *(wymaga tokenu admina)*
| RPC                | Opis                              |
|--------------------|-----------------------------------|
| `CreateProduct`    | Dodaj nowy produkt                |
| `UpdateProduct`    | Edytuj produkt                    |
| `DeleteProduct`    | Usuń produkt                      |
| `CreateCategory`   | Dodaj kategorię                   |
| `UpdateCategory`   | Edytuj kategorię                  |
| `DeleteCategory`   | Usuń kategorię                    |
| `ListAllOrders`    | Wszystkie zamówienia (paginacja)  |
| `ListUsers`        | Lista użytkowników (paginacja)    |

## Lokalne środowisko developerskie

### Wymagania dodatkowe

- [Go](https://go.dev/dl/) >= 1.22
- [Bun](https://bun.sh/) >= 1.1
- [buf](https://buf.build/docs/installation) >= 1.34

### Konfiguracja

```bash
# Zainstaluj zależności i wygeneruj kod
make setup

# Uruchom bazę danych
docker compose up -d postgres

# Backend (lokalnie)
make dev-backend

# Frontend (lokalnie, w osobnym terminalu)
make dev-frontend
```

### Generowanie kodu

```bash
# Wygeneruj kod Go i TypeScript z plików .proto
make proto

# Lub osobno:
make proto-go        # tylko Go
make proto-frontend  # tylko TypeScript
```

## Zmienne środowiskowe

### Backend

| Zmienna       | Domyślna        | Opis               |
|---------------|-----------------|--------------------|
| `DB_HOST`     | `localhost`     | Host PostgreSQL    |
| `DB_PORT`     | `5432`          | Port PostgreSQL    |
| `DB_USER`     | `postgres`      | Użytkownik DB      |
| `DB_PASSWORD` | `postgres`      | Hasło DB           |
| `DB_NAME`     | `golden_fish`   | Nazwa bazy danych  |
| `PORT`        | `8080`          | Port serwera gRPC  |
| `JWT_SECRET`  | (wbudowany)     | Sekret JWT (zmień!)|

### Frontend

| Zmienna                   | Domyślna               | Opis              |
|---------------------------|------------------------|-------------------|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8080`| URL backendu gRPC |

## Dane testowe

Baza danych jest automatycznie zasilana danymi testowymi:
- **6 kategorii**: Wędki, Kołowrotki, Żyłki i Plecionki, Przynęty, Haczyki, Akcesoria
- **24 produkty** od renomowanych marek (Shimano, Daiwa, Fox, Rapala...)
- **Konto admina**: `admin@zlotarybka.pl` / `admin123`

## Panel administratora

Po zalogowaniu na konto admina, w menu użytkownika pojawi się link **Panel admina** (`/admin`).

| Sekcja      | URL                   | Opis                                      |
|-------------|-----------------------|-------------------------------------------|
| Zamówienia  | `/admin/orders`       | Wszystkie zamówienia + zmiana statusu     |
| Produkty    | `/admin/products`     | Pełny CRUD produktów                      |
| Kategorie   | `/admin/categories`   | Pełny CRUD kategorii                      |

## ConnectRPC vs. gRPC-Web

Aplikacja używa protokołu **ConnectRPC**, który:
- Działa **bezpośrednio w przeglądarce** bez potrzeby Envoy proxy
- Jest kompatybilny wstecznie z gRPC i gRPC-Web
- Obsługuje HTTP/1.1 i HTTP/2
- Generuje mniejszy narzut niż klasyczne gRPC-Web

Envoy jest dołączony jako opcjonalny komponent dla klientów używających standardowego gRPC-Web.

## Licencja

MIT
