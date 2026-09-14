// ==========================================================
// YEU CAU CHINH SUA (Sheet DS_YeuCauSua) - danh cho User/TVHĐ o man Tra cuu
// - Admin sua truc tiep -> ap dung NGAY (khong qua co che nay).
// - User/TVHĐ sua -> tao 1 YEU CAU CHO DUYET, chua ap dung ngay. Admin xu ly bang 3 nut:
//   Chap nhan (ap dung gia tri moi) / Tu choi (bo, giu nguyen cu) / Chinh sua (Admin tu sua lai
//   gia tri truoc khi Chap nhan - o phia client, server chi nhan 1 hanh dong "ChapNhan" voi
//   gia tri CUOI CUNG duoc gui len, co the khac voi gia tri User de xuat ban dau).
// - Chi ap dung cho 3 nhom: Chunhiem, Thanhvien (DS_Deansangkien), ChiSo (Chi_so/Nguongdat trong
//   DS_chisodean). Moi dong thay doi = 1 yeu cau doc lap.
// - User duoc gui NHIEU yeu cau song song, va XOA yeu cau cua chinh minh khi CHUA duoc Admin xu ly.
// ==========================================================

// Danh sach yeu cau (CHO DUYET + DA XU LY gan day) cho 1 truong cu the cua 1 de an
// (loai = "Chunhiem" hoac "Thanhvien"). Dung de hien o vuong do + danh sach o Tra cuu.
function getYeuCauSuaList(token, dangkyId, loai) {
  const user = requireUser(token);
  dangkyId = String(dangkyId || "").trim();
  loai = String(loai || "").trim();
  if (!dangkyId || !loai) return [];

  const data = getSheetData(CONFIG.SHEET_YEUCAUSUA);
  if (data.length < 2) return [];
  const map = headerIndexMap(data[0]);
  requireColumns(map, ["DangkyID", "Loai", "TrangThai"]);

  return data.slice(1)
    .filter(function (r) {
      return String(r[map["DangkyID"]] || "").trim() === dangkyId &&
             String(r[map["Loai"]] || "").trim() === loai;
    })
    .map(function (r) { return formatYeuCauSuaRow_(r, map); })
    .sort(function (a, b) { return b._sort - a._sort; })
    .map(function (r) { delete r._sort; return r; });
}

// Danh sach yeu cau cho 1 dong Chi so cu the (rowNumber trong DS_chisodean)
function getYeuCauSuaListChiSo(token, chiSoRowNumber) {
  requireUser(token);
  chiSoRowNumber = parseInt(chiSoRowNumber, 10);
  if (!chiSoRowNumber) return [];

  const data = getSheetData(CONFIG.SHEET_YEUCAUSUA);
  if (data.length < 2) return [];
  const map = headerIndexMap(data[0]);
  requireColumns(map, ["Loai", "ChiSoRowNumber", "TrangThai"]);

  return data.slice(1)
    .filter(function (r) {
      return String(r[map["Loai"]] || "").trim() === YEUCAUSUA_LOAI.CHISO &&
             parseInt(r[map["ChiSoRowNumber"]], 10) === chiSoRowNumber;
    })
    .map(function (r) { return formatYeuCauSuaRow_(r, map); })
    .sort(function (a, b) { return b._sort - a._sort; })
    .map(function (r) { delete r._sort; return r; });
}

function formatYeuCauSuaRow_(row, map) {
  const thoiGianRaw = "ThoiGianGui" in map ? row[map["ThoiGianGui"]] : "";
  return {
    id: "ID" in map ? String(row[map["ID"]] || "") : "",
    loai: "Loai" in map ? String(row[map["Loai"]] || "") : "",
    tenTruong: "TenTruong" in map ? String(row[map["TenTruong"]] || "") : "",
    truongCu: "TruongCu" in map ? String(row[map["TruongCu"]] || "") : "",
    truongMoi: "TruongMoi" in map ? String(row[map["TruongMoi"]] || "") : "",
    nguoiGuiHoTen: "NguoiGuiHoTen" in map ? String(row[map["NguoiGuiHoTen"]] || "") : "",
    thoiGianGui: formatCellValue(thoiGianRaw),
    trangThai: "TrangThai" in map ? String(row[map["TrangThai"]] || "") : "",
    _sort: thoiGianRaw ? new Date(thoiGianRaw).getTime() : 0
  };
}

