// ==========================================================
// PHAM VI DUNG CHO MAN HINH "CAP NHAT TIEN DO"
// (User/TVHĐ chi thay khoa/phong cua minh, Admin thay tat ca)
// ==========================================================


// Danh sach khoa/phong ma user duoc phep xem (Admin: xem het)
// 1 o "Khoaphong" co the chua NHIEU khoa/phong (cach nhau boi dau phay) - tach ra tung khoa/phong
// rieng le bang splitKhoaPhongValues_ (Utils.gs) truoc khi loc quyen, KHONG so sanh === ca chuoi.
function getAllowedKhoaPhong(token) {
  const user = requireUser(token);


  const data = getSheetData(CONFIG.SHEET_DEAN);
  if (data.length < 2) return [];


  const map = headerIndexMap(data[0]);
  requireColumns(map, ["Khoaphong"]);


  const admin = isAdmin(user);
  const allowed = user.khoaPhong || [];
  const set = {};


  data.slice(1).forEach(function (row) {
    splitKhoaPhongValues_(row[map["Khoaphong"]]).forEach(function (khoa) {
      if (admin || allowed.indexOf(khoa) !== -1) {
        set[khoa.toLowerCase()] = khoa;
      }
    });
  });


  return Object.values(set).sort(function (a, b) {
    return a.localeCompare(b, "vi", { sensitivity: "base" });
  });
}


// Danh sach de an/sang kien cua 1 khoa/phong (ma + ten)
function getDeAnListByKhoa(token, khoaPhong) {
  const user = requireUser(token);
  khoaPhong = String(khoaPhong || "").trim();
  if (!khoaPhong) return [];


  if (!isAdmin(user) && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
    throw new Error("Bạn không có quyền truy cập khoa/phòng này.");
  }


  return listDeAnRowsByKhoa(khoaPhong);
}


// ==========================================================
// PHAM VI DUNG CHO MAN HINH "TRA CUU"
// (Admin va TVHĐ: xem duoc TAT CA khoa/phong. User: chi khoa/phong cua minh)
// ==========================================================


function getAllowedKhoaPhongForSearch(token) {
  const user = requireUser(token);


  const data = getSheetData(CONFIG.SHEET_DEAN);
  if (data.length < 2) return [];


  const map = headerIndexMap(data[0]);
  requireColumns(map, ["Khoaphong"]);


  const fullAccess = isAdminOrTVHD(user);
  const allowed = user.khoaPhong || [];
  const set = {};


  data.slice(1).forEach(function (row) {
    splitKhoaPhongValues_(row[map["Khoaphong"]]).forEach(function (khoa) {
      if (fullAccess || allowed.indexOf(khoa) !== -1) {
        set[khoa.toLowerCase()] = khoa;
      }
    });
  });


  return Object.values(set).sort(function (a, b) {
    return a.localeCompare(b, "vi", { sensitivity: "base" });
  });
}


function getDeAnListByKhoaForSearch(token, khoaPhong) {
  const user = requireUser(token);
  khoaPhong = String(khoaPhong || "").trim();
  if (!khoaPhong) return [];


  if (!isAdminOrTVHD(user) && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
    throw new Error("Bạn không có quyền truy cập khoa/phòng này.");
  }


  return listDeAnRowsByKhoa(khoaPhong);
}


// Ham dung chung: lay danh sach de an/sang kien theo khoa/phong (khong kiem tra quyen)
// khoaPhong dau vao la 1 khoa/phong DUY NHAT (nguoi dung da chon tu dropdown), nhung o
// "Khoaphong" cua tung dong co the dang chua NHIEU khoa/phong -> phai tach ra roi kiem tra .indexOf().
function listDeAnRowsByKhoa(khoaPhong) {
  const data = getSheetData(CONFIG.SHEET_DEAN);
  if (data.length < 2) return [];


  const map = headerIndexMap(data[0]);
  requireColumns(map, ["Madean_sangkien", "Khoaphong", "Tendean"]);


  const result = data
    .slice(1)
    .filter(function (row) {
      return splitKhoaPhongValues_(row[map["Khoaphong"]]).indexOf(khoaPhong) !== -1;
    })
    .map(function (row) {
      return {
        madean: String(row[map["Madean_sangkien"]]).trim(),
        tendean: String(row[map["Tendean"]]).trim(),
        dangkyId: "DangkyID" in map ? String(row[map["DangkyID"]] || "").trim() : ""
      };
    });


  result.sort(function (a, b) {
    return a.tendean.localeCompare(b.tendean, "vi", { sensitivity: "base" });
  });


  return result;
}


