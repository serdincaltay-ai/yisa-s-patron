import { Skeleton } from "@/components/ui/skeleton"

export default function BeyinTakimiLoading() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-40 bg-[#0f3460]/30" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-11 w-20 bg-[#0f3460]/20" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 mb-2 bg-[#0f3460]/20" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-[#0f3460]/20" />
          ))}
        </div>
        <div className="md:col-span-2 rounded-xl border border-[#0f3460]/40 p-4 space-y-4">
          <Skeleton className="h-16 w-3/4 bg-[#0f3460]/20" />
          <Skeleton className="h-12 w-1/2 bg-[#0f3460]/20" />
          <Skeleton className="h-14 w-full bg-[#0f3460]/20" />
        </div>
      </div>
    </div>
  )
}
