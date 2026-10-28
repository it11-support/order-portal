import type { Actor } from './access'

export const FLOW: Record<
  string,
  Record<string, { next: Record<string, Array<'admin' | 'sales' | 'customer' | 'system'>> }>
> = {
  order: {
    draft: { next: { pending: ['sales', 'admin', 'customer'], cancelled: ['sales', 'admin', 'customer'] } },
    pending: { next: { confirmed: ['admin'], cancelled: ['admin'] } },
    confirmed: { next: { processing: ['admin'], cancelled: ['admin'] } },
    processing: { next: { delivered: ['admin'], cancelled: ['admin'] } },
    delivered: { next: {} },
    cancelled: { next: {} },
  },
  quote: {
    pending: { next: { processing: ['sales', 'admin'], cancelled: ['sales', 'admin'] } },
    // ready is reached by the price gate once every line is priced, not by a
    // staff status edit.
    processing: { next: { cancelled: ['sales', 'admin'] } },
    ready: { next: { cancelled: ['sales', 'admin'] } },
    converted: { next: {} },
    cancelled: { next: {} },
  },
}

export const actorRoleName = (actor: Actor) =>
  actor.role === 'admin' ? 'admin' : actor.role === 'sales_admin' ? 'sales' : 'customer'
