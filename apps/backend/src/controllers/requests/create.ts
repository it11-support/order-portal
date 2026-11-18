import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'

import { actorOf, deniedMessage, targetCustomer } from '@/services/requests/access'
import { serialize } from '@/services/requests/serializer'
import { validateRequestInput } from './validation'
import { prepareRequestContext } from './request-context'
import { createDraftRequest } from './create-draft'
import { createPendingRequest } from './create-pending'
import { notifyRequestCreated } from './notify-request'

export const createRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const actor = actorOf(req)

  if (!actor) {
    return res.status(403).json({
      message: deniedMessage(req),
    })
  }

  const input = validateRequestInput(req.body)

  if (!input.ok) {
    return res.status(400).json({
      message: input.message,
    })
  }

  const target = await targetCustomer(req, actor, input.data)

  if ('error' in target) {
    return res.status(403).json({
      message: target.error,
    })
  }

  // Resolve inquiry, allowed products and prices.
  const context = await prepareRequestContext(
    req,
    actor,
    target.id,
    input.data,
  )

  if (!context.ok) {
    return res.status(context.status).json({
      ...context.error,
    })
  }

  if (input.data.status === 'draft') {
    const draft = await createDraftRequest({
      ...context.data,
      createdById: Number(req.user!.id),
    })
    return res.status(201).json({
      data: serialize(draft, undefined, actor),
    })
  }

  const result = await createPendingRequest({
    ...context.data,
    createdById: Number(req.user!.id),
  })

  await notifyRequestCreated(result, actor, req)

  return res.status(201).json({
    data: serialize(result, undefined, actor),
  })
}
