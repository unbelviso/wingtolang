import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInput } from './TextInput.jsx';

describe('TextInput', () => {
  it('shows the placeholder text', () => {
    render(<TextInput value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText('윙토언어로 전하고 싶은 말을 입력해주세요.')).toBeInTheDocument();
  });

  it('shows the current character count', () => {
    render(<TextInput value="안녕하세요" onChange={() => {}} />);
    expect(screen.getByText('5자 입력됨')).toBeInTheDocument();
  });

  it('keeps the inline help collapsed until the user opens it', async () => {
    render(<TextInput value="" onChange={() => {}} />);
    expect(screen.queryByText('번역 결과 확인')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /도움말 펼치기/ }));
    expect(screen.getByText('번역 결과 확인')).toBeInTheDocument();
  });

  it('calls onChange with the new value as the user types', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <TextInput
          value={value}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      );
    }
    render(<Harness />);
    await userEvent.type(screen.getByRole('textbox'), '안녕');
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)[0]).toBe('안녕'); // last call has the full typed string
  });

  it('properly clears and replaces text (no concatenation)', async () => {
    function Harness() {
      const [value, setValue] = useState('');
      return <TextInput value={value} onChange={setValue} />;
    }
    const { rerender } = render(<Harness />);
    const textbox = screen.getByRole('textbox');

    // Type initial text
    await userEvent.type(textbox, 'abc');
    expect(textbox).toHaveValue('abc');

    // Clear and type new text (simulating the real clear-and-type flow)
    await userEvent.clear(textbox);
    expect(textbox).toHaveValue('');
    await userEvent.type(textbox, 'xyz');
    expect(textbox).toHaveValue('xyz'); // Should be only 'xyz', not 'abcxyz'
  });
});
