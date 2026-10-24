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
