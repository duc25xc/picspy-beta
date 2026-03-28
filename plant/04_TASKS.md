# ✅ PicSpy — Task Breakdown & Development Plan

> Timeline: 16 tuần | Stack: MERN + Redis + BullMQ + Socket.io

---

## 🗓️ PHASE 1 — Foundation (Tuần 1–3)

### Tuần 1: Project Setup + Auth

**Backend**

- [ ] Khởi tạo Express project (TypeScript optional)
- [ ] Kết nối MongoDB + Mongoose
- [ ] Kết nối Redis
- [ ] Setup middleware: cors, helmet, morgan, express-rate-limit
- [ ] Tạo User model + validation (Joi/Zod)
- [ ] POST `/auth/register` + hash password (bcrypt)
- [ ] POST `/auth/login` + JWT access token (15p)
- [ ] Refresh token rotation (httpOnly cookie, 7 ngày)
  - Lưu hash của refresh token vào Redis
  - Detect reuse attack → logout toàn bộ session
- [ ] Google OAuth (passport-google-oauth20)
- [ ] Middleware `authenticate` (verify access token)
- [ ] POST `/auth/logout` (invalidate refresh token)
- [ ] Email verification (nodemailer + token)
- [ ] Forgot/Reset password flow

**Frontend**

- [ ] Khởi tạo React + Vite + TailwindCSS
- [ ] Setup Zustand (auth store)
- [ ] Setup Axios instance (auto attach token + auto refresh)
- [ ] Trang Login / Register
- [ ] Google OAuth button
- [ ] Protected Route component

---

### Tuần 2: User Profile

**Backend**

- [ ] GET `/users/me`
- [ ] PUT `/users/me` (update profile)
- [ ] Upload avatar → Cloudinary
- [ ] GET `/users/:username` (public profile)
- [ ] Follow/Unfollow logic (atomic update followersCount)
- [ ] GET followers/following list (pagination)

**Frontend**

- [ ] Trang Profile
- [ ] Edit Profile modal
- [ ] Avatar upload (crop trước khi upload)
- [ ] Follow button với optimistic update

---

### Tuần 3: Upload & Image Processing

**Backend**

- [ ] Multer middleware (memory storage, validate type/size)
- [ ] Upload raw → Cloudinary
- [ ] Tạo Post document với status='pending'
- [ ] Setup BullMQ + Worker
- [ ] Image processing worker:
  - [ ] Resize → thumbnail (400px), preview (1200px)
  - [ ] Generate blurHash (blurhash package)
  - [ ] Extract colorPalette (node-vibrant)
  - [ ] NSFW detection (sightengine API hoặc nsfwjs)
  - [ ] Update post sau khi xử lý xong
- [ ] Notify creator qua Socket.io khi ảnh được duyệt

**Frontend**

- [ ] Upload form (drag & drop)
- [ ] Preview ảnh trước khi upload
- [ ] Progress bar upload
- [ ] Form: caption, tags, category, isPremium...
- [ ] Hiển thị trạng thái pending → approved

---

## 🗓️ PHASE 2 — Core Features (Tuần 4–7)

### Tuần 4: Feed & Infinite Scroll

**Backend**

- [ ] GET `/posts` với cursor-based pagination
  ```js
  // Tránh offset pagination (bị lệch khi có post mới)
  const posts = await Post.find({
    status: 'approved',
    ...(cursor && { _id: { $lt: cursor } }),
  })
    .sort({ score: -1, _id: -1 })
    .limit(limit)
  ```
- [ ] Feed types: `hot`, `new`, `following`
- [ ] Cache hot feed vào Redis (TTL 5 phút)
- [ ] Score ranking worker (chạy mỗi giờ):
  ```js
  score =
    (likes * 3 + downloads * 5 + comments * 2 + views * 0.1) /
    Math.pow(ageInHours + 2, 1.5)
  ```
- [ ] Filter: category, resolution, orientation, isAI, isPremium
- [ ] BlurHash placeholder cho ảnh

