import { Check } from 'lucide-react'
type Props = {
  step: 'customer' | 'product' | 'confirm'
}

const Stepper = (props: Props) => {
  const { step } = props
  const STEPS = ['Pilih customer', 'Pilih produk', 'Konfirmasi & kirim'] as const

  const stepOrder = ['customer', 'product', 'confirm'] as const
  const stepIndex = stepOrder.indexOf(step)

  return (
    <div className="flex w-full items-center gap-2 py-2">
      {STEPS.map((label, i) => {
        const active = stepIndex === i
        const completed = stepIndex > i

        return (
          <div
            key={label}
            className={`flex min-w-0 items-center transition-all duration-200 ${
              active ? 'flex-1' : 'shrink-0'
            }`}
          >
            <div
              className={`flex h-11 min-w-0 items-center gap-2 rounded-xl transition-all duration-200 ${
                active ? 'w-full  border-sky-200/70 bg-white px-2.5' : 'justify-center px-1'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? 'bg-sky-600 text-white'
                    : completed
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {completed ? <Check size={16} strokeWidth={2.5} /> : i + 1}
              </span>

              {active && (
                <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-slate-800">
                  {label}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Stepper
