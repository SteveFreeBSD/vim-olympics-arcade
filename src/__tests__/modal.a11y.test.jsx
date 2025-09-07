import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import CommandModal from '../components/CommandModal'

describe('CommandModal a11y', () => {
  test('focuses close button and closes on Escape', async () => {
    const onClose = vi.fn()
    const item = {
      keys: 'dw',
      details: 'delete word',
      examples: [],
      tutorial: null,
    }
    render(<CommandModal item={item} onClose={onClose} onSendKeys={() => {}} />)
    const closeBtn = screen.getByRole('button', { name: /close/i })
    expect(closeBtn).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
