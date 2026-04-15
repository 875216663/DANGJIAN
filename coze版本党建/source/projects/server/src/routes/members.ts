import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import type { AuthRequest } from '../middleware/auth';
import { authMiddleware, branchFilter } from '../middleware/auth';
import {
  findBranchByName,
  getNextNumericId,
  readStore,
  toMemberView,
  updateStore,
} from '../data/store';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.get('/', authMiddleware, branchFilter, async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page ?? '1');
    const limit = Number(req.query.limit ?? '20');
    const search = String(req.query.search ?? '').trim().toLowerCase();
    const status = String(req.query.status ?? '').trim();
    const branchId = Number(req.query.branch_id ?? '0');

    const store = await readStore();
    let members = store.members.map((member) => toMemberView(member, store));

    if (branchId) {
      members = members.filter((member) => member.branch_id === branchId);
    }

    if (status) {
      members = members.filter((member) => member.status === status);
    }

    if (search) {
      members = members.filter((member) =>
        [member.name, member.department, member.position, member.branch_name]
          .join(' ')
          .toLowerCase()
          .includes(search)
      );
    }

    const total = members.length;
    const start = (page - 1) * limit;

    res.json({
      data: members.slice(start, start + limit),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: '获取党员列表失败' });
  }
});

router.get('/export', authMiddleware, branchFilter, async (req: AuthRequest, res) => {
  try {
    const branchId = Number(req.query.branch_id ?? '0');
    const status = String(req.query.status ?? '').trim();

    const store = await readStore();
    let members = store.members.map((member) => toMemberView(member, store));

    if (branchId) {
      members = members.filter((member) => member.branch_id === branchId);
    }

    if (status) {
      members = members.filter((member) => member.status === status);
    }

    const rows = members.map((member) => ({
      姓名: member.name,
      性别: member.gender,
      出生日期: member.birthday,
      部门: member.department,
      职务: member.position,
      政治面貌: member.political_status,
      入党日期: member.join_date,
      转正日期: member.regular_date,
      党费缴纳年月: member.last_fee_month,
      联系电话: member.phone,
      邮箱: member.email,
      所属支部: member.branch_name,
      状态: member.status,
      备注: member.remarks,
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, '党员信息');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="members-export.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Export members error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const store = await readStore();
    const member = store.members.find((item) => item.id === id);

    if (!member) {
      return res.status(404).json({ error: '党员不存在' });
    }

    res.json(toMemberView(member, store));
  } catch (error) {
    console.error('Get member detail error:', error);
    res.status(500).json({ error: '获取党员详情失败' });
  }
});

router.post('/import', upload.single('file'), authMiddleware, async (req: AuthRequest, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: '请选择要上传的Excel文件' });
    }

    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json<Record<string, string>>(worksheet, { raw: false });

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'Excel文件为空' });
    }

    const requiredFields = ['姓名', '部门', '政治面貌', '入党日期', '党费缴纳年月'];
    const firstRow = jsonData[0];
    const missingFields = requiredFields.filter((field) => !(field in firstRow));

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Excel格式不正确，缺少必需字段：${missingFields.join(', ')}`,
      });
    }

    const importedMembers = await updateStore((store) => {
      return jsonData.map((row) => {
        const branchName = row['所属支部']?.trim() || '第一党支部';
        let branch = findBranchByName(store, branchName);

        if (!branch) {
          const createdBranchId = getNextNumericId(store.branches);
          branch = {
            id: createdBranchId,
            name: branchName,
            code: `B${String(createdBranchId).padStart(3, '0')}`,
            description: `${branchName}（导入创建）`,
            establish_date: new Date().toISOString().slice(0, 10),
            renewal_reminder_date: new Date().toISOString().slice(0, 10),
            secretary_name: '',
            status: 'active',
            committee_members: [],
          };
          store.branches.push(branch);
        }

        const member = {
          id: getNextNumericId(store.members),
          name: row['姓名']?.trim() || '未命名党员',
          gender: row['性别']?.trim() || '男',
          birthday: row['出生日期']?.trim() || '',
          department: row['部门']?.trim() || '',
          position: row['职务']?.trim() || '',
          political_status: row['政治面貌']?.trim() || '中共党员',
          join_date: row['入党日期']?.trim() || '',
          regular_date: row['转正日期']?.trim() || '',
          last_fee_month: row['党费缴纳年月']?.trim() || '',
          phone: row['联系电话']?.trim() || '',
          email: row['邮箱']?.trim() || '',
          status: row['状态']?.trim() || 'active',
          branch_id: branch.id,
          remarks: row['备注']?.trim() || '',
          avatar_url: '',
        };

        store.members.push(member);
        return toMemberView(member, store);
      });
    });

    res.json({
      success: true,
      message: `成功导入${importedMembers.length}条党员信息`,
      data: importedMembers,
    });
  } catch (error) {
    console.error('Import members error:', error);
    res.status(500).json({ error: '导入失败' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);

    const updatedMember = await updateStore((store) => {
      const member = store.members.find((item) => item.id === id);

      if (!member) {
        return null;
      }

      const payload = req.body as Partial<typeof member> & { branch_name?: string };
      const branchName = payload.branch_name?.trim();

      let branchId = member.branch_id;
      if (branchName) {
        const matchedBranch = findBranchByName(store, branchName);
        if (matchedBranch) {
          branchId = matchedBranch.id;
        } else {
          const createdBranchId = getNextNumericId(store.branches);
          store.branches.push({
            id: createdBranchId,
            name: branchName,
            code: `B${String(createdBranchId).padStart(3, '0')}`,
            description: `${branchName}（自动创建）`,
            establish_date: new Date().toISOString().slice(0, 10),
            renewal_reminder_date: new Date().toISOString().slice(0, 10),
            secretary_name: '',
            status: 'active',
            committee_members: [],
          });
          branchId = createdBranchId;
        }
      }

      Object.assign(member, {
        ...payload,
        branch_id: branchId,
      });

      return toMemberView(member, store);
    });

    if (!updatedMember) {
      return res.status(404).json({ error: '党员不存在' });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: updatedMember,
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const memberData = req.body as Partial<{
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
      phone: string;
      email: string;
      remarks: string;
      avatar_url: string;
      branch_name: string;
    }>;

    if (!memberData.name?.trim()) {
      return res.status(400).json({ error: '请输入姓名' });
    }

    if (!memberData.join_date?.trim()) {
      return res.status(400).json({ error: '请选择入党日期' });
    }

    const newMember = await updateStore((store) => {
      const branchName = memberData.branch_name?.trim() || '第一党支部';
      let branch = findBranchByName(store, branchName);

      if (!branch) {
        const createdBranchId = getNextNumericId(store.branches);
        branch = {
          id: createdBranchId,
          name: branchName,
          code: `B${String(createdBranchId).padStart(3, '0')}`,
          description: `${branchName}（自动创建）`,
          establish_date: new Date().toISOString().slice(0, 10),
          renewal_reminder_date: new Date().toISOString().slice(0, 10),
          secretary_name: '',
          status: 'active',
          committee_members: [],
        };
        store.branches.push(branch);
      }

      const created = {
        id: getNextNumericId(store.members),
        name: memberData.name.trim(),
        gender: memberData.gender?.trim() || '男',
        birthday: memberData.birthday?.trim() || '',
        department: memberData.department?.trim() || '',
        position: memberData.position?.trim() || '',
        political_status: memberData.political_status?.trim() || '中共党员',
        join_date: memberData.join_date.trim(),
        regular_date: memberData.regular_date?.trim() || '',
        last_fee_month: memberData.last_fee_month?.trim() || '',
        status: memberData.status?.trim() || 'active',
        branch_id: branch.id,
        phone: memberData.phone?.trim() || '',
        email: memberData.email?.trim() || '',
        remarks: memberData.remarks?.trim() || '',
        avatar_url: memberData.avatar_url?.trim() || '',
      };

      store.members.push(created);
      return toMemberView(created, store);
    });

    res.json({
      success: true,
      message: '创建成功',
      data: newMember,
    });
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ error: '创建失败' });
  }
});

export default router;
