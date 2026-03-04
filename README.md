# StudyApp - English Practice App 📚

Ứng dụng hỗ trợ luyện tập tiếng Anh thông minh, giúp chuyển đổi nhanh chóng các đoạn văn bản câu hỏi thô thành bài tập tương tác sinh động.

## ✨ Chức năng chính

1.  **Tạo bài tập từ văn bản (Text-to-Exercise):**
    *   Chỉ cần dán nội dung câu hỏi thô (từ file PDF, Word, hoặc web), ứng dụng sẽ tự động phân tích và tạo giao diện làm bài.
    *   Hỗ trợ nhiều định dạng số thứ tự: `1.`, `Câu 1:`, `Bài 1.`, `1)`.

2.  **Đa dạng loại hình câu hỏi:**
    *   **Trắc nghiệm (MCQ):** Tự động nhận diện các lựa chọn A, B, C, D.
    *   **Điền vào chỗ trống (FITB):** Nhận diện các khoảng trống `_______` và gợi ý trong ngoặc `(work)`.

3.  **Hệ thống nhận diện đáp án thông minh:**
    *   **Quét Answer Key:** Tự động tìm đáp án trong mục `ANSWER KEY` hoặc `ĐÁP ÁN` ở cuối văn bản.
    *   **Đáp án Inline:** Hỗ trợ nhận diện đáp án và giải thích ngay sau mỗi câu hỏi với từ khóa `Đáp án:` và `Giải thích:`.

4.  **Chấm điểm & Phản hồi tức thì:**
    *   Chấm điểm ngay sau khi nộp bài.
    *   Hiển thị đúng/sai trực quan bằng màu sắc.
    *   Cung cấp giải thích chi tiết cho từng câu hỏi để người dùng hiểu rõ lỗi sai.

5.  **Lịch sử luyện tập:**
    *   Tự động lưu kết quả bài làm vào trình duyệt (LocalStorage).
    *   Xem lại các bài đã làm, điểm số và ngày giờ thực hiện thông qua thanh Sidebar.

6.  **Giao diện hiện đại (UI/UX):**
    *   Tối ưu hóa cho cả máy tính và điện thoại.
    *   Hỗ trợ chế độ Sáng/Tối (Dark/Light Mode) linh hoạt.
    *   Hiệu ứng chuyển cảnh mượt mà, thân thiện với người dùng.

## 🛠 Công nghệ sử dụng

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+).
*   **Styling:** Tailwind CSS & DaisyUI (UI Component Library).
*   **Build Tool:** Vite.
*   **Storage:** LocalStorage (Lưu trữ lịch sử bài làm).

## 🚀 Hướng dẫn sử dụng

1.  **Nhập liệu:** Dán nội dung câu hỏi vào ô "New Exercise".
2.  **Tạo bài:** Nhấn nút **Generate** để ứng dụng phân tích dữ liệu.
3.  **Làm bài:** Chọn đáp án hoặc điền từ vào các ô trống.
4.  **Nộp bài:** Nhấn nút **Nộp bài** (biểu tượng tích xanh) để xem kết quả và giải thích.
5.  **Xem lại:** Mở Sidebar bên phải để xem lịch sử các lần luyện tập trước.

---
*Phát triển bởi Antigravity Team.*
