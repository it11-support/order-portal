import { prisma } from '@/utils'

export class CustomerLoginError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'CustomerLoginError'
  }
}

export const getEligibleCustomer = async (id: bigint) => {
  const customer = await prisma.customers.findUnique({
    where: { id },
    select: {
      id: true,
      CardCode: true,
      CardName: true,
      CntctPrsn: true,
      NonActive: true,
    },
  })

  if (!customer) {
    throw new CustomerLoginError(
      404,
      'Pelanggan tidak ditemukan.',
    )
  }

  if (!customer.CardCode || customer.NonActive === 'Y') {
    throw new CustomerLoginError(
      400,
      'Pelanggan tidak aktif atau tidak memiliki CardCode.',
    )
  }

  return {
    ...customer,
    CardCode: customer.CardCode,
  }
}

export const getCustomerRole = async () => {
  const role = await prisma.role.findUnique({
    where: { name: 'customer' },
  })

  if (!role) {
    throw new CustomerLoginError(
      500,
      'Role customer tidak ditemukan.',
    )
  }

  return role
}