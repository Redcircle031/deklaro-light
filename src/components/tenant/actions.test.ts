import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { exportAuditLogsAsCsv, getAuditLogs, getTenantContext, validateUserRole, authorizeTenantOwner, updateUserProfile } from './actions';
import prismaClient from '../../lib/prisma';

// Mock Prisma client
vi.mock('../../lib/prisma', () => {
  const mockPrisma = {
    $transaction: vi.fn(),
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    tenantUser: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    tenant: {
      create: vi.fn(),
    },
  };
  return {
    default: mockPrisma,
  };
});

declare global {
  var getActionContext: Mock;
}

global.getActionContext = vi.fn();

describe('Helper Functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTenantContext', () => {
    it('should throw an error if no active tenant is selected', async () => {
      await expect(getTenantContext()).rejects.toThrow('No active tenant selected.');
    });

    it('should return user and activeTenantId if valid', async () => {
      const mockContext = { user: { id: 'user1' }, activeTenantId: 'tenant1' };
      global.getActionContext.mockResolvedValue(mockContext);

      const result = await getTenantContext();
      expect(result).toEqual(mockContext);
    });
  });

  describe('validateUserRole', () => {
    it('should throw an error if user does not have the required role', async () => {
      vi.mocked(prismaClient.tenantUser.findUnique).mockResolvedValue(null);

      await expect(validateUserRole('user1', 'tenant1', 'OWNER')).rejects.toThrow('User does not have the required role: OWNER');
    });

    it('should return user membership if valid', async () => {
      const mockMembership = { role: 'OWNER' };
      vi.mocked(prismaClient.tenantUser.findUnique).mockResolvedValue(mockMembership as any);

      const result = await validateUserRole('user1', 'tenant1', 'OWNER');
      expect(result).toEqual(mockMembership);
    });
  });

  describe('authorizeTenantOwner', () => {
    const mockOwner = { id: 'owner-user-id' };
    const mockMember = { id: 'member-user-id' };
    const mockTenantId = 'tenant-id';

    it('should throw an error if the current user is not an OWNER', async () => {
      global.getActionContext.mockResolvedValue({ user: mockOwner, activeTenantId: mockTenantId });
      vi.mocked(prismaClient.tenantUser.findUnique).mockResolvedValue({ role: 'ACCOUNTANT' } as any); // Not an owner

      await expect(authorizeTenantOwner(mockMember.id)).rejects.toThrow(
        'You do not have permission to perform this action.',
      );
    });

    it('should succeed if the current user is an OWNER and targets another user', async () => {
      global.getActionContext.mockResolvedValue({ user: mockOwner, activeTenantId: mockTenantId });
      vi.mocked(prismaClient.tenantUser.findUnique).mockResolvedValue({ role: 'OWNER' } as any);

      const result = await authorizeTenantOwner(mockMember.id);

      expect(result).toEqual({ currentUser: mockOwner, activeTenantId: mockTenantId });
    });

    it('should throw an error if the last owner tries to remove themselves', async () => {
      global.getActionContext.mockResolvedValue({ user: mockOwner, activeTenantId: mockTenantId });
      vi.mocked(prismaClient.tenantUser.findUnique).mockResolvedValue({ role: 'OWNER' } as any);
      vi.mocked(prismaClient.tenantUser.count).mockResolvedValue(1); // Only one owner

      await expect(authorizeTenantOwner(mockOwner.id)).rejects.toThrow(
        'You cannot remove or demote the last owner of the tenant.',
      );
    });

    it('should throw an error if the last owner tries to demote themselves', async () => {
      global.getActionContext.mockResolvedValue({ user: mockOwner, activeTenantId: mockTenantId });
      vi.mocked(prismaClient.tenantUser.findUnique).mockResolvedValue({ role: 'OWNER' } as any);
      vi.mocked(prismaClient.tenantUser.count).mockResolvedValue(1); // Only one owner

      await expect(authorizeTenantOwner(mockOwner.id, 'ACCOUNTANT')).rejects.toThrow(
        'You cannot remove or demote the last owner of the tenant.',
      );
    });

    it('should succeed if an owner removes themselves when other owners exist', async () => {
      global.getActionContext.mockResolvedValue({ user: mockOwner, activeTenantId: mockTenantId });
      vi.mocked(prismaClient.tenantUser.findUnique).mockResolvedValue({ role: 'OWNER' } as any);
      vi.mocked(prismaClient.tenantUser.count).mockResolvedValue(2); // More than one owner

      const result = await authorizeTenantOwner(mockOwner.id);
      expect(result).toEqual({ currentUser: mockOwner, activeTenantId: mockTenantId });
    });

    it('should succeed if an owner demotes themselves when other owners exist', async () => {
      global.getActionContext.mockResolvedValue({ user: mockOwner, activeTenantId: mockTenantId });
      vi.mocked(prismaClient.tenantUser.findUnique).mockResolvedValue({ role: 'OWNER' } as any);
      vi.mocked(prismaClient.tenantUser.count).mockResolvedValue(2); // More than one owner

      const result = await authorizeTenantOwner(mockOwner.id, 'ACCOUNTANT');
      expect(result).toEqual({ currentUser: mockOwner, activeTenantId: mockTenantId });
    });
  });

  describe('getAuditLogs', () => {
    const mockTenantId = 'tenant-123';
    const mockLogs = [{ id: 'log-1', action: 'user.login' }];

    it('should fetch audit logs with correct pagination', async () => {
      // Arrange
      global.getActionContext.mockResolvedValue({ activeTenantId: mockTenantId });
      vi.mocked(prismaClient.$transaction).mockResolvedValue([mockLogs, 100]);

      // Act
      const result = await getAuditLogs(2, 20);

      // Assert
      expect(prismaClient.auditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { createdAt: 'desc' },
        skip: 20, // (page 2 - 1) * 20
        take: 20,
      });
      expect(prismaClient.auditLog.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
      expect(result).toEqual({ logs: mockLogs, totalCount: 100 });
    });

    it('should return an error message if fetching fails', async () => {
      // Arrange
      const authError = new Error('No active tenant selected.');
      global.getActionContext.mockRejectedValue(authError);

      // Act
      const result = await getAuditLogs();

      // Assert
      expect(result).toEqual({ message: 'No active tenant selected.' });
      expect(prismaClient.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getAuditLogs date range filtering', () => {
    const mockTenantId = 'tenant-123';

    beforeEach(() => {
      global.getActionContext.mockResolvedValue({ activeTenantId: mockTenantId });
      vi.mocked(prismaClient.$transaction).mockResolvedValue([[], 0]);
    });

    it('should apply start and end date filters to the where clause', async () => {
      // Arrange
      const filters = {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
      };

      // Act
      await getAuditLogs(1, 15, 'createdAt', 'desc', filters);

      // Assert
      const expectedWhereClause = {
        tenantId: mockTenantId,
        createdAt: { gte: new Date('2025-10-01'), lte: new Date('2025-11-01') }, // endDate is inclusive
      };
      expect(prismaClient.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhereClause }))
      expect(prismaClient.auditLog.count).toHaveBeenCalledWith({ where: expectedWhereClause })
    })
  })

  describe('exportAuditLogsAsCsv', () => {
    const mockTenantId = 'tenant-123'
    const mockLogs = [
      {
        id: 'log-1',
        action: 'user.invite',
        userId: 'user-1',
        entityId: 'user-2',
        entityType: 'user',
        createdAt: new Date('2025-10-26T10:00:00.000Z'),
        ipAddress: '192.168.1.1',
        tenantId: mockTenantId,
        metadata: null,
        changes: null,
        userAgent: null,
      },
      {
        id: 'log-2',
        action: 'invoice.approve',
        userId: 'user-1',
        entityId: 'invoice-5',
        entityType: 'invoice',
        createdAt: new Date('2025-10-26T11:00:00.000Z'),
        ipAddress: '192.168.1.1',
        tenantId: mockTenantId,
        metadata: null,
        changes: null,
        userAgent: null,
      },
    ]

    it('should return a correctly formatted CSV string', async () => {
      // Arrange
      global.getActionContext.mockResolvedValue({ activeTenantId: mockTenantId })
      vi.mocked(prismaClient.auditLog.findMany).mockResolvedValue(mockLogs)

      // Act
      const result = await exportAuditLogsAsCsv()

      // Assert
      expect(result.success).toBe(true)
      if ('csvContent' in result) {
        expect(result.csvContent).toContain('id,action,userId,entityId,entityType,createdAt,ipAddress')
        expect(result.csvContent).toContain('"log-1","user.invite","user-1","user-2","user","2025-10-26T10:00:00.000Z","192.168.1.1"')
        expect(result.csvContent).toContain('"log-2","invoice.approve","user-1","invoice-5","invoice","2025-10-26T11:00:00.000Z","192.168.1.1"')
      }
    })
  })

  describe('getAuditLogs sorting', () => {
    const mockTenantId = 'tenant-123'

    beforeEach(() => {
      global.getActionContext.mockResolvedValue({ activeTenantId: mockTenantId })
      vi.mocked(prismaClient.$transaction).mockResolvedValue([[], 0])
    })

    it('should sort by action in ascending order', async () => {
      // Act
      await getAuditLogs(1, 15, 'action', 'asc')

      // Assert
      expect(prismaClient.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            action: 'asc',
          },
        }),
      )
    })

    it('should sort by userId in descending order', async () => {
      // Act
      await getAuditLogs(1, 15, 'userId', 'desc')

      // Assert
      expect(prismaClient.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            userId: 'desc',
          },
        }),
      )
    })

    it('should default to sorting by createdAt if an invalid column is provided', async () => {
      // Act
      await getAuditLogs(1, 15, 'invalidColumn', 'asc')

      // Assert
      expect(prismaClient.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'asc',
          },
        }),
      )
    })
  })

  describe('updateUserProfile', () => {
    const mockUpdateUser = vi.fn()
    const mockSupabase = {
      auth: {
        updateUser: mockUpdateUser,
      },
    }

    beforeEach(() => {
      mockUpdateUser.mockClear()
      global.getActionContext.mockResolvedValue({ supabase: mockSupabase })
    })

    it('should update the user profile successfully', async () => {
      // Arrange
      mockUpdateUser.mockResolvedValue({ error: null })
      const formData = new FormData()
      formData.append('fullName', 'John Doe')

      // Act
      const result = await updateUserProfile(null, formData)

      // Assert
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: { full_name: 'John Doe' },
      })
      expect(result).toEqual({ message: 'Profile updated successfully.', success: true })
    })

    it('should return an error for an invalid full name', async () => {
      // Arrange
      const formData = new FormData()
      formData.append('fullName', 'J')

      // Act
      const result = await updateUserProfile(null, formData)

      // Assert
      expect(mockUpdateUser).not.toHaveBeenCalled()
      expect(result).toEqual({ message: 'Full name must be at least 2 characters long.' })
    })

    it('should return an error if Supabase fails to update', async () => {
      // Arrange
      const supabaseError = new Error('Supabase error')
      mockUpdateUser.mockResolvedValue({ error: supabaseError })
      const formData = new FormData()
      formData.append('fullName', 'Jane Doe')

      // Act
      const result = await updateUserProfile(null, formData)

      // Assert
      expect(result).toEqual({ message: 'Supabase error' })
    })
  })
});