**Frontend**

- [ ] Masonry grid layout (react-masonry-css)
- [ ] Infinite scroll (Intersection Observer API)
- [ ] BlurHash placeholder khi ảnh loading
- [ ] Filter sidebar/drawer
- [ ] Skeleton loading state
- [ ] Tab: Khám phá / Đang follow / Trending

---

### Tuần 5: Post Detail & Social Actions

**Backend**

- [ ] GET `/posts/:id` (full detail)
- [ ] POST `/posts/:id/like` (toggle, atomic update likesCount)
- [ ] POST `/posts/:id/bookmark` (toggle)
- [ ] POST `/posts/:id/view` (debounce, 1 view/user/post/session)
- [ ] POST `/posts/:id/comments`
- [ ] GET `/posts/:id/comments` (nested: top-level + replies)
- [ ] DELETE comment (author hoặc admin)
- [ ] Report bài đăng

**Frontend**

- [ ] Trang chi tiết ảnh (modal hoặc page)
- [ ] Like button với animation tim
- [ ] Bookmark button
- [ ] Comment section (nested 1 level)
- [ ] Share button (copy link)
- [ ] Tag clickable → filter feed

---

### Tuần 6: Download System

**Backend**

- [ ] POST `/posts/:id/download`
  - Kiểm tra isPremium → nếu có thì kiểm tra xu
  - MongoDB transaction: trừ xu user + cộng xu creator (70/30 split)
  - Tạo Cloudinary signed URL (hết hạn 1 giờ)
  - Ghi interaction + transaction records
  - Cộng stats.downloadsCount
- [ ] Race condition protection (Redis lock):
  ```js
  const lockKey = `coinlock:${userId}`
  const locked = await redis.set(lockKey, '1', 'NX', 'EX', 5)
  if (!locked) throw new Error('Đang xử lý, thử lại')
  ```
- [ ] Milestone worker: check và thưởng khi đạt 1k, 10k, 100k download

**Frontend**

- [ ] Nút Download (free / premium)
- [ ] Modal xác nhận khi tải premium (hiện số xu)
- [ ] Lịch sử tải ảnh của user

---

### Tuần 7: Search & Color Search

**Backend**

- [ ] Full-text search: MongoDB text index trên caption + tags
- [ ] Search users theo username/displayName
- [ ] Autocomplete suggestions (cache Redis)
- [ ] Color search:
  ```js
  // User gửi hex color → tìm ảnh có màu gần nhất
  function colorDistance(hex1, hex2) {
    const [r1, g1, b1] = hexToRgb(hex1)
    const [r2, g2, b2] = hexToRgb(hex2)
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
  }
  // Query posts có colorPalette chứa màu trong threshold 50
  ```
- [ ] Filter nâng cao: kết hợp nhiều filter

**Frontend**

- [ ] Search bar với autocomplete dropdown
- [ ] Trang Search results
- [ ] Color picker (react-colorful) → tìm ảnh theo màu
- [ ] Recent searches (localStorage)

---

## 🗓️ PHASE 3 — Monetization (Tuần 8–11)

### Tuần 8: Coin System

**Backend**

- [ ] GET `/coins/balance`
- [ ] GET `/coins/transactions` (phân trang)
- [ ] GET `/coins/packages`
- [ ] Coin earning logic (worker chạy batch mỗi giờ):
  ```
  - Mỗi like mới: +5 xu cho creator
  - Mỗi download free: +10 xu
  - Mỗi download premium: tính theo priceInCoins * 70%
  ```

**Frontend**

- [ ] Trang Ví xu (balance, lịch sử)
- [ ] Coin badge trên header
- [ ] Trang thống kê thu nhập creator (chart theo ngày/tuần/tháng)

---

### Tuần 9: Payment — Nạp xu

**Backend**

- [ ] Tích hợp Stripe (hoặc VNPay cho Việt Nam):
  - POST `/coins/topup` → tạo Stripe checkout session
  - POST `/coins/topup/webhook` → verify + cộng xu
