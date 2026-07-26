export type OnboardingRole = 'clientManager' | 'client' | 'employee' | 'superAdmin' | 'unknown';

export type OnboardingStepCode = 'personalInfo' | 'security' | 'invitations';

export type OnboardingStepStatus = 'notStarted' | 'completed' | 'skipped';

export type OnboardingView = OnboardingStepCode | 'review';
