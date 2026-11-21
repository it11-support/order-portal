import { LucideIcon } from 'lucide-react'
import { useCustomerDashboard } from './hooks/useCustomerDashboard'
import { useAuth } from '@/app/contexts'

export type Alert = {
  key: string
  tone: 'danger' | 'warning'
  icon: LucideIcon
  title: string
  body: string
}

export type QuickAction = {
  label: string
  description: string
  icon: LucideIcon
  onClick: () => void
  color: string
}

export type DashboardStat = {
  label: string
  value: string
  icon: LucideIcon
}

export type CreditLimitCardProps = {
  creditLimit: number
  balance: number
  remainingCredit: number
  isOverCredit: boolean
  hasCreditLimit: boolean
}

export type CustomerAlertsProps = {
  alerts: ReturnType<typeof useCustomerDashboard>['alerts']
}

export type DashboardStatsProps = {
  stats: ReturnType<typeof useCustomerDashboard>['stats']
}

export type DashboardQuickActionsProps = {
  actions: ReturnType<typeof useCustomerDashboard>['quickActions']
}

export type CurrentUser = ReturnType<typeof useAuth>['user']

export type CustomerAccountSummaryProps = {
  currentUser: CurrentUser
}
