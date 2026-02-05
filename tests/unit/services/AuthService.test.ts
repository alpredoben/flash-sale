import { AuthService } from '../../../src/app/services/auth.service';
import userRepository from '../../../src/app/repositories/user.repository';
import roleRepository from '../../../src/app/repositories/role.repository';
import tokenizer from '../../../src/shared/utils/tokenizer.util';
import caching from '../../../src/configs/caching.config';
import encryption from '../../../src/shared/utils/encryption.util';
import emailPublisher from '../../../src/events/queue/publishers/email.publisher';
import logger from '../../../src/shared/utils/logger.util';
import { En_UserStatus } from '../../../src/shared/constants/enum.constant';
import { User } from '../../../src/database/models/user.model';
import { Role } from '../../../src/database/models/role.model';
import {
  In_DTO_Register,
  In_DTO_Login,
  In_DTO_VerifyEmail,
  In_DTO_ForgotPassword,
  In_DTO_ResetPassword,
  In_DTO_ManualChangePassword,
} from '../../../src/interfaces/dto.interface';

// Mock all dependencies
jest.mock('@repositories/user.repository');
jest.mock('@repositories/role.repository');
jest.mock('@utils/tokenizer.util');
jest.mock('@config/caching.config');
jest.mock('@utils/encryption.util');
jest.mock('@/events/queue/publishers/email.publisher');
jest.mock('@utils/logger.util');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUser: Partial<User>;
  let mockRole: Partial<Role>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get singleton instance
    authService = AuthService.getInstance();

    // Setup mock role
    mockRole = {
      id: 'role_123',
      name: 'User',
      slug: 'user',
      description: 'Default user role',
      isActive: true,
    };

    // Setup mock user
    mockUser = {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'hashedPassword123',
      phone: '+1234567890',
      avatar: null,
      status: En_UserStatus.ACTIVE,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      emailVerificationAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null,
      lastLogin: new Date(),
      roles: [mockRole as Role],
      fullName: 'John Doe',
      isActive: () => true,
    };
  });

  describe('register', () => {
    const mockRegisterPayload: In_DTO_Register = {
      firstName: 'Lionel',
      lastName: 'Messi',
      email: 'lionel-messi@miami.org',
      password: 'Password123',
      confirmPassword: 'Password123',
      phone: '+1232454767',
    };

    it('should successfully register a new user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (roleRepository.findByName as jest.Mock).mockResolvedValue(mockRole);
      (encryption.hashPassword as jest.Mock).mockResolvedValue(
        'hashedPassword123'
      );
      (encryption.generateToken as jest.Mock).mockReturnValue(
        'verification-token-123'
      );
      (userRepository.store as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: En_UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
      });
      (emailPublisher.publishVerificationEmail as jest.Mock).mockResolvedValue(
        undefined
      );

      // Act
      const result = await authService.register(mockRegisterPayload);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        mockRegisterPayload.email
      );
      expect(encryption.hashPassword).toHaveBeenCalledWith(
        mockRegisterPayload.password
      );
      expect(roleRepository.findByName).toHaveBeenCalledWith('User');
      expect(userRepository.store).toHaveBeenCalled();
      expect(emailPublisher.publishVerificationEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(logger.info).toHaveBeenCalledWith(
        'User registered successfully',
        expect.any(Object)
      );
    });

    it('should throw error if email already exists', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(mockRegisterPayload)).rejects.toThrow(
        'Email already registered'
      );

      expect(userRepository.store).not.toHaveBeenCalled();
    });

    it('should throw error if passwords do not match', async () => {
      // Arrange
      const payloadWithMismatchedPassword = {
        ...mockRegisterPayload,
        confirmPassword: 'DifferentPassword123!',
      };
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.register(payloadWithMismatchedPassword)
      ).rejects.toThrow('Password do not match');
      expect(userRepository.store).not.toHaveBeenCalled();
    });

    it('should throw error if default user role not found', async () => {
      // Arrange
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (roleRepository.findByName as jest.Mock).mockResolvedValue(null);
      (encryption.hashPassword as jest.Mock).mockResolvedValue(
        'hashedPassword123'
      );

      // Act & Assert
      await expect(authService.register(mockRegisterPayload)).rejects.toThrow(
        'System role configuration error. Please contact administrator'
      );
      expect(userRepository.store).not.toHaveBeenCalled();
    });

    it('should continue registration even if email publishing fails', async () => {
      // Arrange
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (roleRepository.findByName as jest.Mock).mockResolvedValue(mockRole);
      (encryption.hashPassword as jest.Mock).mockResolvedValue(
        'hashedPassword123'
      );
      (encryption.generateToken as jest.Mock).mockReturnValue(
        'verification-token-123'
      );
      (userRepository.store as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: En_UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
      });
      (emailPublisher.publishVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Act
      const result = await authService.register(mockRegisterPayload);

      // Assert
      expect(result).toHaveProperty('user');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish verification email event',
        expect.any(Object)
      );
    });
  });
});
