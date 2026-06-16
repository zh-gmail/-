import { type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider } from '../../../store/AppContext';
import LiveCamera from '../LiveCamera';

// Mock libraryDB
vi.mock('../../../services/libraryDB', () => ({
  getAllItems: vi.fn(() => Promise.resolve([])),
  saveItem: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve()),
}));

// Mock useAREngine hook
vi.mock('../../../hooks/useAREngine', () => ({
  useAREngine: vi.fn(() => ({
    isActive: false,
    faceDetected: false,
    arError: null,
    initEngine: vi.fn(),
    switchHairstyle: vi.fn(() => Promise.resolve()),
    setHairColor: vi.fn(),
    takeScreenshot: vi.fn(() => Promise.resolve('data:image/png,base64')),
  })),
}));

// Mock hairstyle assets
vi.mock('../../../data/hairstyleAssets', () => ({
  HAIRSTYLE_ASSETS: [
    { id: 'short', name: '短发', effectUrl: '/assets/hairstyles/short.glb', thumbnailUrl: '', scale: [1, 1, 1], position: [0, 0.10, -0.02] },
    { id: 'long', name: '长发', effectUrl: '/assets/hairstyles/long.glb', thumbnailUrl: '', scale: [1, 1, 1], position: [0, 0.15, -0.02] },
  ],
}));

function renderWithContext(ui: ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('LiveCamera', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders AR view header', () => {
    renderWithContext(<LiveCamera />);
    expect(screen.getByText('实时AR试戴')).toBeInTheDocument();
  });

  it('shows loading state when AR is not active', () => {
    renderWithContext(<LiveCamera />);
    const loadingTexts = screen.getAllByText('AR 引擎加载中...');
    expect(loadingTexts.length).toBe(2);
  });

  it('shows empty sidebar when library is empty', () => {
    renderWithContext(<LiveCamera />);
    expect(screen.getByText('发型库')).toBeInTheDocument();
  });

  it('renders at least 4 control buttons in the right sidebar', () => {
    const { container } = renderWithContext(<LiveCamera />);
    const rightSidebar = container.querySelector('.right-4.flex-col');
    expect(rightSidebar).toBeInTheDocument();
    const buttons = rightSidebar?.querySelectorAll('button');
    expect(buttons?.length).toBeGreaterThanOrEqual(4);
  });

  it('shows active state with face detected', async () => {
    // Re-mock with active state
    const { useAREngine } = await import('../../../hooks/useAREngine');
    vi.mocked(useAREngine).mockReturnValueOnce({
      isActive: true,
      faceDetected: true,
      arError: null,
      initEngine: vi.fn(),
      switchHairstyle: vi.fn(() => Promise.resolve()),
      setHairColor: vi.fn(),
      takeScreenshot: vi.fn(() => Promise.resolve('data:image/png,base64')),
    });

    // Need to re-render with new mock
    cleanup();
    renderWithContext(<LiveCamera />);
    expect(screen.getByText('· 面部已检测')).toBeInTheDocument();
  });

  it('shows waiting for face state', async () => {
    const { useAREngine } = await import('../../../hooks/useAREngine');
    vi.mocked(useAREngine).mockReturnValueOnce({
      isActive: true,
      faceDetected: false,
      arError: null,
      initEngine: vi.fn(),
      switchHairstyle: vi.fn(() => Promise.resolve()),
      setHairColor: vi.fn(),
      takeScreenshot: vi.fn(() => Promise.resolve('data:image/png,base64')),
    });

    cleanup();
    renderWithContext(<LiveCamera />);
    expect(screen.getByText('· 等待面部')).toBeInTheDocument();
  });

  it('shows error state when AR fails', async () => {
    const { useAREngine } = await import('../../../hooks/useAREngine');
    vi.mocked(useAREngine).mockReturnValueOnce({
      isActive: false,
      faceDetected: false,
      arError: '摄像头权限被拒绝',
      initEngine: vi.fn(),
      switchHairstyle: vi.fn(() => Promise.resolve()),
      setHairColor: vi.fn(),
      takeScreenshot: vi.fn(() => Promise.resolve('data:image/png,base64')),
    });

    cleanup();
    renderWithContext(<LiveCamera />);
    expect(screen.getByText('AR 引擎初始化失败')).toBeInTheDocument();
    expect(screen.getByText('摄像头权限被拒绝')).toBeInTheDocument();
  });

  it('renders retry button on error', async () => {
    const { useAREngine } = await import('../../../hooks/useAREngine');
    vi.mocked(useAREngine).mockReturnValueOnce({
      isActive: false,
      faceDetected: false,
      arError: 'error',
      initEngine: vi.fn(),
      switchHairstyle: vi.fn(() => Promise.resolve()),
      setHairColor: vi.fn(),
      takeScreenshot: vi.fn(() => Promise.resolve('data:image/png,base64')),
    });

    cleanup();
    renderWithContext(<LiveCamera />);
    expect(screen.getByText('重新加载页面')).toBeInTheDocument();
  });

  it('shows color picker when palette button clicked', async () => {
    const { useAREngine } = await import('../../../hooks/useAREngine');
    vi.mocked(useAREngine).mockReturnValueOnce({
      isActive: true,
      faceDetected: false,
      arError: null,
      initEngine: vi.fn(),
      switchHairstyle: vi.fn(() => Promise.resolve()),
      setHairColor: vi.fn(),
      takeScreenshot: vi.fn(() => Promise.resolve('data:image/png,base64')),
    });

    cleanup();
    renderWithContext(<LiveCamera />);

    const paletteBtn = screen.getByTestId('palette-btn');
    fireEvent.click(paletteBtn);

    // After clicking, color preset buttons should appear
    expect(screen.getByTitle('自然黑')).toBeInTheDocument();
    expect(screen.getByTitle('金色')).toBeInTheDocument();
  });

  it('collapses and expands sidebar', () => {
    const { container } = renderWithContext(<LiveCamera />);
    // Sidebar visible initially
    expect(screen.getByText('发型库')).toBeInTheDocument();

    // Click collapse button (ChevronLeft icon, first button in sidebar header)
    const sidebarHeader = container.querySelector('.w-\\[104px\\]');
    const collapseBtn = sidebarHeader?.querySelector('button');
    if (collapseBtn) {
      fireEvent.click(collapseBtn);
      // After collapse, sidebar should be hidden
      expect(screen.queryByText('发型库')).not.toBeInTheDocument();
    }
  });
});
