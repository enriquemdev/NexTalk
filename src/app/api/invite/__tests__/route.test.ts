import { POST } from '../route';
import { NextResponse } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { getAuth } from '@clerk/nextjs/server';
import type { ClerkState } from '@clerk/nextjs/server';

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: () => new Headers(),
}));

// Mock Convex client
vi.mock('convex/browser', () => {
  const mockClient = {
    mutation: vi.fn(),
    query: vi.fn(),
  };
  return {
    ConvexHttpClient: vi.fn(() => mockClient),
  };
});

// Mock Clerk auth
const mockAuthObject: ClerkState = {
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  sessionClaims: {},
  sessionStatus: 'active',
  actor: null,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  has: () => false,
  debug: () => null,
};

vi.mock('@clerk/nextjs/server', () => ({
  getAuth: vi.fn(() => mockAuthObject),
}));

// Mock email sending
vi.mock('@/lib/email', () => ({
  sendRoomInviteEmail: vi.fn(() => Promise.resolve()),
}));

describe('Invite API', () => {
  let mockConvexClient: ConvexHttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConvexClient = new ConvexHttpClient('');
  });

  it('returns 401 when user is not authenticated', async () => {
    const mockUnauthenticatedObject: ClerkState = {
      ...mockAuthObject,
      userId: null,
      sessionStatus: 'signed-out',
    };
    vi.mocked(getAuth).mockReturnValueOnce(mockUnauthenticatedObject);

    const request = new Request('http://localhost/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: 'room123',
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Not authenticated');
  });

  it('returns 400 when required fields are missing', async () => {
    const request = new Request('http://localhost/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields');
  });

  it('successfully creates and sends invitation', async () => {
    // Mock successful Convex responses
    const mockToken = 'test-token';
    const mockRoom = {
      name: 'Test Room',
      _id: 'room123',
    };
    const mockUser = {
      name: 'Test User',
      _id: 'user123',
    };

    const mockMutation = vi.mocked(mockConvexClient.mutation);
    mockMutation.mockImplementation(async (mutation, args) => {
      if (mutation === api.invitations.createInvitation) {
        return { token: mockToken };
      }
      return null;
    });

    const mockQuery = vi.mocked(mockConvexClient.query);
    mockQuery.mockImplementation(async (query, args) => {
      if (query === api.rooms.get) {
        return mockRoom;
      }
      if (query === api.users.getByToken) {
        return mockUser;
      }
      return null;
    });

    const request = new Request('http://localhost/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: 'room123',
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify Convex calls
    expect(mockMutation).toHaveBeenCalledWith(
      api.invitations.createInvitation,
      expect.any(Object)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      api.rooms.get,
      expect.any(Object)
    );
    expect(mockQuery).toHaveBeenCalledWith(
      api.users.getByToken,
      expect.any(Object)
    );
  });

  it('handles invitation creation failure', async () => {
    const mockMutation = vi.mocked(mockConvexClient.mutation);
    mockMutation.mockRejectedValueOnce(new Error('Failed to create invitation'));

    const request = new Request('http://localhost/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: 'room123',
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to send invitation');
  });
}); 