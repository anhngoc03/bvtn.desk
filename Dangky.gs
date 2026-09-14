// Kiem tra 1 file dinh kem (client gui base64 + mimeType + name) co dung dinh dang PDF khong
function isPdfFile_(f) {
  const mime = String((f && f.mimeType) || "").toLowerCase();
  const name = String((f && f.name) || "").toLowerCase();
  return mime === "application/pdf" || name.slice(-4) === ".pdf";
}


// Cac cau "thoi gian" chi nhan dinh dang mm/yyyy (vd 03/2026)
function isValidMonthYear_(value) {
  return /^\d{2}\/\d{4}$/.test(String(value || "").trim());
}


// Cau "khoang thoi gian" dang mm/yyyy - mm/yyyy (vd 01/2026 - 12/2026)
function isValidMonthYearRange_(value) {
  return /^\d{2}\/\d{4}\s*-\s*\d{2}\/\d{4}$/.test(String(value || "").trim());
}


// ==========================================================
// SCHEMA CAU HOI (client goi 1 lan de biet form co nhung cau nao, dropdown/checkbox/radio ra sao -
// nguon du lieu DUY NHAT la cac hang so trong Config.gs, tranh viet trung lap ben JavaScript.html)
// ==========================================================
function getDangKyFieldDefs(token) {
  requireUser(token);
  return {
    loaiOrder: ["DA_MOI", "DA_CU", "SK"],
    loaiLabels: DANGKY_LOAI_LABELS,
    contactFields: DANGKY_CONTACT_FIELDS,
    fields: DANGKY_FIELDS,
    lockedFields: DANGKY_LOCKED_FIELDS
  };
}


// ==========================================================
// BAT/TAT NHAN DANG KY THEO TUNG LOAI (chi Admin duoc bat/tat, luu trong PropertiesService
// vi day la 1 "cong tac" cua he thong, khong phai du lieu nghiep vu nen khong can luu vao Sheet)
// ==========================================================
const DANGKY_STATUS_PROP_KEY = "DANGKY_STATUS";


// Ai da dang nhap cung xem duoc trang thai bat/tat (de biet loai nao dang tam ngung nhan)
function getDangKyStatus(token) {
  requireUser(token);
  const status = { DA_MOI: true, DA_CU: true, SK: true };
  const raw = PropertiesService.getScriptProperties().getProperty(DANGKY_STATUS_PROP_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      Object.keys(status).forEach(function (k) {
        if (typeof saved[k] === "boolean") status[k] = saved[k];
      });
    } catch (e) {
      // du lieu hong -> dung mac dinh (mo ca 3 loai)
    }
  }
  return status;
}


// Chi Admin duoc bat/tat
function setDangKyStatus(token, loai, isOpen) {
  const user = requireUser(token);
  if (!isAdmin(user)) {
    return { success: false, message: "Chỉ Admin mới có quyền bật/tắt nhận đăng ký." };
  }
  if (["DA_MOI", "DA_CU", "SK"].indexOf(loai) === -1) {
    return { success: false, message: "Loại đăng ký không hợp lệ." };
  }


  const status = getDangKyStatus(token);
  status[loai] = !!isOpen;
  PropertiesService.getScriptProperties().setProperty(DANGKY_STATUS_PROP_KEY, JSON.stringify(status));
  return { success: true, message: "Đã cập nhật.", status: status };
}


// ==========================================================
// DANH SACH KHOA/PHONG GOC (Sheet DS_khoa, cot B) - dung cho dropdown "Khoa/phòng đăng ký"
// (day la danh sach day du cua benh vien, KHAC voi danh sach khoa/phong rieng cua tung tai khoan)
// ==========================================================
function getKhoaPhongMasterList(token) {
  requireUser(token);
  const data = getSheetData(CONFIG.SHEET_KHOA);
  if (data.length < 2) return [];


  const set = {};
  data.slice(1).forEach(function (row) {
    const khoa = String((row[1] === undefined ? "" : row[1]) || "").trim(); // cot B = index 1
    if (khoa) set[khoa.toLowerCase()] = khoa;
  });


  return Object.values(set).sort(function (a, b) {
    return a.localeCompare(b, "vi", { sensitivity: "base" });
  });
}


