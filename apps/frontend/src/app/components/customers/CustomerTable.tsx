import { Switch } from '../ui'
import CustomerCredentials from './CustomerCredentials'
import type { useCustomerList } from './hooks/useCustomerList'

type CustomerTableProps = {
  customerList: ReturnType<typeof useCustomerList>
}

const CustomerTable = ({ customerList }: CustomerTableProps) => {
  const { isAdmin, busyId, customers, isFetching, isEmpty, setLoginEnabled, handleReset } =
    customerList
  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="p-4">Nama Pelanggan</th>
              <th className="p-4 w-44">Grup</th>
              <th className="p-4 w-44">SubGroub</th>
              <th className="p-4">Area</th>
              <th className="p-4 w-28 text-center">Status</th>
              {isAdmin && <th className="p-4">Login pelanggan</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {customers.length > 0 &&
              customers.map((customer) => (
                <tr
                  key={customer.id}
                  className={`hover:bg-gray-50/70 transition-colors ${
                    customer.NonActive === 'Y' ? 'bg-gray-50/40 text-gray-400' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="font-medium">{customer.CardName}</div>
                    <div className="text-xs text-gray-500 font-mono">{customer.CardCode}</div>
                    {customer.Address && (
                      <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        {customer.Address}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                      {customer.GroupName || 'Umum'}
                    </span>
                  </td>
                  <td className="p-4">
                    {customer.Subgroup?.IndName && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                        {customer.Subgroup.IndName || null}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500">{customer.City || '-'}</td>
                  <td className="p-4 text-center">
                    {customer.NonActive === 'Y' ? (
                      <span className="inline-flex text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100">
                        Non-Aktif
                      </span>
                    ) : (
                      <span className="inline-flex text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100">
                        Aktif
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <Switch
                          checked={Boolean(customer.hasLogin)}
                          aria-label={`Aktifkan login ${customer.CardCode ?? customer.CardName}`}
                          disabled={
                            busyId !== null ||
                            customer.id == null ||
                            (!customer.hasLogin &&
                              (customer.NonActive === 'Y' || !customer.CardCode))
                          }
                          onCheckedChange={(checked) => setLoginEnabled(customer, checked)}
                        />
                        {busyId === String(customer.id) ? 'Memproses...' : 'Login aktif'}
                      </div>
                      {customer.hasLogin && (
                        <button
                          type="button"
                          onClick={() => handleReset(customer)}
                          disabled={busyId !== null}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Reset password
                        </button>
                      )}
                      {customer.hasLogin && (
                        <div className="mt-2 text-xs">
                          <CustomerCredentials
                            key={`${customer.CardCode}:${customer.loginPassword ?? ''}`}
                            username={customer.loginUsername ?? customer.CardCode ?? ''}
                            password={customer.loginPassword ?? null}
                          />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}

            {isEmpty && !isFetching && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center text-sm text-gray-400">
                  Tidak ada data yang ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CustomerTable
