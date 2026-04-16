import { z } from 'zod';

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().optional()
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .union([z.literal(''), z.string().email('邮箱格式不正确')])
    .optional()
);

const optionalDate = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD').optional().or(z.literal(''))
);

const optionalMonth = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM').optional().or(z.literal(''))
);

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const branchActivistParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  activistId: z.coerce.number().int().positive(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const memberListQuerySchema = paginationQuerySchema.extend({
  search: optionalTrimmedString.default(''),
  status: optionalTrimmedString.default(''),
  branch_id: z.coerce.number().int().positive().optional(),
});

export const memberExportQuerySchema = z.object({
  status: optionalTrimmedString.default(''),
  branch_id: z.coerce.number().int().positive().optional(),
});

export const memberMutationSchema = z.object({
  name: z.string().trim().min(1, '请输入姓名'),
  gender: optionalTrimmedString.default('男'),
  birthday: optionalDate.default(''),
  department: optionalTrimmedString.default(''),
  position: optionalTrimmedString.default(''),
  political_status: optionalTrimmedString.default('中共党员'),
  join_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, '请选择正确的入党日期'),
  regular_date: optionalDate.default(''),
  last_fee_month: optionalMonth.default(''),
  status: optionalTrimmedString.default('active'),
  branch_id: z.coerce.number().int().positive().optional(),
  branch_name: optionalTrimmedString.default(''),
  phone: optionalTrimmedString.default(''),
  email: optionalEmail.default(''),
  remarks: optionalTrimmedString.default(''),
  avatar_url: optionalTrimmedString.default(''),
});

export const memberUpdateSchema = memberMutationSchema.partial().extend({
  join_date: optionalDate,
});

export const branchListQuerySchema = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
});

export const branchMutationSchema = z.object({
  name: z.string().trim().min(1, '请输入支部名称'),
  code: z.string().trim().min(1, '请输入支部代码'),
  description: optionalTrimmedString.default(''),
  contact_phone: optionalTrimmedString.default(''),
  establish_date: optionalDate.default(''),
  renewal_reminder_date: optionalDate.default(''),
  secretary_id: z.coerce.number().int().positive().optional(),
  secretary_name: optionalTrimmedString.default(''),
  status: optionalTrimmedString.default('active'),
  remark: optionalTrimmedString.default(''),
});

export const branchUpdateSchema = branchMutationSchema.partial();

export const activistMutationSchema = z.object({
  name: z.string().trim().min(1, '请输入姓名'),
  gender: optionalTrimmedString.default('男'),
  nation: optionalTrimmedString.default('汉族'),
  birthday: optionalDate.default(''),
  education: optionalTrimmedString.default(''),
  application_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入提交入党申请书时间'),
  talk_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入谈话时间'),
});

export const meetingListQuerySchema = paginationQuerySchema.extend({
  meeting_type: optionalTrimmedString.default(''),
  status: optionalTrimmedString.default(''),
  branch_id: z.coerce.number().int().positive().optional(),
});

export const meetingMutationSchema = z.object({
  title: z.string().trim().min(1, '请输入会议标题'),
  meeting_type: optionalTrimmedString.default('支部大会'),
  meeting_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, '请选择会议日期'),
  location: optionalTrimmedString.default(''),
  status: optionalTrimmedString.default('planned'),
  moderator: optionalTrimmedString.default(''),
  lecturer: optionalTrimmedString.default(''),
  lecturer_title: optionalTrimmedString.default(''),
  attendees: z.array(z.object({ name: z.string().trim().min(1), reason: optionalTrimmedString })).default([]),
  absentees: z.array(z.object({ name: z.string().trim().min(1), reason: optionalTrimmedString })).default([]),
  meeting_categories: z.array(z.string().trim()).default([]),
  topics: optionalTrimmedString.default(''),
  subject: optionalTrimmedString.default(''),
  meeting_details: optionalTrimmedString.default(''),
  attachments: z.array(z.string()).default([]),
  branch_id: z.coerce.number().int().positive().optional(),
});

export const noticeListQuerySchema = paginationQuerySchema;

export const noticeMutationSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空'),
  content: z.string().trim().min(1, '内容不能为空'),
  notice_type: optionalTrimmedString.default('通知'),
  priority: optionalTrimmedString.default('normal'),
  expiry_date: optionalDate.default(''),
  is_top: z.coerce.boolean().default(false),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入账号'),
  password: z.string().trim().min(1, '请输入密码'),
});

export const studyUploadSchema = z.object({
  title: z.string().trim().min(1, '请输入资料标题'),
  description: optionalTrimmedString.default(''),
});
