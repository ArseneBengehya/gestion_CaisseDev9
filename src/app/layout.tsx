import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "@mantine/core/styles.css"; // Importation des styles Mantine
import "./globals.css"; // Importation des styles globaux
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { NotificationProvider } from "../context/NotificationContext";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caisse Dev9",
  description: "Application de gestion de caisse et tontine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${interSans.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <head>
        {/* Prévient le clignotement lors du chargement en mode sombre */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body className="min-h-full flex flex-col">
        <MantineProvider defaultColorScheme="auto">
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </MantineProvider>
      </body>
    </html>
  );
}