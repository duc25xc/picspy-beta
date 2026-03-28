# 🗄️ PicSpy — Database Design

---

## Tổng quan Collections

```
MongoDB Collections:
├── users
├── posts
├── interactions      (like, bookmark, download, view)
├── comments
├── transactions      (coin history)
├── withdrawRequests
├── notifications
├── reports           (user báo cáo vi phạm)
└── sponsoredPosts
```

---

## 📋 Chi tiết Schema

### 1. `users`

```js
{
  _id: ObjectId,
  
  // === IDENTITY ===
  username:       { type: String, unique: true, required: true, minlength: 3, maxlength: 30 },
  email:          { type: String, unique: true, required: true },
  passwordHash:   { type: String },                    // null nếu đăng nhập Google
  googleId:       { type: String, sparse: true },
  
  // === PROFILE ===
  displayName:    { type: String, maxlength: 50 },
  avatar:         { type: String },                    // Cloudinary URL
  bio:            { type: String, maxlength: 200 },
  website:        { type: String },
  socialLinks: {
    tiktok:       String,
    instagram:    String,
    facebook:     String,
  },
  
  // === ROLE & STATUS ===
  role:           { type: String, enum: ['user', 'creator', 'admin'], default: 'user' },
  isVerified:     { type: Boolean, default: false },   // email verified
  isBanned:       { type: Boolean, default: false },
  banReason:      { type: String },
  warningCount:   { type: Number, default: 0 },
  
  // === SUBSCRIPTION ===
  subscriptionTier:   { type: String, enum: ['free', 'pro'], default: 'free' },
  subscriptionExpiry: { type: Date },
  stripeCustomerId:   { type: String },
  
  // === COIN & EARNINGS ===
  coinBalance:    { type: Number, default: 0, min: 0 },
  totalEarned:    { type: Number, default: 0 },        // tổng xu đã kiếm được
  totalWithdrawn: { type: Number, default: 0 },        // tổng xu đã rút
  
  // === STATS (denormalized để tránh query nặng) ===
  stats: {
    postsCount:      { type: Number, default: 0 },
    totalViews:      { type: Number, default: 0 },
    totalLikes:      { type: Number, default: 0 },
    totalDownloads:  { type: Number, default: 0 },
    followersCount:  { type: Number, default: 0 },
    followingCount:  { type: Number, default: 0 },
  },
  
  // === SETTINGS ===
  settings: {
    showNSFW:         { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
    isPrivate:        { type: Boolean, default: false },
  },
  
  // === AUTH ===
  refreshTokenHash:   { type: String },                // hash của refresh token hiện tại
  passwordResetToken: { type: String },
  passwordResetExpiry:{ type: Date },
  lastLoginAt:        { type: Date },
  
  createdAt: Date,
  updatedAt: Date,
}

// Indexes:
// { email: 1 } unique
// { username: 1 } unique
// { googleId: 1 } sparse
// { role: 1 }
// { createdAt: -1 }
```

---

### 2. `posts`

