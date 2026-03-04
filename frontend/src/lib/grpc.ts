import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { ProductService } from "@/gen/golden_fish/v1/products_connect";
import { UserService } from "@/gen/golden_fish/v1/users_connect";
import { CartService } from "@/gen/golden_fish/v1/cart_connect";
import { OrderService } from "@/gen/golden_fish/v1/orders_connect";

const backendURL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

const transport = createConnectTransport({
  baseUrl: backendURL,
});

export const productClient = createClient(ProductService, transport);
export const userClient = createClient(UserService, transport);
export const cartClient = createClient(CartService, transport);
export const orderClient = createClient(OrderService, transport);
