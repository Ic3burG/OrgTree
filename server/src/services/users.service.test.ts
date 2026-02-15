/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as usersService from './users.service.js';
import db from '../db.js';
import bcrypt from 'bcrypt';

// Mock dependencies
vi.mock('../db.js', () => ({
  default: {
    prepare: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe('Users Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users with organization and membership counts', () => {
      const mockUsers = [
        {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          createdAt: '2024-01-01',
        },
        {
          id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'user',
          createdAt: '2024-01-02',
        },
      ];

      const mockOrgCount = { count: 2 };
      const mockMembershipCount = { count: 3 };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT\n      u.id')) {
          return {
            all: vi.fn().mockReturnValue(mockUsers),
          } as unknown as any;
        }
        if (query.includes('COUNT(*) as count\n      FROM organizations')) {
          return {
            get: vi.fn().mockReturnValue(mockOrgCount),
          } as unknown as any;
        }
        if (query.includes('COUNT(*) as count\n      FROM organization_members')) {
          return {
            get: vi.fn().mockReturnValue(mockMembershipCount),
          } as unknown as any;
        }
        return {} as unknown as any;
      });

      const result = usersService.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockUsers[0],
        organizationCount: 2,
        membershipCount: 3,
      });
      expect(result[1]).toEqual({
        ...mockUsers[1],
        organizationCount: 2,
        membershipCount: 3,
      });
    });

    it('should return empty array when no users exist', () => {
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            all: vi.fn().mockReturnValue([]),
          }) as unknown as any
      );

      const result = usersService.getAllUsers();

      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('should return user with detailed organization and membership info', () => {
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        createdAt: '2024-01-01',
      };

      const mockOrgs = [
        { id: 'org1', name: 'Org 1', isPublic: 1, createdAt: '2024-01-01' },
        { id: 'org2', name: 'Org 2', isPublic: 0, createdAt: '2024-01-02' },
      ];

      const mockMemberships = [
        {
          id: 'org3',
          name: 'Org 3',
          isPublic: 1,
          createdAt: '2024-01-03',
          role: 'editor',
          joinedAt: '2024-01-04',
        },
      ];

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (
          query.includes('SELECT id, name, email, role, created_at as createdAt\n    FROM users')
        ) {
          return {
            get: vi.fn().mockReturnValue(mockUser),
          } as unknown as any;
        }
        if (
          query.includes(
            'SELECT id, name, is_public as isPublic, created_at as createdAt\n    FROM organizations'
          )
        ) {
          return {
            all: vi.fn().mockReturnValue(mockOrgs),
          } as unknown as any;
        }
        if (query.includes('SELECT\n      o.id,\n      o.name,\n      o.is_public as isPublic')) {
          return {
            all: vi.fn().mockReturnValue(mockMemberships),
          } as unknown as any;
        }
        return {} as unknown as any;
      });

      const result = usersService.getUserById('user1');

      expect(result).toEqual({
        ...mockUser,
        ownedOrganizations: [
          { id: 'org1', name: 'Org 1', isPublic: true, createdAt: '2024-01-01' },
          { id: 'org2', name: 'Org 2', isPublic: false, createdAt: '2024-01-02' },
        ],
        memberships: [
          {
            id: 'org3',
            name: 'Org 3',
            isPublic: true,
            createdAt: '2024-01-03',
            role: 'editor',
            joinedAt: '2024-01-04',
          },
        ],
        organizationCount: 2,
        membershipCount: 1,
      });
    });

    it('should throw 404 error when user not found', () => {
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            get: vi.fn().mockReturnValue(undefined),
          }) as unknown as any
      );

      expect(() => usersService.getUserById('nonexistent')).toThrow('User not found');
      try {
        usersService.getUserById('nonexistent');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(404);
      }
    });
  });

  describe('updateUser', () => {
    it('should update user name and email', () => {
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        password_hash: 'hash',
      };

      const updatedUser = {
        id: 'user1',
        name: 'John Smith',
        email: 'johnsmith@example.com',
        role: 'user',
        createdAt: '2024-01-01',
      };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: vi.fn().mockReturnValue(mockUser) } as unknown as any;
        }
        if (query.includes('SELECT id FROM users WHERE email = ? AND id != ?')) {
          return { get: vi.fn().mockReturnValue(undefined) } as unknown as any;
        }
        if (
          query.includes(
            'UPDATE users\n    SET name = ?, email = ?, is_discoverable = ?, updated_at = ?'
          )
        ) {
          return { run: vi.fn() } as unknown as any;
        }
        if (
          query.includes(
            'SELECT id, name, email, role, created_at as createdAt, is_discoverable\n    FROM users'
          )
        ) {
          return { get: vi.fn().mockReturnValue(updatedUser) } as unknown as any;
        }
        return {} as unknown as any;
      });

      const result = usersService.updateUser('user1', {
        name: 'John Smith',
        email: 'johnsmith@example.com',
      });

      expect(result).toEqual(updatedUser);
    });

    it('should throw 404 error when user not found', () => {
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            get: vi.fn().mockReturnValue(undefined),
          }) as unknown as any
      );

      expect(() => usersService.updateUser('nonexistent', { name: 'Test' })).toThrow(
        'User not found'
      );
      try {
        usersService.updateUser('nonexistent', { name: 'Test' });
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(404);
      }
    });

    it('should throw 400 error when email already in use', () => {
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: vi.fn().mockReturnValue(mockUser) } as unknown as any;
        }
        if (query.includes('SELECT id FROM users WHERE email = ? AND id != ?')) {
          return { get: vi.fn().mockReturnValue({ id: 'user2' }) } as unknown as any;
        }
        return {} as unknown as any;
      });

      expect(() => usersService.updateUser('user1', { email: 'taken@example.com' })).toThrow(
        'Email already in use'
      );
      try {
        usersService.updateUser('user1', { email: 'taken@example.com' });
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
      }
    });

    it('should allow keeping the same email', () => {
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      const updatedUser = {
        id: 'user1',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'user',
        createdAt: '2024-01-01',
      };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: vi.fn().mockReturnValue(mockUser) } as unknown as any;
        }
        if (query.includes('UPDATE users')) {
          return { run: vi.fn() } as unknown as any;
        }
        if (query.includes('SELECT id, name, email, role')) {
          return { get: vi.fn().mockReturnValue(updatedUser) } as unknown as any;
        }
        return {} as unknown as any;
      });

      const result = usersService.updateUser('user1', {
        name: 'John Smith',
        email: 'john@example.com',
      });

      expect(result.email).toBe('john@example.com');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', () => {
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      const updatedUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        createdAt: '2024-01-01',
      };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: vi.fn().mockReturnValue(mockUser) } as unknown as any;
        }
        if (query.includes('UPDATE users\n    SET role = ?, updated_at = ?')) {
          return { run: vi.fn() } as unknown as any;
        }
        if (query.includes('SELECT id, name, email, role, created_at as createdAt')) {
          return { get: vi.fn().mockReturnValue(updatedUser) } as unknown as any;
        }
        return {} as unknown as any;
      });

      const result = usersService.updateUserRole('user1', 'admin', 'admin1');

      expect(result.role).toBe('admin');
    });

    it('should throw 400 error for invalid role', () => {
      expect(() => usersService.updateUserRole('user1', 'invalid' as any, 'admin1')).toThrow(
        'Invalid role'
      );
    });

    it('should throw 400 error when trying to change own role', () => {
      expect(() => usersService.updateUserRole('user1', 'admin', 'user1')).toThrow(
        'Cannot change your own role'
      );
      try {
        usersService.updateUserRole('user1', 'admin', 'user1');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
      }
    });

    it('should throw 404 error when user not found', () => {
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            get: vi.fn().mockReturnValue(undefined),
          }) as unknown as any
      );

      expect(() => usersService.updateUserRole('nonexistent', 'admin', 'admin1')).toThrow(
        'User not found'
      );
    });
  });

  describe('resetUserPassword', () => {
    it('should reset user password with temporary password', async () => {
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: vi.fn().mockReturnValue(mockUser) } as unknown as any;
        }
        if (query.includes('UPDATE users\n    SET password_hash = ?, must_change_password = 1')) {
          return { run: vi.fn() } as unknown as any;
        }
        return {} as unknown as any;
      });

      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as any);

      const result = await usersService.resetUserPassword('user1');

      expect(result.message).toBe('Password reset successfully');
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword).toHaveLength(16);
      // Verify password is alphanumeric
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]+$/);
      expect(bcrypt.hash).toHaveBeenCalledWith(result.temporaryPassword, 10);
    });

    it('should throw 404 error when user not found', async () => {
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            get: vi.fn().mockReturnValue(undefined),
          }) as unknown as any
      );

      await expect(usersService.resetUserPassword('nonexistent')).rejects.toThrow('User not found');
    });

    it('should generate different passwords on multiple calls', async () => {
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: vi.fn().mockReturnValue(mockUser) } as unknown as any;
        }
        if (query.includes('UPDATE users')) {
          return { run: vi.fn() } as unknown as any;
        }
        return {} as unknown as any;
      });

      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as any);

      const result1 = await usersService.resetUserPassword('user1');
      const result2 = await usersService.resetUserPassword('user1');

      expect(result1.temporaryPassword).not.toBe(result2.temporaryPassword);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', () => {
      const mockUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: vi.fn().mockReturnValue(mockUser) } as unknown as any;
        }
        if (query.includes('DELETE FROM users WHERE id = ?')) {
          return { run: vi.fn() } as unknown as any;
        }
        return {} as unknown as any;
      });

      const result = usersService.deleteUser('user1', 'admin1');

      expect(result.message).toBe('User deleted successfully');
    });

    it('should throw 400 error when trying to delete own account', () => {
      expect(() => usersService.deleteUser('user1', 'user1')).toThrow(
        'Cannot delete your own account'
      );
      try {
        usersService.deleteUser('user1', 'user1');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(400);
      }
    });

    it('should throw 404 error when user not found', () => {
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            get: vi.fn().mockReturnValue(undefined),
          }) as unknown as any
      );

      expect(() => usersService.deleteUser('nonexistent', 'admin1')).toThrow('User not found');
    });
  });

  describe('createAdminUser', () => {
    it('should create admin user with temporary password', async () => {
      const newUser = {
        id: 'user1',
        name: 'New Admin',
        email: 'admin@example.com',
        role: 'admin',
        createdAt: '2024-01-01',
      };

      vi.mocked(db.prepare).mockImplementation((query: string) => {
        if (query.includes('SELECT id FROM users WHERE email = ?')) {
          return { get: vi.fn().mockReturnValue(undefined) } as unknown as any;
        }
        if (query.includes('INSERT INTO users')) {
          return { run: vi.fn() } as unknown as any;
        }
        if (query.includes('SELECT id, name, email, role, created_at as createdAt')) {
          return { get: vi.fn().mockReturnValue(newUser) } as unknown as any;
        }
        return {} as unknown as any;
      });

      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as any);

      const result = await usersService.createAdminUser('New Admin', 'admin@example.com', 'admin');

      expect(result.user).toEqual(newUser);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword).toHaveLength(16);
      expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should throw 400 error for invalid role', async () => {
      await expect(
        usersService.createAdminUser('Test', 'test@example.com', 'invalid' as any)
      ).rejects.toThrow('Invalid role');
    });

    it('should throw 400 error when email already exists', async () => {
      vi.mocked(db.prepare).mockImplementation(
        () =>
          ({
            get: vi.fn().mockReturnValue({ id: 'existing-user' }),
          }) as unknown as any
      );

      await expect(
        usersService.createAdminUser('Test', 'existing@example.com', 'user')
      ).rejects.toThrow('Email already in use');
    });

    it('should allow creating users with different roles', async () => {
      const roles = ['user', 'admin', 'superuser'] as const;

      for (const role of roles) {
        const newUser = {
          id: `user-${role}`,
          name: `Test ${role}`,
          email: `${role}@example.com`,
          role,
          createdAt: '2024-01-01',
        };

        vi.mocked(db.prepare).mockImplementation((query: string) => {
          if (query.includes('SELECT id FROM users WHERE email = ?')) {
            return { get: vi.fn().mockReturnValue(undefined) } as unknown as any;
          }
          if (query.includes('INSERT INTO users')) {
            return { run: vi.fn() } as unknown as any;
          }
          if (query.includes('SELECT id, name, email, role')) {
            return { get: vi.fn().mockReturnValue(newUser) } as unknown as any;
          }
          return {} as unknown as any;
        });

        vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword' as any);

        const result = await usersService.createAdminUser(
          `Test ${role}`,
          `${role}@example.com`,
          role
        );

        expect(result.user.role).toBe(role);
      }
    });
  });
});
