import React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "YİSA-S Patron Paneli | Robot Orkestrasyon Sistemi",
  description: "YİSA-S Akıllı Yönetim Paneli - Beyin Takımı, Canlı Mimari, AI Orkestrasyon",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="font-sans antialiased bg-[#060a13]">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
