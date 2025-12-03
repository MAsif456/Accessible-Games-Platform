import { act, render } from '@testing-library/react';
import React, { useEffect } from 'react';
import '@testing-library/jest-dom';
import useKeyboardNavigation from '../../hooks/navigation/useKeyboardNavigation';

type NavApi = ReturnType<typeof useKeyboardNavigation<HTMLElement>>;

const makeItem = (label: string) => {
  const el = document.createElement('button');
  el.textContent = label;
  el.focus = jest.fn();
  el.click = jest.fn();
  return el as unknown as HTMLElement;
};

function HookHarness({
  items,
  options,
  onReady,
}: {
  items: HTMLElement[];
  options?: Parameters<typeof useKeyboardNavigation>[1];
  onReady: (api: NavApi) => void;
}) {
  const nav = useKeyboardNavigation(items, options);

  useEffect(() => {
    onReady(nav);
  }, [nav, onReady]);

  return null;
}

describe('useKeyboardNavigation hook', () => {
  test('Arrow keys move focus and loop when enabled', () => {
    const items = [makeItem('One'), makeItem('Two'), makeItem('Three')];
    let api: NavApi | null = null;

    render(<HookHarness items={items} onReady={nav => (api = nav)} />);

    act(() => api?.initializeFocus(0));
    expect(items[0].focus).toHaveBeenCalled();

    act(() => api?.handleKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as any));
    expect(items[1].focus).toHaveBeenCalled();

    act(() => api?.handleKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as any));
    expect(items[2].focus).toHaveBeenCalled();

    act(() => api?.handleKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as any));
    expect(items[0].focus).toHaveBeenCalledTimes(2); // looped back
  });

  test('Respects non-looping navigation and Home/End keys', () => {
    const items = [makeItem('One'), makeItem('Two'), makeItem('Three')];
    let api: NavApi | null = null;

    render(
      <HookHarness
        items={items}
        options={{ loop: false, direction: 'horizontal' }}
        onReady={nav => (api = nav)}
      />
    );

    act(() => api?.initializeFocus(2));
    expect(items[2].focus).toHaveBeenCalled();

    act(() => api?.handleKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as any));
    expect(items[0].focus).not.toHaveBeenCalled(); // stayed on last item

    act(() => api?.handleKeyDown({ key: 'Home', preventDefault: jest.fn() } as any));
    expect(items[0].focus).toHaveBeenCalled();

    act(() => api?.handleKeyDown({ key: 'End', preventDefault: jest.fn() } as any));
    expect(items[2].focus).toHaveBeenCalled();
  });

  test('Enter triggers click when selectOnFocus is true', () => {
    const items = [makeItem('One'), makeItem('Two')];
    let api: NavApi | null = null;

    render(
      <HookHarness
        items={items}
        options={{ selectOnFocus: true }}
        onReady={nav => (api = nav)}
      />
    );

    act(() => api?.initializeFocus(1));
    act(() => api?.handleKeyDown({ key: 'Enter', preventDefault: jest.fn() } as any));

    expect(items[1].click).toHaveBeenCalled();
  });
});
