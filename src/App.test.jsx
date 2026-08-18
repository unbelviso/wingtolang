import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

describe('App', () => {
  it('renders the title and starts with the empty-state canvas message', () => {
    render(<App />);
    expect(screen.getByText('윙토언어 번역기')).toBeInTheDocument();
    expect(screen.getByText('아직 빈 공간이에요.')).toBeInTheDocument();
  });

  it('typing text and clicking 번역하기 renders the canvas', async () => {
    render(<App />);
    await userEvent.type(screen.getByPlaceholderText('윙토언어로 전하고 싶은 말을 입력해주세요.'), '안녕');
    await userEvent.click(screen.getByRole('button', { name: '번역하기' }));
    expect(screen.getByTestId('result-canvas')).toBeInTheDocument();
  });
});
