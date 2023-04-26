type OktaPasswordCredential = string;

interface OktaEmailCredential {
  value: string;
  // TODO: Change these to Enums when the Okta documentation
  // actually lists the values...
  status: string;
  type: string;
}

interface OktaRecoveryQuestionCredential {
  question: string;
}

interface OktaAuthenticationIntegration {
  type: string;
  name: string;
}

export interface OktaUserCredentials {
  password: OktaPasswordCredential;
  recovery_question: OktaRecoveryQuestionCredential;
  integration: OktaAuthenticationIntegration;
  emails: OktaEmailCredential[];
}
