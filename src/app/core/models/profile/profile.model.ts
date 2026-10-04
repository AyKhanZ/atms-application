export interface ProfileModel {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  position: string | null;
  languageId: number;
  birthDate: string | null;
  genderId: number | null;
  maritalStatusId: number | null;
  avatarPath: string;
}
