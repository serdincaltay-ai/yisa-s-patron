import { Skeleton } from "@/components/ui/skeleton"

export default function DirektorluklerLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 bg-[#0f3460]/30" />
        <Skeleton className="h-4 w-72 mt-2 bg-[#0f3460]/20" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-[#0f3460]/20" />
        ))}
      </div>
    </div>
  )
}
