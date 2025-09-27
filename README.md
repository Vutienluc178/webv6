# Math Tools Hub — Ultra+ (Convenience)
Tính năng tiện lợi:
- **PWA**: Cài như app, chạy offline.
- **Teacher Mode** (PIN mặc định: 2703) để ẩn/hiện mục GVCN.
- **Multi-Tag** (chế độ 'any' / 'all'), **Share link**, **Random**, **In danh sách**.
- **Export/Import** ⭐ Yêu thích & Gần đây (JSON).

Triển khai:
1) Push lên nhánh `main` (Settings → Pages: Source = GitHub Actions).
2) Workflow `.github/workflows/pages.yml` (đã kèm) sẽ build `manifest.json` + deploy.
Dễ lắm thầy ơi—chỉ cần thả các file .html vào đúng chỗ + gắn meta là trang tự nhận và hiển thị. Quy trình chuẩn:

1) Đặt file vào thư mục tools/…

Lớp → cho vào tools/10/, tools/11/, tools/12/

GVCN → có thể để ở tools/ (gốc) hoặc tools/gvcn/

Công cụ khác → để ở tools/ hoặc tools/khac/

(Nếu dùng bản v5/v6 em làm sẵn thì script sẽ tự quét mọi cấp con của tools/.)

2) Thêm metadata để tự phân loại
Mẫu cho “Lớp 11 – Đại số”
<!DOCTYPE html><html lang="vi"><head>
<meta charset="utf-8"/>
<title>Lớp 11 — Đại số — Tên công cụ</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="tool-category" content="lop">
<meta name="tool-grade" content="11">           <!-- 10 | 11 | 12 -->
<meta name="tool-track" content="dai-so">        <!-- dai-so | hinh-hoc -->
<meta name="tool-tags" content="lop-11, dai-so, tu-khoa-1, tu-khoa-2">
</head><body>
<h1>Tên công cụ</h1>
<!-- Nội dung công cụ của thầy ở đây -->
</body></html>

Mẫu cho “GVCN”
<!DOCTYPE html><html lang="vi"><head>
<meta charset="utf-8"/>
<title>GVCN — Tên công cụ</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="tool-category" content="gvcn">
<meta name="tool-tags" content="gvcn, quan-ly-lop">
</head><body>…</body></html>

Mẫu “Shortcut mở trang ngoài” (GeoGebra, Desmos…)
<!DOCTYPE html><html lang="vi"><head>
<meta charset="utf-8"/>
<title>Khác — GeoGebra</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="tool-category" content="khac">
<meta name="tool-tags" content="geogebra, hinh-hoc">
<meta name="tool-external" content="https://www.geogebra.org/"> <!-- URL ngoài -->
</head><body>Shortcut mở GeoGebra.</body></html>


Với bản v5/v6: mục “shortcut” sẽ có nút 👁 xem trong trang (nếu site cho phép), 🔗 chia sẻ, QR, thêm Playlist, v.v.

3) Đưa lên GitHub

Qua web: vào repo → Add file → Upload files → kéo thả các .html vào đúng thư mục tools/... → Commit vào nhánh main.

Qua git:

git add tools/11/ten-cong-cu.html
git commit -m "Add: Lớp 11 – Đại số – Tên công cụ"
git push origin main

4) Hệ thống tự build & hiển thị

Workflow Pages sẽ tự chạy, tạo manifest.json và deploy.

Kiểm tra nhanh:

Mở …/manifest.json → thấy mục mới.

Trên trang chủ, gõ tên/tags là ra ngay.

Lưu ý: mục GVCN chỉ hiện khi bật Teacher mode (PIN thayluc).

5) Nếu không thấy mục mới

Đảm bảo file đuôi .html và có meta như trên (đặc biệt với category=lop: cần tool-grade + tool-track).

Vào tab Actions xem log Pages có lỗi không.

Thêm xong nhớ hard refresh (Ctrl/Cmd+Shift+R) hoặc bấm “Tải lại” khi toast có phiên bản mới xuất hiện.

Muốn em thêm sẵn vài công cụ mẫu cho 10/11/12 – Đại số/Hình học và GVCN vào repo hiện tại của thầy không? Em đóng gói đúng cấu trúc để thầy chỉ việc kéo thả.
