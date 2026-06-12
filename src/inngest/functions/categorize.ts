// TODO: implement — AI categorization of newly created facts.
// SECURITY: raw content must not cross step boundaries (memoization persists step outputs).
// Pattern: fetch → extract → discard inside a single step.run(). Return derived facts only.

import { inngest } from '../client'

export const categorizeFact = inngest.createFunction(
  { id: 'categorize-fact' },
  { event: 'fact/created' },
  async ({ event: _event, step: _step }) => {
    // TODO: implement
  },
)