// Dem so yeu cau CON CHO DUYET cho 1 de an (ca Chunhiem + Thanhvien) - dung de hien o vuong do
// o bang thong tin chinh (khong can biet chi tiet, chi can dem)
function demYeuCauSuaChoDuyet_(dangkyId, loai) {
  if (!dangkyId || !loai) return 0;
  const data = getSheetData(CONFIG.SHEET_YEUCAUSUA);
  if (data.length < 2) return 0;
  const map = headerIndexMap(data[0]);
  if (!("DangkyID" in map) || !("Loai" in map) || !("TrangThai" in map)) return 0;

  return data.slice(1).filter(function (r) {
    return String(r[map["DangkyID"]] || "").trim() === dangkyId &&
           String(r[map["Loai"]] || "").trim() === loai &&
           String(r[map["TrangThai"]] || "").trim() === YEUCAUSUA_TRANGTHAI.CHODUYET;
  }).length;
}

function demYeuCauSuaChoDuyetChiSo_(chiSoRowNumber) {
  if (!chiSoRowNumber) return 0;
  const data = getSheetData(CONFIG.SHEET_YEUCAUSUA);
  if (data.length < 2) return 0;
  const map = headerIndexMap(data[0]);
  if (!("Loai" in map) || !("ChiSoRowNumber" in map) || !("TrangThai" in map)) return 0;

  return data.slice(1).filter(function (r) {
    return String(r[map["Loai"]] || "").trim() === YEUCAUSUA_LOAI.CHISO &&
           parseInt(r[map["ChiSoRowNumber"]], 10) === chiSoRowNumber &&
           String(r[map["TrangThai"]] || "").trim() === YEUCAUSUA_TRANGTHAI.CHODUYET;
  }).length;
}

