# 🖼️ PicSpy

> Nền tảng chia sẻ wallpaper AI-powered — nơi creator Việt Nam kiếm tiền từ sáng tạo ảnh

[![Tech Stack](https://img.shields.io/badge/Stack-MERN-green)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Cache-Redis-red)](https://redis.io/)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-black)](https://socket.io/)
[![BullMQ](https://img.shields.io/badge/Queue-BullMQ-orange)](https://docs.bullmq.io/)

---

## ✨ Tính năng chính

- 🔐 **Auth** — JWT + Refresh Token Rotation + Google OAuth
- 🖼️ **Upload ảnh** — Async processing với BullMQ (resize, blurHash, NSFW detection, color palette)
- 📰 **Smart Feed** — Cursor pagination + Hacker News ranking algorithm + Redis cache
- 🔍 **Search nâng cao** — Full-text search + tìm ảnh theo màu sắc (Euclidean distance)
- 💰 **Coin System** — Creator kiếm xu từ like/download, rút về MoMo/banking
- 🛡️ **Admin Panel** — Kiểm duyệt ảnh, NSFW detection tự động, quản lý user
- 🔔 **Real-time** — Thông báo tức thời qua Socket.io
- 💳 **Payment** — Nạp xu qua Stripe/VNPay

---

## 🧱 Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Frontend      | React 18 + Vite + TailwindCSS + Framer Motion |
| State         | Zustand + TanStack Query                      |
| Backend       | Node.js + Express.js                          |
| Database      | MongoDB + Mongoose                            |
| Cache & Queue | Redis + BullMQ                                |
| Storage       | Cloudinary                                    |
| Realtime      | Socket.io                                     |
| Auth          | JWT + Passport.js                             |
| Payment       | Stripe                                        |
| Deploy        | Docker + Nginx + Railway                      |

---

## 📁 Project Structure

```
picspy/
├── client/                 # React Frontend
│   └── src/
│       ├── components/     # Reusable UI
│       ├── pages/          # Route pages
│       ├── hooks/          # Custom hooks
│       ├── store/          # Zustand stores
│       └── services/       # API layer
│
├── server/                 # Express Backend
│   └── src/
│       ├── routes/         # API routes
│       ├── controllers/    # Request handlers
│       ├── models/         # Mongoose schemas
│       ├── middleware/      # Auth, validation, rate-limit
│       ├── services/       # Business logic
│       ├── workers/        # BullMQ workers
│       └── socket/         # Socket.io events
│
└── docs/                   # Documentation
    ├── 01_OVERVIEW.md
    ├── 02_DATABASE.md
    ├── 03_API.md
    ├── 04_TASKS.md
    └── 05_SKILLS.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- Cloudinary account

### Installation

```bash
# Clone repo
git clone https://github.com/yourusername/picspy.git
cd picspy

# Setup backend
cd server
cp .env.example .env   # điền các biến môi trường
npm install
npm run dev

# Setup frontend
cd ../client
cp .env.example .env
npm install
npm run dev
```

### Environment Variables

```env
# server/.env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/picspy
REDIS_URL=redis://localhost:6379

JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=

CLIENT_URL=http://localhost:5173
```

---

## 📊 Architecture Highlights

### Coin Transaction (Race-condition Safe)

```
User request download premium
    → Redis distributed lock (SET NX EX 5)
    → MongoDB session transaction
        → Atomic: findOneAndUpdate với điều kiện coinBalance >= required
        → Cộng xu creator (70%), platform giữ (30%)
        → Ghi transaction log
    → Release lock
    → Return signed download URL
```

### Image Processing Pipeline

```
Upload → Cloudinary (raw) → BullMQ queue
    Worker: resize → blurHash → colorPalette → NSFW check
    → Update post status (approved/pending/rejected)
    → Notify creator via Socket.io
```

### Feed Ranking

```
Score = interactions / (age + 2)^1.5
where interactions = likes×3 + downloads×5 + comments×2 + views×0.1

Worker cập nhật score mỗi giờ
Top 100 posts cache vào Redis Sorted Set (TTL 5 phút)
```

---

## 📖 Documentation

| File                                  | Nội dung                                       |
| ------------------------------------- | ---------------------------------------------- |
| [01_OVERVIEW.md](docs/01_OVERVIEW.md) | Tổng quan, định vị, monetization, kiến trúc    |
| [02_DATABASE.md](docs/02_DATABASE.md) | Schema chi tiết tất cả collections + Redis     |
| [03_API.md](docs/03_API.md)           | Tất cả API endpoints + request/response format |
| [04_TASKS.md](docs/04_TASKS.md)       | Task breakdown 16 tuần + technical challenges  |
| [05_SKILLS.md](docs/05_SKILLS.md)     | Code samples + giải thích kỹ thuật             |

---

## 👨‍💻 Author

**[Your Name]** — Fullstack Developer

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your@email.com

---

## 📄 License

MIT License
