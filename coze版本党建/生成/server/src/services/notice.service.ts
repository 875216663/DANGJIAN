import { getNextNumericId, readStore, toNoticeView, updateStore } from '../models/store.model';
import type { CurrentUserContext } from '../middlewares/auth.middleware';
import { buildPaginationMeta, requireEntity } from './store-helper.service';
import { AppError } from '../utils/app-error';

interface NoticeListQuery {
  page: number;
  limit: number;
}

interface NoticePayload {
  title?: string;
  content?: string;
  notice_type?: string;
  priority?: string;
  expiry_date?: string;
  is_top?: boolean;
}

export async function listNotices(query: NoticeListQuery, currentUser: CurrentUserContext) {
  const store = await readStore();
  const notices = [...store.notices]
    .filter((notice) => notice.status === 'published')
    .sort((a, b) => {
      if (a.is_top !== b.is_top) {
        return a.is_top ? -1 : 1;
      }
      return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
    });

  const total = notices.length;
  const start = (query.page - 1) * query.limit;
  return {
    items: notices.slice(start, start + query.limit).map((notice) => toNoticeView(notice, currentUser.userId)),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getNoticeById(id: number, currentUser: CurrentUserContext) {
  const notice = await updateStore((store) => {
    const target = store.notices.find((item) => item.id === id);
    if (!target) {
      return null;
    }

    if (!target.read_by.includes(currentUser.userId)) {
      target.read_by.push(currentUser.userId);
    }

    return toNoticeView(target, currentUser.userId);
  });

  return requireEntity(notice, '通知不存在');
}

export async function createNotice(payload: NoticePayload, currentUser: CurrentUserContext) {
  return updateStore((store) => {
    const notice = {
      id: getNextNumericId(store.notices),
      title: payload.title?.trim() || '',
      content: payload.content?.trim() || '',
      notice_type: payload.notice_type?.trim() || '通知',
      priority: payload.priority?.trim() || 'normal',
      publisher_id: currentUser.userId,
      publish_date: new Date().toISOString(),
      expiry_date: payload.expiry_date?.trim() || undefined,
      is_top: Boolean(payload.is_top),
      status: 'published',
      read_by: [],
    };

    store.notices.push(notice);
    return toNoticeView(notice, currentUser.userId);
  });
}

export async function deleteNotice(id: number) {
  const deleted = await updateStore((store) => {
    const index = store.notices.findIndex((notice) => notice.id === id);
    if (index < 0) {
      return false;
    }

    store.notices.splice(index, 1);
    return true;
  });

  if (!deleted) {
    throw new AppError(404, '通知不存在');
  }
}
