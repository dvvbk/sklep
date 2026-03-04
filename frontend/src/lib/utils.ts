import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(price);
}

export function formatDate(timestamp: { seconds: bigint } | undefined): string {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp.seconds) * 1000);
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getOrderStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    0: "Nieznany",
    1: "Oczekujące",
    2: "Potwierdzone",
    3: "Wysłane",
    4: "Dostarczone",
    5: "Anulowane",
  };
  return labels[status] ?? "Nieznany";
}

export function getOrderStatusColor(status: number): string {
  const colors: Record<number, string> = {
    1: "bg-yellow-100 text-yellow-800",
    2: "bg-blue-100 text-blue-800",
    3: "bg-purple-100 text-purple-800",
    4: "bg-green-100 text-green-800",
    5: "bg-red-100 text-red-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