// ==========================================================
// LINK CAC BIEU MAU CAN TUAN THU (ten hien thi = ten file that tren Google Drive)
// ==========================================================
function getDangKyTemplateLinks(token) {
  requireUser(token);
  return DANGKY_TEMPLATE_LINKS.map(function (url) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    let name = url;
    if (match) {
      try {
        name = DriveApp.getFileById(match[1]).getName();
      } catch (e) {
        name = "Xem biểu mẫu";
      }
    }
    return { url: url, name: name };
  });
}


// ==========================================================
// NOP PHIEU DANG KY MOI
// data = { HoTen, Email, SoDienThoai, ...cac truong rieng cua "loai" (xem DANGKY_FIELDS trong Config.gs) }
// Truong "khoa" (Khoa/phong) gio cho phep CHON NHIEU o phia client - client gui len 1 chuoi
// da noi san cach nhau boi ", " (giong het cach truong "checkbox" hoat dong), server chi luu
// nguyen chuoi do vao 1 o, khong can xu ly gi them o day.
// ==========================================================
function submitDangKy(token, loai, data) {
  const user = requireUser(token);


  if (!DANGKY_FIELDS[loai]) return { success: false, message: "Loại đăng ký không hợp lệ." };
  if (!data) return { success: false, message: "Không nhận được dữ liệu." };


  const status = getDangKyStatus(token);
  if (!status[loai]) {
    return { success: false, message: "Loại đăng ký này hiện đang tạm ngừng nhận đăng ký." };
  }


  const allFields = DANGKY_CONTACT_FIELDS.concat(DANGKY_FIELDS[loai]);
  for (let i = 0; i < allFields.length; i++) {
    const field = allFields[i];
    const value = data[field.key];
    const hasValue = value !== undefined && value !== null && String(value).trim() !== "";


    if (field.required && !hasValue) {
      return { success: false, message: 'Vui lòng điền "' + field.label + '".' };
    }
    if (field.type === "month" && hasValue && !isValidMonthYear_(value)) {
      return { success: false, message: 'Vui lòng nhập "' + field.label + '" theo định dạng mm/yyyy.' };
    }
    if (field.type === "month_range" && hasValue && !isValidMonthYearRange_(value)) {
      return { success: false, message: 'Vui lòng nhập "' + field.label + '" theo định dạng mm/yyyy - mm/yyyy.' };
    }
  }


  const sheet = getSheet(CONFIG.SHEET_DANGKY);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = headerIndexMap(headers);
  requireColumns(map, ["Time", "Madean"]);


  const newRow = new Array(headers.length).fill("");
  const now = new Date();


  newRow[map["Time"]] = now;
  newRow[map["Madean"]] = ""; // Admin tu dien tay sau de phan loai


  const newDangkyId = Utilities.getUuid();
  if ("ID" in map) newRow[map["ID"]] = newDangkyId;
  if ("LoaiDangKy" in map) newRow[map["LoaiDangKy"]] = loai;
  if ("TaiKhoanDangKy" in map) newRow[map["TaiKhoanDangKy"]] = user.email;


  const fileField = DANGKY_FIELDS[loai].find(function (f) { return f.type === "file"; });
  let uploadedFileUrl = "";


  DANGKY_CONTACT_FIELDS.concat(DANGKY_FIELDS[loai]).forEach(function (field) {
    if (field.type === "file") return; // xu ly rieng ben duoi (upload len Drive)
    if (!(field.key in map)) return;
    let value = data[field.key];
    if (Array.isArray(value)) value = value.join(", ");
    newRow[map[field.key]] = String(value === undefined || value === null ? "" : value).trim();
  });


  if (fileField && fileField.key in map) {
    const files = Array.isArray(data[fileField.key]) ? data[fileField.key].slice(0, CONFIG.DANGKY_MAX_FILES) : [];
    const invalidFile = files.find(function (f) { return f && !isPdfFile_(f); });
    if (invalidFile) {
      return { success: false, message: "File đính kèm phải ở định dạng PDF (." + "pdf)." };
    }
    const fileUrls = [];
    if (files.length > 0) {
      try {
        const folder = DriveApp.getFolderById(CONFIG.DANGKY_DRIVE_FOLDER_ID);
        files.forEach(function (f) {
          if (!f || !f.data) return;
          const bytes = Utilities.base64Decode(f.data);
          const blob = Utilities.newBlob(bytes, "application/pdf", f.name || "Dinh_kem.pdf");
          const file = folder.createFile(blob);
          fileUrls.push(file.getUrl());
        });
      } catch (error) {
        return { success: false, message: "Không thể tải file đính kèm lên Drive: " + error.message };
      }
    }
    uploadedFileUrl = fileUrls.join(", ");
    newRow[map[fileField.key]] = uploadedFileUrl;
  }


  sheet.appendRow(newRow);
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, map["Time"] + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");


  // Cac cau "thoi gian" (mm/yyyy) va "tien te" (co dau cham) neu de Google Sheet tu nhan dien se bi
  // TU DONG doi thanh kieu Ngay/So va hien sai dinh dang (vd hien dd/MM/yyyy HH:mm:ss thay vi mm/yyyy).
  // Ep dinh dang o (@) = van ban THUAN TRUOC, roi ghi lai gia tri, de Sheet KHONG tu dong doi kieu du lieu.
  DANGKY_CONTACT_FIELDS.concat(DANGKY_FIELDS[loai]).forEach(function (field) {
    if (["month", "month_range", "currency"].indexOf(field.type) === -1) return;
    if (!(field.key in map)) return;
    const colIndex = map[field.key] + 1;
    const rawValue = newRow[map[field.key]];
    sheet.getRange(lastRow, colIndex).setNumberFormat("@").setValue(rawValue);
  });


  invalidateSheetCache(CONFIG.SHEET_DANGKY);


  // Tu dong tao/cap nhat dong tuong ung trong DS_Deansangkien (va lan truyen xuong cac Sheet
  // khac neu can) qua bo may dong bo trung tam (xem SyncEngine.gs). Boc try/catch de neu Sheet
  // DS_Deansangkien co van de (thieu cot...) cung KHONG lam hong viec nop phieu chinh.
  let syncMessage = "";
  try {
    syncEngineRebuildAndPropagate_(newDangkyId);
  } catch (e) {
    syncMessage = " (Lưu ý: nộp phiếu thành công nhưng CHƯA đồng bộ được sang DS_Deansangkien - " + e.message + ")";
  }


  return { success: true, message: "Đã nộp phiếu đăng ký thành công." + syncMessage };
}


