import { Skeleton } from "@/components/ui/skeleton"

export default function OnayKuyruguLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 bg-[#0f3460]/30" />
        <Skeleton className="h-4 w-72 mt-2 bg-[#0f3460]/20" />
      </div>
      <div className="rounded-xl border border-[#0f3460]/40 overflow-hidden">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-[#0f3460]/30" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[75%] bg-[#0f3460]/30" />
                <Skeleton className="h-3 w-1/2 bg-[#0f3460]/20" />
                <Skeleton className="h-3 w-[33%] bg-[#0f3460]/20" />
              </div>
              <Skeleton className="h-10 w-24 bg-[#0f3460]/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
