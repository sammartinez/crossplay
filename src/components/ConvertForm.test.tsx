import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ConvertForm from './ConvertForm'

// AC11: the URL input and Convert button.

const PLACEHOLDER = 'https://open.spotify.com/track/…'
const LINK = 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv'

const input = () => screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement
const convertButton = () => screen.getByRole('button', { name: 'Convert' })

function renderForm(props: { busy?: boolean; initialValue?: string } = {}) {
  const onConvert = vi.fn()
  render(<ConvertForm busy={props.busy ?? false} initialValue={props.initialValue} onConvert={onConvert} />)
  return onConvert
}

describe('ConvertForm', () => {
  it('renders a labeled URL input with the link placeholder', () => {
    renderForm()
    expect(input()).toHaveAttribute('type', 'url')
    expect(input()).toHaveAccessibleName()
  })

  it('renders an enabled Convert button when not busy', () => {
    renderForm()
    expect(convertButton()).toBeEnabled()
  })

  it('disables the Convert button while busy', () => {
    renderForm({ busy: true })
    expect(convertButton()).toBeDisabled()
  })

  it('starts empty without an initial value', () => {
    renderForm()
    expect(input()).toHaveValue('')
  })

  it('fills the input with the initial value', () => {
    renderForm({ initialValue: LINK })
    expect(input()).toHaveValue(LINK)
  })

  it('calls onConvert with the input value on submit', () => {
    const onConvert = renderForm()
    fireEvent.change(input(), { target: { value: LINK } })
    fireEvent.click(convertButton())
    expect(onConvert).toHaveBeenCalledTimes(1)
    expect(onConvert).toHaveBeenCalledWith(LINK)
  })

  it('calls onConvert with the pasted value one tick after the paste event', async () => {
    const onConvert = renderForm()
    fireEvent.paste(input())
    fireEvent.change(input(), { target: { value: LINK } })
    expect(onConvert).not.toHaveBeenCalled()
    await waitFor(() => expect(onConvert).toHaveBeenCalledTimes(1))
    expect(onConvert).toHaveBeenCalledWith(LINK)
  })
})
