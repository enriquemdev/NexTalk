import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InviteButton } from './invite-button';
import { toast } from '@/components/ui/use-toast';
import { Id } from '../../../convex/_generated/dataModel';
import userEvent from '@testing-library/user-event';

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock dialog components
interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: DialogProps) => <div data-testid="dialog">{children}</div>,
  DialogTrigger: ({ children }: DialogProps) => <div data-testid="dialog-trigger">{children}</div>,
  DialogContent: ({ children }: DialogProps) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: DialogProps) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: DialogProps) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: DialogProps) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: DialogProps) => <div data-testid="dialog-footer">{children}</div>,
}));

describe('InviteButton', () => {
  const mockRoomId = 'room123' as Id<"rooms">;
  const mockEmail = 'test@example.com';
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders invite button', () => {
    render(<InviteButton roomId={mockRoomId} />);
    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
  });

  it('opens dialog when clicked', async () => {
    const user = userEvent.setup();
    render(<InviteButton roomId={mockRoomId} />);
    const button = screen.getByRole('button', { name: /invite/i });
    await user.click(button);
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  it('validates email input', async () => {
    const user = userEvent.setup();
    render(<InviteButton roomId={mockRoomId} />);
    const button = screen.getByRole('button', { name: /invite/i });
    await user.click(button);

    const emailInput = screen.getByPlaceholderText(/email/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /send invitation/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  it('handles successful invitation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const user = userEvent.setup();
    render(<InviteButton roomId={mockRoomId} />);
    const button = screen.getByRole('button', { name: /invite/i });
    await user.click(button);

    const emailInput = screen.getByPlaceholderText(/email/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /send invitation/i });

    await user.type(emailInput, mockEmail);
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Invitation sent successfully',
      });
    });
  });

  it('handles API error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const user = userEvent.setup();
    render(<InviteButton roomId={mockRoomId} />);
    const button = screen.getByRole('button', { name: /invite/i });
    await user.click(button);

    const emailInput = screen.getByPlaceholderText(/email/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /send invitation/i });

    await user.type(emailInput, mockEmail);
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send invitation',
      });
    });
  });
}); 