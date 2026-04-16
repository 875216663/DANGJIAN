import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { readStore, updateStore } from '../models/store.model';
import { ensureDirectory, sanitizeFileName } from '../utils/file';
import { AppError } from '../utils/app-error';

const STUDY_UPLOAD_DIR = resolve(process.cwd(), 'data', 'uploads', 'study');

interface StudyUploadPayload {
  title: string;
  description?: string;
  file: Express.Multer.File;
  uploadedBy: string;
}

export async function listStudyFiles() {
  const store = await readStore();
  return store.studyFiles.map((file) => ({
    id: file.id,
    title: file.title,
    description: file.description,
    fileName: file.fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt,
  }));
}

export async function uploadStudyFile(payload: StudyUploadPayload) {
  ensureDirectory(STUDY_UPLOAD_DIR);

  const storedFileName = `${Date.now()}-${sanitizeFileName(payload.file.originalname)}`;
  const relativePath = `uploads/study/${storedFileName}`;
  const targetPath = resolve(STUDY_UPLOAD_DIR, storedFileName);
  writeFileSync(targetPath, payload.file.buffer);

  const created = await updateStore((store) => {
    const record = {
      id: Date.now().toString(),
      title: payload.title.trim(),
      description: payload.description?.trim() || '',
      fileName: payload.file.originalname,
      fileSize: payload.file.size,
      mimeType: payload.file.mimetype,
      uploadedBy: payload.uploadedBy,
      uploadedAt: new Date().toISOString(),
      storedFileName,
      relativePath,
    };

    store.studyFiles.unshift(record);
    return record;
  });

  return created;
}

export async function getStudyFileById(id: string) {
  const store = await readStore();
  const file = store.studyFiles.find((item) => item.id === id);
  if (!file) {
    throw new AppError(404, '资料不存在');
  }

  return file;
}

export async function deleteStudyFile(id: string) {
  const deleted = await updateStore((store) => {
    const index = store.studyFiles.findIndex((file) => file.id === id);
    if (index < 0) {
      return null;
    }

    const [removed] = store.studyFiles.splice(index, 1);
    return removed;
  });

  if (!deleted) {
    throw new AppError(404, '资料不存在');
  }

  const absolutePath = resolve(process.cwd(), 'data', deleted.relativePath);
  if (existsSync(absolutePath)) {
    unlinkSync(absolutePath);
  }

  return deleted;
}