/**
 * Sau khi 1 phieu dang ky duoc nop thanh cong, tu dong tao 1 dong moi trong Sheet DS_Deansangkien
 * va dien san cac cot co the suy ra truc tiep tu phieu dang ky (xem bang mapping trong tai lieu
 * "web app de an"). Madean_sangkien de trong - Admin van can tu dien ma de an nhu quy trinh hien tai.
 * Cot Khoaphong duoc COPY NGUYEN VAN tu phieu dang ky (co the chua nhieu khoa/phong cach nhau
 * boi dau phay - xem splitKhoaPhongValues_ trong Utils.gs, moi noi doc lai cot nay deu phai tach ra).
 * Anh xa (Sheet Dangky -> Sheet DS_Deansangkien):
 *   Khoa/phong dang ky (DA_/DACu_/SK_KhoaPhong)                -> Khoaphong
 *   Ten de an/sang kien (DA_TenDeAn/DACu_TenDeAn/SK_TenSangKien) -> Tendean
 *   File dinh kem (DA_/DACu_/SK_File)                           -> File_dau (dang duong link Drive)
 *   Truong de an/nhom (DA_TruongDeAn/DACu_TruongDeAn/SK_TruongNhom) -> Chunhiem
 *   Thu ky + Thanh vien gop lai (DA_ThuKy+DA_ThanhVien / SK_ThuKy+SK_ThanhVien) -> Thanhvien
 *   Thoi gian hoan thanh/du kien hoan thanh/ket thuc (DA_TgianHoanThanhBaoCao/
 *     DACu_TgianDuKienHoanThanh/SK_TgianKetThuc)                -> Thoigian_ketthuc
 *   Chi so (DA_ChiSo, chi co o de an moi)                       -> Chi_so
 */
/**
 * (Ham cu syncDeanRowFromDangKy_ da duoc THAY THE hoan toan boi syncEngineRebuildAndPropagate_
 * trong SyncEngine.gs - ham do khong chi tao dong DS_Deansangkien luc nop moi, ma con lan truyen
 * thay doi ca luc SUA phieu sau nay, va cap nhat them ca cac Sheet phia sau khac.)
 */