- [ ] Idempotency: check stripePaymentId trước khi cộng xu (tránh double credit)

**Frontend**

- [ ] Trang mua xu (hiện các gói)
- [ ] Redirect sang Stripe/VNPay
- [ ] Trang success/failed sau thanh toán
- [ ] Toast thông báo xu đã vào tài khoản

---

### Tuần 10: Rút tiền

**Backend**

- [ ] POST `/coins/withdraw` (validate: min 100k xu, không đang pending)
- [ ] Trừ xu ngay lập tức, tạo withdrawRequest với status='pending'
- [ ] Admin API xử lý rút tiền
- [ ] Email thông báo khi rút tiền được xử lý

**Frontend**

- [ ] Form rút tiền (chọn MoMo/banking, nhập thông tin)
- [ ] Hiển thị quy đổi: X xu = Y.000đ
- [ ] Lịch sử rút tiền + trạng thái

---

### Tuần 11: Subscription Pro Creator

**Backend**

- [ ] Stripe subscription (hoặc one-time payment hàng tháng)
- [ ] Middleware `requirePro` cho các endpoint Premium
- [ ] Giới hạn upload/ngày cho free user
- [ ] Cron job: expire subscription hết hạn

**Frontend**

- [ ] Trang nâng cấp Pro Creator
- [ ] So sánh Free vs Pro
- [ ] Badge Pro trên profile
- [ ] Unlock analytics nâng cao cho Pro

---

## 🗓️ PHASE 4 — Admin & Quality (Tuần 12–14)

### Tuần 12: Admin Dashboard

**Backend**

- [ ] GET `/admin/stats`: tổng user, post, doanh thu, xu đang lưu hành
- [ ] GET `/admin/posts/pending`: queue duyệt với NSFW score
- [ ] PUT `/admin/posts/:id/approve|reject`
- [ ] GET `/admin/reports` + xử lý báo cáo
- [ ] Ban/unban user

**Frontend**

- [ ] Admin layout (sidebar)
- [ ] Dashboard stats (recharts)
- [ ] Queue duyệt ảnh: xem ảnh + NSFW score + approve/reject 1 click
- [ ] Bảng quản lý user (search, filter, ban)
- [ ] Bảng xử lý báo cáo

---

### Tuần 13: Notifications & Real-time

**Backend**

- [ ] Socket.io server setup
- [ ] Emit notification khi: like, follow, comment, post approved, coin nhận
- [ ] GET `/users/me/notifications` (phân trang)
- [ ] PUT `/users/me/notifications/read` (batch mark read)
- [ ] TTL index: tự xóa notification sau 90 ngày

**Frontend**

- [ ] Notification bell với badge đếm chưa đọc
- [ ] Notification dropdown (real-time update)
- [ ] Trang full notifications
- [ ] Toast notification khi nhận real-time

---

### Tuần 14: Performance & Security

**Backend**

- [ ] Compression middleware (gzip)
- [ ] Helmet.js (security headers)
- [ ] Morgan logging
- [ ] Request validation (Zod)
- [ ] Sanitize input (DOMPurify/xss)
- [ ] MongoDB query optimization (explain + index review)
- [ ] API response caching (Redis) cho endpoints đọc nhiều

**Frontend**

- [ ] React.lazy + Suspense (code splitting)
- [ ] Image lazy loading (native loading="lazy")
- [ ] Memoization (useMemo, useCallback, React.memo)
- [ ] Error Boundary
- [ ] 404 / 500 pages

---

## 🗓️ PHASE 5 — Deploy & Launch (Tuần 15–16)

### Tuần 15: Deploy