// User/TVHĐ gui 1 yeu cau sua Chunhiem hoac Thanhvien cua 1 de an
function submitYeuCauSua(token, data) {
  const user = requireUser(token);
  if (!data) return { success: false, message: "Không nhận được dữ liệu." };

  const dangkyId = String(data.dangkyId || "").trim();
  const loai = String(data.loai || "").trim();
  const truongMoi = String(data.truongMoi || "").trim();

  if (!dangkyId) return { success: false, message: "Thiếu thông tin đề án/sáng kiến." };
  if ([YEUCAUSUA_LOAI.CHUNHIEM, YEUCAUSUA_LOAI.THANHVIEN].indexOf(loai) === -1) {
    return { success: false, message: "Loại yêu cầu không hợp lệ." };
  }
  if (!truongMoi) return { success: false, message: "Vui lòng nhập nội dung mới." };

  const deanRow = findRowByColumnValue_(CONFIG.SHEET_DEAN, "DangkyID", dangkyId);
  if (!deanRow) return { success: false, message: "Không tìm thấy đề án/sáng kiến." };

  const colName = loai; // "Chunhiem" hoac "Thanhvien" - trung ten cot
  const khoaphong = "Khoaphong" in deanRow.map ? String(deanRow.row[deanRow.map["Khoaphong"]] || "").trim() : "";
  if (!isAdmin(user) && (user.khoaPhong || []).indexOf(khoaphong) === -1) {
    return { success: false, message: "Bạn không có quyền gửi yêu cầu cho đề án/sáng kiến này." };
  }

  const truongCu = (colName in deanRow.map) ? String(deanRow.row[deanRow.map[colName]] || "").trim() : "";

  const sheet = getSheet(CONFIG.SHEET_YEUCAUSUA);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = headerIndexMap(headers);
  requireColumns(map, ["DangkyID", "Loai", "TruongMoi", "TrangThai"]);

  const newRow = new Array(headers.length).fill("");
  if ("ID" in map) newRow[map["ID"]] = Utilities.getUuid();
  newRow[map["DangkyID"]] = dangkyId;
  newRow[map["Loai"]] = loai;
  if ("TenTruong" in map) newRow[map["TenTruong"]] = colName;
  if ("TruongCu" in map) newRow[map["TruongCu"]] = truongCu;
  newRow[map["TruongMoi"]] = truongMoi;
  if ("NguoiGuiEmail" in map) newRow[map["NguoiGuiEmail"]] = user.email;
  if ("NguoiGuiHoTen" in map) newRow[map["NguoiGuiHoTen"]] = user.hoTen;
  if ("ThoiGianGui" in map) newRow[map["ThoiGianGui"]] = new Date();
  newRow[map["TrangThai"]] = YEUCAUSUA_TRANGTHAI.CHODUYET;

  sheet.appendRow(newRow);
  const lastRow = sheet.getLastRow();
  if ("ThoiGianGui" in map) sheet.getRange(lastRow, map["ThoiGianGui"] + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");

  invalidateSheetCache(CONFIG.SHEET_YEUCAUSUA);
  return { success: true, message: "Đã gửi yêu cầu chỉnh sửa, chờ Admin duyệt." };
}

// User/TVHĐ gui 1 yeu cau sua Chi_so hoac Nguongdat cua 1 dong trong DS_chisodean
function submitYeuCauSuaChiSo(token, data) {
  const user = requireUser(token);
  if (!data) return { success: false, message: "Không nhận được dữ liệu." };

  const chiSoRowNumber = parseInt(data.chiSoRowNumber, 10);
  const dangkyId = String(data.dangkyId || "").trim();
  const tenTruong = String(data.tenTruong || "").trim();
  const truongMoi = String(data.truongMoi || "").trim();

  if (!chiSoRowNumber) return { success: false, message: "Thiếu thông tin chỉ số." };
  if (["Chi_so", "Nguongdat"].indexOf(tenTruong) === -1) return { success: false, message: "Tên trường không hợp lệ." };
  if (!truongMoi) return { success: false, message: "Vui lòng nhập nội dung mới." };

  const chiSoSheet = getSheet(CONFIG.SHEET_CHISO);
  const chiSoHeaders = chiSoSheet.getRange(1, 1, 1, chiSoSheet.getLastColumn()).getValues()[0];
  const chiSoMap = headerIndexMap(chiSoHeaders);
  if (!(tenTruong in chiSoMap)) return { success: false, message: "Sheet DS_chisodean đang thiếu cột " + tenTruong + "." };
  if (chiSoRowNumber < 2 || chiSoRowNumber > chiSoSheet.getLastRow()) return { success: false, message: "Không tìm thấy dòng chỉ số." };

  const truongCu = String(chiSoSheet.getRange(chiSoRowNumber, chiSoMap[tenTruong] + 1).getValue() || "").trim();

  const sheet = getSheet(CONFIG.SHEET_YEUCAUSUA);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = headerIndexMap(headers);
  requireColumns(map, ["Loai", "ChiSoRowNumber", "TenTruong", "TruongMoi", "TrangThai"]);

  const newRow = new Array(headers.length).fill("");
  if ("ID" in map) newRow[map["ID"]] = Utilities.getUuid();
  if ("DangkyID" in map) newRow[map["DangkyID"]] = dangkyId;
  newRow[map["Loai"]] = YEUCAUSUA_LOAI.CHISO;
  newRow[map["ChiSoRowNumber"]] = chiSoRowNumber;
  newRow[map["TenTruong"]] = tenTruong;
  if ("TruongCu" in map) newRow[map["TruongCu"]] = truongCu;
  newRow[map["TruongMoi"]] = truongMoi;
  if ("NguoiGuiEmail" in map) newRow[map["NguoiGuiEmail"]] = user.email;
  if ("NguoiGuiHoTen" in map) newRow[map["NguoiGuiHoTen"]] = user.hoTen;
  if ("ThoiGianGui" in map) newRow[map["ThoiGianGui"]] = new Date();
  newRow[map["TrangThai"]] = YEUCAUSUA_TRANGTHAI.CHODUYET;

  sheet.appendRow(newRow);
  const lastRow = sheet.getLastRow();
  if ("ThoiGianGui" in map) sheet.getRange(lastRow, map["ThoiGianGui"] + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");

  invalidateSheetCache(CONFIG.SHEET_YEUCAUSUA);
  return { success: true, message: "Đã gửi yêu cầu chỉnh sửa, chờ Admin duyệt." };
}

// Nguoi gui XOA yeu cau cua CHINH MINH, CHI khi con "Cho duyet" (Admin chua xu ly)
function xoaYeuCauSua(token, id) {
  const user = requireUser(token);
  if (!id) return { success: false, message: "Thiếu ID yêu cầu." };

  const sheet = getSheet(CONFIG.SHEET_YEUCAUSUA);
  const values = sheet.getDataRange().getValues();
  const map = headerIndexMap(values[0]);
  requireColumns(map, ["ID", "NguoiGuiEmail", "TrangThai"]);

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][map["ID"]] || "").trim() === String(id).trim()) { rowIndex = i; break; }
  }
  if (rowIndex === -1) return { success: false, message: "Không tìm thấy yêu cầu." };

  const ownerEmail = String(values[rowIndex][map["NguoiGuiEmail"]] || "").trim().toLowerCase();
  if (ownerEmail !== String(user.email || "").trim().toLowerCase()) {
    return { success: false, message: "Bạn chỉ có thể xóa yêu cầu do chính mình gửi." };
  }
  const trangThai = String(values[rowIndex][map["TrangThai"]] || "").trim();
  if (trangThai !== YEUCAUSUA_TRANGTHAI.CHODUYET) {
    return { success: false, message: "Yêu cầu này đã được xử lý, không thể xóa." };
  }

  sheet.deleteRow(rowIndex + 1);
  invalidateSheetCache(CONFIG.SHEET_YEUCAUSUA);
  return { success: true, message: "Đã xóa yêu cầu." };
}

