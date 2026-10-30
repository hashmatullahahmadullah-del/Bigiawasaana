// Lazy Firebase Storage initialization — loaded only on admin/upload routes
import { getStorage } from 'firebase/storage';
import { app } from './firebase.js';

export const storage = getStorage(app);
