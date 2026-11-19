import { CustomerAlertsProps } from './types'

const CustomerAlerts = ({ alerts }: CustomerAlertsProps) => {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.key}
          role="alert"
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            alert.tone === 'danger' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              alert.tone === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            <alert.icon size={18} />
          </div>

          <div className="min-w-0">
            <p
              className={`text-sm font-bold ${
                alert.tone === 'danger' ? 'text-red-800' : 'text-amber-800'
              }`}
            >
              {alert.title}
            </p>

            <p
              className={`text-xs mt-0.5 ${
                alert.tone === 'danger' ? 'text-red-700' : 'text-amber-700'
              }`}
            >
              {alert.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CustomerAlerts
