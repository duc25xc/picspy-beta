/**
 * Script to inspect database fields related to tokens and VNĐ
 * Hiển thị các field trong database liên quan đến token và tiền VNĐ
 */

console.log('\n🔍 DATABASE FIELD INSPECTION\n')

// === USER MODEL FIELDS ===
console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║ 1. USER MODEL - FIELDS LIÊN QUAN ĐẾN TOKEN VÀ VNĐ         ║')
console.log('╚════════════════════════════════════════════════════════════╝')

console.log('\n📊 User Balance Fields (từ User.model.js):')
console.log(`  • tokenBalance: Number (Token balance - internal currency)`)
console.log(`  • vndBalance: Number (VNĐ wallet - available balance)`)
console.log(`  • holdingBalance: Number (VNĐ holding - pending settlement)`)
console.log(`  • lockedBalance: Number (VNĐ locked - pending approval)`)
console.log(`  • totalEarned: Number (Total VNĐ earned)`)
console.log(`  • totalWithdrawn: Number (Total VNĐ withdrawn)`)
console.log(`  • subscriptionTier: String (free, pro, ultimate, founder)`)

// === TOKEN TRANSACTION MODEL ===
console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║ 2. TOKEN TRANSACTION MODEL - CHI TIẾT CÁC LOẠI GIAO DỊCH  ║')
console.log('╚════════════════════════════════════════════════════════════╝')

const tokenTxTypes = [
  'free_grant', // Cấp 100 token 1 lần cho tài khoản Free mới
  'monthly_grant', // Cấp token định kỳ hàng tháng (Pro/Ultimate)
  'topup', // User mua token lẻ
  'admin_adjust', // Admin nạp/trừ thủ công
  'spend_lensspy', // Tiêu token mở khóa LensSpy AI
  'spend_download', // Tiêu token tải ảnh Premium
  'earn_download', // Creator nhận khi ảnh được tải (70% giá)
  'referral_bonus', // Thưởng referral
  'subscription_bonus', // Bonus khi nâng gói
  'refund', // Hoàn token
]

console.log('\n🏷️  Các loại giao dịch token:')
tokenTxTypes.forEach((type) => console.log(`  • ${type}`))

console.log('\n📋 Token Transaction Fields:')
console.log(
  `  • amount: Number (Số lượng token thay đổi: dương = nhận, âm = tiêu)`
)
console.log(`  • balanceBefore: Number (Snapshot số dư trước)`)
console.log(`  • balanceAfter: Number (Snapshot số dư sau)`)
console.log(`  • description: String (Mô tả ngắn)`)
console.log(`  • type: String (enum loại giao dịch)`)
console.log(`  • userId: ObjectId (User liên quan)`)

// === VND TRANSACTION MODEL ===
console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║ 3. VND TRANSACTION MODEL - CHI TIẾT CÁC LOẠI GIAO DỊCH VNĐ ║')
console.log('╚════════════════════════════════════════════════════════════╝')

const vndTxTypes = [
  'topup', // Nạp tiền vào tài khoản
  'purchase_post', // Người dùng mua ảnh Premium
  'earn_purchase', // Creator nhận hoa hồng bán ảnh (70%)
  'earn_hold', // Creator nhận tạm giữ từ bán ảnh
  'release_hold', // Giải ngân tiền tạm giữ
  'refund', // Hoàn tiền cho người mua
  'refund_creator_hold', // Thu hồi tiền tạm giữ
  'earn_views', // Creator nhận tiền views
  'withdraw_request', // Yêu cầu rút tiền
  'withdraw_lock', // Khóa tiền chờ duyệt rút
  'withdraw_approved', // Yêu cầu rút tiền được duyệt
  'withdraw_rejected', // Yêu cầu rút tiền bị từ chối
]

console.log('\n🏷️  Các loại giao dịch VNĐ:')
vndTxTypes.forEach((type) => console.log(`  • ${type}`))

const vndWalletTypes = ['available', 'holding', 'locked']
console.log('\n💼 Các loại ví VNĐ:')
vndWalletTypes.forEach((type) => console.log(`  • ${type}`))

console.log('\n📋 VND Transaction Fields:')
console.log(
  `  • amount: Number (Số lượng VNĐ thay đổi: dương = cộng, âm = trừ)`
)
console.log(`  • walletType: String (available, holding, locked)`)
console.log(`  • balanceBefore: Number (Snapshot số dư trước)`)
console.log(`  • balanceAfter: Number (Snapshot số dư sau)`)
console.log(`  • description: String (Mô tả ngắn)`)
console.log(`  • type: String (enum loại giao dịch)`)
console.log(`  • userId: ObjectId (User liên quan)`)

// === SUMMARY ===
console.log('\n╔════════════════════════════════════════════════════════════╗')
console.log('║ 4. SUMMARY - TÓM TẮT CÁC FIELD TIỀN VÀ TOKEN              ║')
console.log('╚════════════════════════════════════════════════════════════╝')
console.log(`
📋 DATABASE FIELD NAMES (Tên field - KHÔNG THAY ĐỔI):
  ✓ tokenBalance          → Lưu trữ token balance (giữ nguyên trong DB)
  ✓ vndBalance           → Lưu trữ VNĐ balance (giữ nguyên trong DB)
  ✓ holdingBalance       → Lưu trữ VNĐ tạm giữ (giữ nguyên trong DB)
  ✓ lockedBalance        → Lưu trữ VNĐ bị khóa (giữ nguyên trong DB)

🎨 UI DISPLAY TEXT (Hiển thị trên giao diện - THAY ĐỔI SANG "AI Credits"):
  ✓ "Token" / "Tokens"   → "AI Credits"
  ✓ "token" (lowercase)  → "AI credit"
  ✓ "Số dư token"        → "AI Credits"
  ✓ "Mua thêm Token"     → "Buy AI Credits"
  ✓ "Điều chỉnh Token"   → "Adjust AI Credits"
  ✓ "token/tháng"        → "AI credit/month"
  ✓ "∞ Unlimited token"  → "∞ Unlimited AI Credits"

💰 VNĐ Display (Giữ nguyên):
  ✓ "Ví số dư"           → Không thay đổi (VNĐ wallet)
  ✓ "VNĐ"               → Không thay đổi
  ✓ "đ"                 → Không thay đổi (VNĐ symbol)

🔄 API RESPONSE & Backend (Giữ nguyên):
  ✓ JSON field names (tokenBalance, etc) → Không thay đổi
  ✓ Database collections → Không thay đổi
  ✓ Error messages → Thay "token" thành "AI credit" nếu hiển thị trực tiếp
    `)

console.log('✅ Database inspection completed!\n')
