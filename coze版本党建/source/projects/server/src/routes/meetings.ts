import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { authMiddleware, branchFilter, requireRole } from '../middleware/auth';
import {
  findBranchById,
  getNextNumericId,
  readStore,
  toMeetingView,
  updateStore,
} from '../data/store';

const router = Router();

router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const store = readStore();
    const meetings = store.meetings;

    res.json({
      total_count: meetings.length,
      completed_count: meetings.filter((meeting) => meeting.status === 'completed').length,
      ongoing_count: meetings.filter((meeting) => meeting.status === 'ongoing').length,
      planned_count: meetings.filter((meeting) => meeting.status === 'planned').length,
      year_count: meetings.filter(
        (meeting) => new Date(meeting.meeting_date).getFullYear() === currentYear
      ).length,
    });
  } catch (error) {
    console.error('Get meeting stats error:', error);
    res.status(500).json({ error: '获取会议统计失败' });
  }
});

router.get('/', authMiddleware, branchFilter, async (req: AuthRequest, res) => {
  try {
    const meetingType = String(req.query.meeting_type ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const page = Number(req.query.page ?? '1');
    const limit = Number(req.query.limit ?? '20');
    const branchId = Number(req.query.branch_id ?? '0');

    const store = readStore();
    let meetings = store.meetings;

    if (branchId) {
      meetings = meetings.filter((meeting) => meeting.branch_id === branchId);
    }

    if (meetingType) {
      meetings = meetings.filter((meeting) => meeting.meeting_type === meetingType);
    }

    if (status) {
      meetings = meetings.filter((meeting) => meeting.status === status);
    }

    meetings = [...meetings].sort(
      (a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
    );

    const total = meetings.length;
    const start = (page - 1) * limit;

    res.json({
      data: meetings.slice(start, start + limit).map((meeting) => toMeetingView(meeting, store)),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: '获取会议列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const store = readStore();
    const meeting = store.meetings.find((item) => item.id === id);

    if (!meeting) {
      return res.status(404).json({ error: '会议记录不存在' });
    }

    res.json(toMeetingView(meeting, store));
  } catch (error) {
    console.error('Get meeting detail error:', error);
    res.status(500).json({ error: '获取会议详情失败' });
  }
});

router.post('/', authMiddleware, requireRole('party_inspection', 'branch_secretary', 'party_committee'), async (req: AuthRequest, res) => {
  try {
    const payload = req.body as Partial<{
      title: string;
      meeting_type: string;
      meeting_date: string;
      location: string;
      status: string;
      moderator: string;
      lecturer: string;
      lecturer_title: string;
      attendees: Array<{ name: string }>;
      absentees: Array<{ name: string; reason?: string }>;
      meeting_categories: string[];
      topics: string;
      subject: string;
      meeting_details: string;
      attachments: string[];
      branch_id: number;
    }>;

    if (!payload.title?.trim()) {
      return res.status(400).json({ error: '请输入会议标题' });
    }

    if (!payload.meeting_date?.trim()) {
      return res.status(400).json({ error: '请选择会议日期' });
    }

    const created = updateStore((store) => {
      const branchId =
        payload.branch_id && findBranchById(store, payload.branch_id)
          ? payload.branch_id
          : req.userBranchId || 1;

      const meeting = {
        id: getNextNumericId(store.meetings),
        title: payload.title.trim(),
        meeting_type: payload.meeting_type?.trim() || '支部大会',
        meeting_date: payload.meeting_date.trim(),
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
        created_by: req.userId || 1,
        created_at: new Date().toISOString(),
      };

      store.meetings.push(meeting);
      return toMeetingView(meeting, store);
    });

    res.json(created);
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: '创建会议记录失败' });
  }
});

router.put('/:id', authMiddleware, requireRole('party_inspection', 'branch_secretary', 'party_committee'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body as Partial<{
      title: string;
      meeting_type: string;
      meeting_date: string;
      location: string;
      status: string;
      moderator: string;
      lecturer: string;
      lecturer_title: string;
      attendees: Array<{ name: string }>;
      absentees: Array<{ name: string; reason?: string }>;
      meeting_categories: string[];
      topics: string;
      subject: string;
      meeting_details: string;
      attachments: string[];
      branch_id: number;
    }>;

    const updated = updateStore((store) => {
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
        moderator: payload.moderator?.trim() || '',
        lecturer: payload.lecturer?.trim() || '',
        lecturer_title: payload.lecturer_title?.trim() || '',
        subject: payload.subject?.trim() || '',
        attendees: payload.attendees ?? meeting.attendees,
        absentees: payload.absentees ?? meeting.absentees,
        meeting_categories: payload.meeting_categories ?? meeting.meeting_categories,
        topics: payload.topics?.trim() || '',
        meeting_details: payload.meeting_details?.trim() || '',
        attachments: payload.attachments ?? meeting.attachments,
        branch_id:
          payload.branch_id && findBranchById(store, payload.branch_id)
            ? payload.branch_id
            : meeting.branch_id,
        updated_at: new Date().toISOString(),
      });

      return toMeetingView(meeting, store);
    });

    if (!updated) {
      return res.status(404).json({ error: '会议记录不存在' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: '更新会议记录失败' });
  }
});

router.delete('/:id', authMiddleware, requireRole('party_inspection', 'branch_secretary', 'party_committee'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);

    const deleted = updateStore((store) => {
      const index = store.meetings.findIndex((meeting) => meeting.id === id);
      if (index < 0) {
        return false;
      }

      store.meetings.splice(index, 1);
      return true;
    });

    if (!deleted) {
      return res.status(404).json({ error: '会议记录不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: '删除会议记录失败' });
  }
});

export default router;
