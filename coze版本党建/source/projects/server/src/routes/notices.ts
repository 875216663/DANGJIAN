import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { authMiddleware, requireRole } from '../middleware/auth';
import { getNextNumericId, readStore, toNoticeView, updateStore } from '../data/store';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page ?? '1');
    const limit = Number(req.query.limit ?? '20');
    const store = readStore();

    const notices = [...store.notices]
      .filter((notice) => notice.status === 'published')
      .sort((a, b) => {
        if (a.is_top !== b.is_top) {
          return a.is_top ? -1 : 1;
        }
        return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
      });

    const total = notices.length;
    const start = (page - 1) * limit;

    res.json({
      data: notices.slice(start, start + limit).map((notice) => toNoticeView(notice, req.userId)),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ error: '获取通知列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const notice = updateStore((store) => {
      const target = store.notices.find((item) => item.id === id);

      if (!target) {
        return null;
      }

      if (req.userId && !target.read_by.includes(req.userId)) {
        target.read_by.push(req.userId);
      }

      return toNoticeView(target, req.userId);
    });

    if (!notice) {
      return res.status(404).json({ error: '通知不存在' });
    }

    res.json(notice);
  } catch (error) {
    console.error('Get notice detail error:', error);
    res.status(500).json({ error: '获取通知详情失败' });
  }
});

router.post('/', authMiddleware, requireRole('party_inspection', 'branch_secretary', 'party_committee'), async (req: AuthRequest, res) => {
  try {
    const { title, content, notice_type, priority, expiry_date, is_top } = req.body as Record<string, string | boolean>;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const created = updateStore((store) => {
      const notice = {
        id: getNextNumericId(store.notices),
        title: String(title).trim(),
        content: String(content).trim(),
        notice_type: String(notice_type || '通知').trim(),
        priority: String(priority || 'normal').trim(),
        publisher_id: req.userId || 1,
        publish_date: new Date().toISOString(),
        expiry_date: expiry_date ? String(expiry_date) : undefined,
        is_top: Boolean(is_top),
        status: 'published',
        read_by: [],
      };

      store.notices.push(notice);
      return toNoticeView(notice, req.userId);
    });

    res.json(created);
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ error: '发布通知失败' });
  }
});

router.delete('/:id', authMiddleware, requireRole('party_inspection', 'party_committee'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);

    const deleted = updateStore((store) => {
      const index = store.notices.findIndex((notice) => notice.id === id);
      if (index < 0) {
        return false;
      }

      store.notices.splice(index, 1);
      return true;
    });

    if (!deleted) {
      return res.status(404).json({ error: '通知不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ error: '删除通知失败' });
  }
});

export default router;
