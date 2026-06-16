import { type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider } from '../../../store/AppContext';
import Library from '../Library';

// Mock libraryDB so AppProvider can initialize without IndexedDB
const mockData = [
  { id: '1', name: '短发造型', type: 'short' as const, colorName: '黑色', colorHex: '#1a1a1a', previewUrl: 'data:image/svg+xml,1', createdAt: 1000 },
  { id: '2', name: '长发飘飘', type: 'long' as const, colorName: '棕色', colorHex: '#6B3A2A', previewUrl: 'data:image/svg+xml,2', createdAt: 2000 },
  { id: '3', name: '羊毛卷', type: 'wool' as const, colorName: '金色', colorHex: '#C4A265', previewUrl: 'data:image/svg+xml,3', createdAt: 3000 },
];

const { mockGetAllItems } = vi.hoisted(() => ({
  mockGetAllItems: vi.fn(() => Promise.resolve(mockData)),
}));

vi.mock('../../../services/libraryDB', () => ({
  getAllItems: mockGetAllItems,
  saveItem: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve()),
}));

function renderWithContext(ui: ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe('Library — with data', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the header and description', () => {
    renderWithContext(<Library />);
    expect(screen.getByText('本地素材仓库')).toBeInTheDocument();
    expect(screen.getByText(/已保存的 AR 头膜模型/)).toBeInTheDocument();
  });

  it('shows search input', () => {
    renderWithContext(<Library />);
    expect(screen.getByPlaceholderText('搜索素材...')).toBeInTheDocument();
  });

  it('renders library items after loading', async () => {
    renderWithContext(<Library />);
    expect(await screen.findByText('短发造型')).toBeInTheDocument();
    expect(screen.getByText('长发飘飘')).toBeInTheDocument();
    expect(screen.getByText('羊毛卷')).toBeInTheDocument();
  });

  it('filters items by search query', async () => {
    renderWithContext(<Library />);
    await screen.findByText('短发造型');

    const searchInput = screen.getByPlaceholderText('搜索素材...');
    fireEvent.change(searchInput, { target: { value: '长发' } });

    expect(screen.getByText('长发飘飘')).toBeInTheDocument();
    expect(screen.queryByText('短发造型')).not.toBeInTheDocument();
  });

  it('shows no-match message when search has no results', async () => {
    renderWithContext(<Library />);
    await screen.findByText('短发造型');

    const searchInput = screen.getByPlaceholderText('搜索素材...');
    fireEvent.change(searchInput, { target: { value: 'xxxxxx' } });

    expect(screen.getByText('未找到匹配素材')).toBeInTheDocument();
  });

  it('displays color dot and type for each item', async () => {
    renderWithContext(<Library />);
    await screen.findByText('短发造型');

    expect(screen.getByText('黑色')).toBeInTheDocument();
    expect(screen.getByText('short')).toBeInTheDocument();
  });

  it('delete button triggers confirm dialog', async () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithContext(<Library />);
    await screen.findByText('短发造型');

    const deleteButtons = screen.getAllByTitle('删除素材');
    expect(deleteButtons.length).toBe(3);

    fireEvent.click(deleteButtons[0]);
    expect(mockConfirm).toHaveBeenCalledWith('确定删除此素材？');

    mockConfirm.mockRestore();
  });

  it('shows clear button when search has text', async () => {
    renderWithContext(<Library />);
    await screen.findByText('短发造型');

    const searchInput = screen.getByPlaceholderText('搜索素材...');
    expect(screen.queryByTitle('清空搜索')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '长发' } });
    expect(screen.getByTitle('清空搜索')).toBeInTheDocument();
  });

  it('clear button resets search and refocuses input', async () => {
    renderWithContext(<Library />);
    await screen.findByText('短发造型');

    const searchInput = screen.getByPlaceholderText('搜索素材...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: '长发' } });

    const clearButton = screen.getByTitle('清空搜索');
    fireEvent.click(clearButton);

    expect(searchInput.value).toBe('');
    expect(screen.getByText('短发造型')).toBeInTheDocument();
    expect(screen.getByText('长发飘飘')).toBeInTheDocument();
    expect(document.activeElement).toBe(searchInput);
  });
});

describe('Library — empty', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    mockGetAllItems.mockImplementation(() => Promise.resolve([]));
  });

  it('shows empty state message when library has no items', async () => {
    renderWithContext(<Library />);
    expect(await screen.findByText('暂无素材，请先提取或生成发型')).toBeInTheDocument();
  });
});
