export type ParticipantSide = 'client' | 'team';

export interface ParticipantCandidate {
  id: string;
  name: string;
  surname: string;
  email: string;
  avatarPath?: string | null;
  side: ParticipantSide;
}
