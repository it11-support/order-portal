import { InfiniteScrollWatcher } from '@/app/components/common/InfiniteScrollWatcher'
import { useCustomerList } from './hooks/useCustomerList'
import CustomerTable from './CustomerTable'
import CustomerCardView from './CustomerCardView'
import CustomerListHeader from './CustomerListHeader'

const CustomerList: React.FC = () => {
  const { loginError, isLoading, isValidating, isEmpty, isReachingEnd, observerTargetRef } =
    useCustomerList()

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {loginError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {loginError}
        </p>
      )}
      {/* HEADER & SEARCH BAR */}
      <CustomerListHeader />

      {/* CARD VIEW — mobile only */}
      <CustomerCardView />

      {/* TABLE VIEW — desktop only */}
      <CustomerTable />

      <div ref={observerTargetRef} className="w-full min-h-1">
        <InfiniteScrollWatcher
          isLoading={isLoading}
          isValidating={isValidating}
          isReachingEnd={isReachingEnd}
          isEmpty={isEmpty}
        />
      </div>
    </div>
  )
}

export default CustomerList
