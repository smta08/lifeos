// TODO: implement — Anthropic SDK client for runtime AI calls.
// Runtime models: claude-sonnet-4-6 (default scan/categorize), claude-haiku-4-5 (boilerplate)
// No console.* anywhere in src/services/ai/ or the scan pipeline.

import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