// ==========================================================
// LICH SU DANG KY
// - Admin: XEM duoc TAT CA phieu (moi khoa/phong, moi thoi diem, ke ca loai dang ky dang tam dong
//   nhan dang ky) - day la diem KHAC BIET duy nhat cua Admin so voi TVHĐ/User.
// - TVHĐ va User: quyen XEM ngang nhau - chi xem duoc phieu co Khoa/phong (cua CHINH phieu do)
//   GIAO voi danh sach khoa/phong cua tai khoan, HOAC phieu do CHINH tai khoan nay da nop (khop
//   TaiKhoanDangKy voi email dang nhap), ke ca khi phieu do khong thuoc khoa/phong cua minh.
// - canEdit: quy tac GIONG NHAU cho CA 3 vai tro (Admin/TVHĐ/User) - sua duoc khi va chi khi
//   (thuoc dung khoa/phong cua phieu HOAC chinh tai khoan da nop phieu do) VA loai dang ky do
//   dang duoc Admin mo (bat). Voi tai khoan Admin, dieu nay nghia la Admin CHI sua duoc phieu
//   thuoc khoa/phong cua chinh Admin (neu co) hoac phieu do chinh Admin tu nop.
// - 1 o "Khoa/phong" co the chua NHIEU khoa/phong (cach nhau boi dau phay) - LUON tach bang
//   splitKhoaPhongValues_() (Utils.gs) va kiem tra bang .indexOf()/.some(), KHONG so sanh ===
//   truc tiep voi ca chuoi trong o nua.
// ==========================================================
function getDangKyHistory(token) {
  const user = requireUser(token);
  const data = getSheetData(CONFIG.SHEET_DANGKY);
  if (data.length < 2) return [];


  const map = headerIndexMap(data[0]);
  requireColumns(map, ["Time", "Madean"]);


  const admin = isAdmin(user);
  const allowedKhoa = user.khoaPhong || [];
  const status = getDangKyStatus(token);
  const userEmail = String(user.email || "").trim().toLowerCase();


  // Tap cac DangkyID DA duoc dat Trang thai o Phan cong phe duyet (bat ky gia tri nao) -> nhung
  // phieu nay bi khoa sua VINH VIEN qua man hinh Dang ky, doc rieng 1 lan cho ca danh sach.
  const lockedDangkyIds = {};
  try {
    const pcData = getSheetData(CONFIG.SHEET_PHANCONG);
    if (pcData.length >= 2) {
      const pcMap = headerIndexMap(pcData[0]);
      if ("DangkyID" in pcMap && "Trangthai" in pcMap) {
        pcData.slice(1).forEach(function (r) {
          const dkId = String(r[pcMap["DangkyID"]] || "").trim();
          const tt = String(r[pcMap["Trangthai"]] || "").trim();
          if (dkId && tt) lockedDangkyIds[dkId] = true;
        });
      }
    }
  } catch (e) {
    // Sheet DS_Phancong loi/chua co cot DangkyID -> bo qua, khong khoa gi ca (khong lam gian doan Lich su dang ky)
  }


  const rows = [];


  data.slice(1).forEach(function (row) {
    const loai = "LoaiDangKy" in map ? String(row[map["LoaiDangKy"]] || "").trim() : "";
    if (!DANGKY_FIELDS[loai]) return; // dong rong / chua xac dinh duoc loai -> bo qua


    const khoaKey = dangKyKhoaPhongFieldKey_(loai);
    const khoaValueRaw = khoaKey in map ? String(row[map[khoaKey]] || "").trim() : "";
    const khoaValues = splitKhoaPhongValues_(khoaValueRaw);


    const ownerEmail = "TaiKhoanDangKy" in map ? String(row[map["TaiKhoanDangKy"]] || "").trim().toLowerCase() : "";
    const isOwner = !!ownerEmail && ownerEmail === userEmail;
    const belongsToKhoa = khoaValues.some(function (k) { return allowedKhoa.indexOf(k) !== -1; });


    if (!admin && !belongsToKhoa && !isOwner) return;


    const thisId = "ID" in map ? String(row[map["ID"]] || "") : "";


    // Quy tac sua GIONG NHAU cho ca 3 vai tro: thuoc khoa/phong cua phieu HOAC chinh minh da nop,
    // VA loai dang ky do dang duoc mo. Admin xem duoc tat ca nhung cung chi sua duoc theo dung
    // cong thuc nay (khong co ngoai le rieng cho Admin). Rieng phieu DA duoc dat Trang thai o
    // Phan cong phe duyet thi KHOA sua vinh vien, du co du dieu kien tren.
    const canEdit = (belongsToKhoa || isOwner) && !!status[loai] && !lockedDangkyIds[thisId];


    const timeRaw = row[map["Time"]];
    const timeSort = timeRaw ? new Date(timeRaw).getTime() : 0;


    const fields = DANGKY_CONTACT_FIELDS.concat(DANGKY_FIELDS[loai]).map(function (field) {
      return {
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options || null,
        hint: field.hint || null,
        required: !!field.required,
        locked: DANGKY_LOCKED_FIELDS.indexOf(field.key) !== -1,
        value: field.key in map ? formatCellValue(row[map[field.key]]) : ""
      };
    });


    rows.push({
      id: "ID" in map ? String(row[map["ID"]] || "") : "",
      loai: loai,
      loaiLabel: DANGKY_LOAI_LABELS[loai] || loai,
      time: formatCellValue(timeRaw),
      khoaPhong: khoaValueRaw,
      canEdit: canEdit,
      fields: fields,
      _sort: timeSort
    });
  });


  rows.sort(function (a, b) { return a._sort - b._sort; }); // cu nhat truoc -> danh so "Phieu dang ky 1, 2, 3..."
  rows.forEach(function (r, i) {
    r.index = i + 1;
    delete r._sort;
  });


  return rows;
}