// Chi tiet 1 de an/sang kien (tat ca cac cot trong DS_Deansangkien)
// - Ten cot tra ve da duoc doi sang nhan tieng Viet than thien (xem Config.gs -> DEAN_COLUMN_LABELS)
// - User VA TVHĐ khong duoc thay gia tri that cua Nguoi_cham_1 / Nguoi_cham_2 -> tra ve "---"
// - Admin va TVHĐ duoc xem de an/sang kien cua TAT CA khoa/phong; User chi xem khoa/phong cua minh
// - Cot "Chi_so" duoc thay bang gia tri suy ra tu Sheet DS_chisodean (xem buildChiSoFieldForDeAn_)
// - khoaPhong dau vao la 1 khoa/phong DUY NHAT (client chon tu dropdown Tra cuu); dong trong Sheet
//   co the co NHIEU khoa/phong trong 1 o -> khop bang splitKhoaPhongValues_().indexOf(), khong ===.
function getDeAnDetail(token, khoaPhong, tenDeAn) {
  const user = requireUser(token);


  khoaPhong = String(khoaPhong || "").trim();
  tenDeAn = String(tenDeAn || "").trim();


  if (!khoaPhong || !tenDeAn) return null;


  const data = getSheetData(CONFIG.SHEET_DEAN);
  if (data.length < 2) return null;


  const headers = data[0];
  const map = headerIndexMap(headers);


  requireColumns(map, ["Khoaphong", "Tendean"]);


  const row = data.slice(1).find(function (r) {
    const rowTenDeAn = String(r[map["Tendean"]] || "").trim();
    return rowTenDeAn === tenDeAn &&
           splitKhoaPhongValues_(r[map["Khoaphong"]]).indexOf(khoaPhong) !== -1;
  });


  if (!row) return null;


  const admin = isAdmin(user);
  const fullAccess = isAdminOrTVHD(user);
  const tvhd = isTVHD(user);
  const hoTen = String(user.hoTen || "").trim();


  if (!fullAccess && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
    throw new Error("Bạn không có quyền xem đề án/sáng kiến này.");
  }


  // Cot "Nguoi cham 1" / "Nguoi cham 2": ap dung rieng cho tung nguoi xem (KHONG dung chung 1
  // quy tac cho ca man hinh nhu truoc):
  // - Admin: luon thay ten that o CA 2 cot.
  // - TVHĐ: CHI thay ten that o dung cot nao trung voi ten CHINH MINH (vd Nguyen Van A dang la
  //   "Nguoi cham 1" cua de an nay thi cot "Nguoi cham 1" hien "Nguyen Van A", con "Nguoi cham 2"
  //   van hien "---"; neu de an do khong phan cong A o ca 2 cot thi ca 2 cot deu hien "---").
  // - User: luon thay "---" o ca 2 cot.
  const HIDDEN_FOR_USER = ["Nguoi_cham_1", "Nguoi_cham_2"];


  const maDeAn = "Madean_sangkien" in map ? String(row[map["Madean_sangkien"]] || "").trim() : "";


  // Danh sach chi so do luong ung voi de an nay (dung cho cot Chi_so va cho popup "Xem chi tiet")
  const chiSoRows = listChiSoForDeAn(khoaPhong, tenDeAn, maDeAn);


  // Chi Admin moi duoc sua -> chi Admin moi can biet cot nao co dropdown (Data Validation) tren Sheet
  // de hien thanh <select> giong het danh sach that trong Google Sheet, tranh phai doc Sheet cho moi luot Tra cuu thuong.
  let sheetForValidation = null;
  let sheetRowNumber = -1;
  if (admin) {
    const matchedIndex = data.findIndex(function (r, i) {
      if (i === 0) return false;
      return String(r[map["Tendean"]] || "").trim() === tenDeAn &&
             splitKhoaPhongValues_(r[map["Khoaphong"]]).indexOf(khoaPhong) !== -1;
    });
    if (matchedIndex !== -1) {
      sheetForValidation = getSheet(CONFIG.SHEET_DEAN);
      sheetRowNumber = matchedIndex + 1; // data[0] la header ~ Sheet hang 1
    }
  }


  const dangkyId = "DangkyID" in map ? String(row[map["DangkyID"]] || "").trim() : "";
  const pendingChunhiem = dangkyId ? demYeuCauSuaChoDuyet_(dangkyId, YEUCAUSUA_LOAI.CHUNHIEM) : 0;
  const pendingThanhvien = dangkyId ? demYeuCauSuaChoDuyet_(dangkyId, YEUCAUSUA_LOAI.THANHVIEN) : 0;

  const fields = headers
    .map(function (header, index) { return { header: header, index: index }; })
    .filter(function (h) { return DEAN_HIDDEN_COLUMNS.indexOf(String(h.header).trim()) === -1; })
    .map(function (h) {
    const header = h.header;
    const index = h.index;
    const headerName = String(header).trim();
    let value;


    if (headerName === "Chi_so") {
      // Cot nay khong lay truc tiep tu o trong DS_Deansangkien nua, ma suy ra tu DS_chisodean
      const hasChiSo = chiSoRows.some(function (r) { return r.chiso !== ""; });
      const result = {
        header: getDeanColumnLabel(headerName),
        rawHeader: headerName,
        isFile: false,
        isChiSoLink: hasChiSo,
        value: hasChiSo ? "Xem chi tiết" : "Không có chỉ số đo lường"
      };
      if (hasChiSo) {
        result.chiSoList = chiSoRows
          .filter(function (r) { return r.chiso !== ""; })
          .map(function (r) {
            return {
              rowNumber: r.rowNumber, chiso: r.chiso, nguongdat: r.nguongdat,
              pendingChiSo: demYeuCauSuaChoDuyetChiSo_(r.rowNumber),
              pendingNguongdat: demYeuCauSuaChoDuyetChiSo_(r.rowNumber)
            };
          });
      }
      return result;
    }


    if (HIDDEN_FOR_USER.indexOf(headerName) !== -1) {
      const rawCellValue = String(row[index] || "").trim();
      if (admin) {
        value = formatCellValue(row[index]);
      } else if (tvhd && rawCellValue && rawCellValue === hoTen) {
        value = formatCellValue(row[index]);
      } else {
        value = "---";
      }
    } else if (DEAN_DATE_ONLY_COLUMNS.indexOf(headerName) !== -1) {
      value = formatCellValueDateOnly(row[index]);
    } else {
      value = formatCellValue(row[index]);
    }


    const result = {
      header: getDeanColumnLabel(headerName),
      rawHeader: headerName,
      isFile: DEAN_FILE_COLUMNS.indexOf(headerName) !== -1,
      value: value
    };


    if (headerName === "Chunhiem") result.pendingCount = pendingChunhiem;
    if (headerName === "Thanhvien") result.pendingCount = pendingThanhvien;


    if (sheetForValidation) {
      const options = getColumnDropdownOptions(sheetForValidation, sheetRowNumber, index + 1);
      if (options && options.length > 0) {
        result.options = options;
      }
    }


    return result;
  });

  return {
    fields: fields,
    isAdmin: admin,
    dangkyId: dangkyId,
    // User/TVHĐ CHI duoc gui yeu cau (khong sua truc tiep) cho DUY NHAT Chunhiem/Thanhvien -
    // client dung co nay de quyet dinh hien o nhap hay khong khi o che do Sua.
    editableFieldsForNonAdmin: ["Chunhiem", "Thanhvien"]
  };
}


