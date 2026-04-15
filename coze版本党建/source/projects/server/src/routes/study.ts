import express from 'express';
import multer from 'multer';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { readStore, updateStore } from '../data/store';

const router = express.Router();

const STUDY_UPLOAD_DIR = resolve(process.cwd(), 'data', 'uploads', 'study');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

function ensureStudyUploadDir() {
  if (!existsSync(STUDY_UPLOAD_DIR)) {
    mkdirSync(STUDY_UPLOAD_DIR, { recursive: true });
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildDownloadUrl(req: express.Request, fileId: string) {
  const host = req.get('host');
  const protocol = req.protocol;

  return `${protocol}://${host}/api/v1/study/files/${fileId}/download`;
}

router.post('/files', upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body as Record<string, string>;
    const file = req.file;
    const userId = String(req.headers['x-user-id'] ?? 'unknown');

    if (!file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    if (!title?.trim()) {
      return res.status(400).json({ error: '请输入资料标题' });
    }

    ensureStudyUploadDir();

    const storedFileName = `${Date.now()}-${sanitizeFileName(file.originalname)}`;
    const relativePath = `uploads/study/${storedFileName}`;
    const targetPath = resolve(STUDY_UPLOAD_DIR, storedFileName);
    writeFileSync(targetPath, file.buffer);

    const studyFile = updateStore((store) => {
      const record = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description?.trim() || '',
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        storedFileName,
        relativePath,
      };

      store.studyFiles.unshift(record);
      return record;
    });

    res.json({
      id: studyFile.id,
      title: studyFile.title,
      description: studyFile.description,
      fileName: studyFile.fileName,
      fileSize: studyFile.fileSize,
      mimeType: studyFile.mimeType,
      uploadedAt: studyFile.uploadedAt,
      downloadUrl: buildDownloadUrl(req, studyFile.id),
    });
  } catch (error) {
    console.error('Upload study file error:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

router.get('/files', async (req, res) => {
  try {
    const store = readStore();
    res.json({
      files: store.studyFiles.map((file) => ({
        id: file.id,
        title: file.title,
        description: file.description,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        downloadUrl: buildDownloadUrl(req, file.id),
      })),
    });
  } catch (error) {
    console.error('Get study files error:', error);
    res.status(500).json({ error: '获取资料列表失败' });
  }
});

router.get('/files/:id/download', async (req, res) => {
  try {
    const fileId = req.params.id;
    const store = readStore();
    const file = store.studyFiles.find((item) => item.id === fileId);

    if (!file) {
      return res.status(404).json({ error: '资料不存在' });
    }

    const absolutePath = resolve(process.cwd(), 'data', file.relativePath);
    res.download(absolutePath, file.fileName);
  } catch (error) {
    console.error('Download study file error:', error);
    res.status(500).json({ error: '下载失败' });
  }
});

router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = updateStore((store) => {
      const index = store.studyFiles.findIndex((file) => file.id === id);
      if (index < 0) {
        return null;
      }

      const [file] = store.studyFiles.splice(index, 1);
      return file;
    });

    if (!deleted) {
      return res.status(404).json({ error: '资料不存在' });
    }

    const targetPath = resolve(process.cwd(), 'data', deleted.relativePath);
    if (existsSync(targetPath)) {
      unlinkSync(targetPath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete study file error:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
