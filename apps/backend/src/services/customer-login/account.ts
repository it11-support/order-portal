
import { prisma } from '@/utils'
import { CustomerLoginError } from './validation'
import { getEligibleCustomer } from './validation'
import { prepareCustomerCredentials } from './credentials'
import { hashCustomerPassword } from '@/utils/customer-password'

type EligibleCustomer = Awaited<ReturnType<typeof getEligibleCustomer>>
type SaveCustomerLoginParams = {
  customer: Awaited<ReturnType<typeof getEligibleCustomer>>
  roleId: number
  existingUser: Awaited<
    ReturnType<typeof getCustomerAccount>
  >['existingUser']
  credentials: ReturnType<typeof prepareCustomerCredentials>
}

export const getCustomerAccount = async (
  customer: EligibleCustomer,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { username: customer.CardCode },
    select: {
      id: true,
      customerId: true,
      isActive: true,
      encryptedPassword: true,
    },
  })

  // Username digunakan oleh customer lain
  if (
    existingUser &&
    String(existingUser.customerId) !== String(customer.id)
  ) {
    throw new CustomerLoginError(
      409,
      'CardCode sudah digunakan sebagai username akun lain.',
    )
  }

  // Login sudah aktif
  if (existingUser?.isActive) {
    throw new CustomerLoginError(
      409,
      'Login pelanggan sudah diaktifkan.',
    )
  }

  // Customer sudah terhubung ke akun lain
  const existingLinkedUser = await prisma.user.findFirst({
    where: { customerId: customer.id },
    select: {
      id: true,
      encryptedPassword: true,
    },
  })

  if (
    existingLinkedUser &&
    (!existingUser || existingLinkedUser.id !== existingUser.id)
  ) {
    throw new CustomerLoginError(
      409,
      'Pelanggan ini sudah memiliki akun user.',
    )
  }

  return {
    existingUser,
  }
}

export const saveCustomerLogin = async ({
  customer,
  roleId,
  existingUser,
  credentials,
}: SaveCustomerLoginParams): Promise<void> => {
  const userData = {
    username: customer.CardCode,
    name:
      customer.CardName ||
      customer.CntctPrsn ||
      customer.CardCode,
    roleId,
    customerId: customer.id,
    isActive: true,
  }

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...userData,
        ...(credentials.needsPasswordUpdate
          ? {
            password: await hashCustomerPassword(
              credentials.password,
            ),
            encryptedPassword: credentials.encryptedPassword,
          }
          : {}),
      },
    })

    return
  }

  await prisma.user.create({
    data: {
      ...userData,
      password: await hashCustomerPassword(
        credentials.password,
      ),
      encryptedPassword: credentials.encryptedPassword,
    },
  })
}