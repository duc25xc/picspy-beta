import mongoose from 'mongoose'

/**
 * PostAnalysis - Lưu cache kết quả phân tích AI của LensSpy
 * Mỗi post chỉ có 1 document này (unique index trên postId).
 * Khi user mở khóa lần đầu → gọi AI → lưu vào đây.
 * Lần sau user/người khác vào → đọc từ DB, không gọi lại AI → tiết kiệm token.
 */
const postAnalysisSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      unique: true,
    },

    // User đầu tiên unlock (người trả Xu để kích hoạt phân tích)
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Số Xu đã tiêu để generate (để audit)
    coinsCost: { type: Number, default: 2 },

    // AI model được dùng (để trace nếu đổi model sau)
    aiModel: { type: String, default: 'gemini-1.5-flash' },

    // ─── JSON phân tích chính từ LensSpy AI ───────────────────────
    cameraAndLens: {
      evaluation: String,   // Đánh giá tổng thể ống kính/máy
      focusPoint: String,   // Điểm lấy nét được đặt ở đâu
      dofAnalysis: String,  // Phân tích chiều sâu trường ảnh (DOF)
      evAnalysis: String,   // Giải thích EV (Exposure Value) của bức ảnh
    },

    lighting: {
      type: { type: String },         // "Natural Light", "Studio Flash", "Mixed"
      keyLight: String,               // Mô tả nguồn sáng chính
      fillLight: String,              // Nguồn sáng phụ/bù sáng
      rimLight: String,               // Sáng viền/backlight (nếu có)
      mood: String,                   // Vibe cảm xúc của ánh sáng
      lightingDiagram: String,        // Hướng dẫn setup dạng text (VD: "45° left high")
    },

    compositionAndPose: {
      ruleUsed: String,               // Rule of Thirds / Golden Ratio / Diagonal...
      cameraAngle: String,            // Eye-level / High angle / Low angle / Dutch angle
      subjectDistance: String,        // Khoảng cách ước tính máy - chủ thể
      poseAnalysis: String,           // Phân tích dáng người mẫu (nếu có người)
      vibeKeywords: [String],         // ["mysterious", "elegant", "raw", "cinematic"]
    },

    colorGrading: {
      vibe: String,                   // "Teal & Orange", "Moody Desaturated", "Warm Film"
      technique: String,              // Mô tả Chi tiết kỹ thuật đổ màu
      whiteBalance: String,           // "Warm ~5500K" hoặc "Cool ~7000K"
      filterRecommend: String,        // "VSCO C1", "Kodak Portra 400"...
      lutSuggestion: String,          // Tên LUT nếu có (Dehancer, BMPCC...)
    },

    // Tổng hợp lời khuyên thực chiến (array để render gạch đầu dòng)
    actionableAdvice: [String],

    // Gợi ý thiết bị mua (để gắn Affiliate sau này)
    gearSuggestions: [
      {
        type: { type: String },       // "lens", "light", "reflector", "filter"
        name: String,                 // "Sony 85mm GM f/1.4"
        reason: String,               // Lý do tại sao gợi ý thiết bị này
        searchKeyword: String,        // Keyword để tìm trên Shopee/Amazon
      }
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

const PostAnalysis = mongoose.model('PostAnalysis', postAnalysisSchema)
export default PostAnalysis
