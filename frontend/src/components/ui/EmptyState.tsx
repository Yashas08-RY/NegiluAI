import { motion } from "motion/react"
import type { ReactNode } from "react"

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sand text-charcoal/40">
        {icon}
      </div>
      <h3 className="mt-5 font-serif text-xl text-charcoal">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-charcoal/60">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}
