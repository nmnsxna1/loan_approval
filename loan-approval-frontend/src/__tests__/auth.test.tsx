import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';

function TestConsumer() {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
      {user && <span data-testid="user-role">{user.role}</span>}
      {user && <span data-testid="user-name">{user.username}</span>}
      <button data-testid="login-btn" onClick={() => login('test', 'pass').catch(() => {})}>Login</button>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides unauthenticated state when no user in localStorage', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out');
  });

  it('restores user from localStorage on mount', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ username: 'stored', email: 's@t.com', role: 'APPLICANT' }));

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-in');
    expect(screen.getByTestId('user-role').textContent).toBe('APPLICANT');
    expect(screen.getByTestId('user-name').textContent).toBe('stored');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', 'not-valid-json');

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out');
  });

  it('useAuth throws when used outside AuthProvider', () => {
    expect(() => render(
      <MemoryRouter>
        <TestConsumer />
      </MemoryRouter>
    )).toThrow('useAuth must be used within AuthProvider');
  });

  it('logout clears localStorage and sets user to null', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ username: 't', email: 't@t.com', role: 'APPLICANT' }));

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('logged-in');
    fireEvent.click(screen.getByTestId('logout-btn'));
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
