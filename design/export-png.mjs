// Renders every .dc.html artboard to a PNG in design/png/.
//
// The artboards are static: no bindings, no logic, only the `<x-dc>` wrapper
// and a `<helmet>` block that the canvas editor would inline. Unwrapping them
// into plain documents is enough, so this needs a browser and nothing else.
//
// Uses the Chromium that Playwright already downloaded rather than adding a
// dependency: these PNGs are a documentation artifact, not part of the build.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const HERE = dirname(new URL(import.meta.url).pathname)
const OUT = join(HERE, 'png')
const TMP = join(HERE, '.png-build')

const CHROME = join(
  homedir(),
  'Library/Caches/ms-playwright/chromium_headless_shell-1234',
  'chrome-headless-shell-mac-arm64/chrome-headless-shell',
)

if (!existsSync(CHROME)) {
  console.error(`no headless chromium at ${CHROME}`)
  console.error('run `npx playwright install chromium` first')
  process.exit(1)
}

/** Pull the head fragment and the body out of a .dc.html artboard. */
function unwrap(source) {
  const helmet = source.match(/<helmet>([\s\S]*?)<\/helmet>/)
  const body = source.match(/<\/helmet>([\s\S]*?)<\/x-dc>/)
  if (!helmet || !body) throw new Error('artboard is not in the expected <x-dc>/<helmet> shape')
  return { head: helmet[1], body: body[1] }
}

const canvas = JSON.parse(readFileSync(join(HERE, 'canvas.json'), 'utf8'))

mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

for (const board of canvas.artboards) {
  const { head, body } = unwrap(readFileSync(join(HERE, board.file), 'utf8'))
  const name = board.file.replace(/\.dc\.html$/, '')
  const page = join(TMP, `${name}.html`)
  const png = join(OUT, `${name}.png`)

  writeFileSync(
    page,
    `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${name}</title>
${head}
<style>
  html, body { margin: 0; padding: 0; }
  /* The artboard carries its own width and height; the page must not add any. */
  body > * { margin: 0 !important; }
</style>
</head>
<body>${body}</body>
</html>`,
  )

  execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      // 2x so the board stays readable when the README scales it down.
      '--force-device-scale-factor=2',
      `--window-size=${board.w},${board.h}`,
      // Google Fonts need a moment; without this the fallback face is captured.
      '--virtual-time-budget=6000',
      `--screenshot=${png}`,
      `file://${page}`,
    ],
    { stdio: 'pipe' },
  )

  console.log(`${board.file} -> design/png/${name}.png (${board.w}x${board.h} at 2x)`)
}

rmSync(TMP, { recursive: true, force: true })
