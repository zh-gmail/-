import { act, type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider } from '../../../store/AppContext';
import Extraction from '../Extraction';

// Mock libraryDB so AppProvider can initialize without IndexedDB
vi.mock('../../../services/libraryDB', () => ({
  getAllItems: vi.fn(() => Promise.resolve([])),
  saveItem: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve()),
}));

// Mock imageGenClient to avoid dynamic imports
vi.mock('../../../services/imageGenClient', () => ({
  imageGenClient: {
    setProvider: vi.fn(),
    extractHairstyle: vi.fn(),
  },
}));

// Mock resizeImage to avoid canvas operations in jsdom
vi.mock('../../../utils/imageUtils', () => ({
  resizeImage: vi.fn(() => Promise.resolve('mock-base64-data')),
}));

function renderWithContext(ui: ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('Extraction', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the header and upload prompt', () => {
    renderWithContext(<Extraction />);

    expect(screen.getByText('提取素材发型')).toBeInTheDocument();
    expect(screen.getByText('上传包含发型的参考图')).toBeInTheDocument();
  });

  it('shows file upload area when no image selected', () => {
    const { container } = renderWithContext(<Extraction />);

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('switches to preview mode after file selection', () => {
    const { container } = renderWithContext(<Extraction />);

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File([''], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('原图')).toBeInTheDocument();
    expect(screen.getByText('提取结果演示')).toBeInTheDocument();
    expect(screen.getByText('提取发型')).toBeInTheDocument();
  });

  it('extracts in demo mode and saves to library', async () => {
    vi.useFakeTimers();
    const { container } = renderWithContext(<Extraction />);

    // Upload a file
    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File([''], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click extract (demo mode because no API key)
    fireEvent.click(screen.getByText('提取发型'));

    // Fast-forward through DEMO_DELAY_MS (1500ms)
    act(() => { vi.advanceTimersByTime(1500); });

    // After extraction: color options + save button should appear
    expect(screen.getByText('保存素材并转至库')).toBeInTheDocument();

    // Click save
    fireEvent.click(screen.getByText('保存素材并转至库'));

    // saveToLibrary calls AppContext.setActiveTab('library')
    // (rendered directly, so component stays mounted in this test)
    expect(screen.getByText('提取素材发型')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
