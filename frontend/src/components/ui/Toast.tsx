import { AnimatePresence, motion } from "motion/react"
import { Check } from "lucide-react"

export default function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 24, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 24, x: "-50%" }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="fixed bottom-6 left-1/2 z-[60] flex items-center gap-2.5 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-cream shadow-xl shadow-forest/30"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-harvest text-forest">
            <Check className="h-3.5 w-3.5" />
          </span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
