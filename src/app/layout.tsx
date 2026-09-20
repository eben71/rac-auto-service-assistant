import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "RAC Auto Services | Demo booking journey",
  description: "Synthetic demonstration of an Auto Services booking journey.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
