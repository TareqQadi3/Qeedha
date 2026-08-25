import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../api', () => ({
  getToken: vi.fn(),
  getRole: vi.fn(),
}));
vi.mock('../Login', () => ({ default: () => <div data-testid="login-screen" /> }));
vi.mock('../Cashier', () => ({ default: () => <div data-testid="cashier-screen" /> }));
vi.mock('../OwnerShell', () => ({ default: () => <div data-testid="owner-shell-screen" /> }));

import { getRole, getToken } from '../api';
import App from '../App';

const mockedGetToken = vi.mocked(getToken);
const mockedGetRole = vi.mocked(getRole);

describe('App — role-based routing', () => {
  it('renders Login when there is no token, regardless of role', () => {
    mockedGetToken.mockReturnValue(null);
    mockedGetRole.mockReturnValue('OWNER');

    render(<App />);

    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('cashier-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('owner-shell-screen')).not.toBeInTheDocument();
  });

  it('renders Cashier unchanged for a CASHIER role', () => {
    mockedGetToken.mockReturnValue('tok-1');
    mockedGetRole.mockReturnValue('CASHIER');

    render(<App />);

    expect(screen.getByTestId('cashier-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('owner-shell-screen')).not.toBeInTheDocument();
  });

  it('renders OwnerShell for an OWNER role', () => {
    mockedGetToken.mockReturnValue('tok-2');
    mockedGetRole.mockReturnValue('OWNER');

    render(<App />);

    expect(screen.getByTestId('owner-shell-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('cashier-screen')).not.toBeInTheDocument();
  });

  it('renders OwnerShell for a MANAGER role', () => {
    mockedGetToken.mockReturnValue('tok-3');
    mockedGetRole.mockReturnValue('MANAGER');

    render(<App />);

    expect(screen.getByTestId('owner-shell-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('cashier-screen')).not.toBeInTheDocument();
  });
});
