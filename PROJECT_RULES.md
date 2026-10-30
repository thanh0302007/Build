# QUY ĐỊNH CỐT LÕI DỰ ÁN "COZYSPACE" (AI MASTER RULES)
Bạn đang xây dựng ứng dụng Desktop/Web "CozySpace" (Electron + React + Tailwind CSS + Lucide Icons). Bạn BẮT BUỘC phải tuân thủ tuyệt đối các quy tắc dưới đây trong MỌI lần trả lời và viết code.

## I. 5 NGUYÊN TẮC CẤM VI PHẠM (HARD CONSTRAINTS)
1. **KHÔNG DÙNG API KEY & KHÔNG DÙNG NOTEBOOKLM:**
   - Tuyệt đối không viết code gọi Gemini API, OpenAI API hay yêu cầu người dùng nhập API Key.
   - Tuyệt đối không chèn tính năng liên quan đến NotebookLM.
   - Việc tích hợp Gemini trong Khu vực Học tập BẮT BUỘC thực hiện qua thẻ `<webview id="gemini-webview" src="https://gemini.google.com/app" partition="persist:gemini">` của Electron kết hợp tiêm CSS (`insertCSS`) và cầu nối dữ liệu (`executeJavaScript` / Clipboard Bridge).
2. **KHÔNG LÀM MẤT TÍNH NĂNG CŨ KHI THÊM TÍNH NĂNG MỚI:**
   - Ứng dụng gồm 7 khu vực: (0) Dashboard, (1) Lịch & To-do, (2) Khu vực Học tập + Gemini, (3) Khu vực Tập trung + YouTube, (4) Nhật ký & Cảm xúc, (5) Ghi chú nhanh, (6) Sổ thu chi.
   - Khi được yêu cầu sửa hoặc nâng cấp 1 khu vực, phải giữ nguyên vẹn code và dữ liệu của 6 khu vực còn lại. Không được dùng comment kiểu `// ... giữ nguyên code cũ ...` làm hỏng file chạy.
3. **BẮT BUỘC CÓ HỆ THỐNG HÌNH ẢNH 2 LỚP (`<ImageSlot />`):**
   - Mọi hình ảnh minh họa trong app phải được bọc trong một Component dùng chung tên là `<ImageSlot slotId="..." defaultSvg={...} />`.
   - Lớp 1 (Mặc định): AI phải tự vẽ sẵn hình SVG dễ thương cho `defaultSvg`.
   - Lớp 2 (Tùy chỉnh): Khi người dùng bấm nút "📷 Đổi ảnh" trên hình đó, cho phép tải ảnh từ máy tính (lưu Base64 vào LocalStorage) hoặc dán URL ảnh để đè lên hình mặc định, kèm nút "Khôi phục gốc".
4. **ĐỒNG BỘ GIAO DIỆN COZY PASTEL 100%:**
   - Không dùng màu đen tuyền (`#000000`), xanh dương gắt hay đỏ gắt mặc định của Tailwind.
   - Chỉ sử dụng bảng màu chuẩn:
     + Nền chính: Kem ấm `#FDFBF7`
     + Nền thẻ (Card): Trắng sữa `#FFFFFF` hoặc Hồng phấn nhạt `#FFF9F9`
     + Màu nhấn 1 (Primary): Hồng đào `#F4ACB7`
     + Màu nhấn 2 (Secondary): Xanh Matcha `#A3C9A8`
     + Màu nhấn 3 (Accent): Tím Oải hương `#E2D4F0` & Vàng bơ `#FFF3B0`
     + Chữ chính: Xám nâu mềm `#4A4A4A` | Chữ phụ: `#8E8A86`
   - Mọi khung thẻ bo góc lớn (`rounded-2xl` hoặc `rounded-3xl`), viền mảnh (`border-[#F0EAE1]`), đổ bóng mềm (`shadow-sm`). Font chữ chính: `'Quicksand', 'Nunito', sans-serif`.
5. **LƯU TRỮ DỮ LIỆU BỀN VỮNG (LOCALSTORAGE CHUẨN HÓA):**
   - Toàn bộ dữ liệu người dùng nhập vào phải tự động lưu vào `localStorage` theo đúng tên Key quy định ở mục II. Không được tự ý đổi tên Key giữa các lần sửa code.

---

## II. CẤU TRÚC DỮ LIỆU CỐ ĐỊNH (STANDARDIZED DATA SCHEMA)
Mọi module trong ứng dụng phải đọc và ghi dữ liệu vào `localStorage` theo đúng 8 Key và cấu trúc JSON sau:

1. `cozy_custom_images`: `{ [slotId: string]: string }` (Lưu URL hoặc chuỗi Base64 của 9 vị trí ảnh).
2. `cozy_todos`: `Array<{ id, title, date (YYYY-MM-DD), priority ('high'|'medium'|'low'), category, completed: boolean }>`
3. `cozy_subjects`: `Array<{ id, name, color, coverSlotId, createdAt }>`
4. `cozy_study_materials`: `Array<{ id, subjectId, title, content, type ('note'|'file'), updatedAt }>`
5. `cozy_study_sets`: `Array<{ id, subjectId, flashcards: Array<{ front, back, known: boolean }>, quizzes: Array<{ question, options: string[], correctIndex: number, explanation: string }> }>`
6. `cozy_focus_config`: `{ pomodoroWork: 25, pomodoroShort: 5, pomodoroLong: 15, completedSessions: number, youtubeLinks: Array<{ title, url, videoId }> }`
7. `cozy_diary_entries`: `Array<{ id, date (YYYY-MM-DD), mood ('happy'|'peaceful'|'excited'|'tired'|'sad'), title, content, paperColor, photos: string[] }>`
8. `cozy_sticky_notes`: `Array<{ id, content, color, isPinned: boolean, updatedAt }>`
9. `cozy_expenses`: `{ monthlyBudget: number, transactions: Array<{ id, amount: number, type ('income'|'expense'), category ('food'|'study'|'shopping'|'entertainment'|'other'), note, date (YYYY-MM-DD) }> }`

