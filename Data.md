# Đề xuất Cấu trúc Database cho StudyApp

Tài liệu này đề xuất chuyển đổi từ việc lưu trữ dữ liệu phân tán (localStorage/Cookie) sang một hệ quản trị cơ sở dữ liệu có cấu trúc (như Supabase/PostgreSQL) nhằm hỗ trợ các tính năng thống kê chuyên sâu.

## 1. Sơ đồ cơ sở dữ liệu (Database Schema)

### Bảng `users` (Quản lý người dùng)
Lưu trữ thông tin cơ bản và cài đặt cá nhân.
- `id`: UUID (PK)
- `email`: String (Unique)
- `password_hash`: String
- `username`: String
- `avatar_url`: String
- `theme`: String (light/dark)
- `created_at`: Timestamp

### Bảng `study_sessions` (Phiên học)
Mục tiêu: Theo dõi thời gian học thực tế của người dùng.
- `id`: UUID (PK)
- `user_id`: UUID (FK)
- `start_time`: Timestamp (Thời điểm bắt đầu phiên)
- `end_time`: Timestamp (Thời điểm kết thúc phiên)
- `duration_seconds`: Integer (Tổng giây học trong phiên)
- `activity_type`: Enum ('quiz', 'reading', 'vocabulary')
- `created_at`: Timestamp

### Bảng `exercises` (Bài tập/Khóa học)
Mục tiêu: Quản lý danh sách các bài học/bài tập có sẵn.
- `id`: UUID (PK)
- `title`: String
- `content_raw`: Text (Dữ liệu đầu vào để parse)
- `category`: String (Ví dụ: 'TOEIC', 'IELTS', 'Grammar')
- `total_questions`: Integer
- `estimated_time`: Integer (Giây - thời gian dự kiến hoàn thành)
- `created_at`: Timestamp

### Bảng `practice_history` (Lịch sử làm bài)
Mục tiêu: Lưu kết quả chi tiết từng lần làm quiz.
- `id`: UUID (PK)
- `user_id`: UUID (FK)
- `exercise_id`: UUID (FK)
- `session_id`: UUID (FK) - Liên kết với phiên học cụ thể
- `score_correct`: Integer (Số câu đúng)
- `score_total`: Integer (Tổng số câu)
- `percentage`: Float (Tỷ lệ đúng)
- `user_answers`: JSONB (Lưu chi tiết các câu trả lời: `{"q1": "A", "q2": "working"}`)
- `time_spent_seconds`: Integer (Thời gian thực tế làm bài này)
- `is_completed`: Boolean
- `submitted_at`: Timestamp

### Bảng `vocabulary_albums` & `vocabulary_words` (Sổ tay từ vựng)
- **`vocabulary_albums`**:
    - `id`: UUID (PK)
    - `user_id`: UUID (FK)
    - `name`: String
    - `created_at`: Timestamp
- **`vocabulary_words`**:
    - `id`: UUID (PK)
    - `album_id`: UUID (FK)
    - `word`: String
    - `word_type`: String (n, v, adj...)
    - `phonetic`: String
    - `meaning`: Text
    - `mastery_score`: Integer (Điểm thành thạo - dùng cho thuật toán lặp lại ngắt quãng SRS)
    - `last_reviewed_at`: Timestamp

---

## 2. Giải pháp thực hiện các chức năng thống kê

### 2.1. Thống kê thời gian học
- **Tổng thời gian**: `SUM(duration_seconds)` từ `study_sessions`.
- **Theo ngày/tuần/tháng**: Group by `start_time` trong `study_sessions`.
- **Learning Streak**: Kiểm tra tính liên tục của `start_time` trong `study_sessions` (distinct days).
- **UI Gợi ý**: Sử dụng thư viện `Chart.js` hoặc `ECharts` để vẽ Heatmap và Bar Chart.

### 2.2. Thống kê tiến độ
- **% Hoàn thành**: So sánh số lượng `exercise_id` duy nhất có `is_completed = true` trong `practice_history` với tổng số bài trong `exercises`.
- **Thời gian ước tính**: Lấy tổng `estimated_time` của các bài chưa làm.

### 2.3. Hiệu suất học tập
- **Điểm trung bình**: `AVERAGE(percentage)` trong `practice_history`.
- **Số lần làm lại**: Đếm số bản ghi trùng `exercise_id` và `user_id` trong `practice_history`.
- **Bài học khó nhất**: Truy vấn `exercise_id` có `percentage` trung bình thấp nhất của người dùng.
- **Xu hướng cải thiện**: Vẽ biểu đồ đường `percentage` theo thời gian `submitted_at`.

### 2.4. Lịch sử chi tiết
- Truy vấn trực tiếp từ `practice_history` join với `exercises`. Hiển thị dưới dạng Timeline hoặc Table.

---

## 3. Lộ trình nâng cấp (Roadmap)

1. **Giai đoạn 1**: Thay thế `localStorage` bằng API lưu trữ (Supabase là lựa chọn tốt nhất nhờ tính năng SQL mạnh mẽ và Realtime).
2. **Giai đoạn 2**: Bổ sung Logic tracking thời gian vào `main.js` (Bắt đầu khi user vào trang, gửi `end_time` khi user đóng trang hoặc nộp bài).
3. **Giai đoạn 3**: Xây dựng trang Dashboard Thống kê với các thành phần UI cao cấp (DaisyUI + Chart.js).
