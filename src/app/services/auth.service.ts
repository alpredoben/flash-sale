import { In_AuthResponse } from '@/interfaces/auth.interface';
import {
  In_DTO_ForgotPassword,
  In_DTO_Login,
  In_DTO_ManualChangePassword,
  In_DTO_Register,
  In_DTO_ResetPassword,
  In_DTO_VerifyEmail,
} from '@/interfaces/dto.interface';
import userRepository from '@repositories/user.repository';
import roleRepository from '@repositories/role.repository';
import logger from '@utils/logger.util';
import { User } from '@/database/models/user.model';
import { En_UserStatus } from '@/shared/constants/enum.constant';
import { Role } from '@/database/models/role.model';
import tokenizer from '@utils/tokenizer.util';
import caching from '@config/caching.config';
import encryption from '@utils/encryption.util';

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async makeAuthResponse(user: User): Promise<In_AuthResponse> {
    const roleNames = user.roles.map((r: Role) => r.name);

    const payload = {
      userId: user.id,
      email: user.email,
      roles: roleNames,
    };

    // Generate tokens
    const accessToken = tokenizer.generateAccessToken({
      ...payload,
      type: 'access',
    });

    const refreshToken = tokenizer.generateAccessToken({
      ...payload,
      type: 'refresh',
    });

    // Caching payload user
    await caching.cacheUser(
      user.id,
      {
        id: user.id,
        email: user.email,
        lastName: user.lastName,
        roles: roleNames,
        isActive: user.isActive(),
        isEmailVerified: user.emailVerified,
        status: user.status,
      },
      1800 // 30 minutes
    );

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? null,
        avatar: user.avatar ?? null,
        roles: roleNames,
        status: user.status,
        emailVerified: user.emailVerified,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 1500, //tokenizer.getAccessTokenExpiration(),
      },
    };
  }

  /** Register user */
  async register(payload: In_DTO_Register): Promise<In_AuthResponse> {
    try {
      const existingUser = await userRepository.findByEmail(payload.email);

      if (existingUser) {
        throw new Error('Email already registered');
      }

      // validate password
      if (payload.password !== payload.confirmPassword) {
        throw new Error('Password do not match');
      }

      const hashPassword = await encryption.hashPassword(payload.password);

      const emailVerified = {
        token: encryption.generateToken(32),
        expires: new Date(),
      };

      emailVerified.expires.setHours(emailVerified.expires.getHours() + 24);

      // find default user role
      let userRole = await roleRepository.findByName('User');
      if (!userRole) {
        logger.warn('Default user role not found. Please creating one');
        throw new Error(
          'System role configuration error. Please contact administrator'
        );
      }

      // Create user
      const user = await userRepository.store({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email.toLowerCase(),
        password: hashPassword,
        phone: payload.phone,
        status: En_UserStatus.PENDING_VERIFICATION,
        emailVerified: false,
        roles: [userRole],
      } as Partial<User>);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
      });

      return await this.makeAuthResponse(user);
    } catch (error) {
      logger.error('Error during registration', {
        email: payload.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Login user */
  async login(payload: In_DTO_Login): Promise<In_AuthResponse> {
    try {
      // Find user with password
      const user = await userRepository.findByEmailWithPassword(payload.email);

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status === En_UserStatus.BANNED) {
        throw new Error('Your account has been banned');
      }

      if (user.status === En_UserStatus.SUSPENDED) {
        throw new Error('Your account has been suspended');
      }

      // Verify password
      const isPasswordValid = await encryption.comparePassword(
        payload.password,
        user.password
      );
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await userRepository.updateLastLogin(user.id);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      // Generate tokens
      return await this.makeAuthResponse(user);
    } catch (error) {
      logger.error('Error during login', {
        email: payload.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Refresh access token */
  async refreshToken(token: string): Promise<In_AuthResponse> {
    try {
      const decoded = tokenizer.verifyRefreshToken(token);

      const isBlacklisted = await caching.exists(`blacklist:${token}`, {
        prefix: '',
      });

      if (isBlacklisted) {
        throw new Error('Refresh token has been blacklisted');
      }

      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (
        user.status !== En_UserStatus.ACTIVE &&
        user.status !== En_UserStatus.PENDING_VERIFICATION
      ) {
        throw new Error('User account is not activated');
      }

      logger.info('Token refreshed successfully', { userId: user.id });

      return await this.makeAuthResponse(user);
    } catch (error) {
      logger.error('Error refreshing token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Logout user */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      // Blacklist access token
      const accessLifetime = tokenizer.getTokenLifetime(accessToken);

      if (accessLifetime > 0) {
        await caching.set(`blacklist:${accessToken}`, true, {
          ttl: accessLifetime,
          prefix: '',
        });
      }

      // Blacklist refresh token
      if (refreshToken) {
        const refreshLifetime = tokenizer.getTokenLifetime(refreshToken);
        if (refreshLifetime > 0) {
          await caching.set(`blacklisted:${refreshLifetime}`, true, {
            ttl: refreshLifetime,
            prefix: '',
          });
        }
      }

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Error during logout', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Verify email */
  async verifyEmail(payload: In_DTO_VerifyEmail): Promise<User> {
    try {
      const user = await userRepository.findByEmailVerificationToken(
        payload.token
      );

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      // Verify email
      const verifiedUser = await userRepository.verifyEmail(user.id);

      if (!verifiedUser) {
        throw new Error('Failed to verify email');
      }

      if (verifiedUser.status == En_UserStatus.PENDING_VERIFICATION) {
        await userRepository.update(user.id, {
          status: En_UserStatus.ACTIVE,
        });
      }

      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
      });

      return verifiedUser;
    } catch (error) {
      logger.error('Error verifying email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Request password reset */
  async forgotPassword(payload: In_DTO_ForgotPassword): Promise<void> {
    try {
      // Find user by email
      const user = await userRepository.findByEmail(payload.email);
      if (!user) {
        // Don't reveal if email exists
        logger.info('Password reset requested for non-existent email', {
          email: payload.email,
        });
        return;
      }

      // Generate reset token
      const passwordResetToken = encryption.generateToken(32);
      const passwordResetExpires = new Date();
      passwordResetExpires.setHours(passwordResetExpires.getHours() + 1); // 1 hour

      // Update user with reset token
      await userRepository.update(user.id, {
        passwordResetToken,
        passwordResetExpires,
      });

      logger.info('Password reset requested', {
        userId: user.id,
        email: user.email,
      });

      // TODO: Send password reset email
      // await emailService.sendPasswordResetEmail(user.email, passwordResetToken);
    } catch (error) {
      logger.error('Error requesting password reset', {
        email: payload.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Reset password */
  async resetPassword(payload: In_DTO_ResetPassword): Promise<void> {
    try {
      // Validate password match
      if (payload.password !== payload.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Find user by reset token
      const user = await userRepository.findByPasswordResetToken(payload.token);
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await encryption.hashPassword(payload.password);

      // Update password and clear reset token
      await userRepository.update(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      logger.info('Password reset successfully', {
        userId: user.id,
        email: user.email,
      });

      // Send password changed notification email
      // await emailService.sendPasswordChangedEmail(user.email);
    } catch (error) {
      logger.error('Error resetting password', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Manual change password (authenticated user)*/
  async changePassword(
    userId: string,
    payload: In_DTO_ManualChangePassword
  ): Promise<void> {
    try {
      // Validate password match
      if (payload.newPassword !== payload.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Get user with password
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user with password for verification
      const userWithPassword = await userRepository.findByEmailWithPassword(
        user.email
      );
      if (!userWithPassword) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await encryption.comparePassword(
        payload.currentPassword,
        userWithPassword.password
      );

      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await encryption.hashPassword(payload.newPassword);

      // Update password
      await userRepository.update(userId, {
        password: hashedPassword,
      });

      // Invalidate user cache
      await caching.invalidateUser(userId);

      logger.info('Password changed successfully', {
        userId,
      });

      // Send password changed notification email
      // await emailService.sendPasswordChangedEmail(user.email);
    } catch (error) {
      logger.error('Error changing password', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Get current user profile */
  async getMe(userId: string): Promise<User> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error getting user profile', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default AuthService.getInstance();
