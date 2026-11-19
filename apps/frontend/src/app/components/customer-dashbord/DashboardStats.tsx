import { DashboardStatsProps } from './types'

const DashboardStats = ({ stats }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl border border-border p-3 text-center">
          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-1">
            <stat.icon size={16} className="text-muted-foreground" />
          </div>

          <p className="text-xs text-muted-foreground font-semibold">{stat.label}</p>

          <p className="text-lg font-bold text-foreground mt-0.5">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

export default DashboardStats