// ==========================================================
// SUA 1 PHIEU DANG KY DA NOP
// - Khong cho sua cot Khoa/phong (DANGKY_LOCKED_FIELDS), du la Admin hay chu phieu.
// - Quy tac sua GIONG NHAU cho CA 3 vai tro (Admin/TVHĐ/User): sua duoc khi va chi khi (thuoc
//   dung khoa/phong cua phieu HOAC chinh tai khoan da nop phieu do) VA loai dang ky do dang mo.
// - 1 o "Khoa/phong" co the chua NHIEU khoa/phong - LUON tach bang splitKhoaPhongValues_()
//   (Utils.gs) va kiem tra bang .some()/.indexOf(), khong so sanh === truc tiep ca chuoi.
// data = { <field key>: <gia tri moi>, ... }  (chi can gui cac truong muon sua)
// ==========================================================
function updateDangKy(token, id, data) {
  const user = requireUser(token);
  if (!id) return { success: false, message: "Thiếu ID phiếu cần sửa." };
  if (!data) return { success: false, message: "Không nhận được dữ liệu." };


  const sheet = getSheet(CONFIG.SHEET_DANGKY);
  const values = sheet.getDataRange().getValues();
  const map = headerIndexMap(values[0]);
  requireColumns(map, ["Time", "Madean"]);


  if (!("ID" in map)) return { success: false, message: "Sheet Dangky đang thiếu cột ID." };


  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][map["ID"]]) === String(id)) { rowIndex = i; break; }
  }
  if (rowIndex === -1) return { success: false, message: "Không tìm thấy phiếu đăng ký cần sửa." };


  const loai = "LoaiDangKy" in map ? String(values[rowIndex][map["LoaiDangKy"]] || "").trim() : "";
  if (!DANGKY_FIELDS[loai]) return { success: false, message: "Không xác định được loại đăng ký của phiếu này." };


  // Khi de an nay DA duoc dat Trang thai o Phan cong phe duyet (bat ky gia tri nao trong 3 gia
  // tri co dinh) -> khoa sua phieu Dang ky VINH VIEN qua man hinh nay, khong phan biet vai tro,
  // khong phan biet Trang thai sau nay co doi qua lai the nao nua.
  const phancongLockRow = findRowByColumnValue_(CONFIG.SHEET_PHANCONG, "DangkyID", id);
  if (phancongLockRow && "Trangthai" in phancongLockRow.map) {
    const trangThaiHienTai = String(phancongLockRow.row[phancongLockRow.map["Trangthai"]] || "").trim();
    if (trangThaiHienTai) {
      return { success: false, message: "Đề án/sáng kiến này đã được đưa vào đợt phê duyệt, không thể chỉnh sửa phiếu đăng ký nữa." };
    }
  }


  const status = getDangKyStatus(token);


  const khoaKey = dangKyKhoaPhongFieldKey_(loai);
  const khoaValueRaw = khoaKey in map ? String(values[rowIndex][map[khoaKey]] || "").trim() : "";
  const khoaValues = splitKhoaPhongValues_(khoaValueRaw);
  const allowedKhoa = user.khoaPhong || [];
  const belongsToKhoa = khoaValues.some(function (k) { return allowedKhoa.indexOf(k) !== -1; });

  const ownerEmail = "TaiKhoanDangKy" in map ? String(values[rowIndex][map["TaiKhoanDangKy"]] || "").trim().toLowerCase() : "";
  const isOwner = !!ownerEmail && ownerEmail === String(user.email || "").trim().toLowerCase();


  // Quy tac sua GIONG NHAU cho ca 3 vai tro: thuoc khoa/phong cua phieu HOAC chinh minh da nop,
  // VA loai dang ky do dang duoc mo.
  const canEdit = (belongsToKhoa || isOwner) && !!status[loai];
  if (!canEdit) {
    const reason = (!belongsToKhoa && !isOwner)
      ? "Bạn không có quyền chỉnh sửa phiếu đăng ký này."
      : "Loại đăng ký này hiện đang tạm ngừng nhận đăng ký nên không thể chỉnh sửa. Vui lòng liên hệ Admin.";
    return { success: false, message: reason };
  }


  const rowNumber = rowIndex + 1;
  const fileField = DANGKY_FIELDS[loai].find(function (f) { return f.type === "file"; });


  const allFields = DANGKY_CONTACT_FIELDS.concat(DANGKY_FIELDS[loai]);
  for (let i = 0; i < allFields.length; i++) {
    const field = allFields[i];
    if (DANGKY_LOCKED_FIELDS.indexOf(field.key) !== -1) continue; // Khoa/phong da khoa, chac chan da co gia tri tu luc nop
    if (field.type === "file") continue; // xu ly rieng, khong bat buoc
    if (!(field.key in data)) continue; // client khong gui truong nay len thi bo qua, giu nguyen gia tri cu
    const value = data[field.key];
    const hasValue = value !== undefined && value !== null && String(value).trim() !== "";


    if (field.required && !hasValue) {
      return { success: false, message: 'Vui lòng điền "' + field.label + '".' };
    }
    if (field.type === "month" && hasValue && !isValidMonthYear_(value)) {
      return { success: false, message: 'Vui lòng nhập "' + field.label + '" theo định dạng mm/yyyy.' };
    }
    if (field.type === "month_range" && hasValue && !isValidMonthYearRange_(value)) {
      return { success: false, message: 'Vui lòng nhập "' + field.label + '" theo định dạng mm/yyyy - mm/yyyy.' };
    }
  }


  DANGKY_CONTACT_FIELDS.concat(DANGKY_FIELDS[loai]).forEach(function (field) {
    if (DANGKY_LOCKED_FIELDS.indexOf(field.key) !== -1) return; // Khoa/phong: khong bao gio cho sua
    if (field.type === "file") return; // xu ly rieng ben duoi
    if (!(field.key in map)) return;
    if (!(field.key in data)) return; // chi ghi de nhung truong client thuc su gui len
    let value = data[field.key];
    if (Array.isArray(value)) value = value.join(", ");
    const strValue = String(value === undefined || value === null ? "" : value).trim();
    const range = sheet.getRange(rowNumber, map[field.key] + 1);
    // Cung ly do nhu luc nop moi: ep dinh dang van ban truoc de Sheet khong tu doi mm/yyyy thanh Ngay
    if (["month", "month_range", "currency"].indexOf(field.type) !== -1) range.setNumberFormat("@");
    range.setValue(strValue);
  });


  // File dinh kem: cho phep GIU LAI 1 phan file cu (keepFileUrls) + them file MOI (newFiles).
  // Bo 1 url khoi keepFileUrls chi go lien ket khoi phieu, KHONG xoa file that su tren Google Drive.
  if (fileField && fileField.key in map && (("keepFileUrls" in data) || ("newFiles" in data))) {
    const keepFileUrls = Array.isArray(data.keepFileUrls)
      ? data.keepFileUrls.map(function (u) { return String(u || "").trim(); }).filter(Boolean)
      : [];
    const newFiles = Array.isArray(data.newFiles) ? data.newFiles.slice(0, CONFIG.DANGKY_MAX_FILES) : [];


    if (keepFileUrls.length + newFiles.length > CONFIG.DANGKY_MAX_FILES) {
      return { success: false, message: "Chỉ được tối đa " + CONFIG.DANGKY_MAX_FILES + " file đính kèm." };
    }


    const invalidFile = newFiles.find(function (f) { return f && !isPdfFile_(f); });
    if (invalidFile) {
      return { success: false, message: "File đính kèm phải ở định dạng PDF (.pdf)." };
    }


    const newUploadedUrls = [];
    if (newFiles.length > 0) {
      try {
        const folder = DriveApp.getFolderById(CONFIG.DANGKY_DRIVE_FOLDER_ID);
        newFiles.forEach(function (f) {
          if (!f || !f.data) return;
          const bytes = Utilities.base64Decode(f.data);
          const blob = Utilities.newBlob(bytes, "application/pdf", f.name || "Dinh_kem.pdf");
          const file = folder.createFile(blob);
          newUploadedUrls.push(file.getUrl());
        });
      } catch (error) {
        return { success: false, message: "Không thể tải file đính kèm lên Drive: " + error.message };
      }
    }


    const finalFileUrls = keepFileUrls.concat(newUploadedUrls);
    sheet.getRange(rowNumber, map[fileField.key] + 1).setValue(finalFileUrls.join(", "));
  }


  invalidateSheetCache(CONFIG.SHEET_DANGKY);


  let syncMessage = "";
  try {
    syncEngineRebuildAndPropagate_(id);
  } catch (e) {
    syncMessage = " (Lưu ý: đã lưu chỉnh sửa nhưng CHƯA đồng bộ được sang các Sheet liên quan - " + e.message + ")";
  }


  return { success: true, message: "Đã lưu chỉnh sửa phiếu đăng ký." + syncMessage };
}

