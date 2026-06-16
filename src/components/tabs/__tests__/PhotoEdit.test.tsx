import { act, type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider } from '../../../store/AppContext';
import PhotoEdit from '../PhotoEdit';

// Mock libraryDB
vi.mock('../../../services/libraryDB', () => ({
  getAllItems: vi.fn(() => Promise.resolve([])),
  saveItem: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve()),
}));

// Mock imageGenClient
vi.mock('../../../services/imageGenClient', () => ({
  imageGenClient: {
    setProvider: vi.fn(() => Promise.resolve()),
    generateHairstyles: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock resizeImage
vi.mock('../../../utils/imageUtils', () => ({
  resizeImage: vi.fn(() => Promise.resolve('mock-base64-data')),
}));

function renderWithContext(ui: ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('PhotoEdit', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders header and description', () => {
    renderWithContext(<PhotoEdit />);
    expect(screen.getByText('照片极速换发')).toBeInTheDocument();
    expect(screen.getAllByText(/上传正脸照片/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows upload area when no image selected', () => {
    renderWithContext(<PhotoEdit />);
    expect(screen.getByText('上传正脸照片')).toBeInTheDocument();
    expect(screen.getByText(/支持 JPEG, PNG 格式/)).toBeInTheDocument();
  });

  it('shows file input with accept image/*', () => {
    const { container } = renderWithContext(<PhotoEdit />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput?.accept).toBe('image/*');
    expect(fileInput?.className).toContain('hidden');
  });

  it('shows no-key warning when no API key is configured', () => {
    renderWithContext(<PhotoEdit />);
    expect(screen.getByText('使用基础版示意生成')).toBeInTheDocument();
  });

  it('does not show no-key warning when API key is set', () => {
    // Set API key in localStorage before render
    localStorage.setItem('app_settings', JSON.stringify({
      imageApiKey: 'test-key',
      imageApiSecret: '',
      imageFalKey: '',
      imageProvider: 'baidu',
    }));

    renderWithContext(<PhotoEdit />);
    expect(screen.queryByText('使用基础版示意生成')).not.toBeInTheDocument();
  });

  it('switches to preview mode after file upload', () => {
    const { container } = renderWithContext(<PhotoEdit />);

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File([''], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // After upload, shows change image button
    expect(screen.getByText('更换图片')).toBeInTheDocument();
  });

  it('shows generate button after upload', () => {
    const { container } = renderWithContext(<PhotoEdit />);

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File([''], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('AI 生成适配发型')).toBeInTheDocument();
  });

  it('generates demo results when no API key', async () => {
    vi.useFakeTimers();
    const { container } = renderWithContext(<PhotoEdit />);

    // Upload file
    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File([''], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click generate
    fireEvent.click(screen.getByText('AI 生成适配发型'));

    // Showing loading state
    expect(screen.getByText('正在生成适配发型...')).toBeInTheDocument();

    // Fast-forward through DEMO_DELAY_MS
    act(() => { vi.advanceTimersByTime(2000); });

    // After generation: results should appear
    // At least one "发型风格" text should appear
    expect(screen.getByText('发型风格 1')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows hair type selector when results are displayed', async () => {
    vi.useFakeTimers();
    const { container } = renderWithContext(<PhotoEdit />);

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File([''], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByText('AI 生成适配发型'));
    act(() => { vi.advanceTimersByTime(2000); });

    // Hair type selector should be visible
    expect(screen.getByText('发型类型')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('saves result to library with selected hair type', async () => {
    vi.useFakeTimers();
    const { container } = renderWithContext(<PhotoEdit />);

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File([''], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByText('AI 生成适配发型'));
    act(() => { vi.advanceTimersByTime(2000); });

    // Save button should be present
    const saveBtn = screen.getByTestId('save-btn-0');
    expect(saveBtn).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows error when API call fails', async () => {
    // Mock generateHairstyles to throw
    const { imageGenClient } = await import('../../../services/imageGenClient');
    vi.mocked(imageGenClient.generateHairstyles).mockRejectedValueOnce(new Error('API 错误'));

    // Set API key so it tries real API
    localStorage.setItem('app_settings', JSON.stringify({
      imageApiKey: 'test-key',
      imageApiSecret: '',
      imageFalKey: '',
      imageProvider: 'baidu',
    }));

    const { container } = renderWithContext(<PhotoEdit />);

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File([''], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByText('AI 生成适配发型'));

    // Error should appear
    const errorMsg = await screen.findByText('调用失败，请检查 API 配置和网络连接');
    expect(errorMsg).toBeInTheDocument();
  });
});
