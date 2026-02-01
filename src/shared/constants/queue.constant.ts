export enum Ty_EmailEventType {
  VERIFICATION = 'verification',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password reset',
  PASSWORD_CHANGED = 'password changed',
  ACCOUNT_APPROVAL = 'account approval',
}

export enum RoutingKeys {
  EMAIL_VERIFICATION = 'keys_email_verification',
  EMAIL_PASSWORD_RESET = 'keys_email_password_reset',
  EMAIL_PASSWORD_CHANGED = 'keys_email_password_changed',
  EMAIL_ACCOUNT_APPROVAL = 'keys_email_account_approval',
}
