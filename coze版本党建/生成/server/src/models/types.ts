export interface CommitteeMember {
  position: string;
  name: string;
}

export interface BranchRecord {
  id: number;
  name: string;
  code: string;
  description: string;
  establish_date: string;
  renewal_reminder_date: string;
  secretary_id?: number;
  secretary_name: string;
  status: string;
  committee_members: CommitteeMember[];
}

export interface MemberRecord {
  id: number;
  name: string;
  gender: string;
  birthday: string;
  department: string;
  position: string;
  political_status: string;
  join_date: string;
  regular_date: string;
  last_fee_month: string;
  status: string;
  branch_id: number;
  phone: string;
  email: string;
  remarks: string;
  avatar_url: string;
}

export interface ActivistRecord {
  id: number;
  branch_id: number;
  name: string;
  gender: string;
  nation: string;
  birthday: string;
  education: string;
  application_date: string;
  talk_date: string;
}

export interface MeetingParticipant {
  name: string;
  reason?: string;
}

export interface MeetingRecord {
  id: number;
  title: string;
  meeting_type: string;
  meeting_date: string;
  location: string;
  status: string;
  moderator: string;
  lecturer: string;
  lecturer_title: string;
  subject: string;
  attendees: MeetingParticipant[];
  absentees: MeetingParticipant[];
  meeting_categories: string[];
  topics: string;
  meeting_details: string;
  attachments: string[];
  branch_id: number;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface NoticeRecord {
  id: number;
  title: string;
  content: string;
  notice_type: string;
  priority: string;
  publisher_id: number;
  publish_date: string;
  expiry_date?: string;
  is_top: boolean;
  status: string;
  read_by: number[];
}

export interface StudyFileRecord {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  storedFileName: string;
  relativePath: string;
}

export interface StoreData {
  branches: BranchRecord[];
  members: MemberRecord[];
  activists: ActivistRecord[];
  meetings: MeetingRecord[];
  notices: NoticeRecord[];
  studyFiles: StudyFileRecord[];
}