- [ ] Dockerfile cho server
- [ ] docker-compose (server + mongo + redis)
- [ ] Deploy backend: Railway hoặc VPS (Ubuntu + Nginx + PM2)
- [ ] Deploy frontend: Vercel hoặc Netlify
- [ ] SSL certificate (Let's Encrypt)
- [ ] Environment variables management
- [ ] CI/CD: GitHub Actions (auto deploy khi push main)
- [ ] MongoDB Atlas (production database)
- [ ] Cloudinary setup (production account)

### Tuần 16: Polish & Launch

- [ ] SEO: meta tags, Open Graph, sitemap
- [ ] PWA: manifest + service worker (optional)
- [ ] Google Analytics
- [ ] Error tracking: Sentry
- [ ] Load testing: Artillery hoặc k6
- [ ] Write README.md chi tiết cho GitHub
- [ ] Demo video / screenshots cho CV
- [ ] Soft launch: share vào group Facebook dev Việt, Reddit r/webdev

---

## 🧠 Technical Challenges & Solutions

### Challenge 1: Infinite Scroll bị lệch khi có post mới

```
Vấn đề: Dùng offset pagination → khi có post mới, trang 2 sẽ bị trùng post cuối trang 1
Giải pháp: Cursor-based pagination dùng _id của post cuối cùng
Code: Post.find({ _id: { $lt: lastId } }).sort({ score: -1 }).limit(20)
```

### Challenge 2: Race condition khi nhiều user tải cùng ảnh premium

```
Vấn đề: 2 request đến cùng lúc, cả 2 đều thấy đủ xu → trừ 2 lần → âm xu
Giải pháp: Redis distributed lock (SET NX EX) + MongoDB atomic findOneAndUpdate
          với điều kiện coinBalance >= required
```

### Challenge 3: Fake views / spam like

```
Vấn đề: Creator tự like, tự view để lấy xu
Giải pháp:
  - Interaction unique index (userId + postId + type)
  - View: chỉ count 1 lần/session, debounce 30 giây
  - Creator không nhận xu từ chính ảnh của mình
  - Rate limit API
  - Anomaly detection worker: flag account có pattern bất thường
```

### Challenge 4: NSFW detection không chính xác

```
Vấn đề: AI detect sai → block ảnh hợp lệ hoặc để lọt ảnh xấu
Giải pháp:
  - Dùng Sightengine API (reliable hơn nsfwjs local)
  - Threshold: score > 0.8 → reject tự động
  - score 0.4-0.8 → đưa vào queue review thủ công
  - score < 0.4 → auto approve
  - User có thể appeal bài bị reject
```

### Challenge 5: Feed ranking không fair cho bài mới

```
Vấn đề: Bài cũ nhiều like sẽ luôn đứng top → bài mới không có cơ hội
Giải pháp: Time decay trong score formula (Hacker News algorithm)
  score = interactions / (age + 2)^1.5
  → Bài mới có score cao dù ít like
  → Bài cũ dù nhiều like cũng sẽ giảm dần
```

---

## 📦 Dependencies chính

### Backend

```json
{
  "express": "^4.18",
  "mongoose": "^8.0",
  "redis": "^4.6",
  "bullmq": "^5.0",
  "socket.io": "^4.6",
  "jsonwebtoken": "^9.0",
  "bcryptjs": "^2.4",
  "multer": "^1.4",
  "cloudinary": "^2.0",
  "node-vibrant": "^3.1",
  "blurhash": "^2.0",
  "stripe": "^14.0",
  "nodemailer": "^6.9",
  "passport": "^0.6",
  "passport-google-oauth20": "^2.0",
  "zod": "^3.22",
  "helmet": "^7.0",
  "compression": "^1.7"
}
```

### Frontend

```json
{
  "react": "^18.2",
  "react-router-dom": "^6.20",
  "zustand": "^4.4",
  "axios": "^1.6",
  "tailwindcss": "^3.3",
  "framer-motion": "^10.16",
  "react-masonry-css": "^1.0",
  "react-colorful": "^5.6",
  "blurhash": "^2.0",
  "react-hot-toast": "^2.4",
  "recharts": "^2.9",
  "socket.io-client": "^4.6",
  "@tanstack/react-query": "^5.0"
}
```
