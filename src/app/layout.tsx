import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/lib/auth/auth-provider";
import { ToastProvider } from "@/app/components/Toast";

export const metadata: Metadata = {
  title: "Splash Air — Service Platform v10",
  description: "Field Service Management Platform for Splash Air Conditioning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider>
      </body>
    </html>
  );
}
