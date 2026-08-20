import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/lib/auth/auth-provider";
import { ToastProvider } from "@/app/components/Toast";
import PwaRegister from "@/app/components/PwaRegister";

export const metadata: Metadata = {
  title: "Splash Air — Service Platform v10",
  description: "Field Service Management Platform for Splash Air Conditioning",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#093a68",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider><ToastProvider><PwaRegister />{children}</ToastProvider></AuthProvider>
      </body>
    </html>
  );
}
