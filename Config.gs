const CONFIG = {
 SPREADSHEET_ID: "1636S8F6K9CTtjpKlWkin0uxyA-u1rU-IfwUqnWXhRnI",
 SHEET_USER: "DS_Nguoidung",
 SHEET_DEAN: "DS_Deansangkien",
 SHEET_PROGRESS: "Tiendo",
 SHEET_CHISO: "DS_chisodean",
 SHEET_KHOA: "DS_khoa",
 SHEET_DANGKY: "Dangky",
 SHEET_PHANCONG: "DS_Phancong",
 SHEET_NOPLAN2: "DS_noplan2",
 SHEET_PHEDUYET_LAN1: "Phe_duyet_lan1",
 SHEET_PHEDUYET_LAN2: "Phe_duyet_lan2",
 SHEET_FILECHOT: "File_chot",
 SHEET_BCNGHIEMTHU: "BC_nghiemthu",
 SHEET_NGHIEMTHU: "Nghiem_thu",
 SHEET_YEUCAUSUA: "DS_YeuCauSua",
 // 3 dong duoi day LAY TU file DriveFolders.gs - can sua ID thu muc Drive thi vao file DO
 // sua (khong sua o day), xem chi tiet cach lay ID trong ghi chu dau file DriveFolders.gs.
 DRIVE_FOLDER_ID: getDriveFolderIds_().TIEN_DO,
 DANGKY_DRIVE_FOLDER_ID: getDriveFolderIds_().DANG_KY,
 NOPLAN2_DRIVE_FOLDER_ID: getDriveFolderIds_().NOP_LAN_2,

 // Thoi gian cache du lieu Sheet (giay) - giam do tre khi doc du lieu
 CACHE_SECONDS: 180,

 // Thoi gian song cua phien dang nhap (giay). Toi da CacheService cho phep la 21600 (6 gio)
 SESSION_SECONDS: 21600,

 // So file minh chung toi da moi lan cap nhat
 MAX_FILES: 5,
 DANGKY_MAX_FILES: 1,
 NOPLAN2_MAX_FILES: 1,

 // Cac vai tro tai khoan duoc he thong ho tro
 // Gia tri phai KHOP CHINH XAC voi cot "Vaitro" trong Sheet DS_Nguoidung
 ROLES: {
   ADMIN: "Admin",
   TVHD: "TVHĐ",
   USER: "User"
 }
};

/**
* Ten cot hien thi (tieng Viet, than thien nguoi dung) cho Sheet DS_Deansangkien.
* Key = ten cot THAT trong hang 1 cua Sheet (khong doi ten that trong Sheet).
* Value = nhan se hien thi cho nguoi dung trong man hinh Tra cuu.
* Dung ham getDeanColumnLabel() de tra cuu, cot nao khong co trong danh sach
* se tu dong hien thi dung ten cot goc.
*/
const DEAN_COLUMN_LABELS = {
 "Madean_sangkien": "Mã đề án/ sáng kiến",
 "Khoaphong": "Khoa/phòng",
 "Tendean": "Tên đề án/sáng kiến",
 "Phanloai": "Phân loại",
 "File_dau": "File đầu",
 "Chunhiem": "Chủ nhiệm",
 "Thanhvien": "Thành viên",
 "Thoigian_batdau": "Thời gian bắt đầu",
 "Thoigian_ketthuc": "Thời gian kết thúc",
 "Chi_so": "Chỉ số",
 "Nguoi_cham_1": "Người chấm 1",
 "Nhan_xet_cua_NC1": "Nhận xét của Người chấm 1",
 "Diem_cua_NC1": "Điểm của Người chấm 1",
 "NC1_duyet": "Người chấm 1 duyệt",
 "Nguoi_cham_2": "Người chấm 2",
 "Nhan_xet_cua_NC2": "Nhận xét của Người chấm 2",
 "Diem_cua_NC2": "Điểm của Người chấm 2",
 "NC2_duyet": "Người chấm 2 duyệt",
 "Diem_TB_lan1": "Điểm trung bình lần 1",
 "File_sua_lan_1": "File sửa lần 1",
 "Diem_cua_NC1_lan_2": "Điểm của Người chấm 1 (lần 2)",
 "Nhan_xet_cua_NC1_lan_2": "Nhận xét của Người chấm 1 (lần 2)",
 "NC_1_duyet_lan_2": "Người chấm 1 duyệt (lần 2)",
 "Diem_cua_NC2_lan_2": "Điểm của Người chấm 2 (lần 2)",
 "Nhan_xet_cua_NC2_lan_2": "Nhận xét của Người chấm 2 (lần 2)",
 "NC2_duyet_lan_2": "Người chấm 2 duyệt (lần 2)",
 "Diem_TB_lan_2": "Điểm trung bình (lần 2)",
 "Duyet_Khongduyet": "Duyệt/Không duyệt (chốt)",
 "File_cuoi": "File cuối",
 "Trang_thai": "Trạng thái",
 "Ghichu": "Ghi chú"
};

