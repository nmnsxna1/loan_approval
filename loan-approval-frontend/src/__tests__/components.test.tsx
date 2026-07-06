import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { CardSkeleton, TableSkeleton } from '../components/LoadingSkeleton';
import SearchBar from '../components/SearchBar';
import ConfirmDialog from '../components/ConfirmDialog';
import ProtectedRoute from '../components/ProtectedRoute';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

describe('StatusBadge', () => {
  it('renders APPROVED status uppercase', () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
  });

  it('renders DRAFT status', () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('renders REJECTED status', () => {
    render(<StatusBadge status="REJECTED" />);
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
  });

  it('replaces underscores with spaces', () => {
    render(<StatusBadge status="UNDER_REVIEW" />);
    expect(screen.getByText('UNDER REVIEW')).toBeInTheDocument();
  });

  it('renders SUBMITTED with blue styling', () => {
    render(<StatusBadge status="SUBMITTED" />);
    const badge = screen.getByText('SUBMITTED');
    expect(badge.className).toContain('bg-blue');
  });

  it('renders APPROVED with green styling', () => {
    render(<StatusBadge status="APPROVED" />);
    const badge = screen.getByText('APPROVED');
    expect(badge.className).toContain('bg-green');
  });

  it('renders ESCALATED with purple styling', () => {
    render(<StatusBadge status="ESCALATED" />);
    const badge = screen.getByText('ESCALATED');
    expect(badge.className).toContain('bg-purple');
  });

  it('renders unknown status with gray fallback styling', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    const badge = screen.getByText('UNKNOWN STATUS');
    expect(badge.className).toContain('bg-gray');
  });

  it('handles empty status string', () => {
    const { container } = render(<StatusBadge status="" />);
    expect(container.textContent).toBe('');
  });
});

describe('EmptyState', () => {
  it('renders with title', () => {
    render(<EmptyState title="No applications found" />);
    expect(screen.getByText('No applications found')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(<EmptyState title="Empty" description="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<EmptyState title="Empty" />);
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
  });
});

describe('Pagination', () => {
  it('renders page and total info', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument();
  });

  it('disables prev button on first page', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toBeDisabled();
  });

  it('disables both buttons when totalPages is 1', () => {
    render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('disables both buttons when totalPages is 0', () => {
    render(<Pagination page={1} totalPages={0} onPageChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('calls onPageChange with page-1 when prev clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with page+1 when next clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});

describe('CardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });
});

describe('TableSkeleton', () => {
  it('renders default 5 rows', () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll('.h-12');
    expect(rows.length).toBe(5);
  });

  it('renders custom row count', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    const rows = container.querySelectorAll('.h-12');
    expect(rows.length).toBe(3);
  });

  it('renders 0 rows when rows is 0', () => {
    const { container } = render(<TableSkeleton rows={0} />);
    const rows = container.querySelectorAll('.h-12');
    expect(rows.length).toBe(0);
  });

  it('renders 0 rows when rows is negative', () => {
    const { container } = render(<TableSkeleton rows={-1} />);
    const rows = container.querySelectorAll('.h-12');
    expect(rows.length).toBe(0);
  });
});

describe('SearchBar', () => {
  it('renders with default placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} placeholder="Find apps..." />);
    expect(screen.getByPlaceholderText('Find apps...')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<SearchBar value="test" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test');
  });

  it('calls onChange on user input', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('renders a search icon', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
  });
});

describe('ConfirmDialog', () => {
  it('returns null when closed', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Test" message="Test" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when open', () => {
    render(
      <ConfirmDialog open={true} title="Delete?" message="Are you sure?" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText('Delete?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders danger variant by default', () => {
    render(
      <ConfirmDialog open={true} title="Delete?" message="Sure?" onConfirm={() => {}} onCancel={() => {}} />
    );
    const confirmBtn = screen.getByText('Confirm');
    expect(confirmBtn.className).toContain('bg-red');
  });

  it('renders warning variant', () => {
    render(
      <ConfirmDialog open={true} title="Warning" message="Careful" variant="warning" onConfirm={() => {}} onCancel={() => {}} />
    );
    const confirmBtn = screen.getByText('Confirm');
    expect(confirmBtn.className).toContain('bg-yellow');
  });

  it('renders info variant', () => {
    render(
      <ConfirmDialog open={true} title="Info" message="FYI" variant="info" onConfirm={() => {}} onCancel={() => {}} />
    );
    const confirmBtn = screen.getByText('Confirm');
    expect(confirmBtn.className).toContain('bg-blue');
  });

  it('uses custom labels', () => {
    render(
      <ConfirmDialog open={true} title="Test" message="Test" confirmLabel="Yes" cancelLabel="No" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open={true} title="Test" message="Test" onConfirm={onConfirm} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open={true} title="Test" message="Test" onConfirm={onConfirm} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel when X button clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open={true} title="Test" message="Test" onConfirm={() => {}} onCancel={onCancel} />
    );
    const xButton = screen.getByRole('button', { name: '' });
    const allButtons = screen.getAllByRole('button');
    const xBtn = allButtons.find(b => b.innerHTML.includes('svg') || b.querySelector('svg'));
    if (xBtn) fireEvent.click(xBtn);
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('ProtectedRoute', () => {
  it('renders without crashing when unauthenticated', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const { container } = render(
      <MemoryRouter initialEntries={['/applicant']}>
        <AuthProvider>
          <ProtectedRoute />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing when unauthorized role', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ username: 'test', email: 'test@test.com', role: 'APPLICANT' }));

    const { container } = render(
      <MemoryRouter initialEntries={['/main-manager']}>
        <AuthProvider>
          <ProtectedRoute roles={['MAIN_MANAGER']} />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing when authorized', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ username: 'test', email: 'test@test.com', role: 'MAIN_MANAGER' }));

    const { container } = render(
      <MemoryRouter initialEntries={['/main-manager']}>
        <AuthProvider>
          <ProtectedRoute roles={['MAIN_MANAGER']} />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
