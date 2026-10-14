import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

export const config = {
  production: process.argv.includes('--production') || process.env.NODE_ENV === 'production',
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  textModel: process.env.TEXT_MODEL || 'gpt-4o-mini',
  lowCostMode: process.env.LOW_COST_MODE !== 'false',
  imageModel: process.env.IMAGE_MODEL || 'gpt-image-1',
  aiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
};

export const defaults = {
  autoFetch: true,
  autoGenerate: true,
  fetchIntervalMinutes: 15,
  dailyDraftLimit: 50,
  dailyImageLimit: 3,
  tone: 'Dễ hiểu, điềm tĩnh, có nhận xét thận trọng',
  audience: 'Người quan tâm thị trường và người mua nhà',
  autoImage: true,
  writingMode: 'ai',
  focusArea: '',
  projectContext: '',
  dailyTarget: 5,
  contentMix: 'mixed',
  styleSamples: '',
  styleGuide: 'Giọng Đức Vượng: rõ ràng, gần gũi, phân tích thay đổi khu vực và nhu cầu người mua. Dẫn chứng trước, nhận định có điều kiện sau. Bài dự án nêu đối tượng phù hợp và mời inbox; không tạo khan hiếm giả.',
  brandName: 'Đức Vượng · Góc nhìn bất động sản',
  websiteUrl: '',
  imageStyle: 'premium',
};
