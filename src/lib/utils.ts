import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

export function shortAddress(address?: string, head = 6, tail = 4) {
  if (!address) return "";
  return `${address.slice(0, head)}···${address.slice(-tail)}`;
}
