import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/Login';

vi.mock('../api/axios', () => {
  const mockAxios = {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    },
  };
  return mockAxios;
});

import api from '../api/axios';

describe('Login Page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders login form with username and password fields', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('renders demo credentials section', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Demo Credentials/)).toBeInTheDocument();
  });

  it('shows loading state on submit', async () => {
    (api.post as any).mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'test' } });
    fireEvent.change(inputs[1], { target: { value: 'pass' } });
    fireEvent.click(screen.getByText('Sign In'));

    expect(await screen.findByText('Signing in...')).toBeInTheDocument();
  });

  it('calls login API on form submit', async () => {
    (api.post as any).mockResolvedValue({
      data: { token: 't', username: 'test', email: 't@t.com', role: 'APPLICANT' },
    });

    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'test' } });
    fireEvent.change(inputs[1], { target: { value: 'pass' } });
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', { username: 'test', password: 'pass' });
    });
  });
});