/**
* Ten cot hien thi (tieng Viet) cho Sheet Tiendo (man hinh Cap nhat tien do).
*/
const PROGRESS_COLUMN_LABELS = {
 "Madean_sangkien": "Mã đề án/sáng kiến",
 "Khoaphong": "Khoa/phòng",
 "Tendean": "Tên đề án/sáng kiến",
 "Trangthai": "Trạng thái",
 "NoidungCV_dang_thuc_hien": "Nội dung công việc đang thực hiện",
 "Tenchiso": "Tên chỉ số",
 "Tyle_hientai": "Kết quả đo lường hiện tại",
 "File_minh_chung_neuco": "File minh chứng (nếu có)",
 "Email": "Email",
 "Thoi_gian": "Thời gian",
 "DaChinhSua": "Đã chỉnh sửa"
};

/**
* Ten cot hien thi (tieng Viet) cho Sheet DS_chisodean (bang chi so do luong cua de an cai tien).
*/
const CHISO_COLUMN_LABELS = {
 "Madean_sangkien": "Mã đề án/sáng kiến",
 "Khoaphong": "Khoa/phòng",
 "Tendean": "Tên đề án",
 "Chi_so": "Chỉ số",
 "Nguongdat": "Ngưỡng đạt",
 "Tylehoanthanh": "Tỷ lệ hoàn thành",
 "Minhchung": "Minh chứng đạt",
 "Ly_do_khongdat": "Lý do không đạt (nếu có)",
 "Ghichu": "Ghi chú"
};

/**
* Cac cot trong Sheet DS_Deansangkien la duong dan file (Drive URL) -> hien thi dang link "Xem file"
* thay vi hien nguyen duong dan dai trong bang Tra cuu.
*/
const DEAN_FILE_COLUMNS = ["File_dau", "File_sua_lan_1", "File_cuoi"];

/**
* Cac cot ngay thang chi can hien dd/MM/yyyy (KHONG kem gio:phut:giay).
* Khac voi cot "Thoi_gian" ben Sheet Tiendo (van giu nguyen ca gio, vi do la thoi diem cap nhat).
*/
const DEAN_DATE_ONLY_COLUMNS = ["Thoigian_batdau", "Thoigian_ketthuc"];

/**
* Cac cot dang co CONG THUC tinh toan san trong Google Sheet (vd AVERAGE diem 2 nguoi cham),
* hoac la cot duoc HE THONG tu tinh/suy ra (vd Phan loai theo cong thuc rieng cua Sheet).
* Nhung cot nay se KHONG cho sua tu man hinh Tra cuu (ca giao dien lan server deu chan).
*/
const DEAN_COMPUTED_COLUMNS = ["Diem_TB_lan1", "Diem_TB_lan_2", "Duyet_Khongduyet", "Phanloai"];

/**
* Cot "Chi_so" gio khong con la o nhap van ban tu do nua - gia tri hien thi (Xem chi tiet /
* Khong co chi so do luong) duoc HE THONG tu suy ra tu Sheet DS_chisodean, nen cung khong
* cho sua truc tiep tu man hinh Tra cuu (chan rieng, khong dung chung note "cong thuc" voi
* DEAN_COMPUTED_COLUMNS o phia client).
*/
const DEAN_LINK_ONLY_COLUMNS = ["Chi_so"];