/**
 * XOA HAN 1 phieu Dang ky, VINH VIEN, TRIET DE - xoa dong tuong ung o TAT CA cac Sheet lien
 * quan: Dangky (chinh no), DS_Deansangkien, DS_Phancong, Phe_duyet_lan1, Phe_duyet_lan2,
 * DS_noplan2, File_chot, BC_nghiemthu, Nghiem_thu, Tiendo, DS_chisodean.
 * KHONG luu lai lich su xoa o dau ca. Chi Admin duoc phep. Khong the hoan tac.
 */
function deleteDangKyPhieu(token, id) {
  const user = requireUser(token);
  if (!isAdmin(user)) {
    return { success: false, message: "Chỉ Admin mới có quyền xóa phiếu đăng ký." };
  }
  const dangkyId = String(id || "").trim();
  if (!dangkyId) return { success: false, message: "Thiếu ID phiếu đăng ký." };

  // Tim DeansangkienID (neu co) de xoa dung dong DS_chisodean tuong ung
  let deansangkienId = "";
  try {
    const deanRow = findRowByColumnValue_(CONFIG.SHEET_DEAN, "DangkyID", dangkyId);
    if (deanRow && ("ID" in deanRow.map)) deansangkienId = String(deanRow.row[deanRow.map["ID"]] || "").trim();
  } catch (e) {
    // bo qua, khong lam gian doan viec xoa chinh
  }

  // Xoa cascade o cac Sheet phu (dung lai dung ham cua co che "Đã loại")
  try { xoaDeAnDaLoaiKhoiCacSheetPhu_(dangkyId, deansangkienId); } catch (e) { /* bo qua */ }

  // Xoa dong DS_Deansangkien
  try { deleteRowsByColumnValue_(CONFIG.SHEET_DEAN, "DangkyID", dangkyId); } catch (e) { /* bo qua */ }

  // Xoa chinh dong Dangky (khoa la "ID", khac voi cac Sheet phu dung "DangkyID")
  const deletedCount = deleteRowsByColumnValue_(CONFIG.SHEET_DANGKY, "ID", dangkyId);
  if (deletedCount === 0) {
    return { success: false, message: "Không tìm thấy phiếu đăng ký để xóa (có thể đã bị xóa trước đó)." };
  }

  return { success: true, message: "Đã xóa phiếu đăng ký." };
}
