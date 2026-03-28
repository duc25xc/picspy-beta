# 🖼️ PicSpy — Project Overview

> **Nền tảng chia sẻ wallpaper AI-powered dành cho creator Việt Nam**

---

## 🎯 Vision

PicSpy là nền tảng nơi **creator** đăng ảnh wallpaper chất lượng cao (AI-generated hoặc tự chụp), kiếm tiền từ lượt view + download, và được cộng đồng công nhận.

> Không nhắm vào người mua wallpaper — nhắm vào **người muốn nổi tiếng và kiếm tiền từ sáng tạo ảnh.**

---

## 🧭 Định vị sản phẩm

|                     | PicSpy | Pinterest | Unsplash |
| ------------------- | ------ | --------- | -------- |
| Creator kiếm tiền   | ✅     | ❌        | ❌       |
| Ảnh AI-generated    | ✅     | ⚠️        | ⚠️       |
| Thuần Việt          | ✅     | ❌        | ❌       |
| Wallpaper-focused   | ✅     | ❌        | ⚠️       |
| Kiểm duyệt nội dung | ✅     | ⚠️        | ✅       |

---

## 👥 Target Users

### Primary — Creator (người đăng ảnh)

- 18–30 tuổi
- Đam mê thiết kế, AI art, nhiếp ảnh
- Muốn được công nhận + kiếm thêm thu nhập
- Active trên TikTok, Instagram, Facebook

### Secondary — Consumer (người tải ảnh)

- Muốn hình nền đẹp, độc lạ cho điện thoại/laptop
- Không nhất thiết trả tiền — nhưng tương tác (like, share, comment)

---

## 💰 Mô hình kiếm tiền

### Dành cho Creator

| Hành động                  | Creator nhận     |
| -------------------------- | ---------------- |
| 1.000 lượt tim (like)      | 500 xu (~2.500đ) |
| 1 lượt download free       | 10 xu (~50đ)     |
| 1 lượt download premium    | 200 xu (~1.000đ) |
| Đạt milestone 10k download | Thưởng 50.000 xu |

> Creator rút tiền khi đạt 100.000 xu (~500.000đ) qua MoMo/banking

### Dành cho Platform

| Nguồn thu            | Cơ chế                                                  |
| -------------------- | ------------------------------------------------------- |
| **Coin topup**       | User mua xu để tải ảnh premium (margin 40%)             |
| **Gói Pro Creator**  | 49.000đ/tháng — upload không giới hạn, analytics, badge |
| **Affiliate**        | Link mua tool AI (Midjourney, Adobe...) trong app       |
| **Sponsored Upload** | Brand trả phí để ảnh lên top feed                       |

---

## 🧱 Tech Stack

```
Frontend:   React 18 + Vite + TailwindCSS + Framer Motion
Backend:    Node.js + Express.js
Database:   MongoDB (Mongoose) + Redis
Queue:      BullMQ (xử lý ảnh async)
Storage:    Cloudinary (ảnh) + CDN
Auth:       JWT + Refresh Token + Google OAuth
Realtime:   Socket.io
Payment:    Stripe (topup xu) + MoMo API (rút tiền)
Deploy:     Railway / VPS (Nginx + PM2)
```

---

## 📐 Kiến trúc hệ thống

```
┌─────────────────────────────────────┐
│           React Client              │
│  (Vite + TailwindCSS + Zustand)     │
└──────────────┬──────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────┐
│         Nginx Reverse Proxy         │
│    (Rate limiting + SSL + Cache)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Express API Server           │
├─────────────────────────────────────┤
│  /auth      Auth Service            │
│  /posts     Post Service            │
│  /feed      Feed Service            │
│  /social    Social Service          │
│  /coins     Coin Service            │
│  /admin     Admin Service           │
│  /notify    Notification Service    │
└──────┬───────────────┬──────────────┘
       │               │
┌──────▼──────┐  ┌─────▼──────┐
│   MongoDB   │  │   Redis    │
│  (primary)  │  │(cache+queue│
└─────────────┘  └─────┬──────┘
                       │
               ┌───────▼───────┐
               │  BullMQ Worker│
               │ (image process│
               │  + email      │
               │  + payout)    │
               └───────────────┘
```

---

## 🗓️ Timeline tổng quan

| Giai đoạn                | Tuần  | Nội dung                      |
| ------------------------ | ----- | ----------------------------- |
| Phase 1 — Foundation     | 1–3   | Auth, User, Upload cơ bản     |
| Phase 2 — Core Features  | 4–7   | Feed, Social, Search          |
| Phase 3 — Monetization   | 8–11  | Coin, Premium, Payment        |
| Phase 4 — Admin & Polish | 12–14 | Admin panel, Kiểm duyệt, NSFW |
| Phase 5 — Launch         | 15–16 | Deploy, Performance, Launch   |

---

## 📁 Cấu trúc thư mục dự án

```
picspy/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom hooks
│   │   ├── store/             # Zustand stores
│   │   ├── services/          # API calls
│   │   └── utils/
│   └── package.json
│
├── server/                    # Express Backend
│   ├── src/
│   │   ├── routes/            # API routes
│   │   ├── controllers/       # Business logic
│   │   ├── models/            # Mongoose models
│   │   ├── middleware/        # Auth, rate limit...
│   │   ├── services/          # External services
│   │   ├── workers/           # BullMQ workers
│   │   └── utils/
│   └── package.json
│
├── docs/                      # Project documentation
│   ├── 01_OVERVIEW.md
│   ├── 02_DATABASE.md
│   ├── 03_API.md
│   ├── 04_TASKS.md
│   └── 05_SKILLS.md
│
└── docker-compose.yml
```
