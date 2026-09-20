import { motion } from "motion/react"
import type { LucideIcon } from "lucide-react"

export default function Stat({
  icon: Icon,
  label,
  value,
  note,
  trend,
  delay = 0,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  note?: string
  trend?: { value: number; label?: string }
  delay?: number
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl border border-charcoal/10 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal/60">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest/8">
          <Icon className="h-4 w-4 text-forest" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              trend.value >= 0
                ? "bg-forest/10 text-forest"
                : "bg-clay/10 text-clay"
            }`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
        )}
        {note && <p className="text-xs text-charcoal/50">{note}</p>}
      </div>
    </motion.article>
  )
}
