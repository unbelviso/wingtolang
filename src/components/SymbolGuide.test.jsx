import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SymbolGuide } from './SymbolGuide.jsx';

describe('SymbolGuide', () => {
  it('starts collapsed, showing only the toggle', () => {
    render(<SymbolGuide />);
    expect(screen.queryByText('ㄲ')).not.toBeInTheDocument();
  });

  it('expands to show jamo entries when the toggle is clicked', async () => {
    render(<SymbolGuide />);
    await userEvent.click(screen.getByRole('button', { name: /자모 대응표/ }));
    expect(screen.getByText('ㄲ')).toBeInTheDocument();
  });
});
