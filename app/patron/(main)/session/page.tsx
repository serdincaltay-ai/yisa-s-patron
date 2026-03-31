import SessionList from "./SessionList"

export const metadata = {
  title: "Oturumlar | YİSA-S Patron",
  description: "Aktif ve geçmiş oturumlar — sporcu ders takibi",
}

export default function SessionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          Oturumlar (Session)
        </h2>
        <p className="text-sm text-[#8892a8] mt-1">
          Aktif ve geçmiş sporcu ders oturumlarını görüntüleyin.
        </p>
      </div>
      <SessionList />
    </div>
  )
}
