// TODO: implement — canonical prompt templates for the AI pipeline.
// See docs/TRD-review.md §5–6 for the full prompt specs.
// Prompts are design artefacts, not security controls — validators in code are the control.

export const prompts = {
  // Phase 1: deterministic engine only — these are Phase 2+ stubs
  categorize: null as unknown as string,
  lifeScan: null as unknown as string,
} as const
