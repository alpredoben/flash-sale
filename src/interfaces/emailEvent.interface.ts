import { Ty_EmailEventType } from '@constants/queue.constant';

export interface In_BaseEmailEvent {
  type: Ty_EmailEventType;
  to: string;
  data: Record<string, any>;
  metadata?: {
    userId?: string;
    timestamp?: number;
    retryCount?: number;
    [key: string]: any;
  };
}

export interface In_EmailVerificationEvent extends In_BaseEmailEvent {
  type: Ty_EmailEventType.VERIFICATION;
  data: {
    userName: string;
    verificationToken: string;
    expiresAt: Date;
    verificationUrl?: string;
    customMessage?: string;
  };
}

export interface In_WelcomeEmailEvent extends In_BaseEmailEvent {
  type: Ty_EmailEventType.WELCOME;
  data: {
    userName: string;
    loginUrl?: string;
    gettingStartedUrl?: string;
    userRole?: string;
    specialOffer?: string;
  };
}

export interface In_PasswordResetEvent extends In_BaseEmailEvent {
  type: Ty_EmailEventType.PASSWORD_RESET;
  data: {
    userName: string;
    resetToken: string;
    expiresAt: Date;
    resetUrl?: string;
    requestIp?: string;
    requestDevice?: string;
    requestLocation?: string;
  };
}

export interface In_PasswordChangedEvent extends In_BaseEmailEvent {
  type: Ty_EmailEventType.PASSWORD_CHANGED;
  data: {
    userName: string;
    changedAt?: Date;
    changedFrom?: 'reset_link' | 'settings_page' | 'forced_reset' | string;
    changeIp?: string;
    changeDevice?: string;
    supportUrl?: string;
    securityTips?: string[];
  };
}

export interface In_AccountApprovalEvent extends In_BaseEmailEvent {
  type: Ty_EmailEventType.ACCOUNT_APPROVAL;
  data: {
    userName: string;
    loginUrl?: string;
    approvedBy?: string;
    approvedAt?: Date;
    accountType?: string;
    welcomeMessage?: string;
    nextSteps?: string[];
    featuresAvailable?: string[];
  };
}

export interface In_GenericEmailEvent extends In_BaseEmailEvent {
  type: Ty_EmailEventType;
  data: {
    subject?: string;
    message?: string;
    templateName?: string;
    templateVars?: Record<string, any>;
    [key: string]: any;
  };
}

export interface In_BulkEmailEvent {
  type: Ty_EmailEventType;
  recipients: Array<{
    to: string;
    data: Record<string, any>;
    metadata?: Record<string, any>;
  }>;
  metadata?: {
    batchId?: string;
    timestamp?: number;
    priority?: 'high' | 'normal' | 'low';
    sendDelay?: number;
    [key: string]: any;
  };
}

export interface In_EmailEventWithAttachments extends In_BaseEmailEvent {
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
    encoding?: string;
    contentDisposition?: 'attachment' | 'inline';
    cid?: string;
  }>;
}

export type Ty_EmailEvent =
  | In_EmailVerificationEvent
  | In_WelcomeEmailEvent
  | In_PasswordResetEvent
  | In_PasswordChangedEvent
  | In_AccountApprovalEvent
  | In_GenericEmailEvent;

export type EmailEventHandler = (event: Ty_EmailEvent) => Promise<void>;

export type EmailEventValidator = (event: Ty_EmailEvent) => boolean;

export function isEmailVerificationEvent(
  event: Ty_EmailEvent
): event is In_EmailVerificationEvent {
  return event.type === Ty_EmailEventType.VERIFICATION;
}

export function isWelcomeEmailEvent(
  event: Ty_EmailEvent
): event is In_WelcomeEmailEvent {
  return event.type === Ty_EmailEventType.WELCOME;
}

export function isPasswordResetEvent(
  event: Ty_EmailEvent
): event is In_PasswordResetEvent {
  return event.type === Ty_EmailEventType.PASSWORD_RESET;
}

export function isPasswordChangedEvent(
  event: Ty_EmailEvent
): event is In_PasswordChangedEvent {
  return event.type === Ty_EmailEventType.PASSWORD_CHANGED;
}

export function isAccountApprovalEvent(
  event: Ty_EmailEvent
): event is In_AccountApprovalEvent {
  return event.type === Ty_EmailEventType.ACCOUNT_APPROVAL;
}
export function validateEmailEvent(event: any): event is Ty_EmailEvent {
  if (!event || typeof event !== 'object') return false;
  if (!event.type || !event.to || !event.data) return false;
  if (typeof event.to !== 'string') return false;
  if (typeof event.data !== 'object') return false;

  return true;
}

export function createEmailEvent<T extends Ty_EmailEvent>(event: T): T {
  if (!validateEmailEvent(event)) {
    throw new Error('Invalid email event structure');
  }
  return event;
}
