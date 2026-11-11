export interface DeveloperModel {
  id: string;
  name: string;
  color: string;
  membershipId?: string | null;
  eligibleForNewAssignment?: boolean;
}