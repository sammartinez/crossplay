import { expect } from 'vitest'
import { within } from '@testing-library/react'

// Visible as toBeVisible sees it: no `hidden`, display:none or visibility:hidden up the tree.
export const isShown = (el: Element): boolean => {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (node.hasAttribute('hidden') || style.display === 'none' || style.visibility === 'hidden') {
      return false
    }
  }
  return true
}

// Passes when the element was not rendered or is rendered hidden.
export const expectNotShown = (el: Element | null): void => {
  expect(el !== null && isShown(el)).toBe(false)
}

// The result-list item holding the link with this accessible name.
export const resultRow = (name: string, container: HTMLElement = document.body): HTMLElement => {
  const li = within(container)
    .getAllByRole('listitem')
    .find((item) => within(item).queryByRole('link', { name }))
  if (!li) throw new Error(`no result row for ${name}`)
  return li
}