```js
{
  _id: ObjectId,
  authorId: { type: ObjectId, ref: 'User', required: true },
  
  // === IMAGE ===
  images: [{
    url:          String,    // Cloudinary original URL
    thumbnailUrl: String,    // 400px width
    previewUrl:   String,    // 1200px width
    width:        Number,
    height:       Number,
    fileSize:     Number,    // bytes
    format:       String,    // jpg, png, webp
  }],
  blurHash:       String,    // placeholder khi loading
  colorPalette:   [String],  // mảng hex colors trích từ ảnh, vd: ['#1a1a2e', '#16213e']
  
  // === CONTENT ===
  caption:        { type: String, maxlength: 500 },
  tags:           [{ type: String, lowercase: true }],
  category: {
    type: String,
    enum: ['nature', 'anime', 'minimal', 'abstract', 'city', 'space', 'dark', 'light', 'gradient', 'other'],
    required: true,
  },
  resolution:     { type: String, enum: ['hd', '2k', '4k'] },
  orientation:    { type: String, enum: ['portrait', 'landscape', 'square'] },
  
  // === AI ===
  isAIGenerated:  { type: Boolean, default: false },
  aiTool:         { type: String },                    // 'midjourney', 'stable-diffusion', ...
  
  // === MODERATION ===
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending',
  },
  isNSFW:         { type: Boolean, default: false },
  nsfwScore:      { type: Number, min: 0, max: 1 },    // từ AI detection
  rejectionReason:{ type: String },
  reviewedBy:     { type: ObjectId, ref: 'User' },
  reviewedAt:     { type: Date },
  
  // === MONETIZATION ===
  isPremium:      { type: Boolean, default: false },   // cần xu để tải full-res
  priceInCoins:   { type: Number, default: 50 },       // giá tải premium
  totalCoinsEarned: { type: Number, default: 0 },
  
  // === STATS (denormalized) ===
  stats: {
    viewsCount:     { type: Number, default: 0 },
    likesCount:     { type: Number, default: 0 },
    downloadsCount: { type: Number, default: 0 },
    commentsCount:  { type: Number, default: 0 },
    bookmarksCount: { type: Number, default: 0 },
    sharesCount:    { type: Number, default: 0 },
  },
  
  // === RANKING ===
  score:          { type: Number, default: 0 },        // tính lại mỗi giờ bởi worker
  isFeatured:     { type: Boolean, default: false },   // admin featured
  isTrending:     { type: Boolean, default: false },   // tự động theo score
  
  // === SPONSORED ===
  isSponsored:    { type: Boolean, default: false },
  sponsorExpiry:  { type: Date },
  
  createdAt: Date,
  updatedAt: Date,
}

// Indexes:
// { authorId: 1, createdAt: -1 }
// { status: 1, createdAt: -1 }
// { category: 1, score: -1 }
// { tags: 1 }
// { score: -1 }                    (hot feed)
// { colorPalette: 1 }              (color search)
// { isNSFW: 1, status: 1 }
// Text index: { caption: 'text', tags: 'text' }
```

---

### 3. `interactions`

```js
{
  _id: ObjectId,
  userId:   { type: ObjectId, ref: 'User', required: true },
  postId:   { type: ObjectId, ref: 'Post', required: true },
  type: {
    type: String,
    enum: ['like', 'bookmark', 'download', 'view'],
    required: true,
  },
  
  // Download metadata
  downloadType: { type: String, enum: ['free', 'premium'] },  // chỉ khi type='download'
  coinsSpent:   { type: Number },
  
  createdAt: Date,
}

// Indexes:
// { userId, postId, type } unique   (prevent duplicate like/bookmark)
// { postId, type }                  (count per post)
// { userId, type, createdAt: -1 }   (user history)
```

---

### 4. `comments`

```js
{
  _id: ObjectId,
  postId:    { type: ObjectId, ref: 'Post', required: true },
  authorId:  { type: ObjectId, ref: 'User', required: true },
  parentId:  { type: ObjectId, ref: 'Comment', default: null },  // null = top-level
  
  content:   { type: String, required: true, maxlength: 500 },
  likesCount:{ type: Number, default: 0 },
  isHidden:  { type: Boolean, default: false },   // ẩn bởi admin
  
  createdAt: Date,
  updatedAt: Date,
}

// Indexes:
// { postId: 1, createdAt: 1 }
// { authorId: 1 }
// { parentId: 1 }
```

---

### 5. `follows`

```js
{
  _id: ObjectId,
  followerId:  { type: ObjectId, ref: 'User', required: true },  // người follow
  followingId: { type: ObjectId, ref: 'User', required: true },  // người được follow
  createdAt: Date,
}

// Indexes:
// { followerId, followingId } unique
// { followingId: 1 }    (ai follow mình)
// { followerId: 1 }     (mình follow ai)
```

---

### 6. `transactions`

```js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true },
  
  type: {
    type: String,
    enum: [
      'earn_like',          // kiếm từ like
      'earn_download_free', // kiếm từ download free
      'earn_download_premium', // kiếm từ download premium
      'earn_milestone',     // thưởng milestone
      'spend_download',     // mua xu để tải
      'topup',              // nạp xu bằng tiền thật
      'withdraw',           // rút tiền
      'refund',             // hoàn xu
      'admin_adjust',       // admin điều chỉnh
    ],
    required: true,
  },
  
  amount:        { type: Number, required: true },     // dương = nhận, âm = tiêu
  balanceBefore: { type: Number, required: true },
  balanceAfter:  { type: Number, required: true },
  
  description:   { type: String },
  relatedPostId: { type: ObjectId, ref: 'Post' },
  relatedUserId: { type: ObjectId, ref: 'User' },     // ai trigger transaction
  
  // Payment info (khi topup)
  stripePaymentId: { type: String },
  packageId:       { type: String },                  // 'coin_50', 'coin_150', ...
  
  status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' },
  
  createdAt: Date,
}

// Indexes:
// { userId: 1, createdAt: -1 }
// { type: 1 }
// { stripePaymentId: 1 } sparse
```

