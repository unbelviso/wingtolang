import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { DownloadButton } from './DownloadButton.jsx';

describe('DownloadButton', () => {
  it('triggers a download using the canvas data URL when clicked', async () => {
    const canvasRef = createRef();
    canvasRef.current = { toDataURL: vi.fn(() => 'data:image/png;base64,xyz') };
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    render(<DownloadButton canvasRef={canvasRef} />);
    await userEvent.click(screen.getByRole('button', { name: 'PNG 다운로드' }));

    expect(canvasRef.current.toDataURL).toHaveBeenCalledWith('image/png');
    expect(clickSpy).toHaveBeenCalled();
    document.createElement.mockRestore();
  });
});
