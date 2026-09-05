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

  it('typing text renders the canvas live without a convert button', async () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: '번역하기' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('윙토언어로 전하고 싶은 말을 입력해주세요.'), '안녕');
    expect(await screen.findByTestId('result-canvas')).toBeInTheDocument();
  });

  it('clearing the input returns to the empty-space state', async () => {
    render(<App />);
    const textbox = screen.getByPlaceholderText('윙토언어로 전하고 싶은 말을 입력해주세요.');
    await userEvent.type(textbox, '안녕');
    expect(await screen.findByTestId('result-canvas')).toBeInTheDocument();
    await userEvent.clear(textbox);
    expect(await screen.findByText('아직 빈 공간이에요.')).toBeInTheDocument();
    expect(screen.queryByTestId('result-canvas')).not.toBeInTheDocument();
  });

  it('keeps the PNG download button disabled until there is a result', async () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'PNG 다운로드' })).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('윙토언어로 전하고 싶은 말을 입력해주세요.'), '안녕');
    expect(await screen.findByTestId('result-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PNG 다운로드' })).toBeEnabled();
  });
});
