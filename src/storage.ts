import multer from 'multer';
import { agentic } from './helper';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, agentic.documentsDirectory);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage: storage });
