import { prisma } from '@/utils'

const main = async () => {
  const users = await prisma.user.findMany({
    where: { customerId: { not: null } },
    select: { id: true, username: true, customerId: true, role: { select: { name: true } } },
    take: 15,
  })
  console.log('users with customerId:')
  console.table(users)

  const customers = await prisma.customers.findMany({
    select: { id: true, CardCode: true, priceListNum: true, NonActive: true },
    take: 15,
  })
  console.log('customers:')
  console.table(customers)

  const lists = await prisma.priceList.findMany({
    select: { listNum: true, listName: true },
    take: 15,
  })
  console.log('price lists:')
  console.table(lists)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())