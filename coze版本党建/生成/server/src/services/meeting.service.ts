import {
  findBranchById,
  getNextNumericId,
  readStore,
  toMeetingView,
  updateStore,
} from '../models/store.model';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import { resolveBranchScope } from '../middlewares/auth.middleware';
import { AppError } from '../utils/app-error';
import { canViewAllData } from '../utils/rbac';
import { buildPaginationMeta, requireEntity } from './store-helper.service';

interface MeetingListQuery {
  page: number;
  limit: number;
  meeting_type?: string;
  status?: string;
  branch_id?: number;
}

interface MeetingPayload {
  title?: string;
  meeting_type?: string;
  meeting_date?: string;
  location?: string;
  status?: string;
  moderator?: string;
  lecturer?: string;
  lecturer_title?: string;
  attendees?: Array<{ name: string; reason?: string }>;
  absentees?: Array<{ name: string; reason?: string }>;
  meeting_categories?: string[];
  topics?: string;
  subject?: string;
  meeting_details?: string;
  attachments?: string[];
  branch_id?: number;
}

export async function getMeetingStats(currentUser: CurrentUserContext) {
  const currentYear = new Date().getFullYear();
  const store = await readStore();
  const scopedBranchId = resolveBranchScope(currentUser, undefined);
  const meetings = scopedBranchId
    ? store.meetings.filter((meeting) => meeting.branch_id === scopedBranchId)
    : store.meetings;

  return {
    total_count: meetings.length,
    completed_count: meetings.filter((meeting) => meeting.status === 'completed').length,
    ongoing_count: meetings.filter((meeting) => meeting.status === 'ongoing').length,
    planned_count: meetings.filter((meeting) => meeting.status === 'planned').length,
    year_count: meetings.filter(
      (meeting) => new Date(meeting.meeting_date).getFullYear() === currentYear
    ).length,
  };
}

export async function listMeetings(query: MeetingListQuery, currentUser: CurrentUserContext) {
  const store = await readStore();
  const scopedBranchId = resolveBranchScope(currentUser, query.branch_id);
  let meetings = store.meetings;

  if (scopedBranchId) {
    meetings = meetings.filter((meeting) => meeting.branch_id === scopedBranchId);
  }

  if (query.meeting_type) {
    meetings = meetings.filter((meeting) => meeting.meeting_type === query.meeting_type);
  }

  if (query.status) {
    meetings = meetings.filter((meeting) => meeting.status === query.status);
  }

  meetings = [...meetings].sort(
    (a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
  );

  const total = meetings.length;
  const start = (query.page - 1) * query.limit;

  return {
    items: meetings.slice(start, start + query.limit).map((meeting) => toMeetingView(meeting, store)),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getMeetingById(id: number, currentUser: CurrentUserContext) {
  const store = await readStore();
  const meeting = requireEntity(
    store.meetings.find((item) => item.id === id),
    '会议记录不存在'
  );

  const scopedBranchId = resolveBranchScope(currentUser, undefined);
  if (
    scopedBranchId &&
    !canViewAllData(currentUser.role) &&
    meeting.branch_id !== scopedBranchId
  ) {
    throw new AppError(403, '无权查看其他支部会议');
  }

  return toMeetingView(meeting, store);
}

export async function createMeeting(payload: MeetingPayload, currentUser: CurrentUserContext) {
  return updateStore((store) => {
    const branchId =
      payload.branch_id && findBranchById(store, payload.branch_id)
        ? payload.branch_id
        : currentUser.branchId || 1;

    const meeting = {
      id: getNextNumericId(store.meetings),
      title: payload.title?.trim() || '',
      meeting_type: payload.meeting_type?.trim() || '支部大会',
      meeting_date: payload.meeting_date?.trim() || '',
      location: payload.location?.trim() || '',
      status: payload.status?.trim() || 'planned',
      moderator: payload.moderator?.trim() || '',
      lecturer: payload.lecturer?.trim() || '',
      lecturer_title: payload.lecturer_title?.trim() || '',
      subject: payload.subject?.trim() || '',
      attendees: payload.attendees ?? [],
      absentees: payload.absentees ?? [],
      meeting_categories: payload.meeting_categories ?? [],
      topics: payload.topics?.trim() || '',
      meeting_details: payload.meeting_details?.trim() || '',
      attachments: payload.attachments ?? [],
      branch_id: branchId,
      created_by: currentUser.userId,
      created_at: new Date().toISOString(),
    };

    store.meetings.push(meeting);
    return toMeetingView(meeting, store);
  });
}

export async function updateMeeting(id: number, payload: MeetingPayload) {
  const updated = await updateStore((store) => {
    const meeting = store.meetings.find((item) => item.id === id);
    if (!meeting) {
      return null;
    }

    Object.assign(meeting, {
      title: payload.title?.trim() || meeting.title,
      meeting_type: payload.meeting_type?.trim() || meeting.meeting_type,
      meeting_date: payload.meeting_date?.trim() || meeting.meeting_date,
      location: payload.location?.trim() || meeting.location,
      status: payload.status?.trim() || meeting.status,
      moderator: payload.moderator?.trim() || meeting.moderator,
      lecturer: payload.lecturer?.trim() || meeting.lecturer,
      lecturer_title: payload.lecturer_title?.trim() || meeting.lecturer_title,
      subject: payload.subject?.trim() || meeting.subject,
      attendees: payload.attendees ?? meeting.attendees,
      absentees: payload.absentees ?? meeting.absentees,
      meeting_categories: payload.meeting_categories ?? meeting.meeting_categories,
      topics: payload.topics?.trim() || meeting.topics,
      meeting_details: payload.meeting_details?.trim() || meeting.meeting_details,
      attachments: payload.attachments ?? meeting.attachments,
      branch_id:
        payload.branch_id && findBranchById(store, payload.branch_id)
          ? payload.branch_id
          : meeting.branch_id,
      updated_at: new Date().toISOString(),
    });

    return toMeetingView(meeting, store);
  });

  return requireEntity(updated, '会议记录不存在');
}

export async function deleteMeeting(id: number) {
  const deleted = await updateStore((store) => {
    const index = store.meetings.findIndex((meeting) => meeting.id === id);
    if (index < 0) {
      return false;
    }

    store.meetings.splice(index, 1);
    return true;
  });

  if (!deleted) {
    throw new AppError(404, '会议记录不存在');
  }
}
