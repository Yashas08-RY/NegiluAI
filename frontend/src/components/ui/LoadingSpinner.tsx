import { Loader2 } from "lucide-react"

export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="grid min-h-72 place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-forest" />
        <p className="text-sm text-charcoal/60">{message}</p>
      </div>
    </div>
  )
}
