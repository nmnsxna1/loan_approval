import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { backendLogger } from '../utils/logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    backendLogger.info(`Upload destination checked: ${UPLOAD_DIR}`, {
      file: 'src/middleware/upload.ts',
      function: 'storage.destination',
      requestId: (req as any).requestId,
    });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    backendLogger.info(`File saved as: ${name} (original: ${file.originalname}, size: ${file.size})`, {
      file: 'src/middleware/upload.ts',
      function: 'storage.filename',
      requestId: (req as any).requestId,
    });
    cb(null, name);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    backendLogger.info(`File accepted: ${file.originalname} (${file.mimetype})`, {
      file: 'src/middleware/upload.ts',
      function: 'fileFilter',
      requestId: req.requestId,
    });
    cb(null, true);
  } else {
    backendLogger.warn(`File rejected: ${file.originalname} (${file.mimetype})`, {
      file: 'src/middleware/upload.ts',
      function: 'fileFilter',
      requestId: req.requestId,
    });
    cb(new Error('Only PDF files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});
