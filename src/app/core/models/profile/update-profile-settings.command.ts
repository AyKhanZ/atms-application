export interface UpdateProfileSettingsCommand {
  name: string;
  surname: string;
  phoneNumber: string;
  position: string;
  languageId: number;
  birthDate: string;
  genderId: number;
  maritalStatusId: number;
  avatar: File | null;
}
