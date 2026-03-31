import TaleplerList from "./TaleplerList"

export const metadata = {
  title: "Talepler | YİSA-S Patron",
  description: "Franchise ve veli talepleri — onay ve takip",
}

export default function TaleplerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          Talepler
        </h2>
        <p className="text-sm text-[#8892a8] mt-1">
          Franchise, veli ve personel taleplerini görüntüleyin ve yönetin.
        </p>
      </div>
      <TaleplerList />
    </div>
  )
}
