# 🎨 PICSPY — UI/UX Design Specification

> **Tên thương hiệu:** PICSPY  
> **Tagline:** *"Chia sẻ sáng tạo. Kiếm tiền từ đam mê."*  
> **Stack UI:** React 18 + Vite + TailwindCSS v3 + Framer Motion

---

## 🎨 Design System

### Color Palette

| Tên | Hex | Dùng cho |
|---|---|---|
| **Brand 600** | `#7c3aed` | Primary buttons, active states, accents |
| **Brand 400** | `#a78bfa` | Text links, icons active, gradient start |
| **Surface** | `#0f0f13` | Background toàn site |
| **Surface 50** | `#1a1a24` | Card background |
| **Surface 100** | `#222230` | Input background, secondary card |
| **Surface 200** | `#2a2a3d` | Border hover, skeleton shimmer |
| **White/10** | `rgba(255,255,255,0.10)` | Borders nhẹ |
| **White/60** | `rgba(255,255,255,0.60)` | Text phụ / mô tả |

### Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Heading/Logo | Outfit (Display) | 700–800 | 24–72px |
| Body | Outfit | 400–500 | 14–16px |
| Label/Caption | Outfit | 400 | 12–13px |

### Gradient Chủ đạo
```css
background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%);
```
Dùng cho: buttons primary, logo, CTA section, animated underlines

### Spacing & Radius
- Border radius: `12px` (input), `16px` (card), `20px–24px` (image card), `9999px` (pill)
- Touch target tối thiểu: **44×44px** (Apple HIG)
- Padding container: `16px` mobile → `32px` desktop
- Bottom padding mobile: `80px` (cho BottomNav)

### Animations (Framer Motion)
| Animation | Config | Dùng khi |
|---|---|---|
| `fade-in + slide-up` | `y: 8, opacity: 0 → 1, 200ms` | Page transitions |
| `scale-in` | `scale: 0.95 → 1, 200ms` | Modal, cards xuất hiện |
| `hover scale` | `scale: 1.05, 200ms` | Avatar, card hover |
| `tap scale` | `scale: 0.95–0.98` | All buttons |
| `shimmer` | `backgroundPosition sweep 1.5s` | Skeleton loading |
| `float` | `y: 0 → -8 → 0, 2.5s repeat` | Hero decorative cards |

---

## 📱 Layout System

### Mobile (< 768px) — Phone First
```
┌──────────────────────┐
│   [Content area]     │
│   padding: 16px      │
│   pb: 80px (nav)     │
├──────────────────────┤
│  BottomNav (fixed)   │
│  Home│Search│📤│🔔│👤 │
└──────────────────────┘
```

### Desktop (≥ 768px)
```
┌──────────────────────────────────────┐
│  Header (sticky)                     │
│  Logo │ Nav links │ Coin│Upload│User  │
├──────────────────────────────────────┤
│         Content (max-w-7xl)          │
│         padding: 32px                │
└──────────────────────────────────────┘
```

---

## 📄 Pages Chi Tiết

---

### 1. 🏠 HomePage (`/`)

**Mục đích:** Landing page giới thiệu PICSPY, thu hút creator đăng ký, hiển thị trending wallpapers.

#### Sections

**Hero Section**
- Background: radial gradient glow `brand-700/20` phía trên trái
- Badge: `🔮 Nền tảng wallpaper AI-powered #1 Việt Nam`
- H1 (72px desktop, 40px mobile): *"Chia sẻ **sáng tạo** / Kiếm tiền từ **đam mê**"*
  - Chữ bold trong `<span class="gradient-text">` (violet→blue)
  - Animated underline xuất hiện sau 0.8s dưới từ "đam mê"
- Sub-text: Mô tả platform (xu, MoMo, threshold)
- CTA: `[Bắt đầu ngay →]` (primary) + `[Khám phá wallpaper]` (secondary)

**Stats Strip** (4 cards dạng grid 2x2 mobile, 4x1 desktop)
- 📷 50K+ Wallpapers | 👥 8K+ Creator | ⬇️ 1M+ Downloads | ❤️ 5M+ Lượt thích
- Card: nền `surface-50`, icon brand-400, số gradient-text

