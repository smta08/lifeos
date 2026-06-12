// Shared result shape used by every Server Action and repository method.

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

export type PaginatedResult<T> = Result<{
  items: T[]
  nextCursor: string | null
}>
