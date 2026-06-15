
import { prisma } from '../src/utils/prisma'
import * as bcrypt from 'bcrypt'



async function main() {
  console.log('🔄 Memulai seeding master data portal...')

  // 1. INSERT ROLES (ON CONFLICT DO NOTHING)
  // Menjamin role 'admin', 'sales_admin', dan 'customer' terbuat otomatis
  const roles = ['admin', 'sales_admin', 'customer']
  const roleMap: Record<string, number> = {}

  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {}, // Jika sudah ada, jangan ubah apa-pun (Do Nothing)
      create: { name: roleName },
    })
    roleMap[roleName] = role.id
    console.log(`✅ Role checked/created: ${roleName}`)
  }

  // 2. ENKRIPSI PASSWORD UNTUK USER ADMIN
  // Ubah string password di bawah ini sesuai standar keamanan perusahaan Anda
  const saltRounds = 10
  const adminPassword = await bcrypt.hash('AdminPortal2026!', saltRounds)
  const salesAdminPassword = await bcrypt.hash('SalesAdmin2026!', saltRounds)

  // 3. INSERT USER: SUPER ADMIN
  // Kolom customerId diisi null karena admin tidak punya data di tabel Customers
  await prisma.user.upsert({
    where: { email: 'admin@portal.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@portal.com',
      password: adminPassword,
      name: 'Super Admin Portal',
      roleId: roleMap['admin'],
      isActive: true,
      customerId: null,
    },
  })
  console.log('👤 User Created: admin@portal.com')

  // 4. INSERT USER: SALES ADMIN
  // Kolom customerId diisi null karena sales_admin tidak terikat ke master customer SAP
  await prisma.user.upsert({
    where: { email: 'sales.admin@portal.com' },
    update: {},
    create: {
      username: 'sales.admin',
      email: 'sales.admin@portal.com',
      password: salesAdminPassword,
      name: 'Sales Administrator',
      roleId: roleMap['sales_admin'],
      isActive: true,
      customerId: null,
    },
  })
  console.log('👤 User Created: sales.admin@portal.com')

  console.log('🏁 Proses seeding selesai dengan sukses!')
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
