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
  const customerPassword = await bcrypt.hash('Customer2026!', saltRounds)

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

  // 4. INSERT USER: CUSTOMER
  await prisma.user.upsert({
    where: { email: 'customer@portal.com' },
    update: {},
    create: {
      username: 'customer',
      email: 'customer@portal.com',
      password: customerPassword,
      name: 'Customer Portal',
      roleId: roleMap['customer'],
      isActive: true,
      customerId: null,
    },
  })
  console.log('👤 User Created: customer@portal.com')

  // 5. INSERT DEMO CUSTOMERS (with login credentials)
  const customerPasswordHash = await bcrypt.hash('Customer2026!', saltRounds)

  const demoCustomers = [
    {
      cardCode: 'C001',
      cardName: 'Budi Santoso',
      groupName: 'RETAIL',
      phone1: '021-555-0101',
      cellular: '0812-3456-7890',
      address: 'Jl. Merdeka No. 1',
      city: 'Jakarta',
      paymentTerm: 'NET 30',
    },
    {
      cardCode: 'C002',
      cardName: 'Siti Rahma',
      groupName: 'WHOLESALE',
      phone1: '021-555-0202',
      cellular: '0813-4567-8901',
      address: 'Jl. Pasteur No. 45',
      city: 'Bandung',
      paymentTerm: 'NET 14',
    },
    {
      cardCode: 'C003',
      cardName: 'Dedi Kurniawan',
      groupName: 'RETAIL',
      phone1: '021-555-0303',
      cellular: '0814-5678-9012',
      address: 'Jl. Dago No. 78',
      city: 'Surabaya',
      paymentTerm: 'NET 30',
    },
  ]

  for (const dc of demoCustomers) {
    await prisma.customers.upsert({
      where: { CardCode: dc.cardCode },
      update: {
        CardName: dc.cardName,
        GroupName: dc.groupName,
        Phone1: dc.phone1,
        Cellular: dc.cellular,
        Address: dc.address,
        City: dc.city,
        PaymentTerm: dc.paymentTerm,
        NonActive: 'N',
        password: customerPasswordHash,
      },
      create: {
        CardCode: dc.cardCode,
        CardName: dc.cardName,
        GroupName: dc.groupName,
        Phone1: dc.phone1,
        Cellular: dc.cellular,
        Address: dc.address,
        City: dc.city,
        NonActive: 'N',
        PaymentTerm: dc.paymentTerm,
        password: customerPasswordHash,
      },
    })
    console.log(`👥 Customer Created: ${dc.cardCode} - ${dc.cardName}`)
  }

  // INSERT CATEGORIES (ON CONFLICT DO NOTHING)
  const categories = [
    { code: 'DAIRY', name: 'Dairy', icon: '', sortOrder: 1 },
    { code: 'BEVERAGE', name: 'Beverage', icon: '', sortOrder: 2 },
    { code: 'CHEMICAL', name: 'Chemical', icon: '', sortOrder: 3 },
    { code: 'SAUCE', name: 'Sauce', icon: '', sortOrder: 4 },
    { code: 'TISSUE', name: 'Tissue', icon: '', sortOrder: 5 },
    { code: 'OTHER', name: 'Other', icon: '', sortOrder: 6 },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    })
    console.log(`📂 Category checked/created: ${cat.code}`)
  }

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
