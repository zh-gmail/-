import { type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider, useAppContext } from '../../../store/AppContext';
import Navigation from '../Navigation';

// Mock libraryDB so AppProvider can initialize
vi.mock('../../../services/libraryDB', () => ({
  getAllItems: vi.fn(() => Promise.resolve([])),
  saveItem: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve()),
}));

function renderWithContext(ui: ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('Navigation', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders 5 nav buttons with labels', () => {
    renderWithContext(<Navigation />);
    expect(screen.getByRole('button', { name: '实时试戴' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '照片换发' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '素材提取' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '素材库' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '设置' })).toBeInTheDocument();
  });

  it('highlights active tab with white text', () => {
    renderWithContext(<Navigation />);
    // Default activeTab is 'live'
    const liveBtn = screen.getByRole('button', { name: '实时试戴' });
    expect(liveBtn.innerHTML).toContain('text-white');

    // Inactive tabs should have neutral-500
    const photoBtn = screen.getByRole('button', { name: '照片换发' });
    expect(photoBtn.innerHTML).toContain('text-neutral-500');
  });

  it('switches active tab on click', () => {
    renderWithContext(<Navigation />);

    fireEvent.click(screen.getByRole('button', { name: '照片换发' }));

    // Clicked tab now shows white text
    const photoBtn = screen.getByRole('button', { name: '照片换发' });
    expect(photoBtn.innerHTML).toContain('text-white');

    // Previously active tab is now neutral
    const liveBtn = screen.getByRole('button', { name: '实时试戴' });
    expect(liveBtn.innerHTML).toContain('text-neutral-500');
  });

  it('does not re-render when unrelated context changes', () => {
    function TestHarness() {
      const { updateSettings } = useAppContext();
      return (
        <div>
          <Navigation />
          <button data-testid="change-unrelated" onClick={() => updateSettings({ imageApiKey: 'test' })}>
            Change
          </button>
        </div>
      );
    }

    const { container } = render(<AppProvider><TestHarness /></AppProvider>);
    const nav = container.querySelector('nav')!;
    const initialHTML = nav.innerHTML;

    fireEvent.click(screen.getByTestId('change-unrelated'));

    // Navigation DOM should be unchanged
    expect(nav.innerHTML).toBe(initialHTML);
  });
});
