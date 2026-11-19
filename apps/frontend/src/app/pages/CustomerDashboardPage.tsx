import { Shell } from '@layouts'
import CreditLimitCard from '@components/customer-dashbord/CreditLimitCard'
import CustomerWelcome from '@components/customer-dashbord/CustomerWelcome'
import CustomerAlerts from '@components/customer-dashbord/CustomerAlerts'
import DashboardStats from '@components/customer-dashbord/DashboardStats'
import DashboardQuickActions from '@components/customer-dashbord/DashboardQuickActions'
import CustomerAccountSummary from '@components/customer-dashbord/CustomerAccountSummary'
import { useCustomerDashboard } from '@components/customer-dashbord/hooks/useCustomerDashboard'

const CustomerDashboard = () => {
  const {
    currentUser,
    creditLimit,
    balance,
    remainingCredit,
    isOverCredit,
    hasCreditLimit,
    alerts,
    quickActions,
    stats,
  } = useCustomerDashboard()

  return (
    <Shell title="Dashboard" showBack={false}>
      <div className="space-y-6">
        <CreditLimitCard
          creditLimit={creditLimit}
          balance={balance}
          remainingCredit={remainingCredit}
          isOverCredit={isOverCredit}
          hasCreditLimit={hasCreditLimit}
        />

        <CustomerWelcome currentUser={currentUser} />

        <CustomerAlerts alerts={alerts} />

        <DashboardStats stats={stats} />
        <DashboardQuickActions actions={quickActions} />

        <CustomerAccountSummary currentUser={currentUser} />
      </div>
    </Shell>
  )
}

export default CustomerDashboard
