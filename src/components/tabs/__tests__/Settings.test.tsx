import { type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider } from '../../../store/AppContext';
import Settings from '../Settings';

// Mock libraryDB so AppProvider can initialize
vi.mock('../../../services/libraryDB', () => ({
  getAllItems: vi.fn(() => Promise.resolve([])),
  saveItem: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve()),
}));

// Mock imageGenClient
vi.mock('../../../services/imageGenClient', () => ({
  imageGenClient: {
    setProvider: vi.fn(() => Promise.resolve()),
    testConnection: vi.fn(() => Promise.resolve(true)),
    getProviderName: vi.fn(() => 'baidu'),
  },
}));

function renderWithContext(ui: ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('Settings', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders header and provider options', () => {
    renderWithContext(<Settings />);
    expect(screen.getByText('配置中心 (授权)')).toBeInTheDocument();
    expect(screen.getByText('百度文心一言')).toBeInTheDocument();
    expect(screen.getByText('阿里通义万相')).toBeInTheDocument();
    expect(screen.getByText('FAL AI')).toBeInTheDocument();
  });

  it('shows MindAR as ready', () => {
    renderWithContext(<Settings />);
    expect(screen.getByText(/MindAR 引擎已就绪/)).toBeInTheDocument();
  });

  it('defaults to baidu provider', () => {
    renderWithContext(<Settings />);
    const baiduBtn = screen.getByText('百度文心一言');
    expect(baiduBtn.className).toContain('bg-black');
  });

  it('switches provider on click', () => {
    renderWithContext(<Settings />);
    fireEvent.click(screen.getByText('阿里通义万相'));
    const aliBtn = screen.getByText('阿里通义万相');
    expect(aliBtn.className).toContain('bg-black');
    expect(screen.getByText(/通义万相 API Key/)).toBeInTheDocument();
  });

  it('switches to FAL provider', () => {
    renderWithContext(<Settings />);
    fireEvent.click(screen.getByText('FAL AI'));
    const falBtn = screen.getByText('FAL AI');
    expect(falBtn.className).toContain('bg-black');
    expect(screen.getByText('FAL API Key')).toBeInTheDocument();
  });

  it('shows API key input with placeholder', () => {
    renderWithContext(<Settings />);
    const keyInput = screen.getByPlaceholderText('百度 Client ID');
    expect(keyInput).toBeInTheDocument();
    expect(keyInput).toHaveAttribute('type', 'password');
  });

  it('toggles API key visibility', () => {
    const { container } = renderWithContext(<Settings />);
    const keyInput = screen.getByPlaceholderText('百度 Client ID') as HTMLInputElement;
    expect(keyInput.type).toBe('password');

    // Find the eye toggle button (the one with tabIndex={-1} near the key input)
    const toggleBtn = container.querySelector('button[tabindex="-1"]')!;
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(keyInput.type).toBe('text');
  });

  it('shows secret key input for baidu provider', () => {
    renderWithContext(<Settings />);
    expect(screen.getByPlaceholderText('百度 Client Secret')).toBeInTheDocument();
  });

  it('hides secret key input for non-baidu providers', () => {
    renderWithContext(<Settings />);
    fireEvent.click(screen.getByText('阿里通义万相'));
    expect(screen.queryByPlaceholderText('百度 Client Secret')).not.toBeInTheDocument();
  });

  it('renders test connection button', () => {
    renderWithContext(<Settings />);
    expect(screen.getByText('测试连接')).toBeInTheDocument();
  });

  it('disables test connection when no API key', () => {
    renderWithContext(<Settings />);
    const testBtn = screen.getByText('测试连接');
    expect(testBtn).toBeDisabled();
  });

  it('enables test connection when API key is provided', () => {
    renderWithContext(<Settings />);
    const keyInput = screen.getByPlaceholderText('百度 Client ID');
    fireEvent.change(keyInput, { target: { value: 'test-key' } });

    const testBtn = screen.getByText('测试连接');
    expect(testBtn).not.toBeDisabled();
  });

  it('shows success status after test connection', async () => {
    renderWithContext(<Settings />);
    const keyInput = screen.getByPlaceholderText('百度 Client ID');
    fireEvent.change(keyInput, { target: { value: 'test-key' } });

    const testBtn = screen.getByText('测试连接');
    fireEvent.click(testBtn);

    const successMsg = await screen.findByText('连接成功');
    expect(successMsg).toBeInTheDocument();
  });

  it('trims whitespace from API key input', () => {
    renderWithContext(<Settings />);
    const keyInput = screen.getByPlaceholderText('百度 Client ID') as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: '  sk-abc123  ' } });
    expect(keyInput.value).toBe('sk-abc123');
  });

  it('trims whitespace from secret key input', () => {
    renderWithContext(<Settings />);
    const secretInput = screen.getByPlaceholderText('百度 Client Secret') as HTMLInputElement;
    fireEvent.change(secretInput, { target: { value: '  client-secret-456  ' } });
    expect(secretInput.value).toBe('client-secret-456');
  });

  it('shows fail status when test connection fails', async () => {
    // Override mock to return false
    const { imageGenClient } = await import('../../../services/imageGenClient');
    vi.mocked(imageGenClient.testConnection).mockResolvedValueOnce(false);

    renderWithContext(<Settings />);
    const keyInput = screen.getByPlaceholderText('百度 Client ID');
    fireEvent.change(keyInput, { target: { value: 'test-key' } });

    fireEvent.click(screen.getByText('测试连接'));

    const failMsg = await screen.findByText('连接失败，请检查 Key');
    expect(failMsg).toBeInTheDocument();
  });
});
