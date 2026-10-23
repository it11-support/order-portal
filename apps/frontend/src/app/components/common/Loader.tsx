import { Loader as LoaderIcon } from 'lucide-react'

type LoaderProps = {
  label?: string
  className?: string
}

export const Loader = ({ label = 'Memuat...', className }: LoaderProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className ?? ''}`}>
      <LoaderIcon className="w-6 h-6 text-muted-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export default Loader