/**
* Cac cot KHONG BAO GIO hien thi tren man hinh Tra cuu (an hoan toan, khong chi che gia tri) -
* day la cac cot ky thuat (ID lien ket giua cac Sheet) chi phuc vu bo may dong bo phia sau,
* khong co y nghia gi voi nguoi dung xem/sua thong tin de an.
*/
const DEAN_HIDDEN_COLUMNS = ["ID", "DangkyID"];

function getDeanColumnLabel(headerName) {
 return DEAN_COLUMN_LABELS[headerName] || headerName;
}

function getProgressColumnLabel(headerName) {
 return PROGRESS_COLUMN_LABELS[headerName] || headerName;
}

function getChiSoColumnLabel(headerName) {
 return CHISO_COLUMN_LABELS[headerName] || headerName;
}

// ==========================================================
// CHUC NANG "DANG KY" (Sheet Dangky) - dinh nghia dung chung cho ca server (Dangky.gs) va client
// ==========================================================

// 3 loai dang ky tuong ung 3 muc I/II/III trong file BM01-QTQL_BVTN_23
const DANGKY_LOAI_LABELS = {
 DA_MOI: "Đăng ký đề án mới",
 DA_CU: "Đề án cũ đang trong quá trình thực hiện",
 SK: "Đăng ký sáng kiến cải tiến"
};

// Cac truong lien lac dung chung cho ca 3 loai (cau 1-3 dau phieu)
const DANGKY_CONTACT_FIELDS = [
 { key: "HoTen", label: "Họ và tên người liên lạc (khi cần)", type: "text", required: true },
 { key: "Email", label: "Email người liên lạc (khi cần)", type: "text", required: true },
 { key: "SoDienThoai", label: "Số điện thoại người liên lạc (khi cần)", type: "text", required: true }
];

