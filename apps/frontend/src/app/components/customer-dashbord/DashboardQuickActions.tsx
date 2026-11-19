import { DashboardQuickActionsProps } from './types'

const DashboardQuickActions = ({ actions }: DashboardQuickActionsProps) => {
  return (
    <div>
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Aksi Cepat
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="bg-white rounded-xl border border-border p-4 text-left hover:border-accent/50 active:scale-[0.99] transition-all"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${action.color}`}
            >
              <action.icon size={20} />
            </div>

            <p className="text-sm font-bold text-foreground">{action.label}</p>

            <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default DashboardQuickActions
