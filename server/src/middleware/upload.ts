import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .pdf and .docx files are accepted"));
  }
}

const LIMITS = { fileSize: 5 * 1024 * 1024 }; // 5MB

export const uploadCv = multer({ storage, fileFilter, limits: LIMITS });

/**
 * Memory storage for the parse-only endpoint (candidate not created yet —
 * nothing worth persisting to disk). candidatesRoutes' actual create path
 * still uses uploadCv (disk storage) above; unrelated to this.
 */
export const uploadCvMemory = multer({ storage: multer.memoryStorage(), fileFilter, limits: LIMITS });