/**
* Cac truong rieng cho tung loai dang ky, dung CHUNG cho server (validate/label) va client (ve form).
* type: "khoa" (dropdown lay tu Sheet DS_khoa, KHONG cho sua sau khi da nop),
*       "text", "textarea",
*       "checkbox" (chon nhieu, luu cach nhau boi dau phay),
*       "radio_other" (chon 1 trong "options", rieng lua chon "Khác" se dung kem 1 o nhap tu do -
*                      noi dung o "Khac" duoc luu o truong ke tiep co hau to "Khac" trong danh sach).
*/
const DANGKY_FIELDS = {
 DA_MOI: [
   { key: "DA_KhoaPhong", label: "Khoa/phòng đăng ký", type: "khoa", required: true },
   { key: "DA_TruongDeAn", label: "Trưởng đề án", type: "text", required: true, placeholder: "Ví dụ: Nguyễn Văn A" },
   { key: "DA_ThuKy", label: "Thư ký", type: "text", required: true, placeholder: "Ví dụ: Nguyễn Văn A" },
   { key: "DA_ThanhVien", label: "Thành viên", type: "text", required: true, placeholder: "Ví dụ: Nguyễn Văn A" },
   { key: "DA_TenDeAn", label: "Tên đề án", type: "text", required: true },
   { key: "DA_MucTieuTongQuat", label: "Mục tiêu tổng quát", type: "textarea", required: true },
   { key: "DA_MucTieuCuThe", label: "Mục tiêu cụ thể", type: "textarea", required: true },
   { key: "DA_ChiSo", label: "Chỉ số", type: "textarea", required: true },
   { key: "DA_TomTatYTuong", label: "Trình bày tóm tắt ý tưởng đề án", type: "textarea", required: true },
   { key: "DA_TgianXayDungDeCuong", label: "Thời gian xây dựng đề cương đề án", type: "month", required: false },
   { key: "DA_TgianTrienKhai", label: "Thời gian triển khai đề án", type: "month_range", required: true },
   { key: "DA_TgianHoanThanhBaoCao", label: "Thời gian hoàn thành báo cáo", type: "month", required: true },
   { key: "DA_DiaDiem", label: "Địa điểm thực hiện đề án", type: "text", required: true },
   { key: "DA_DuTruKinhPhi", label: "Dự trù kinh phí", type: "currency", required: true, placeholder: "Ví dụ: 3.000.000" },
   { key: "DA_NguonKinhPhi", label: "Nguồn kinh phí", type: "select", options: ["Ngân sách bệnh viện", "Tự túc"], required: true },
   { key: "DA_File", label: "Đính kèm file đề án/ sáng kiến", type: "file", required: false, accept: "application/pdf,.pdf", hint: "Vui lòng đặt tên file theo cú pháp [Tên khoa/phòng] - [Tên đề án/sáng kiến]" }
 ],
 DA_CU: [
   { key: "DACu_KhoaPhong", label: "Khoa/phòng đang trong quá trình thực hiện đề án", type: "khoa", required: true },
   { key: "DACu_TruongDeAn", label: "Trưởng đề án", type: "text", required: true, placeholder: "Ví dụ: Nguyễn Văn A" },
   { key: "DACu_TenDeAn", label: "Tên đề án", type: "text", required: true },
   { key: "DACu_TrangThai", label: "Trạng thái", type: "radio_other", options: ["Đang đo lường hiệu quả", "Đang hoàn thiện báo cáo"], required: true },
   { key: "DACu_TgianDuKienHoanThanh", label: "Thời gian dự kiến hoàn thành báo cáo", type: "month", required: true },
   { key: "DACu_File", label: "Đính kèm file đề án/ sáng kiến", type: "file", required: false, accept: "application/pdf,.pdf", hint: "Vui lòng đặt tên file theo cú pháp [Tên khoa/phòng] - [Tên đề án/sáng kiến]" }
 ],
 SK: [
   { key: "SK_KhoaPhong", label: "Khoa/phòng đăng ký", type: "khoa", required: true },
   { key: "SK_TruongNhom", label: "Trưởng nhóm sáng kiến", type: "text", required: true, placeholder: "Ví dụ: Nguyễn Văn A" },
   { key: "SK_ThuKy", label: "Thư ký", type: "text", required: true, placeholder: "Ví dụ: Nguyễn Văn A" },
   { key: "SK_ThanhVien", label: "Thành viên", type: "text", required: true, placeholder: "Ví dụ: Nguyễn Văn A" },
   { key: "SK_TenSangKien", label: "Tên sáng kiến", type: "text", required: true },
   { key: "SK_TomTat", label: "Trình bày tóm tắt về sáng kiến", type: "textarea", required: true },
   { key: "SK_TgianBatDau", label: "Thời gian bắt đầu thực hiện", type: "month", required: true },
   { key: "SK_TgianKetThuc", label: "Thời gian kết thúc", type: "month", required: true },
   { key: "SK_DuTruKinhPhi", label: "Dự trù kinh phí", type: "currency", required: true, placeholder: "Ví dụ: 3.000.000" },
   { key: "SK_NguonKinhPhi", label: "Nguồn kinh phí", type: "select", options: ["Ngân sách bệnh viện", "Tự túc"], required: true },
   { key: "SK_File", label: "Đính kèm file đề án/ sáng kiến", type: "file", required: false, accept: "application/pdf,.pdf", hint: "Vui lòng đặt tên file theo cú pháp [Tên khoa/phòng] - [Tên đề án/sáng kiến]" }
 ]
};

// Cac truong Khoa/phong: KHONG cho sua sau khi da nop, vi day la khoa dung de phan quyen xem/sua phieu
const DANGKY_LOCKED_FIELDS = ["DA_KhoaPhong", "DACu_KhoaPhong", "SK_KhoaPhong"];

