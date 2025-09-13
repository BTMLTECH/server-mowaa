import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const uploadHandover = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimes = [
  'application/pdf',        
  'image/jpeg',                  
  'image/png',                   
  'image/jpg',                  
];

    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error('Only PDF, JPG, PNG files are allowed'));
    } else {
      cb(null, true); 
    }
  },
});

export default uploadHandover;
