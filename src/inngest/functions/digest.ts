// TODO: implement — daily email digest at 08:00 UTC.
// Digests carry counts + titles only — never amounts, dates, or document details.

import { inngest } from '../client'

export const sendDigest = inngest.createFunction(
  { id: 'send-digest' },
  { cron: '0 8 * * *' },
  async ({ step: _step }) => {
    // TODO: implement
  },
)