**Trending Posts** (2 cột mobile, 3 cột desktop)
- Image card `rounded-2xl`, tỷ lệ `aspect-video` hoặc cố định `h-48`
- Hover: overlay từ dưới lên (translate-y), hiện category + likes count
- Animation: `staggered fade-in` với delay `i * 70ms`

**CTA Creator Section**
- Full-width card với gradient background (brand-800 → surface-50)
- Radial glow phía trên
- Hiển thị bảng đổi xu: `1k like = 5 xu | download = 10–200 xu`
- CTA: `[Tạo tài khoản miễn phí →]`

**Dữ liệu cuối sẽ hiển thị:**
- API `GET /v1/posts?feed=hot&limit=6` → trending posts thật
- API `GET /v1/admin/stats` → số liệu thực của platform

---

### 2. 🔐 LoginPage (`/login`)

**Mục đích:** Đăng nhập vào tài khoản PICSPY.

#### Layout
- Desktop: **Split 50/50** — Left decorative panel + Right form
- Mobile: Full screen form

**Left Panel (desktop only)**
- Gradient background brand-900 → surface
- Logo PICSPY lớn (Eye icon + brand name)
- Tagline ngắn
- 4 Float cards (Tailwind animation `float`): `🎨 AI Art`, `🌿 Nature`, `🌃 City`, `✨ Minimal`
  - Từng card animate `y: 0→-8→0` với delay khác nhau

**Right Form**
- Logo mobile (hiển thị khi width < lg)
- H2: "Đăng nhập" + sub "Chào mừng trở lại, creator! 👋"
- **Button Google OAuth** (icon SVG thật, border, hover bg-white/10)
- Divider "hoặc"
- Input Email: **icon Mail** absolute left, type=email
- Input Password: **icon Lock** + toggle **Eye/EyeOff** (show/hide)
- Link "Quên mật khẩu?" (right-aligned)
- Submit button: `btn-full` với loading spinner (border-animate) khi đang xử lý
- Link "Chưa có tài khoản? **Đăng ký ngay**"

**UX Notes:**
- Lưu `location.state.from` → redirect về trang gốc sau login
- Toast success: `"Chào mừng trở lại! 🎉"`

---

### 3. 📝 RegisterPage (`/register`)

**Mục đích:** Tạo tài khoản creator mới.

#### Layout
- Full screen, centered max-w-md, mobile-optimized

**Form Fields**
1. **Username** — input `@` icon, lowercase, regex `/^[a-z0-9_]+$/`, hint text
2. **Email** — input `Mail` icon
3. **Password** — `Lock` icon + Eye toggle
   - **Password Strength Bar** (4 segments):
     - 🔴 Yếu (1 điều kiện) → 🟠 Trung bình → 🟡 Khá → 🟢 Mạnh
     - Điều kiện: `length≥8`, `có chữ hoa`, `có số`, `có ký tự đặc biệt`
4. **Confirm Password** — border đỏ nếu không khớp, inline error message

**Success State**
- Replace form bằng card xanh lá với `CheckCircle2` icon, animated `scale-in`
- Text: `"Chúng tôi đã gửi link xác thực đến **{email}**"`
- CTA: `[Đến trang đăng nhập]`

**UX Notes:**
- Validation real-time (confirm password)
- Rate limit: 3 lần/giờ/IP (backend)

---

### 4. 🖼️ ProfilePage (`/profile/:username`)

**Mục đích:** Xem profile creator, posts, stats cá nhân.

#### Sections

**Cover + Avatar**
- Cover: gradient `brand-900 → surface-50`, height `144px` mobile / `208px` desktop
- Radial glow overlay
- Avatar: `-mt-14 md:-mt-20` (vươn ra khỏi cover), `96px` mobile / `128px` desktop
  - Border `border-4 border-surface` để tách nền
  - Verified badge (✓, brand-600, border-surface) ở góc dưới phải
- **PRO badge**: `⚡ PRO` pill (badge-brand màu) khi `subscriptionTier === 'pro'`

