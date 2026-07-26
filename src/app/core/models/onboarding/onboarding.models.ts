import {
  OnboardingRole,
  OnboardingStepCode,
  OnboardingStepStatus,
  OnboardingView,
} from './onboarding.types';

export interface OnboardingStepModel {
  code: OnboardingStepCode;
  status: OnboardingStepStatus;
  required: boolean;
}

export interface OnboardingPersonalInfoModel {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  position: string | null;
  languageId: number | null;
  avatarPath: string | null;
  avatarUploaded: boolean;
  birthDate: string | null;
  genderId: number | null;
  maritalStatusId: number | null;
}

export interface OnboardingInvitedUserModel {
  id: string;
  name: string;
  surname: string;
  email: string;
}

export interface OnboardingModel {
  role: OnboardingRole;
  currentStep: OnboardingView | 'complete';
  version: number;
  updatedAt: string;
  securityCompleted: boolean;
  steps: OnboardingStepModel[];
  personalInfo: OnboardingPersonalInfoModel;
  invitedUsers: OnboardingInvitedUserModel[];
  maxInvitations: number;
}

export interface OnboardingCompletionModel {
  accessToken: string;
  accessTokenExpireTime: string;
  invitationsQueued: number;
}
