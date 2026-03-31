import PatronHavuzu from "./PatronHavuzu"

export const metadata = {
  title: "10'a Çıkart | YİSA-S Patron",
  description: "Patron Komutları ve Demo Talepleri — Onay Kuyruğu",
}

export default function OnayKuyruguPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          10&apos;a Çıkart — Patron Havuzu
        </h2>
        <p className="text-sm text-[#8892a8] mt-1">
          Patron komutlarını ve demo taleplerini inceleyin, onaylayın veya reddedin.
        </p>
      </div>
      <PatronHavuzu />
    </div>
  )
}
