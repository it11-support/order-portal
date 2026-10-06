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

  // 2. ENKRIPSI PASSWORD
  // Ubah string password di bawah ini sesuai standar keamanan perusahaan Anda
  const saltRounds = 10
  const adminPassword = await bcrypt.hash('AdminPortal2026!', saltRounds)
  const customerPassword = await bcrypt.hash('Customer2026!', saltRounds)
  const salesPassword = await bcrypt.hash('SalesPortal2026!', saltRounds)

  // 3. INSERT USER: SUPER ADMIN
  // Kolom customerId diisi null karena admin tidak punya data di tabel Customers
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: 'admin@portal.com',
      password: adminPassword,
      name: 'Super Admin Portal',
      roleId: roleMap['admin'],
      isActive: true,
      customerId: null,
    },
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

  // 4. INSERT USER SALES ADMIN UNTUK SETIAP SALESPERSON YANG AKTIF
  // Hanya sales person active='Y' dan locked='N' yang mendapat akun. Locked
  // menandai baris sistem (mis. "-No Sales Employee-") yang bukan orang, dan
  // active='N' berarti sudah tidak dipakai, jadi keduanya tidak boleh bisa login.
  // Username mengikuti kode sales supaya jelas territory mana yang dipegang.
  const salesPersons = await prisma.salesPerson.findMany({
    where: { active: 'Y', locked: 'N' },
    orderBy: { slpCode: 'asc' },
    select: { slpCode: true, slpName: true, groupCode: true },
  })

  for (const person of salesPersons) {
    const username = `sales${person.slpCode}`
    const name = person.slpName?.trim() || `Sales ${person.slpCode}`
    await prisma.user.upsert({
      where: { username },
      update: {
        email: `${username}@portal.com`,
        password: salesPassword,
        name,
        roleId: roleMap['sales_admin'],
        isActive: true,
        customerId: null,
        slpCode: person.slpCode,
      },
      create: {
        username,
        email: `${username}@portal.com`,
        password: salesPassword,
        name,
        roleId: roleMap['sales_admin'],
        isActive: true,
        customerId: null,
        slpCode: person.slpCode,
      },
    })
    console.log(`👤 User checked/created: ${username}@portal.com (${name})`)
  }
  console.log(`👥 Total akun sales: ${salesPersons.length}`)

  // 5. INSERT DEMO CUSTOMERS
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
      slpCode: 26,
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
    const customer = await prisma.customers.upsert({
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
        SlpCode: dc.slpCode ?? null,
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
        SlpCode: dc.slpCode ?? null,
      },
    })
    await prisma.user.upsert({
      where: { username: dc.cardCode },
      update: {
        password: customerPassword,
        name: dc.cardName,
        roleId: roleMap['customer'],
        isActive: true,
        customerId: BigInt(String(customer.id)),
      },
      create: {
        username: dc.cardCode,
        password: customerPassword,
        name: dc.cardName,
        roleId: roleMap['customer'],
        isActive: true,
        customerId: BigInt(String(customer.id)),
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