// Admin xu ly 1 yeu cau: hanhDong = "ChapNhan" hoac "TuChoi".
// giaTriApDung = gia tri CUOI CUNG se ap dung neu Chap nhan (co the khac TruongMoi ban dau, neu
// Admin da tu sua lai truoc khi bam Chap nhan - dung "Chinh sua" o giao dien).
function xuLyYeuCauSua(token, id, hanhDong, giaTriApDung) {
  const user = requireUser(token);
  if (!isAdmin(user)) return { success: false, message: "Chỉ Admin mới có quyền xử lý yêu cầu chỉnh sửa." };
  if (!id) return { success: false, message: "Thiếu ID yêu cầu." };
  if (["ChapNhan", "TuChoi"].indexOf(hanhDong) === -1) return { success: false, message: "Hành động không hợp lệ." };

  const sheet = getSheet(CONFIG.SHEET_YEUCAUSUA);
  const values = sheet.getDataRange().getValues();
  const map = headerIndexMap(values[0]);
  requireColumns(map, ["ID", "Loai", "TrangThai"]);

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][map["ID"]] || "").trim() === String(id).trim()) { rowIndex = i; break; }
  }
  if (rowIndex === -1) return { success: false, message: "Không tìm thấy yêu cầu." };

  const row = values[rowIndex];
  const rowNumber = rowIndex + 1;
  const trangThaiHienTai = String(row[map["TrangThai"]] || "").trim();
  if (trangThaiHienTai !== YEUCAUSUA_TRANGTHAI.CHODUYET) {
    return { success: false, message: "Yêu cầu này đã được xử lý trước đó." };
  }

  if (hanhDong === "TuChoi") {
    sheet.getRange(rowNumber, map["TrangThai"] + 1).setValue(YEUCAUSUA_TRANGTHAI.TUCHOI);
    if ("ThoiGianXuLy" in map) sheet.getRange(rowNumber, map["ThoiGianXuLy"] + 1).setValue(new Date()).setNumberFormat("dd/MM/yyyy HH:mm:ss");
    invalidateSheetCache(CONFIG.SHEET_YEUCAUSUA);
    return { success: true, message: "Đã từ chối yêu cầu." };
  }

  // Chap nhan: ap dung gia tri (uu tien gia tri Admin gui len, fallback ve TruongMoi ban dau)
  const loai = String(row[map["Loai"]] || "").trim();
  const finalValue = String(giaTriApDung || (("TruongMoi" in map) ? row[map["TruongMoi"]] : "") || "").trim();

  if (loai === YEUCAUSUA_LOAI.CHUNHIEM || loai === YEUCAUSUA_LOAI.THANHVIEN) {
    const dangkyId = "DangkyID" in map ? String(row[map["DangkyID"]] || "").trim() : "";
    const deanRow = findRowByColumnValue_(CONFIG.SHEET_DEAN, "DangkyID", dangkyId);
    if (!deanRow) return { success: false, message: "Không tìm thấy đề án/sáng kiến tương ứng." };
    if (loai in deanRow.map) {
      deanRow.sheet.getRange(deanRow.rowNumber, deanRow.map[loai] + 1).setValue(finalValue);
      invalidateSheetCache(CONFIG.SHEET_DEAN);
    }
  } else if (loai === YEUCAUSUA_LOAI.CHISO) {
    const chiSoRowNumber = "ChiSoRowNumber" in map ? parseInt(row[map["ChiSoRowNumber"]], 10) : 0;
    const tenTruong = "TenTruong" in map ? String(row[map["TenTruong"]] || "").trim() : "";
    if (chiSoRowNumber && tenTruong) {
      const chiSoSheet = getSheet(CONFIG.SHEET_CHISO);
      const chiSoHeaders = chiSoSheet.getRange(1, 1, 1, chiSoSheet.getLastColumn()).getValues()[0];
      const chiSoMap = headerIndexMap(chiSoHeaders);
      if (tenTruong in chiSoMap) {
        chiSoSheet.getRange(chiSoRowNumber, chiSoMap[tenTruong] + 1).setValue(finalValue);
        invalidateSheetCache(CONFIG.SHEET_CHISO);
      }
    }
  }

  sheet.getRange(rowNumber, map["TrangThai"] + 1).setValue(YEUCAUSUA_TRANGTHAI.DADUYET);
  if ("TruongMoi" in map) sheet.getRange(rowNumber, map["TruongMoi"] + 1).setValue(finalValue);
  if ("ThoiGianXuLy" in map) sheet.getRange(rowNumber, map["ThoiGianXuLy"] + 1).setValue(new Date()).setNumberFormat("dd/MM/yyyy HH:mm:ss");

  invalidateSheetCache(CONFIG.SHEET_YEUCAUSUA);
  return { success: true, message: "Đã chấp nhận và áp dụng thay đổi." };
}
