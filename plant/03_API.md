# 🔌 PicSpy — API Documentation

> Base URL: `https://api.picspy.vn/v1`
> Auth: `Authorization: Bearer <access_token>`

---

## 🔐 Auth Routes `/auth`

| Method | Endpoint                | Auth | Mô tả                                |
| ------ | ----------------------- | ---- | ------------------------------------ |
| POST   | `/auth/register`        | ❌   | Đăng ký tài khoản                    |
| POST   | `/auth/login`           | ❌   | Đăng nhập                            |
| POST   | `/auth/google`          | ❌   | Đăng nhập Google OAuth               |
| POST   | `/auth/refresh`         | ❌   | Làm mới access token                 |
| POST   | `/auth/logout`          | ✅   | Đăng xuất (invalidate refresh token) |
| POST   | `/auth/forgot-password` | ❌   | Gửi email reset                      |
| POST   | `/auth/reset-password`  | ❌   | Đặt lại mật khẩu                     |
| POST   | `/auth/verify-email`    | ❌   | Xác thực email                       |

### POST `/auth/register`

```json
// Request
{
  "username": "creator_dev",
  "email": "dev@example.com",
  "password": "SecurePass123!"
}

// Response 201
{
  "message": "Đăng ký thành công. Vui lòng xác thực email.",
  "user": {
    "_id": "...",
    "username": "creator_dev",
    "email": "dev@example.com",
    "role": "user"
  }
}
```

### POST `/auth/login`

```json
// Response 200
{
  "accessToken": "eyJ...",      // 15 phút
  "user": { "_id", "username", "role", "coinBalance", "subscriptionTier" }
}
// refreshToken set qua httpOnly cookie
```

---

## 👤 User Routes `/users`

| Method | Endpoint                       | Auth | Mô tả                  |
| ------ | ------------------------------ | ---- | ---------------------- |
| GET    | `/users/me`                    | ✅   | Lấy thông tin bản thân |
| PUT    | `/users/me`                    | ✅   | Cập nhật profile       |
| PUT    | `/users/me/avatar`             | ✅   | Upload avatar          |
| PUT    | `/users/me/password`           | ✅   | Đổi mật khẩu           |
| GET    | `/users/:username`             | ❌   | Xem profile công khai  |
| GET    | `/users/:username/posts`       | ❌   | Ảnh của user           |
| POST   | `/users/:id/follow`            | ✅   | Follow/unfollow        |
| GET    | `/users/:id/followers`         | ❌   | Danh sách followers    |
| GET    | `/users/:id/following`         | ❌   | Danh sách following    |
| GET    | `/users/me/bookmarks`          | ✅   | Ảnh đã bookmark        |
| GET    | `/users/me/downloads`          | ✅   | Ảnh đã tải             |
| GET    | `/users/me/notifications`      | ✅   | Thông báo              |
| PUT    | `/users/me/notifications/read` | ✅   | Đánh dấu đã đọc        |
| GET    | `/users/me/stats`              | ✅   | Thống kê cá nhân       |

---

## 🖼️ Post Routes `/posts`

| Method | Endpoint                         | Auth | Mô tả                       |
| ------ | -------------------------------- | ---- | --------------------------- |
| POST   | `/posts`                         | ✅   | Upload ảnh mới              |
| GET    | `/posts`                         | ❌   | Feed (có filter)            |
| GET    | `/posts/:id`                     | ❌   | Chi tiết bài đăng           |
| PUT    | `/posts/:id`                     | ✅   | Chỉnh sửa bài (author only) |
| DELETE | `/posts/:id`                     | ✅   | Xóa bài (author/admin)      |
| POST   | `/posts/:id/like`                | ✅   | Like/unlike                 |
| POST   | `/posts/:id/bookmark`            | ✅   | Bookmark/unbookmark         |
| POST   | `/posts/:id/download`            | ✅   | Tải ảnh (free hoặc dùng xu) |
| POST   | `/posts/:id/view`                | ❌   | Track lượt xem              |
| GET    | `/posts/:id/comments`            | ❌   | Danh sách comment           |
| POST   | `/posts/:id/comments`            | ✅   | Thêm comment                |
| DELETE | `/posts/:id/comments/:commentId` | ✅   | Xóa comment                 |
| POST   | `/posts/:id/report`              | ✅   | Báo cáo vi phạm             |

### POST `/posts` — Upload ảnh

```
Content-Type: multipart/form-data

Fields:
  image*        File        (required, max 20MB, jpg/png/webp)
  caption       String      (max 500 chars)
  tags          String[]    (max 10 tags)
  category*     String      (required)
  isPremium     Boolean
  priceInCoins  Number      (nếu isPremium=true)
  isAIGenerated Boolean
  aiTool        String
  resolution    String      (hd|2k|4k)
  orientation   String      (portrait|landscape|square)

Response 202:
{
  "message": "Ảnh đang được xử lý",
  "postId": "...",
  "status": "pending"
}
```

### GET `/posts` — Feed với filters

```
Query params:
  feed=hot|new|following    (default: hot)
  category=nature|anime|...
  resolution=hd|2k|4k
  orientation=portrait|landscape|square
  isAI=true|false
  isPremium=true|false
  color=#1a1a2e              (tìm theo màu sắc)
  q=keyword                  (full-text search)
  cursor=<lastPostId>        (pagination)
  limit=20                   (default 20, max 50)

Response 200:
{
  "posts": [...],
  "nextCursor": "...",
  "hasMore": true
}
```

### POST `/posts/:id/download`

