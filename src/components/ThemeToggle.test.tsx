import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ThemeToggle from './ThemeToggle'
import { mockSystemTheme } from '../test/systemTheme'
import { makeStorageThrow } from '../test/storage'

const KEY = 'cp-theme'
const html = () => document.documentElement

function renderToggle() {
  render(<ThemeToggle />)
  return screen.getByRole('button', { name: 'Theme' })
}

describe('ThemeToggle', () => {
  it('renders a button labeled Theme', () => {
    expect(renderToggle()).toBeInTheDocument()
  })

  it('leaves the theme to the system until clicked', () => {
    mockSystemTheme('dark')
    renderToggle()
    expect(html()).not.toHaveAttribute('data-theme')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('switches to light on first click when the system shows dark', () => {
    mockSystemTheme('dark')
    fireEvent.click(renderToggle())
    expect(html()).toHaveAttribute('data-theme', 'light')
  })

  it('switches to dark on first click when the system shows light', () => {
    mockSystemTheme('light')
    fireEvent.click(renderToggle())
    expect(html()).toHaveAttribute('data-theme', 'dark')
  })

  it('toggles from the theme set on <html> rather than the system theme', () => {
    mockSystemTheme('light')
    html().setAttribute('data-theme', 'dark')
    fireEvent.click(renderToggle())
    expect(html()).toHaveAttribute('data-theme', 'light')
  })

  it('alternates between light and dark on repeated clicks', () => {
    mockSystemTheme('light')
    const button = renderToggle()
    fireEvent.click(button)
    expect(html()).toHaveAttribute('data-theme', 'dark')
    fireEvent.click(button)
    expect(html()).toHaveAttribute('data-theme', 'light')
    fireEvent.click(button)
    expect(html()).toHaveAttribute('data-theme', 'dark')
  })

  it('persists the chosen theme under cp-theme', () => {
    mockSystemTheme('light')
    fireEvent.click(renderToggle())
    expect(localStorage.getItem(KEY)).toBe('dark')
  })

  it('still toggles the theme when storage throws', () => {
    mockSystemTheme('dark')
    makeStorageThrow()
    fireEvent.click(renderToggle())
    expect(html()).toHaveAttribute('data-theme', 'light')
  })
})