---

### 7. `withdrawRequests`

```js
{
  _id: ObjectId,
  userId:   { type: ObjectId, ref: 'User', required: true },
  
  amountInCoins: { type: Number, required: true, min: 100000 },   // min 100k xu
  amountInVND:   { type: Number, required: true },                 // quy đổi
  
  method: { type: String, enum: ['momo', 'banking'], required: true },
  accountInfo: {
    name:   { type: String, required: true },
    number: { type: String, required: true },
    bank:   { type: String },                // chỉ khi method='banking'
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'],
    default: 'pending',
  },
  
  processedBy: { type: ObjectId, ref: 'User' },   // admin xử lý
  processedAt: { type: Date },
  rejectionNote: { type: String },
  
  createdAt: Date,
}

// Indexes:
// { userId: 1, createdAt: -1 }
// { status: 1, createdAt: 1 }  (admin xử lý theo thứ tự)
```

---

### 8. `notifications`

```js
{
  _id: ObjectId,
  recipientId: { type: ObjectId, ref: 'User', required: true },
  
  type: {
    type: String,
    enum: [
      'new_follower',
      'post_liked',
      'post_commented',
      'post_downloaded',
      'post_approved',
      'post_rejected',
      'coin_received',
      'milestone_reached',
      'withdraw_completed',
      'system',
    ],
  },
  
  message:  { type: String, required: true },
  link:     { type: String },                  // URL để redirect
  isRead:   { type: Boolean, default: false },
  
  // References
  actorId:  { type: ObjectId, ref: 'User' },   // ai trigger
  postId:   { type: ObjectId, ref: 'Post' },
  
  createdAt: Date,
}

// Indexes:
// { recipientId: 1, isRead: 1, createdAt: -1 }
// TTL index: createdAt (tự xóa sau 90 ngày)
```

---

### 9. `reports`

```js
{
  _id: ObjectId,
  reporterId: { type: ObjectId, ref: 'User', required: true },
  
  targetType: { type: String, enum: ['post', 'comment', 'user'] },
  targetId:   { type: ObjectId, required: true },
  
  reason: {
    type: String,
    enum: ['nsfw', 'spam', 'copyright', 'hate_speech', 'misinformation', 'other'],
  },
  description: { type: String, maxlength: 500 },
  
  status: { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
  reviewedBy: { type: ObjectId, ref: 'User' },
  reviewNote: { type: String },
  
  createdAt: Date,
}

// Indexes:
// { targetId: 1, targetType: 1 }
// { status: 1, createdAt: 1 }
```

---

## 🔴 Redis Schema (Key conventions)

```
# Feed cache
feed:hot                    → sorted set (postId, score)     TTL: 5 phút
feed:new                    → sorted set (postId, timestamp)  TTL: 2 phút
feed:category:{name}        → sorted set                      TTL: 10 phút

# User session
session:refresh:{userId}    → string (hashed token)           TTL: 7 ngày
session:reset:{token}       → string (userId)                 TTL: 15 phút

# Rate limiting
ratelimit:upload:{userId}   → counter                         TTL: 1 giờ
ratelimit:api:{ip}          → counter                         TTL: 1 phút

# Online presence
online:{userId}             → string                          TTL: 30 giây (ping)

# Post score cache
postscore:{postId}          → string (score)                  TTL: 1 giờ

# Coin lock (prevent race condition)
coinlock:{userId}           → string                          TTL: 5 giây
```

---

## 📊 Quan hệ giữa các Collections

```
User ──────┬── Post (1:N, authorId)
           ├── Comment (1:N, authorId)
           ├── Interaction (1:N, userId)
           ├── Transaction (1:N, userId)
           ├── WithdrawRequest (1:N, userId)
           ├── Notification (1:N, recipientId)
           └── Follow (N:M qua follows collection)

Post ──────┬── Comment (1:N, postId)
           ├── Interaction (1:N, postId)
           └── Transaction (1:N, relatedPostId)
```
