import {
  decryptCustomerPassword,
  encryptCustomerPassword,
  generateCustomerPassword,
} from '@/utils/customer-password'

type ExistingUser = {
  encryptedPassword: string | null
} | null

export const prepareCustomerCredentials = (
  existingUser: ExistingUser,
) => {
  const existingPassword = existingUser?.encryptedPassword
    ? decryptCustomerPassword(existingUser.encryptedPassword)
    : null

  if (existingPassword) {
    return {
      password: existingPassword,
      encryptedPassword: existingUser!.encryptedPassword!,
      needsPasswordUpdate: false,
    }
  }

  const password = generateCustomerPassword()

  return {
    password,
    encryptedPassword: encryptCustomerPassword(password),
    needsPasswordUpdate: true,
  }
}