// Link cac bieu mau can tuan thu, hien trong man hinh Dang ky (ten hien thi = ten file that tren Google Drive)
const DANGKY_TEMPLATE_LINKS = [
 "https://docs.google.com/document/d/1O3HLTvJRS6om6YtLt5DCQx_G1AhbAfxI/edit?usp=sharing&ouid=117022318491631215984&rtpof=true&sd=true",
 "https://docs.google.com/spreadsheets/d/1__8U8iGRSaJ77sSCITA_4FgH41I0UeYU/edit?usp=sharing&ouid=117022318491631215984&rtpof=true&sd=true",
 "https://docs.google.com/document/d/1AmhFCWDZ-ctGNvCA51VGyf1aQT9dYDdX/edit?usp=drive_link&ouid=117022318491631215984&rtpof=true&sd=true",
 "https://docs.google.com/document/d/15iTWcLJ-ljCmxL-FWueVaXcbKJm61wNo/edit?usp=sharing&ouid=117022318491631215984&rtpof=true&sd=true"
];

// Ten cot Khoa/phong tuong ung voi tung loai dang ky (dung de loc quyen xem/sua theo Khoaphong cua tai khoan)
function dangKyKhoaPhongFieldKey_(loai) {
 if (loai === "DA_MOI") return "DA_KhoaPhong";
 if (loai === "DA_CU") return "DACu_KhoaPhong";
 if (loai === "SK") return "SK_KhoaPhong";
 return null;
}

// Ten cot "Ten de an" tuong ung voi tung loai dang ky (dung cho PhanCong.gs de dong bo DS_Phancong)
function dangKyTenDeAnFieldKey_(loai) {
 if (loai === "DA_MOI") return "DA_TenDeAn";
 if (loai === "DA_CU") return "DACu_TenDeAn";
 if (loai === "SK") return "SK_TenSangKien";
 return null;
}

// Ten cot File dinh kem tuong ung voi tung loai dang ky (dung cho PheDuyet.gs - lay file cho Phe duyet lan 1)
function dangKyFileFieldKey_(loai) {
 if (loai === "DA_MOI") return "DA_File";
 if (loai === "DA_CU") return "DACu_File";
 if (loai === "SK") return "SK_File";
 return null;
}

// ==========================================================
// CHUC NANG "PHAN CONG PHE DUYET" (Sheet DS_Phancong)
// ==========================================================

// 3 trang thai co dinh cho cot Trangthai trong DS_Phancong.
// Y nghia (theo Admin quy dinh): "Phê duyệt lần 1" = dang mo nhan phieu lan 1 (dong lan 2);
// "Phê duyệt lần 2" = dang mo nhan phieu lan 2 (dong lan 1); "Đóng phê duyệt" = dong ca 2 lan.
const PHANCONG_TRANGTHAI_OPTIONS = ["Phê duyệt lần 1", "Phê duyệt lần 2", "Đóng phê duyệt"];

// ==========================================================
// CHUC NANG "PHE DUYET" (Sheet Phe_duyet_lan1 / Phe_duyet_lan2)
// - De an (ma bat dau "ĐA") dung bo tieu chi PHEDUYET_TIEUCHI_DA + PHEDUYET_KETLUAN_OPTIONS_DA.
// - Sang kien (ma bat dau "SK") dung bo tieu chi PHEDUYET_TIEUCHI_SK + PHEDUYET_KETLUAN_OPTIONS_SK.
// - Ca 2 bo tieu chi deu co dung 10 tieu chi, moi tieu chi toi da PHEDUYET_MAX_DIEM diem.
// ==========================================================

const PHEDUYET_MAX_DIEM = 10;
const PHEDUYET_DIEM_STEP = 0.1;

// Noi dung nguyen van tu file "BM_03A - Bảng kiểm phê duyệt đề án"
const PHEDUYET_TIEUCHI_DA = [
 "Nêu được sự cần thiết và lý do tiến hành của đề án",
 "Mục tiêu của đề án - Cho thấy được kết quả đầu ra cụ thể là gì?",
 "Mục tiêu của đề án - Có thể lượng giá được hay không?",
 "Các giải pháp đưa ra có hợp lý và logic hay không?",
 "Có mô tả chi tiết phương pháp thực hiện hay không?",
 "Các giải pháp đưa ra giải quyết được mục tiêu tổng quát và cụ thể hay không?",
 "Đề án có giám sát thực hiện cụ thể rõ ràng (nội dung giám sát, cách giám sát, phương tiện sử dụng, thời gian)",
 "Tính giá trị và khả năng ứng dụng vào thực tiễn của đề án",
 "Tính hợp lý của kinh phí đề nghị",
 "Đánh giá OPPM"
];