/**
 * Neu o (rowNumber, colNumber) tren Sheet dang co Data Validation dang "Danh sach thả xuống"
 * (nhap tay danh sach HOAC lay tu 1 vung du lieu khac), tra ve mang cac gia tri de client
 * render thanh <select> giong het dropdown that trong Google Sheet.
 * Tra ve null neu o do khong co dropdown (se hien o nhap van ban binh thuong).
 */
function getColumnDropdownOptions(sheet, rowNumber, colNumber) {
  try {
    const validation = sheet.getRange(rowNumber, colNumber).getDataValidation();
    if (!validation) return null;


    const criteriaType = validation.getCriteriaType();
    const criteriaValues = validation.getCriteriaValues();


    if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
      // Dropdown nhap tay 1 danh sach gia tri ngay trong quy tac Data Validation
      return criteriaValues[0];
    }


    if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
      // Dropdown lay danh sach tu 1 vung o khac tren Sheet
      const range = criteriaValues[0];
      const flat = [];
      range.getValues().forEach(function (r) {
        r.forEach(function (v) {
          const s = String(v || "").trim();
          if (s) flat.push(s);
        });
      });
      return flat;
    }


    return null;
  } catch (e) {
    return null;
  }
}


/**
 * ADMIN: chinh sua truc tiep 1 dong trong Sheet DS_Deansangkien tu man hinh Tra cuu.
 * Xac dinh dong can sua bang (Khoaphong, Tendean) - khong sua duoc 2 cot nay va Madean_sangkien
 * de tranh lam sai lech du lieu dang dung de tra cuu / lien ket voi Sheet Tiendo.
 * khoaPhong dau vao la 1 khoa/phong DUY NHAT (client chon tu dropdown); dong tren Sheet co the
 * dang chua NHIEU khoa/phong trong 1 o -> khop bang splitKhoaPhongValues_().indexOf(), khong ===.
 * updates = { "TenCotThat1": "Gia tri moi", "TenCotThat2": "Gia tri moi", ... }
 * Sua xong: du lieu tren Google Sheet thay doi ngay, va lan tra cuu tiep theo se thay gia tri moi
 * (Tra cuu luon doc truc tiep/qua cache ngan han tu chinh Sheet nay, nen 2 chieu Sheet <-> App luon dong bo).
 */
