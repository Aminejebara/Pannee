import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dossiers d'upload
const profileUploadDir = path.join(__dirname, '../../uploads/profiles');
const messageUploadDir = path.join(__dirname, '../../uploads/messages');

// Créer les dossiers s'ils n'existent pas
if (!fs.existsSync(profileUploadDir)) {
    fs.mkdirSync(profileUploadDir, { recursive: true });
}
if (!fs.existsSync(messageUploadDir)) {
    fs.mkdirSync(messageUploadDir, { recursive: true });
}

// Configuration pour les avatars (profile)
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${ext}`);
    }
});

// Configuration pour les messages
const messageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, messageUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `message-${uniqueSuffix}${ext}`);
    }
});

// Filtre pour les images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, webp)'));
    }
};

// Multer pour les avatars
const profileUpload = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: fileFilter
});

// Multer pour les messages
const messageUpload = multer({
    storage: messageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: fileFilter
});

export { profileUpload, messageUpload };