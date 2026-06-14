// Route-level skeleton. Reserves the same vertical rhythm the real pages use so there is
// no layout shift when content arrives.
export default function AppLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-8">
        <div className="h-8 w-64 rounded-lg bg-[#E4E4E7] dark:bg-[#27272A]" />
        <div className="mt-2 h-4 w-48 rounded bg-[#E4E4E7] dark:bg-[#27272A]" />
      </div>
      <div className="mb-8 h-28 w-full rounded-2xl bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A]" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 w-full rounded-2xl bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A]"
          />
        ))}
      </div>
    </div>
  )
}