function updateDeAnDetail(token, khoaPhong, tenDeAn, updates) {
  const user = requireUser(token);
  const admin = isAdmin(user);


  khoaPhong = String(khoaPhong || "").trim();
  tenDeAn = String(tenDeAn || "").trim();
  if (!khoaPhong || !tenDeAn) return { success: false, message: "Thiếu thông tin đề án/sáng kiến." };
  if (!updates) return { success: false, message: "Không nhận được dữ liệu." };


  const sheet = getSheet(CONFIG.SHEET_DEAN);
  const values = sheet.getDataRange().getValues();
  const map = headerIndexMap(values[0]);
  requireColumns(map, ["Khoaphong", "Tendean"]);


  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][map["Tendean"]]).trim() === tenDeAn &&
        splitKhoaPhongValues_(values[i][map["Khoaphong"]]).indexOf(khoaPhong) !== -1) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex === -1) return { success: false, message: "Không tìm thấy đề án/sáng kiến cần sửa." };


  const rowNumber = rowIndex + 1;


  // ---- User/TVHĐ: KHONG sua truc tiep, chi duoc gui Yeu cau chinh sua cho DUY NHAT
  // Chunhiem/Thanhvien (2 truong nay). Cac truong khac neu lo gui len se bi BO QUA (khong ap dung,
  // khong bao loi rieng - client vốn da an het cac o khong duoc phep sua).
  if (!admin) {
    if (!isAdminOrTVHD(user) && (user.khoaPhong || []).indexOf(khoaPhong) === -1) {
      return { success: false, message: "Bạn không có quyền gửi yêu cầu chỉnh sửa cho đề án/sáng kiến này." };
    }
    const dangkyId = "DangkyID" in map ? String(values[rowIndex][map["DangkyID"]] || "").trim() : "";
    if (!dangkyId) return { success: false, message: "Đề án/sáng kiến này chưa được đồng bộ đầy đủ (thiếu DangkyID), chưa thể gửi yêu cầu." };

    const allowed = [YEUCAUSUA_LOAI.CHUNHIEM, YEUCAUSUA_LOAI.THANHVIEN];
    let sentCount = 0;
    allowed.forEach(function (colName) {
      if (!(colName in updates)) return;
      const newValue = String(updates[colName] === undefined || updates[colName] === null ? "" : updates[colName]).trim();
      const currentValue = (colName in map) ? String(values[rowIndex][map[colName]] || "").trim() : "";
      if (newValue === currentValue) return; // khong doi gi thi khong tao yeu cau
      const result = submitYeuCauSua(token, { dangkyId: dangkyId, loai: colName, truongMoi: newValue });
      if (result.success) sentCount++;
    });

    if (sentCount === 0) {
      return { success: false, message: "Không có nội dung nào thay đổi để gửi yêu cầu." };
    }
    return { success: true, message: "Đã gửi " + sentCount + " yêu cầu chỉnh sửa, chờ Admin duyệt." };
  }


  // ---- Admin: sua truc tiep, ap dung NGAY (giu nguyen hanh vi cu) ----
  const LOCKED_COLUMNS = ["Madean_sangkien", "Khoaphong", "Tendean"]
    .concat(DEAN_COMPUTED_COLUMNS)
    .concat(DEAN_LINK_ONLY_COLUMNS);


  Object.keys(updates).forEach(function (headerName) {
    if (LOCKED_COLUMNS.indexOf(headerName) !== -1) return; // khong cho sua cot dinh danh / cot co cong thuc / cot chi hien link
    if (!(headerName in map)) return; // bo qua cot khong ton tai tren Sheet
    const newValue = String(updates[headerName] === undefined || updates[headerName] === null ? "" : updates[headerName]).trim();
    sheet.getRange(rowNumber, map[headerName] + 1).setValue(newValue);
  });


  invalidateSheetCache(CONFIG.SHEET_DEAN);


  // Neu ban sua nay co doi "Trang_thai" thanh "Đã loại", xoa han du lieu lien quan o cac Sheet
  // phu (giong het khi sua truc tiep tren Sheet - xem onEdit trong Utils.gs)
  if ("Trang_thai" in updates && String(updates["Trang_thai"] || "").trim() === "Đã loại") {
    const dangkyId = "DangkyID" in map ? String(values[rowIndex][map["DangkyID"]] || "").trim() : "";
    const deansangkienId = "ID" in map ? String(values[rowIndex][map["ID"]] || "").trim() : "";
    if (dangkyId) {
      try { xoaDeAnDaLoaiKhoiCacSheetPhu_(dangkyId, deansangkienId); } catch (e) { /* khong lam gian doan viec luu chinh */ }
    }
  }


  return { success: true, message: "Đã lưu thông tin đề án/sáng kiến." };
}


