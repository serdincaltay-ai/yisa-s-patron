import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Beyin Takımı | YİSA-S Patron",
  description: "AI robotlarla sohbet — CELF, Veri, Güvenlik, YİSA-S",
}

export default function BeyinTakimiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
