import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { authMiddleware, branchFilter, requireRole } from '../middleware/auth';
import {
  findBranchById,
  getNextNumericId,
  readStore,
  toBranchView,
  toMemberView,
  updateStore,
} from '../data/store';

const router = Router();

router.get('/', authMiddleware, branchFilter, async (req: AuthRequest, res) => {
  try {
    const branchId = Number(req.query.branch_id ?? '0');
    const store = await readStore();
    let branches = store.branches;

    if (branchId) {
      branches = branches.filter((branch) => branch.id === branchId);
    }

    res.json(branches.map((branch) => toBranchView(branch, store)));
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: '获取支部列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const store = await readStore();
    const branch = findBranchById(store, id);

    if (!branch) {
      return res.status(404).json({ error: '支部不存在' });
    }

    res.json(toBranchView(branch, store));
  } catch (error) {
    console.error('Get branch detail error:', error);
    res.status(500).json({ error: '获取支部详情失败' });
  }
});

router.get('/:id/members', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const store = await readStore();
    const members = store.members
      .filter((member) => member.branch_id === id)
      .map((member) => toMemberView(member, store));

    res.json(members);
  } catch (error) {
    console.error('Get branch members error:', error);
    res.status(500).json({ error: '获取支部成员失败' });
  }
});

router.get('/:id/activists', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const store = await readStore();
    const activists = store.activists.filter((activist) => activist.branch_id === id);

    res.json(activists);
  } catch (error) {
    console.error('Get branch activists error:', error);
    res.status(500).json({ error: '获取积极分子列表失败' });
  }
});

router.post('/:id/activists', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const branchId = Number(req.params.id);
    const { name, gender, nation, birthday, education, application_date, talk_date } = req.body as Record<string, string>;

    if (!name?.trim()) {
      return res.status(400).json({ error: '请输入姓名' });
    }

    if (!application_date?.trim()) {
      return res.status(400).json({ error: '请输入提交入党申请书时间' });
    }

    if (!talk_date?.trim()) {
      return res.status(400).json({ error: '请输入谈话时间' });
    }

    const created = await updateStore((store) => {
      const activist = {
        id: getNextNumericId(store.activists),
        branch_id: branchId,
        name: name.trim(),
        gender: gender?.trim() || '男',
        nation: nation?.trim() || '汉族',
        birthday: birthday?.trim() || '',
        education: education?.trim() || '',
        application_date: application_date.trim(),
        talk_date: talk_date.trim(),
      };

      store.activists.push(activist);
      return activist;
    });

    res.json({
      success: true,
      message: '创建成功',
      data: created,
    });
  } catch (error) {
    console.error('Create activist error:', error);
    res.status(500).json({ error: '创建积极分子失败' });
  }
});

router.put('/:id/activists/:activistId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const branchId = Number(req.params.id);
    const activistId = Number(req.params.activistId);
    const { name, gender, nation, birthday, education, application_date, talk_date } = req.body as Record<string, string>;

    if (!name?.trim()) {
      return res.status(400).json({ error: '请输入姓名' });
    }

    if (!application_date?.trim()) {
      return res.status(400).json({ error: '请输入提交入党申请书时间' });
    }

    if (!talk_date?.trim()) {
      return res.status(400).json({ error: '请输入谈话时间' });
    }

    const updated = await updateStore((store) => {
      const activist = store.activists.find(
        (item) => item.id === activistId && item.branch_id === branchId
      );

      if (!activist) {
        return null;
      }

      Object.assign(activist, {
        name: name.trim(),
        gender: gender?.trim() || '男',
        nation: nation?.trim() || '汉族',
        birthday: birthday?.trim() || '',
        education: education?.trim() || '',
        application_date: application_date.trim(),
        talk_date: talk_date.trim(),
      });

      return activist;
    });

    if (!updated) {
      return res.status(404).json({ error: '积极分子不存在' });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: updated,
    });
  } catch (error) {
    console.error('Update activist error:', error);
    res.status(500).json({ error: '更新积极分子失败' });
  }
});