// Noi dung nguyen van tu file "BM_03B - Bảng kiểm phê duyệt sáng kiến"
const PHEDUYET_TIEUCHI_SK = [
 "Nêu được sự cần thiết và phù hợp cải tiến tại đơn vị",
 "Mục tiêu rõ ràng, phù hợp với vấn đề đặt ra",
 "Có thể quan sát hoặc đánh giá được sau khi triển khai",
 "Các giải pháp đưa ra có hợp lý và logic. Có mô tả chi tiết cách thực hiện",
 "Tính trực tiếp trong giải quyết vấn đề, trúng đích",
 "Sự cải tiến so với phương pháp cũ. Mức độ cải thiện so với trước khi áp dụng sáng kiến",
 "Tính khả thi khi triển khai. Khả năng áp dụng ngay tại khoa/phòng",
 "Phù hợp với nhân lực và điều kiện hiện có",
 "Lợi ích có thể mang lại cho người bệnh, nhân viên y tế hoặc hoạt động chuyên môn, quản lý",
 "Tính hợp lý của kinh phí đề nghị"
];

const PHEDUYET_KETLUAN_OPTIONS_DA = [
 "Duyệt tiến hành đề án",
 "Chỉnh sửa bổ sung theo góp ý",
 "Cần trình lại theo phản biện",
 "Chỉnh sửa đầy đủ và có thể tiến hành đề án"
];

const PHEDUYET_KETLUAN_OPTIONS_SK = [
 "Duyệt tiến hành sáng kiến",
 "Chỉnh sửa bổ sung theo góp ý",
 "Cần trình lại theo phản biện",
 "Chỉnh sửa đầy đủ và có thể tiến hành sáng kiến"
];

// Rieng Phe duyet LAN 2 (ca de an lan sang kien): chi con 2 lua chon don gian, khong dung chung
// bo 4 lua chon cua Lan 1 nua.
const PHEDUYET_KETLUAN_OPTIONS_LAN2 = ["Duyệt", "Không duyệt"];

// Xac dinh de an ("ĐA") hay sang kien ("SK") tu Ma de an, dung chung server + client
function pheDuyetLoaiTuMaDean_(maDeAn) {
 return /^ĐA/i.test(String(maDeAn || "").trim()) ? "DA" : "SK";
}

// ==========================================================
// CHUC NANG "NGHIEM THU" (Sheet Nghiem_thu)
// - De an ("ĐA"): 6 o diem Diem1, Diem2a, Diem2b, Diem3, Diem4, Diem5 (Diem2a/2b chon 1 trong 2
//   nhung KHONG khoa lan nhau tren giao dien - nguoi cham tu chon dien dung 1 o).
// - Sang kien ("SK"): 9 o diem Diem1a, Diem1b, Diem2a, Diem2b, Diem3a, Diem3b, Diem4, Diem5, Diem6.
// - Nguon: BM05A (De an) / BM05B (Sang kien).
// ==========================================================

const NGHIEMTHU_TIEUCHI_DA = [
 { key: "Diem1", label: "Đề án hoàn thành đúng tiến độ. (Các giải pháp được thực hiện đúng theo lộ trình được nêu trong đề cương đề án cải tiến chất lượng đã được Hội đồng xét duyệt cho phép tiến hành.)", max: 20 },
 { key: "Diem2a", label: "Đề án đạt được các mục tiêu - Tất cả mục tiêu đều đạt.", max: 30 },
 { key: "Diem2b", label: "Đề án đạt được các mục tiêu - Một phần mục tiêu đạt.", max: 10 },
 { key: "Diem3", label: "Đề án có ý nghĩa thực tiễn (giúp giải quyết được các vấn đề cụ thể, cải tiến công tác khám chữa bệnh, cải thiện hiệu quả công việc, nâng cao chất lượng phục vụ tại bệnh viện).", max: 20 },
 { key: "Diem4", label: "Đề án có khả năng duy trì (các giải pháp/kỹ thuật của đề án có khả năng duy trì triển khai áp dụng sau khi nghiệm thu đề án).", max: 15 },
 { key: "Diem5", label: "Đề án có khả năng nhân rộng (triển khai áp dụng tại các khoa/phòng khác trong bệnh viện hoặc các đơn vị khác trong ngành y tế).", max: 15 }
];

const NGHIEMTHU_TIEUCHI_SK = [
 { key: "Diem1a", label: "Hoàn thành đúng tiến độ - Sáng kiến được triển khai đúng theo nội dung, kế hoạch đã đăng ký và được phê duyệt.", max: 15 },
 { key: "Diem1b", label: "Hoàn thành đúng tiến độ - Các bước thực hiện rõ ràng, có minh chứng (hình ảnh, số liệu, quy trình…).", max: 5 },
 { key: "Diem2a", label: "Mức độ đạt mục tiêu - Đạt đầy đủ mục tiêu đề ra (có số liệu chứng minh trước – sau).", max: 15 },
 { key: "Diem2b", label: "Mức độ đạt mục tiêu - Trường hợp chỉ đạt một phần mục tiêu (có phân tích nguyên nhân).", max: 5 },
 { key: "Diem3a", label: "Hiệu quả cải tiến - Sáng kiến giúp cải thiện rõ rệt chất lượng chuyên môn, quy trình hoặc an toàn người bệnh.", max: 20 },
 { key: "Diem3b", label: "Hiệu quả cải tiến - Có tác động tích cực đến nhân viên y tế hoặc hiệu quả vận hành.", max: 10 },
 { key: "Diem4", label: "Khả năng duy trì (có thể duy trì thường quy sau khi nghiệm thu).", max: 10 },
 { key: "Diem5", label: "Khả năng nhân rộng (có thể áp dụng cho khoa/phòng khác trong bệnh viện hoặc các đơn vị khác trong ngành y tế).", max: 10 },
 { key: "Diem6", label: "Hiệu quả chi phí (chi phí hợp lý so với hiệu quả mang lại).", max: 10 }
];

const NGHIEMTHU_KETLUAN_OPTIONS_DA = [
 "Duyệt tiến hành đề án",
 "Chỉnh sửa bổ sung theo góp ý",
 "Cần trình lại theo phản biện",
 "Chỉnh sửa đầy đủ và có thể nghiệm thu đề án"
];

const NGHIEMTHU_KETLUAN_OPTIONS_SK = [
 "Duyệt tiến hành",
 "Chỉnh sửa bổ sung theo góp ý",
 "Cần trình lại theo phản biện",
 "Chỉnh sửa đầy đủ và có thể nghiệm thu"
];

// Nhan hien thi cho o tich rieng (doc lap voi Ket luan)
const NGHIEMTHU_DEXUAT_THANHPHO_LABEL = "Đề xuất phạm vi ảnh hưởng cấp Thành phố";

// ==========================================================
// CHUC NANG "YEU CAU CHINH SUA" (Sheet DS_YeuCauSua) - danh cho User/TVHĐ o man Tra cuu
// - Chi ap dung cho 3 nhom: Chunhiem, Thanhvien (o DS_Deansangkien), va ChiSo (tung dong rieng
//   trong DS_chisodean, sua Chi_so hoac Nguongdat).
// ==========================================================
const YEUCAUSUA_LOAI = {
 CHUNHIEM: "Chunhiem",
 THANHVIEN: "Thanhvien",
 CHISO: "ChiSo"
};

const YEUCAUSUA_TRANGTHAI = {
 CHODUYET: "Chờ duyệt",
 DADUYET: "Đã duyệt",
 TUCHOI: "Đã từ chối"
};
