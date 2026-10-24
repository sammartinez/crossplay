import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// AC4: the Vite entry page keeps the metas and links that make Add to Home
// Screen and theming work, and its icons are served from public/.
// npm test runs vitest from the repo root.
const root = process.cwd()
const page = readFileSync(resolve(root, 'index.html'), 'utf8')

const tags = (name: string) => page.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? []
const metaNamed = (name: string) =>
  tags('meta').filter((t) => new RegExp(`name=["']${name}["']`, 'i').test(t))
const linkWithRel = (rel: string) =>
  tags('link').filter((t) => new RegExp(`rel=["']${rel}["']`, 'i').test(t))

describe('index.html page shell', () => {
  it('is titled Crossplay', () => {
    expect(page).toMatch(/<title>\s*Crossplay\s*<\/title>/)
  })

  it('keeps the viewport meta with viewport-fit=cover', () => {
    const [viewport] = metaNamed('viewport')
    expect(viewport).toBeDefined()
    expect(viewport).toMatch(/viewport-fit=cover/)
  })

  it('keeps the apple-mobile-web-app metas', () => {
    expect(metaNamed('apple-mobile-web-app-capable')).toHaveLength(1)
    expect(metaNamed('apple-mobile-web-app-title')).toHaveLength(1)
    expect(metaNamed('apple-mobile-web-app-status-bar-style')).toHaveLength(1)
  })

  it('keeps the mobile-web-app-capable meta', () => {
    expect(metaNamed('mobile-web-app-capable')).toHaveLength(1)
  })

  it('keeps a theme-color meta for both light and dark schemes', () => {
    const themeColors = metaNamed('theme-color')
    expect(themeColors).toHaveLength(2)
    expect(themeColors.some((t) => /prefers-color-scheme:\s*light/.test(t))).toBe(true)
    expect(themeColors.some((t) => /prefers-color-scheme:\s*dark/.test(t))).toBe(true)
  })

  it('keeps the Google Fonts links', () => {
    expect(linkWithRel('preconnect').some((t) => t.includes('https://fonts.googleapis.com'))).toBe(true)
    expect(
      linkWithRel('stylesheet').some((t) => t.includes('https://fonts.googleapis.com/css2')),
    ).toBe(true)
  })

  it('links the favicon and serves it from public/', () => {
    expect(linkWithRel('icon').some((t) => /favicon\.png/.test(t))).toBe(true)
    expect(existsSync(resolve(root, 'public/favicon.png'))).toBe(true)
  })

  it('links the apple-touch-icon and serves it from public/', () => {
    expect(linkWithRel('apple-touch-icon').some((t) => /apple-touch-icon\.png/.test(t))).toBe(true)
    expect(existsSync(resolve(root, 'public/apple-touch-icon.png'))).toBe(true)
  })

  it('loads the app from src/main.tsx as a module script', () => {
    expect(
      tags('script').some((t) => /type=["']module["']/.test(t) && /src=["'][^"']*src\/main\.tsx["']/.test(t)),
    ).toBe(true)
  })

  it('has no inline script left over from the old page', () => {
    const inline = tags('script').filter((t) => !/\bsrc=/.test(t))
    expect(inline).toHaveLength(0)
  })

  it('provides the #app mount point', () => {
    expect(page).toMatch(/id=["']app["']/)
  })
})