**Info Block**
- Display name (H1) + username (@handle, white/50)
- Bio (max 200 chars, line-height relaxed)
- Links: Globe icon + website (hover brand-400)

**Stats Row** (scrollable horizontal, hidden scrollbar)
- Ảnh | Followers | Following | Lượt like | Downloads
- Click Followers/Following → (Phase 2) modal danh sách

**Action Button**
- Own profile: `[Chỉnh sửa hồ sơ]` (secondary)
- Other profile: `[Follow]` (primary) / `[Đang follow]` (secondary) toggle với optimistic update

**Tabs**
- `🖼 Ảnh` | `🔖 Bookmark` — border-bottom animated indicator
- Đang active: `border-brand-500 text-brand-400`

**Posts Grid**
- 2 cột mobile, 3 cột desktop, `gap-3`
- Card: `aspect-square rounded-2xl overflow-hidden`
- Hover: `scale-110` image + overlay 50% dark + likes counter
- Premium badge: `💎 Premium` (badge-warning) góc trên phải

**Dữ liệu cuối hiển thị:**
- `GET /v1/users/:username` → profile thật
- `GET /v1/users/:username/posts` → posts với infinite scroll (Phase 2)

---

### 5. 📤 UploadPage (`/upload`) — Protected

**Mục đích:** Creator upload wallpaper mới lên PICSPY.

#### Form Sections

**1. Drop Zone**
- Trạng thái mặc định: dashed border `border-dashed border-2 border-white/20`
- Hover/Drag: `border-brand-500 bg-brand-500/10` transition
- Icon `Image` + text hướng dẫn + sub-text format/size
- Sau khi chọn: preview ảnh (`object-contain max-h-80`), nút X để xóa

**2. Caption**
- Textarea 3 rows, maxLength 500
- Counter right-aligned `{len}/500`

**3. Category Grid** (required)
- 10 buttons dạng chip `rounded-xl`
- Active: `bg-brand-600 border-brand-500`
- Inactive: `bg-surface-100 border-white/10 hover:border-brand-500/50`

**4. Tags**
- Input + "Thêm" button hoặc Enter/comma để thêm
- Tags animated với `AnimatePresence` (scale 0→1 khi thêm, scale 1→0 khi xóa)
- Badge: `badge-brand #tag` + X button

**5. Metadata Row** (grid 2 cột)
- Dropdown Độ phân giải: HD | 2K | 4K
- Dropdown Chiều ảnh: Dọc | Ngang | Vuông

**6. Toggle: AI Generated**
- Custom toggle switch có animation smooth `translate-x`
- Icon `Sparkles` brand-400

**7. Toggle: Premium**
- Icon `DollarSign` yellow-400
- Khi bật → show animated input "Giá tải (xu)"
- Helper text: `≈ {price * 5}đ • Creator nhận {floor(price * 0.7)} xu`

**8. Upload Progress**
- Card ẩn → xuất hiện khi uploading
- Progress bar animated `motion.div width: {progress}%`
- Gradient brand

**Success State**
- Replace page bằng card `CheckCircle` xanh lá
- Options: `[Upload thêm]` | `[Về trang chủ]`

---

### 6. 🔍 SearchPage (`/search`)

**Mục đích:** Tìm kiếm wallpaper theo từ khóa, category, AI filter.

#### Sections

**Search Bar**
- `Search` icon absolute left, `X` button khi có text
- `autoFocus` khi vào trang
- Placeholder: *"Tìm wallpaper, tag, creator..."*

**Category Chips** (horizontal scroll, `no-scrollbar`)
- [Tất cả] [🌿 Nature] [🎌 Anime] [◻️ Minimal] ... (9 categories)
- Active: `bg-brand-600`, Inactive: `bg-surface-50`

**Filter Row**
- Toggle "AI only" (Sparkles icon + toggle switch)
- Result count right-aligned

**Results Grid — Masonry Layout** 
- Dùng CSS `columns-2 md:columns-3 gap-3`
- Cards xen kẽ `aspect-square` và `aspect-[3/4]` để tạo effect masonry
- Hover: `scale-110` image + overlay từ dưới
  - `[Tải về]` button small primary
  - Likes counter

