import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import CommandCard from '../components/CommandCard'

describe('CommandCard progress toggle', () => {
  test('calls onToggleDone when Mark button clicked', () => {
    const item = { keys: 'dw', desc: 'delete word' }
    const onToggleDone = vi.fn()
    render(
      <CommandCard
        item={item}
        onOpen={() => {}}
        onToggleDone={onToggleDone}
        query=""
        done={false}
      />,
    )
    const btn = screen.getByRole('button', { name: /mark/i })
    fireEvent.click(btn)
    expect(onToggleDone).toHaveBeenCalled()
  })
  test('shows ✓ Done when done=true', () => {
    const item = { keys: 'dw', desc: 'delete word' }
    render(<CommandCard item={item} onOpen={() => {}} query="" done={true} />)
    const btn = screen.getByText('✓ Done')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('title', 'Mark as not done')
  })
})
