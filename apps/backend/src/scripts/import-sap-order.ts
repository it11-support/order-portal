import { prisma } from '@/utils'
import { eligibleSapOrders, importSapOrder } from '@/services/sap-import'

/**
 * CLI around the SAP order import.
 *
 *   pnpm exec tsx src/scripts/import-sap-order.ts                 one, the newest eligible
 *   pnpm exec tsx src/scripts/import-sap-order.ts --doc 12345     one specific docNum
 *   pnpm exec tsx src/scripts/import-sap-order.ts --entry 90012  by SAP DocEntry
 *   pnpm exec tsx src/scripts/import-sap-order.ts --list          show what is eligible
 */

const arg = (flag: string): string | null => {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const numberOf = (value: string | null, label: string): number | undefined => {
  if (value == null) return undefined
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error(`${label} harus angka bulat positif, diterima "${value}".`)
  return parsed
}

const main = async () => {
  if (process.argv.includes('--list')) {
    const rows = await eligibleSapOrders()
    if (!rows.length) {
      console.log('Tidak ada dokumen sistem yang belum terhubung ke portal.')
      return
    }
    console.log('Dokumen sistem yang bisa diimpor:')
    for (const row of rows) {
      console.log(
        `  no. ${row.docNum} (internal ${row.docEntry}) · ${row.docStatus?.trim() || '?'}` +
        `${row.canceled === 'Y' ? ' · canceled' : ''} · ${row.cardCode} ${row.cardName ?? ''}` +
        ` · ${row.lines.length} baris`,
      )
    }
    return
  }

  const result = await importSapOrder({
    docNum: numberOf(arg('--doc'), '--doc'),
    docEntry: numberOf(arg('--entry'), '--entry'),
  })
  console.log(result.ok ? result.message : `Gagal: ${result.message}`)
  if (!result.ok) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })