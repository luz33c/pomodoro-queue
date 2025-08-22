import { Storage } from '@plasmohq/storage';

// 共享的 Storage 实例，确保前台后台使用同一个
export const sharedStorage = new Storage({ area: 'local' });