// ==========================================================
// CHI SO DO LUONG CUA DE AN CAI TIEN (Sheet DS_chisodean)
// Chi de an co ma bat dau bang "ĐA" moi co chi so do luong; sang kien (ma "SK") thuong se
// khong co dong nao trong Sheet nay, ham listChiSoForDeAn() se tra ve mang rong cho truong hop do.
// ==========================================================


/**
 * Chuan hoa 1 gia tri de so sanh: ep ve chuoi, trim khoang trang, va normalize("NFC")
 * de tranh truong hop 2 Sheet khac nhau luu cung 1 chu tieng Viet nhung o 2 dang Unicode
 * khac nhau (dung/ghep dau khac nhau) khien so sanh === bi sai lech dù nhin y het nhau.
 */
function normalizeMatchText_(value) {
  const s = String(value === null || value === undefined ? "" : value).trim();
  return typeof s.normalize === "function" ? s.normalize("NFC") : s;
}


/**
 * Lay danh sach dong chi so do luong ung voi 1 de an. Thu tu do (LUON theo dung thu tu nay,
 * chi thu hep sang buoc sau khi buoc truoc con "trung" - tuc khop nhieu hon 1 de an khac nhau):
 * 1) Ma de an (Madean_sangkien) - day la khoa CHINH.
 * 2) Neu tap ket qua o buoc 1 dang gom nhieu de an KHAC NHAU (vd du lieu ma bi trung do nhap sai)
 *    -> thu hep tiep theo Khoa/phong.
 * 3) Neu van con gom nhieu de an khac nhau (cung Khoa/phong nhung khac Ten) -> thu hep tiep theo Ten de an.
 * Neu Ma de an KHONG khop dong nao ca (va Ma de an cua de an dang xem khong rong) -> tra ve MANG RONG
 * (khong tu dong quay ve khop theo Khoa/phong + Ten de an), de tranh gop nham chi so cua de an khac
 * chi vi trung ten/khoa nhung khac ma.
 * LUU Y: cot "Khoaphong" trong CHINH Sheet DS_chisodean nay la sheet rieng, doc lap, khong lien
 * quan truc tiep den viec Dangky/DS_Deansangkien cho phep nhieu khoa/phong trong 1 o - buoc thu hep
 * (2) o day chi la 1 heuristic phu, hau nhu khong bao gio can dung toi vi Ma de an da du de khop dung.
 * Tra ve mang [{ rowNumber, madean, khoaphong, tendean, chiso, nguongdat, tylehoanthanh,
 *                minhchung, lydokhongdat, ghichu }, ...]
 */
