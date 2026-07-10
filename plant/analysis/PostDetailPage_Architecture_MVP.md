# Picspy - PostDetailPage Architecture (MVP)

## Mục tiêu

PostDetailPage có 3 nhiệm vụ:

1.  Xem ảnh (Viewer)
2.  Hiểu ảnh (Information)
3.  Khám phá tiếp (Discovery)

Không biến PostDetail thành trang chỉ để tải ảnh. Mục tiêu là tăng thời
gian sử dụng và tạo Discovery Loop.

---

# Kiến trúc

    PostDetailPage
    │
    ├── Left
    │   └── Image Viewer
    │       ├── Zoom
    │       ├── Gallery (1 hoặc nhiều ảnh)
    │       └── Navigation
    │
    └── Right
        ├── Creator
        ├── Title
        ├── Category
        ├── Tags
        ├── Download
        ├── Like / Save / Share
        ├── Histogram
        ├── Color Palette
        ├── Prompt / EXIF (tuỳ loại ảnh)
        ├── Comment
        └── Metadata khác

Sau phần thông tin là Discovery.

---

# Discovery Sections

## 1. Ảnh tương tự (12 ảnh)

Ưu tiên cao nhất.

Logic:

- Cùng Category
- Trùng nhiều Tag
- Title gần giống
- Loại bỏ chính ảnh hiện tại

Ví dụ điểm:

    Category giống: +50
    Mỗi Tag trùng: +15
    Keyword Title: +20

Sắp xếp theo tổng điểm và lấy 12 ảnh.

---

## 2. Theo màu (12 ảnh)

USP của Picspy.

Mỗi ảnh lưu:

    dominantColors

Ví dụ:

    [
     "#89CFF0",
     "#FFFFFF",
     "#222222"
    ]

Query các ảnh có nhiều màu trùng nhất.

Không cần AI.

---

## 3. Cùng Creator (8 ảnh)

Hiển thị các ảnh khác của cùng Creator.

Sort:

- Mới nhất
- Hoặc Trending của Creator

---

## 4. Trending (8 ảnh)

Không dùng tổng Views.

Dùng TrendingScore của 7 ngày gần nhất.

Ví dụ:

    Score =
    Views
    +
    Likes × 2
    +
    Downloads × 3

Cron Job cập nhật định kỳ.

---

# Discovery Loop

    Image

    ↓

    Tag

    ↓

    Category

    ↓

    Image

    ↓

    Creator

    ↓

    Image

    ↓

    Color

    ↓

    Image

    ↓

    Trending

    ↓

    Image

Không để người dùng kết thúc sau Download.

---

# Comment

Giữ Comment.

Comment không dùng để Recommendation ở phiên bản MVP.

Vai trò:

- Tăng tương tác
- Thảo luận
- Social Proof
- Tăng thời gian ở lại trang

Trong tương lai có thể dùng AI phân tích xu hướng nhưng chưa cần.

---

# MongoDB Structure

```js
{
 title,
 category,
 tags:[],
 creatorId,
 dominantColors:[],
 trendingScore,
 createdAt
}
```

Không cần Recommendation AI.

Chỉ dùng Rule-based Query.

---

# Nguyên tắc MVP

- Không AI Recommendation.
- Không Embedding.
- Không Collection.
- Không Semantic Search.
- Không tính Recommendation realtime.

Chỉ dùng: - Category - Tags - Dominant Colors - Creator - Trending Score

Đơn giản, nhanh, dễ mở rộng.

---

# Thứ tự ưu tiên

1.  Ảnh tương tự
2.  Theo màu
3.  Creator
4.  Trending
5.  Comment

Đây là phiên bản tối ưu cho MERN Stack, đủ nhanh, dễ bảo trì và vẫn tạo
được Discovery Loop hiệu quả.
