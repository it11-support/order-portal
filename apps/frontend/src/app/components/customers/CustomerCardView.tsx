import { Loader } from '../common'
import { Switch } from '../ui'
import CustomerCredentials from './CustomerCredentials'
import { useCustomerList } from './hooks/useCustomerList'

type CustomerCardViewProps = {
  customerList: ReturnType<typeof useCustomerList>
}

const CustomerCardView = (props: CustomerCardViewProps) => {
  const { customerList } = props
  const {
    isAdmin,
    busyId,
    customers,
    isLoading,
    isFetching,
    isEmpty,
    setLoginEnabled,
    handleReset,
  } = customerList

  return (
    <div className="md:hidden space-y-3">
      {isLoading && customers.length === 0 ? (
        <Loader label="Memuat..." className="py-12" />
      ) : (
        <>
          {customers.map((customer) => (
            <div
              key={customer.id}
              className={`bg-white rounded-xl border border-border p-4 space-y-2 ${
                customer.NonActive === 'Y' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{customer.CardName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{customer.CardCode}</p>
                </div>
                {customer.NonActive === 'Y' ? (
                  <span className="inline-flex text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100 shrink-0">
                    Non-Aktif
                  </span>
                ) : (
                  <span className="inline-flex text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100 shrink-0">
                    Aktif
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {customer.GroupName && (
                  <span className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-md font-medium">
                    {customer.GroupName}
                  </span>
                )}
                {customer.Subgroup?.IndName && (
                  <span className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-md font-medium">
                    {customer.Subgroup.IndName}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{customer.City || '-'}</span>
              </div>

              {customer.Address && (
                <p className="text-xs text-muted-foreground line-clamp-1">{customer.Address}</p>
              )}

              {isAdmin && (
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Switch
                      checked={Boolean(customer.hasLogin)}
                      disabled={
                        busyId !== null ||
                        customer.id == null ||
                        (!customer.hasLogin && (customer.NonActive === 'Y' || !customer.CardCode))
                      }
                      onCheckedChange={(checked) => setLoginEnabled(customer, checked)}
                    />
                    {busyId === String(customer.id) ? 'Memproses...' : 'Login aktif'}
                  </div>
                  {customer.hasLogin && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReset(customer)}
                        disabled={busyId !== null}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                      >
                        Reset password
                      </button>
                    </div>
                  )}
                  {customer.hasLogin && (
                    <div className="mt-1 text-xs text-left w-full">
                      <CustomerCredentials
                        key={`${customer.CardCode}:${customer.loginPassword ?? ''}`}
                        username={customer.loginUsername ?? customer.CardCode ?? ''}
                        password={customer.loginPassword ?? null}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isEmpty && !isFetching && (
            <p className="text-center py-12 text-sm text-muted-foreground">
              Tidak ada data yang ditemukan.
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default CustomerCardView
