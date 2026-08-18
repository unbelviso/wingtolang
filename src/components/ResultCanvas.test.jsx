import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { ResultCanvas } from './ResultCanvas.jsx';

vi.mock('../utils/renderToCanvas.js', () => ({ renderToCanvas: vi.fn() }));

describe('ResultCanvas', () => {
  it('shows a guidance message and no canvas when text is empty', () => {
    render(<ResultCanvas text="" canvasRef={createRef()} />);
    expect(screen.getByText('아직 빈 공간이에요.')).toBeInTheDocument();
    expect(screen.queryByTestId('result-canvas')).not.toBeInTheDocument();
  });

  it('renders a canvas and calls renderToCanvas when text is present', async () => {
    const { renderToCanvas } = await import('../utils/renderToCanvas.js');
    render(<ResultCanvas text="안녕" canvasRef={createRef()} />);
    expect(screen.getByTestId('result-canvas')).toBeInTheDocument();
    expect(renderToCanvas).toHaveBeenCalled();
    expect(renderToCanvas.mock.calls[0][1]).toBe('안녕');
  });
});