function listChiSoForDeAn(khoaPhong, tenDeAn, maDeAn) {
  khoaPhong = normalizeMatchText_(khoaPhong);
  tenDeAn = normalizeMatchText_(tenDeAn);
  maDeAn = normalizeMatchText_(maDeAn);


  const data = getSheetData(CONFIG.SHEET_CHISO);
  if (data.length < 2) return [];


  const map = headerIndexMap(data[0]);
  const required = ["Madean_sangkien", "Khoaphong", "Tendean", "Chi_so"];
  const missing = required.filter(function (n) { return !(n in map); });
  if (missing.length > 0) return []; // Sheet chua co day du cot can thiet -> coi nhu chua co du lieu


  const rows = data.slice(1).map(function (row, i) {
    return {
      rowNumber: i + 2,
      madean: normalizeMatchText_(row[map["Madean_sangkien"]]),
      khoaphong: normalizeMatchText_(row[map["Khoaphong"]]),
      tendean: normalizeMatchText_(row[map["Tendean"]]),
      chiso: normalizeMatchText_(row[map["Chi_so"]]),
      nguongdat: "Nguongdat" in map ? normalizeMatchText_(row[map["Nguongdat"]]) : "",
      tylehoanthanh: "Tylehoanthanh" in map ? normalizeMatchText_(row[map["Tylehoanthanh"]]) : "",
      minhchung: "Minhchung" in map ? normalizeMatchText_(row[map["Minhchung"]]) : "",
      lydokhongdat: "Ly_do_khongdat" in map ? normalizeMatchText_(row[map["Ly_do_khongdat"]]) : "",
      ghichu: "Ghichu" in map ? normalizeMatchText_(row[map["Ghichu"]]) : ""
    };
  });


  let candidates;
  if (maDeAn) {
    candidates = rows.filter(function (r) { return r.madean === maDeAn; });
    if (candidates.length === 0) return []; // Ma de an khong khop dong nao -> khong co chi so, KHONG fallback
  } else {
    // De an chua co ma (truong hop hiem) -> bat dau tu toan bo, roi thu hep dan theo Khoa/phong + Ten de an
    candidates = rows;
  }


  // Thu hep buoc 2 (Khoa/phong) - chi ap dung neu tap hien tai con lan nhieu de an KHAC nhau
  const distinctStep2 = new Set(candidates.map(function (r) { return r.khoaphong + "\u0001" + r.tendean; }));
  if (distinctStep2.size > 1 && khoaPhong) {
    const narrowed = candidates.filter(function (r) { return r.khoaphong === khoaPhong; });
    if (narrowed.length > 0) candidates = narrowed;
  }


  // Thu hep buoc 3 (Ten de an) - chi ap dung neu van con lan nhieu de an khac nhau (cung khoa, khac ten)
  const distinctStep3 = new Set(candidates.map(function (r) { return r.tendean; }));
  if (distinctStep3.size > 1 && tenDeAn) {
    const narrowed = candidates.filter(function (r) { return r.tendean === tenDeAn; });
    if (narrowed.length > 0) candidates = narrowed;
  }


  return candidates;
}