router.delete('/:id/activists/:activistId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const branchId = Number(req.params.id);
    const activistId = Number(req.params.activistId);

    const removed = await updateStore((store) => {
      const index = store.activists.findIndex(
        (item) => item.id === activistId && item.branch_id === branchId
      );

      if (index < 0) {
        return false;
      }

      store.activists.splice(index, 1);
      return true;
    });

    if (!removed) {
      return res.status(404).json({ error: '积极分子不存在' });
    }

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete activist error:', error);
    res.status(500).json({ error: '删除积极分子失败' });
  }
});

router.post(
  '/',
  authMiddleware,
  requireRole('party_committee', 'party_inspection', 'branch_secretary'),
  async (req: AuthRequest, res) => {
  try {
    const { name, code, description, establish_date, renewal_reminder_date, secretary_id, secretary_name, status } = req.body as Record<string, string>;

    if (!name?.trim()) {
      return res.status(400).json({ error: '请输入支部名称' });
    }

    if (!code?.trim()) {
      return res.status(400).json({ error: '请输入支部代码' });
    }

    const created = await updateStore((store) => {
      const branch = {
        id: getNextNumericId(store.branches),
        name: name.trim(),
        code: code.trim(),
        description: description?.trim() || '',
        establish_date: establish_date?.trim() || new Date().toISOString().slice(0, 10),
        renewal_reminder_date:
          renewal_reminder_date?.trim() ||
          establish_date?.trim() ||
          new Date().toISOString().slice(0, 10),
        secretary_id: secretary_id ? Number(secretary_id) : undefined,
        secretary_name: secretary_name?.trim() || '',
        status: status?.trim() || 'active',
        committee_members: secretary_name?.trim()
          ? [{ position: '书记', name: secretary_name.trim() }]
          : [],
      };

      store.branches.push(branch);
      return toBranchView(branch, store);
    });

    res.json({
      success: true,
      message: '创建成功',
      data: created,
    });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ error: '创建支部失败' });
  }
});

router.put(
  '/:id',
  authMiddleware,
  requireRole('party_committee', 'party_inspection', 'branch_secretary'),
  async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { name, code, description, establish_date, renewal_reminder_date, secretary_id, secretary_name, status } = req.body as Record<string, string>;

    const updated = await updateStore((store) => {
      const branch = store.branches.find((item) => item.id === id);

      if (!branch) {
        return null;
      }

      branch.name = name?.trim() || branch.name;
      branch.code = code?.trim() || branch.code;
      branch.description = description?.trim() || '';
      branch.establish_date = establish_date?.trim() || branch.establish_date;
      branch.renewal_reminder_date =
        renewal_reminder_date?.trim() ||
        establish_date?.trim() ||
        branch.renewal_reminder_date;
      branch.secretary_id = secretary_id ? Number(secretary_id) : branch.secretary_id;
      branch.secretary_name = secretary_name?.trim() || branch.secretary_name;
      branch.status = status?.trim() || branch.status;

      if (branch.secretary_name) {
        const committeeMembers = branch.committee_members.filter(
          (member) => member.position !== '书记'
        );
        branch.committee_members = [
          { position: '书记', name: branch.secretary_name },
          ...committeeMembers,
        ];
      }

      return toBranchView(branch, store);
    });

    if (!updated) {
      return res.status(404).json({ error: '支部不存在' });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: updated,
    });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ error: '更新支部失败' });
  }
});

router.delete(
  '/:id',
  authMiddleware,
  requireRole('party_committee', 'party_inspection', 'branch_secretary'),
  async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);

    const deleted = await updateStore((store) => {
      const hasMembers = store.members.some((member) => member.branch_id === id);
      const hasActivists = store.activists.some((activist) => activist.branch_id === id);
      const hasMeetings = store.meetings.some((meeting) => meeting.branch_id === id);

      if (hasMembers || hasActivists || hasMeetings) {
        return 'HAS_RELATION';
      }

      const index = store.branches.findIndex((branch) => branch.id === id);
      if (index < 0) {
        return 'NOT_FOUND';
      }

      store.branches.splice(index, 1);
      return 'DELETED';
    });

    if (deleted === 'NOT_FOUND') {
      return res.status(404).json({ error: '支部不存在' });
    }

    if (deleted === 'HAS_RELATION') {
      return res.status(400).json({ error: '该支部下仍有关联党员、积极分子或会议，无法删除' });
    }

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ error: '删除支部失败' });
  }
});

export default router;
