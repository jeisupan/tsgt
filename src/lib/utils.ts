import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskEmail(email: string | null): string {
  if (!email) return "-";
  
  const [localPart, domain] = email.split("@");
  if (!domain) return email;
  
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  
  const visibleChars = Math.max(2, Math.floor(localPart.length * 0.3));
  const masked = localPart.slice(0, visibleChars) + "***";
  return `${masked}@${domain}`;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "-";
  
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  
  const visibleStart = Math.min(3, Math.floor(digits.length * 0.25));
  const visibleEnd = Math.min(3, Math.floor(digits.length * 0.25));
  const start = phone.slice(0, visibleStart);
  const end = phone.slice(-visibleEnd);
  
  return `${start}***${end}`;
}

export function maskAddress(address: string | null): string {
  if (!address) return "-";
  
  const halfLength = Math.ceil(address.length / 2);
  const visible = address.slice(halfLength);
  
  return `***${visible}`;
}
