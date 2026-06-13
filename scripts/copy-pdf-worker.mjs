// Copies the pdf.js worker into /public so it is served as a static asset.
// Bundling the worker through webpack breaks Terser (it's an ESM module), so we
// reference it at runtime via GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'.
// Runs on postinstall so the worker stays in sync with the installed pdfjs-dist.

import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const src = 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
const dest = 'public/pdf.worker.min.mjs'

try {
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  console.log(`Copied pdf.js worker → ${dest}`)
} catch (err) {
  console.error('Failed to copy pdf.js worker:', err.message)
  process.exit(1)
}
