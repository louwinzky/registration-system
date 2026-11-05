import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Registration System",
  description: "Registrar and Cashier management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
