export type Side = "candidate" | "recruiter";

export interface ShareLink {
  id: string;
  token: string;
  url: string;
  scope: string;
  access: string;
  label?: string;
  requireSignIn?: boolean;
  expiresAt?: string;
  createdAt?: string;
  isActive?: boolean;
  analytics?: {
    uniqueVisitors: number;
    totalConversations: number;
    totalMessages: number;
  };
}

export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  fileCount: number;
}

export interface ProfilePayload {
  workHistory: string;
  skills: string;
  policy: string;
}

export interface RolePayload {
  roleBrief: string;
  teamContext: string;
  compBand: string;
}

export interface SessionState {
  folderId?: number;
  shareLink?: ShareLink;
  profilePublished?: boolean;
  rolePublished?: boolean;
}