---

## III. DANH SÁCH 9 VỊ TRÍ HÌNH ẢNH (`slotId`) BẮT BUỘC HỖ TRỢ ĐỔI ẢNH
AI phải tạo sẵn SVG mặc định và gắn `<ImageSlot />` cho đúng 9 mã `slotId` sau:
1. `app_bg`: Hình nền toàn ứng dụng (mặc định: nền kem chấm bi mờ).
2. `dashboard_banner`: Banner ngang trang chủ (mặc định: góc bàn học ấm cúng bên cửa sổ).
3. `user_avatar`: Ảnh đại diện người dùng ở Sidebar.
4. `mascot_focus`: Nhân vật Mascot khi đang chạy giờ học Pomodoro (mặc định: mèo đeo tai nghe đọc sách).
5. `mascot_break`: Nhân vật Mascot khi đang nghỉ giải lao (mặc định: mèo nằm ngủ gật).
6. `mood_stickers`: Bộ 5 icon cảm xúc trong Nhật ký (`mood_happy`, `mood_peaceful`, `mood_excited`, `mood_tired`, `mood_sad`).
7. `subject_default_cover`: Ảnh bìa mặc định cho sổ tay môn học.
8. `expense_piggy`: Hình ống heo tiết kiệm ở Sổ thu chi.
9. `empty_state`: Hình minh họa khi danh sách việc/ghi chú đang trống.

---

## IV. QUY ĐỊNH CHI TIẾT CHO TỪNG CHỨC NĂNG ĐẶC BIỆT

### 1. Khu vực Học tập & Cách nhúng Gemini (Study Hub)
- **Bố cục:** Chia 2 cột khi mở một môn học.
  + **Cột trái (55%):** Gồm 3 tab con: `Tài liệu môn học` (soạn thảo, tải file `.txt`/`.md`), `Flashcard` (thẻ lật 3D mặt trước/sau), `Trắc nghiệm Quiz` (chọn đáp án A/B/C/D, báo đúng/sai, tính điểm).
  + **Cột phải (45%):** Khung nhúng Gemini.
- **Cách xử lý Khung Gemini:**
  + Sử dụng `<webview id="gemini-webview" src="https://gemini.google.com/app" partition="persist:gemini">`. (Nếu đang chạy trên môi trường Preview trình duyệt chưa có Electron, hiển thị khung giao diện mô phỏng giống hệt kèm nút mở Popup cửa sổ đôi để không bị lỗi trắng trang).
  + **CSS Injection:** Khi `<webview>` tải xong, tự động chèn CSS ẩn Sidebar (`mat-sidenav`), ẩn Header của Google, đổi `background-color` sang `#FDFBF7`, đổi font sang `Quicksand`, bo tròn khung chat với viền `#F4ACB7`.
  + **Thanh công cụ Prompt tự động (Smart Bridge):** Phía trên khung Gemini có 3 nút: `[✨ Tóm tắt bài]`, `[🎴 Tạo Flashcard]`, `[📝 Tạo câu hỏi Quiz]`. Khi bấm:
    1. App lấy nội dung tài liệu đang chọn ở Cột trái.
    2. Ghép với câu lệnh yêu cầu Gemini trả lời theo định dạng JSON chuẩn (đối với Flashcard/Quiz).
    3. Tự động điền vào ô chat của Gemini (hoặc Copy vào Clipboard) để gửi.
  + **Nút `[🪄 Nhập câu trả lời vào Phòng Ôn tập]`:** Đọc chuỗi JSON/văn bản từ câu trả lời của Gemini (tự động lọc bỏ dấu ```json thừa) và lưu thẳng vào `cozy_study_sets` để hiển thị ngay thành thẻ Flashcard lật 3D và bài Quiz bên Cột trái.

### 2. Khu vực Tập trung & Nhạc YouTube (Focus Zone)
- **Đồng hồ Pomodoro:** Có nút Bắt đầu / Tạm dừng / Đặt lại, tự động chuyển đổi hình ảnh giữa `mascot_focus` (khi đang đếm giờ học) và `mascot_break` (khi chuyển sang giờ nghỉ).
- **Trình phát YouTube:**
  + Có hàm `extractYouTubeId(url)` hỗ trợ mọi định dạng link (`[youtube.com/watch?v=](https://youtube.com/watch?v=)...`, `youtu.be/...`, `[youtube.com/live/](https://youtube.com/live/)...`).
  + Nhúng bằng `<iframe src="[https://www.youtube.com/embed/$](https://www.youtube.com/embed/$){videoId}?autoplay=1" allow="autoplay; encrypted-media" />` nằm gọn trong khung bo tròn màu pastel.
  + Có sẵn danh sách các kênh nhạc Lofi/Piano/Tiếng mưa học bài để bấm chọn 1 chạm và cho phép người dùng lưu thêm link YouTube yêu thích.