```json
// Request
{ "type": "free" }         // hoặc "premium"

// Response 200
{
  "downloadUrl": "https://cloudinary.com/...",
  "expiresAt": "...",       // URL signed, hết hạn sau 1 giờ
  "coinsSpent": 0,
  "creatorEarned": 10
}

// Error 402 (không đủ xu)
{
  "error": "INSUFFICIENT_COINS",
  "required": 50,
  "current": 20
}
```

---

## 💰 Coin Routes `/coins`

| Method | Endpoint                  | Auth | Mô tả                  |
| ------ | ------------------------- | ---- | ---------------------- |
| GET    | `/coins/balance`          | ✅   | Số xu hiện tại         |
| GET    | `/coins/transactions`     | ✅   | Lịch sử giao dịch xu   |
| GET    | `/coins/packages`         | ❌   | Các gói mua xu         |
| POST   | `/coins/topup`            | ✅   | Tạo payment để nạp xu  |
| POST   | `/coins/topup/webhook`    | ❌   | Stripe webhook confirm |
| POST   | `/coins/withdraw`         | ✅   | Yêu cầu rút tiền       |
| GET    | `/coins/withdraw/history` | ✅   | Lịch sử rút tiền       |

### GET `/coins/packages`

```json
{
  "packages": [
    { "id": "coin_50", "coins": 50, "bonusCoins": 0, "priceVND": 10000 },
    { "id": "coin_150", "coins": 150, "bonusCoins": 30, "priceVND": 25000 },
    { "id": "coin_500", "coins": 500, "bonusCoins": 150, "priceVND": 69000 },
    { "id": "coin_1500", "coins": 1500, "bonusCoins": 600, "priceVND": 179000 }
  ]
}
```

### POST `/coins/withdraw`

```json
// Request
{
  "amountInCoins": 100000,
  "method": "momo",
  "accountInfo": {
    "name": "Nguyen Van A",
    "number": "0987654321"
  }
}

// Response 201
{
  "message": "Yêu cầu rút tiền đã được gửi. Xử lý trong 1-3 ngày làm việc.",
  "requestId": "...",
  "amountVND": 500000,
  "newBalance": 0
}
```

---

## 🔍 Search Routes `/search`

| Method | Endpoint              | Auth | Mô tả                |
| ------ | --------------------- | ---- | -------------------- |
| GET    | `/search/posts`       | ❌   | Tìm kiếm bài đăng    |
| GET    | `/search/users`       | ❌   | Tìm kiếm người dùng  |
| GET    | `/search/tags`        | ❌   | Tìm kiếm theo tag    |
| GET    | `/search/suggestions` | ❌   | Gợi ý tìm kiếm       |
| GET    | `/search/color`       | ❌   | Tìm ảnh theo màu sắc |

### GET `/search/color`

```
Query: ?color=%231a1a2e&limit=20

Logic:
  1. Parse hex → RGB
  2. Tìm posts có colorPalette gần nhất (Euclidean distance trong RGB space)
  3. Sắp xếp theo khoảng cách tăng dần

Response: { posts: [...] }
```

---

## 🛡️ Admin Routes `/admin`

> Yêu cầu role: `admin`

| Method | Endpoint                   | Mô tả                  |
| ------ | -------------------------- | ---------------------- |
| GET    | `/admin/posts/pending`     | Queue ảnh chờ duyệt    |
| PUT    | `/admin/posts/:id/approve` | Duyệt bài              |
| PUT    | `/admin/posts/:id/reject`  | Từ chối bài            |
| PUT    | `/admin/posts/:id/feature` | Feature bài            |
| GET    | `/admin/reports`           | Danh sách báo cáo      |
| PUT    | `/admin/reports/:id`       | Xử lý báo cáo          |
| GET    | `/admin/users`             | Danh sách user         |
| PUT    | `/admin/users/:id/ban`     | Ban user               |
| PUT    | `/admin/users/:id/unban`   | Unban user             |
| GET    | `/admin/withdraws/pending` | Yêu cầu rút tiền       |
| PUT    | `/admin/withdraws/:id`     | Xử lý rút tiền         |
| GET    | `/admin/stats`             | Thống kê tổng quan     |
| POST   | `/admin/coins/adjust`      | Điều chỉnh xu thủ công |

---

## 📡 WebSocket Events (Socket.io)

```js
// Client join room cá nhân khi login
socket.emit('join', { userId })

// Server emit đến client
socket.to(`user:${userId}`).emit('notification', {
  type: 'post_liked' | 'new_follower' | 'post_approved' | 'coin_received' | ...,
  message: String,
  data: { postId?, actorId?, amount? }
})

// Real-time view count (public room)
socket.join(`post:${postId}`)
socket.to(`post:${postId}`).emit('view_update', { viewsCount: Number })
```

---

## ⚠️ Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {} // optional validation errors
}

// Common error codes:
// UNAUTHORIZED          401 - chưa đăng nhập
// FORBIDDEN             403 - không có quyền
// NOT_FOUND             404 - không tìm thấy
// VALIDATION_ERROR      422 - dữ liệu không hợp lệ
// INSUFFICIENT_COINS    402 - không đủ xu
// RATE_LIMITED          429 - quá nhiều request
// UPLOAD_TOO_LARGE      413 - file quá lớn
// NSFW_DETECTED         400 - ảnh nhạy cảm
// POST_PENDING          400 - bài đang chờ duyệt
```

---

## 🔒 Rate Limiting

| Endpoint                   | Limit            |
| -------------------------- | ---------------- |
| POST `/auth/login`         | 5 lần/15 phút/IP |
| POST `/auth/register`      | 3 lần/giờ/IP     |
| POST `/posts` (upload)     | 20 ảnh/ngày/user |
| POST `/posts/:id/download` | 50 lần/giờ/user  |
| GET `/posts`               | 100 req/phút/IP  |
| POST `/coins/withdraw`     | 1 lần/ngày/user  |
