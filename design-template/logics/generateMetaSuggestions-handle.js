import fs from 'fs';
import path from 'path';

// Bản đồ ánh xạ giữa các Style Key gửi từ Client/Giao diện và Tiêu đề trong file Markdown
const STYLE_MAP = {
  gioi_tre_y2k: 'Giới Trẻ Y2K',
  tho_mong: 'Thơ Mộng Thả Thính',
  hai_huoc: 'Hài Hước Xoáy Sâu',
  ngau: 'Ngầu Cá Tính',
  sau_lang: 'Sâu Lắng Sâu Sắc',
  buon: 'Buồn - Cô Đơn',
  tet_le: 'Tết - Lễ - Noel',
  dong_luc: 'Động Lực - Học Tập - Tuổi Trẻ',
  cong_viec: 'Công Việc - Đi Làm',
  tinh_ban: 'Tình Bạn - Gia Đình - Hôn Nhân',
  do_an: 'Đăng Ảnh Đồ Ăn',
  du_lich: 'Du Lịch',
  tieng_anh: 'Tiếng Anh Song Ngữ'
};

/**
 * Đọc và trích xuất ngữ liệu mẫu của phong cách cụ thể từ file Markdown
 * Nhằm tối ưu hóa Token Payload và giảm thiểu độ trễ (Latency) khi gọi API
 */
const getStyleCorpus = (styleKey) => {
  try {
    const filePath = path.join(process.cwd(), 'caption-tha-thinh-tong-hop_pro.md');
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ getStyleCorpus: Không tìm thấy file corpus tại ${filePath}`);
      return '';
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const targetHeading = STYLE_MAP[styleKey];
    if (!targetHeading) return '';

    // Phân tách nội dung file dựa trên ký tự phân đoạn Markdown '## '
    const sections = fileContent.split('\n## ');
    const targetSection = sections.find(sec => sec.trim().startsWith(targetHeading));

    if (!targetSection) return '';

    // Cắt bớt nếu phân đoạn quá dài (như mục Hài Hước có >1100 câu) để bảo vệ Context Window và tiết kiệm chi phí Token
    const lines = targetSection.split('\n');
    if (lines.length > 70) {
      return lines.slice(0, 70).join('\n') + '\n... (và nhiều câu cấu trúc tương tự khác)';
    }
    return targetSection;
  } catch (error) {
    console.error('❌ getStyleCorpus Error:', error);
    return '';
  }
};

/**
 * Tạo Gợi ý Mô tả & Tags dựa trên Hình ảnh và Phong cách truyền vào
 * Áp dụng cấu trúc Prompt Hệ thống chuẩn RTCC
 */
export const generateMetaSuggestions = async (imageBase64, style = 'gioi_tre_y2k', imageMimeType = 'image/jpeg') => {
  // 1. Lấy kho ngữ liệu đặc trưng của style được chọn
  const styleName = STYLE_MAP[style] || 'Tổng hợp';
  const styleCorpus = getStyleCorpus(style);

  // 2. Thiết lập cấu trúc System Prompt chuẩn RTCC (Role - Task - Context - Constraints)
  const systemPrompt = `
[ROLE - VAI TRÒ]
Bạn là một Chuyên gia Sáng tạo Nội dung Truyền thông Xã hội (Social Media Content Creator) kiêm Chuyên gia tối ưu hóa SEO hình ảnh. Bạn am hiểu sâu sắc xu hướng ngôn từ của giới trẻ, các cấu trúc câu thả thính độc lạ và cách giật tít bắt mắt trên Facebook, Instagram, TikTok, Threads.

[TASK - NHIỆM VỤ]
Phân tích chi tiết bối cảnh hình ảnh được cung cấp kết hợp với Kho ngữ liệu tham khảo để sinh ra một đối tượng dữ liệu JSON gồm câu mô tả (caption) sống động và danh sách các thẻ khóa liên quan (tags).

[CONTEXT - BỐI CẢNH]
- Hình ảnh này được tải lên bởi một người dùng đang có nhu cầu tạo bài đăng mạng xã hội để tăng tương tác.
- Phong cách viết bài (Tone of Voice) được chỉ định cho ảnh này là: "${styleName}".
- Dưới đây là Kho ngữ liệu chứa các từ lóng, meme trend, câu caption mẫu tiêu biểu cho phong cách này. Bạn cần học tập tư duy nhả chữ, nhịp điệu ngắt câu hoặc áp dụng linh hoạt dữ liệu này vào ngữ cảnh thực tế của bức ảnh (Tuyệt đối không rập khuôn sao chép nguyên văn nếu bối cảnh ảnh không ăn khớp):
---
${styleCorpus}
---

[CONSTRAINTS - RÀNG BUỘC]
- Định dạng đầu ra: Bắt buộc chỉ trả về chuỗi JSON khớp chính xác với Schema cấu trúc được định nghĩa. Không bọc trong ký tự markdown block (\`\`\`json), không giải thích thừa thãi.
- Tiêu chuẩn Caption: Độ dài tối đa 500 ký tự. Viết hoàn toàn bằng tiếng Việt văn phong tự nhiên, lôi cuốn, mang tính viral cao.
- Tiêu chuẩn Tags: Mảng chứa từ 5 đến 10 từ khóa (tiếng Anh hoặc tiếng Việt) viết thường, không chứa dấu thăng (#), không chứa khoảng trắng (nếu cụm từ thì viết liền hoặc ngăn cách bằng gạch nối). Các tag phải bám sát vào chủ thể, trang phục, mood (tâm trạng), màu sắc hoặc xu hướng được nhận diện từ ảnh.
`.trim();

  const content = [
    { text: systemPrompt },
    { inlineData: { data: imageBase64, mimeType: imageMimeType } }
  ];

  let lastError = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`🤖 generateMetaSuggestions: Trying model "${modelName}" with style "${style}"...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              caption: {
                type: 'STRING',
                description: 'Attractive customized style caption in Vietnamese, max 500 chars'
              },
              tags: {
                type: 'ARRAY',
                items: {
                  type: 'STRING',
                  description: 'Single word or short phrase lowercase tags without hashes'
                }
              }
            },
            required: ['caption', 'tags']
          }
        }
      });

      const result = await model.generateContent(content);
      const rawText = result.response.text().trim();
      const parsed = JSON.parse(rawText);
      console.log(`✅ generateMetaSuggestions: Success with model "${modelName}"`);
      return parsed;
    } catch (err) {
      lastError = err;
      const errMsg = err.message || '';
      const shouldFallback = errMsg.includes('429')
        || errMsg.includes('quota')
        || errMsg.includes('Too Many Requests')
        || errMsg.includes('404')
        || errMsg.includes('not found')
        || errMsg.includes('503')
        || errMsg.includes('500')
        || errMsg.includes('high demand')
        || errMsg.includes('overloaded');
      if (shouldFallback) {
        console.warn(`⚠️ generateMetaSuggestions: Model "${modelName}" lỗi (${errMsg.includes('404') ? '404 Not Found' : 'Rate Limited'}), thử model tiếp theo...`);
        continue;
      }
      throw err;
    }
  }

  console.error('❌ generateMetaSuggestions: Tất cả model đều thất bại hoặc hết quota!');
  throw lastError || new Error('Tất cả AI model đều hết quota. Vui lòng thử lại sau.');
};