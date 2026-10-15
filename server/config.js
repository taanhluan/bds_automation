import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

export const config = {
  production: process.argv.includes('--production') || process.env.NODE_ENV === 'production',
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  textModel: process.env.TEXT_MODEL || 'gpt-4o-mini',
  lowCostMode: process.env.LOW_COST_MODE !== 'false',
  imageModel: process.env.IMAGE_MODEL?.trim() || 'gpt-image-2.5-flare',
  aiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
};

export const defaults = {
  autoFetch: true,
  autoGenerate: true,
  fetchIntervalMinutes: 15,
  dailyDraftLimit: 50,
  dailyImageLimit: 5,
  tone: 'Chuyên nghiệp, rõ ràng, phân tích có căn cứ',
  audience: 'Người quan tâm thị trường và người mua nhà',
  autoImage: true,
  writingMode: 'ai',
  focusArea: '',
  projectContext: '',
  dailyTarget: 5,
  contentMix: 'mixed',
  styleSamples: '',
  styleGuide: 'Giọng Vượng Nguyễn: chuyên nghiệp, rõ ràng, phân tích sự thay đổi của khu vực và nhu cầu người mua. Dẫn chứng trước, tác động và điều kiện sau. Không xưng mình hoặc dùng lời tâm sự. Bài dự án nêu đối tượng phù hợp và mời tư vấn có căn cứ.',
  brandName: 'Vượng Nguyễn · Bất động sản',
  websiteUrl: '',
  imageStyle: 'photo',
  imageMode: 'ai',
  imageModel: config.imageModel,
  imageQuality: 'high',
};