/**
 * Sau khi nguoi dung cap nhat "Ket qua do luong hien tai" o man hinh Cap nhat tien do (Progress.gs),
 * ghi lai gia tri do vao cot Tylehoanthanh cua DONG TUONG UNG trong Sheet DS_chisodean
 * (khop theo de an + dung ten chi so). Khong lam gi neu khong tim thay dong khop.
 */
function updateTyLeHoanThanhInChiSoSheet_(khoaPhong, tenDeAn, maDeAn, tenChiSo, tyLeHienTai) {
  tenChiSo = normalizeMatchText_(tenChiSo);
  if (!tenChiSo) return;


  const sheet = getSheet(CONFIG.SHEET_CHISO);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;


  const map = headerIndexMap(values[0]);
  if (!("Chi_so" in map) || !("Tylehoanthanh" in map)) return;


  const rows = listChiSoForDeAn(khoaPhong, tenDeAn, maDeAn);
  const matched = rows.find(function (r) { return r.chiso === tenChiSo; });
  if (!matched) return;


  sheet.getRange(matched.rowNumber, map["Tylehoanthanh"] + 1).setValue(String(tyLeHienTai || "").trim());
  invalidateSheetCache(CONFIG.SHEET_CHISO);
}


/**
 * ADMIN: sua truc tiep cot Chi_so va Nguongdat trong Sheet DS_chisodean, goi tu popup
 * "Xem chi tiết" o man hinh Tra cuu (nut "Chỉnh sửa").
 * updates = [ { rowNumber, chiso, nguongdat }, ... ]  (rowNumber lay tu getDeAnDetail -> chiSoList)
 */
function updateChiSoRows(token, updates) {
  const user = requireUser(token);
  if (!isAdmin(user)) {
    return { success: false, message: "Chỉ Admin mới có quyền chỉnh sửa chỉ số." };
  }
  if (!Array.isArray(updates) || updates.length === 0) {
    return { success: false, message: "Không có dữ liệu." };
  }


  const sheet = getSheet(CONFIG.SHEET_CHISO);
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = headerIndexMap(headerRow);


  if (!("Chi_so" in map) || !("Nguongdat" in map)) {
    return { success: false, message: "Sheet DS_chisodean đang thiếu cột Chi_so hoặc Nguongdat." };
  }


  const lastRow = sheet.getLastRow();


  updates.forEach(function (u) {
    const rowNumber = parseInt(u && u.rowNumber, 10);
    if (!rowNumber || rowNumber < 2 || rowNumber > lastRow) return;
    sheet.getRange(rowNumber, map["Chi_so"] + 1).setValue(String((u && u.chiso) || "").trim());
    sheet.getRange(rowNumber, map["Nguongdat"] + 1).setValue(String((u && u.nguongdat) || "").trim());
  });


  invalidateSheetCache(CONFIG.SHEET_CHISO);
  return { success: true, message: "Đã lưu thay đổi chỉ số." };
}