**Empty State** (Phase 2 khi search không có kết quả):
- Illustration + text "Không tìm thấy kết quả cho **{query}**"

---

### 7. ❌ NotFoundPage (`404`)

**Mục đích:** Trang lỗi khi URL không tồn tại.

#### Layout
- Centered full screen
- Số "**4**0**4**": chữ 4 là `gradient-text`, số 0 là `text-white/10` → hiệu ứng "missing"
- Font size cực lớn `text-[180px]` → visual impact
- Mô tả context PICSPY: *"Wallpaper bạn đang tìm đã bị ẩn..."*
- Buttons: `[🏠 Về trang chủ]` + `[🔍 Khám phá]`

---

## 🧭 Navigation Components

### Header (desktop ≥ md)
```
[👁 PICSPY]    [Khám phá] [Tìm kiếm]    [💰 1,200] [Upload] [🔔] [Avatar] [↪]
```
- Logo: Eye icon + PICSPY gradient text tracking-wide
- Coin balance: pill `bg-surface-100`, icon `Coins` yellow-400
- Avatar: `w-9 h-9 rounded-full border-2 border-brand-600`, hover `scale-1.05`
- Guest: `[Đăng nhập]` ghost + `[Đăng ký]` primary

### BottomNav (mobile < md)
```
[🏠 Home] [🔍 Search] [📤 Upload*] [🔔 Bell] [👤 Profile]
```
- Upload button: elevated, `w-12 h-12 rounded-2xl bg-gradient-brand shadow-lg`
- Active indicator: animated `layoutId="nav-indicator"` dot bên dưới
- Ẩn trên trang: `/login`, `/register`, `/forgot-password`, `/reset-password`
- `backdrop-blur-xl` + `bg-surface-50/90`

---

## ⚡ UX Patterns

| Pattern | Implementation |
|---|---|
| **Page transition** | `AnimatePresence mode="wait"` + `y: 8 → 0` fade |
| **Lazy loading** | `React.lazy + Suspense`, PageLoader spinner |
| **Optimistic update** | Follow button toggle immediate, revert nếu API fail |
| **Toast notifications** | `react-hot-toast`, dark themed, top-center |
| **Loading states** | Spinner trong buttons disabled khi `isLoading` |
| **Mobile scroll** | `overflow-x: hidden` body, `no-scrollbar` chips |
| **Touch targets** | `min-height: 44px` tất cả interactive elements |
| **Image lazy** | `loading="lazy"` native + `scale-110` hover |

---

## 🔌 Data Flow — Tính năng cuối cùng

| Page/Component | API Endpoint | Data hiển thị |
|---|---|---|
| **HomePage — Trending** | `GET /v1/posts?feed=hot&limit=6` | Ảnh trending thật, likes, category |
| **HomePage — Stats** | `GET /v1/admin/stats` (public) | Số user, posts, downloads thực tế |
| **ProfilePage** | `GET /v1/users/:username` | Tên, bio, avatar, stats thật |
| **ProfilePage — Posts** | `GET /v1/users/:username/posts` | Grid ảnh của creator |
| **SearchPage** | `GET /v1/posts?q=&category=&feed=` | Full-text search kết quả |
| **UploadPage** | `POST /v1/posts` (multipart) | Upload → BullMQ worker → approved |
| **Header — Coins** | Từ Zustand `user.coinBalance` | Số xu real-time |
| **Notifications** | Socket.io `notification` event | Toast + badge count |

---

## 📦 Dữ liệu Demo (Phase 1)

Do Phase 1 chưa kết nối API thật, các pages dùng:
- **Ảnh wallpaper:** Unsplash random (query params `?w=400`)
- **User avatar:** DiceBear Avataaars API
- **Stats/Counts:** Hardcoded số ấn tượng (50K+ wallpapers...)
- **Post grid:** 6–8 posts cố định với likes/category mock

**Phase 2 sẽ thay thế tất cả bằng TanStack Query hooks:**
```js
const { data, isLoading } = useQuery({
  queryKey: ['posts', 'hot'],
  queryFn: () => api.get('/posts?feed=hot').then(r => r.data)
})
```
