// ==========================================================
// BO MAY DONG BO DU LIEU TRUNG TAM (SyncEngine.gs)
// Chuoi lien ket: Dangky -> DS_Phancong -> Phe_duyet_lan1 -> DS_noplan2 -> Phe_duyet_lan2 -> Tiendo
// (Nghiem_thu, Bao cao: chua xay dung, chua co trong chuoi dong bo nay)
//
// DS_Deansangkien la "trung tam" rieng cho Madean/Tendean: BAT KY Sheet nao thay doi 2 truong
// nay deu gom ve DS_Deansangkien (lay theo lan doi MOI NHAT), roi tu do DS_Deansangkien lan tiep
// ra CAC SHEET PHIA SAU - TRU Dangky (nguon goc, khong bao gio ghi nguoc), Phe_duyet_lan1 (dong
// bang vinh vien tu luc nop), va cot "Tendean" RIENG cua DS_noplan2 (giu nguyen ten luc gui lai,
// khong doi theo - chi cot "Madean" cua DS_noplan2 moi duoc cap nhat).
//
// KHOA DUNG DE DOI CHIEU GIUA CAC SHEET: cot "DangkyID" (= dung "ID" cua dong Dangky goc), THAY
// vi Khoaphong/Tendean/Madean nhu truoc day - vi 3 truong nay co the thay doi theo thoi gian.
//
// YEU CAU CAU TRUC SHEET (PHAI TU TAY THEM COT TRUOC KHI CHAY, dat o 2 cot dau tien):
//   DS_Deansangkien : them "ID", "DangkyID"
//   DS_Phancong     : them "ID", "DangkyID"
//   Phe_duyet_lan1  : da co "ID", them "DangkyID"
//   Phe_duyet_lan2  : da co "ID", them "DangkyID"
//   DS_noplan2      : them "ID", "DangkyID"
//   Tiendo          : da co "ID", them "DangkyID"
//   DS_chisodean    : them "ID", "DeansangkienID" (KHONG dung DangkyID - xem ghi chu cuoi file)
// ==========================================================

// -------- HAM DUNG CHUNG: tim 1 dong trong Sheet theo gia tri 1 cot --------
function findRowByColumnValue_(sheetName, colName, value) {
  if (!value) return null;
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  const map = headerIndexMap(data[0]);
  if (!(colName in map)) return null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][map[colName]] || "").trim() === String(value).trim()) {
      return { sheet: sheet, rowNumber: i + 1, map: map, row: data[i] };
    }
  }
  return null;
}

// Tim TAT CA cac dong khop (dung cho Phe_duyet_lan1/lan2 - moi de an toi da 2 dong / 2 nguoi cham)
function findAllRowsByColumnValue_(sheetName, colName, value) {
  if (!value) return [];
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const map = headerIndexMap(data[0]);
  if (!(colName in map)) return [];

  const results = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][map[colName]] || "").trim() === String(value).trim()) {
      results.push({ sheet: sheet, rowNumber: i + 1, map: map, row: data[i] });
    }
  }
  return results;
}

// Cat phan "mm/yyyy" DAU TIEN trong chuoi dang "mm/yyyy - mm/yyyy" (dung cho DA_TgianTrienKhai)
function extractFirstMonthYear_(rangeStr) {
  const s = String(rangeStr || "").trim();
  const match = s.match(/^(\d{2}\/\d{4})/);
  return match ? match[1] : s;
}

/**
 * HAM TRUNG TAM: goi ham nay sau MOI thao tac ghi du lieu co lien quan toi 1 de an cu the
 * (nop/sua phieu Dangky, phan cong nguoi cham, nop phieu phe duyet lan 1/2, gui lai sau phe
 * duyet). Se tu dong:
 * 1) Tinh lai TOAN BO cac truong cua DS_Deansangkien cho dung de an do (xac dinh boi dangkyId).
 * 2) Lan truyen Madean + Tendean MOI NHAT xuong DS_Phancong, DS_noplan2 (chi Madean),
 *    Phe_duyet_lan2, Tiendo.
 */
function syncEngineRebuildAndPropagate_(dangkyId) {
  if (!dangkyId) return;

  const dangkyRow = findRowByColumnValue_(CONFIG.SHEET_DANGKY, "ID", dangkyId);
  if (!dangkyRow) return; // khong tim thay phieu goc - khong co gi de dong bo

  const dkMap = dangkyRow.map;
  const row = dangkyRow.row;
  const loai = "LoaiDangKy" in dkMap ? String(row[dkMap["LoaiDangKy"]] || "").trim() : "";
  if (!DANGKY_FIELDS[loai]) return;

  const khoaKey = dangKyKhoaPhongFieldKey_(loai);
  const tenKey = dangKyTenDeAnFieldKey_(loai);
  const fileKey = dangKyFileFieldKey_(loai);

  const khoaphong = khoaKey && (khoaKey in dkMap) ? String(row[dkMap[khoaKey]] || "").trim() : "";
  let tendean = tenKey && (tenKey in dkMap) ? String(row[dkMap[tenKey]] || "").trim() : "";
  const fileDau = fileKey && (fileKey in dkMap) ? String(row[dkMap[fileKey]] || "").trim() : "";
  const madean = "Madean" in dkMap ? String(row[dkMap["Madean"]] || "").trim() : "";

  let chunhiem = "", thanhvien = "", thoigianBatdau = "", thoigianKetthuc = "";
  if (loai === "DA_MOI") {
    chunhiem = String(row[dkMap["DA_TruongDeAn"]] || "").trim();
    thanhvien = [row[dkMap["DA_ThuKy"]], row[dkMap["DA_ThanhVien"]]].filter(function (v) { return v; }).join(", ");
    thoigianBatdau = "DA_TgianTrienKhai" in dkMap ? extractFirstMonthYear_(row[dkMap["DA_TgianTrienKhai"]]) : "";
    thoigianKetthuc = "DA_TgianHoanThanhBaoCao" in dkMap ? String(row[dkMap["DA_TgianHoanThanhBaoCao"]] || "").trim() : "";
  } else if (loai === "DA_CU") {
    chunhiem = "DACu_TruongDeAn" in dkMap ? String(row[dkMap["DACu_TruongDeAn"]] || "").trim() : "";
    thoigianKetthuc = "DACu_TgianDuKienHoanThanh" in dkMap ? String(row[dkMap["DACu_TgianDuKienHoanThanh"]] || "").trim() : "";
    // De an cu khong co truong "thoi gian bat dau" rieng trong form dang ky -> de trong
  } else if (loai === "SK") {
    chunhiem = "SK_TruongNhom" in dkMap ? String(row[dkMap["SK_TruongNhom"]] || "").trim() : "";
    thanhvien = [row[dkMap["SK_ThuKy"]], row[dkMap["SK_ThanhVien"]]].filter(function (v) { return v; }).join(", ");
    thoigianBatdau = "SK_TgianBatDau" in dkMap ? String(row[dkMap["SK_TgianBatDau"]] || "").trim() : "";
    thoigianKetthuc = "SK_TgianKetThuc" in dkMap ? String(row[dkMap["SK_TgianKetThuc"]] || "").trim() : "";
  }

  // DS_noplan2: neu co Tendean_neusua thi ghi de len Tendean; cot File luon lay lam File_sua_lan_1
  let fileSuaLan1 = "";
  const noplan2Row = findRowByColumnValue_(CONFIG.SHEET_NOPLAN2, "DangkyID", dangkyId);
  if (noplan2Row) {
    const npMap = noplan2Row.map;
    const tenSua = "Tendean_neusua" in npMap ? String(noplan2Row.row[npMap["Tendean_neusua"]] || "").trim() : "";
    if (tenSua) tendean = tenSua;
    fileSuaLan1 = "File" in npMap ? String(noplan2Row.row[npMap["File"]] || "").trim() : "";
  }

  // File_chot: cot File -> lam File_cuoi
  let fileCuoi = "";
  const fileChotRow = findRowByColumnValue_(CONFIG.SHEET_FILECHOT, "DangkyID", dangkyId);
  if (fileChotRow && ("File" in fileChotRow.map)) {
    fileCuoi = String(fileChotRow.row[fileChotRow.map["File"]] || "").trim();
  }

  // DS_Phancong: lay ten Nguoi cham 1 / Nguoi cham 2
  let nguoiCham1 = "", nguoiCham2 = "";
  const phancongRow = findRowByColumnValue_(CONFIG.SHEET_PHANCONG, "DangkyID", dangkyId);
  if (phancongRow) {
    const pcMap = phancongRow.map;
    nguoiCham1 = "Nguoicham1" in pcMap ? String(phancongRow.row[pcMap["Nguoicham1"]] || "").trim() : "";
    nguoiCham2 = "Nguoicham2" in pcMap ? String(phancongRow.row[pcMap["Nguoicham2"]] || "").trim() : "";
  }

  // Phe_duyet_lan1 / lan2: khop tung phieu voi Nguoi cham 1/2 de biet gan vao cot NC1 hay NC2
  const lan1 = readPheDuyetScoresForDeansangkien_(CONFIG.SHEET_PHEDUYET_LAN1, dangkyId, nguoiCham1, nguoiCham2);
  const lan2 = readPheDuyetScoresForDeansangkien_(CONFIG.SHEET_PHEDUYET_LAN2, dangkyId, nguoiCham1, nguoiCham2);

  // Nghiem_thu: chi lay TongDiem (Diemnghiemthu_NC1/NC2) - KHONG lay Nhan xet/Ket luan (khong lan xuong)
  const nghiemthu = readNghiemThuScoresForDeansangkien_(dangkyId, nguoiCham1, nguoiCham2);

  // ---- Ghi (hoac tao moi) dong DS_Deansangkien ----
  const deanSheet = getSheet(CONFIG.SHEET_DEAN);
  const deanValues = deanSheet.getDataRange().getValues();
  const deanMap = headerIndexMap(deanValues[0]);

  let deanRowNumber = -1;
  if ("DangkyID" in deanMap) {
    for (let i = 1; i < deanValues.length; i++) {
      if (String(deanValues[i][deanMap["DangkyID"]] || "").trim() === dangkyId) { deanRowNumber = i + 1; break; }
    }
  }

  // Chunhiem/Thanhvien CHI dien tu Dangky luc TAO MOI dong DS_Deansangkien lan dau. Sau do 2
  // cot nay tro thanh "doc lap" - Admin sua truc tiep hoac duyet Yeu cau chinh sua se GIU NGUYEN
  // gia tri da sua, KHONG bi bo dong bo ghi de lai theo Dangky nua o nhung lan dong bo sau.
  const fieldsToWrite = {
    Madean_sangkien: madean,
    Khoaphong: khoaphong,
    Tendean: tendean,
    File_dau: fileDau,
    File_sua_lan_1: fileSuaLan1,
    File_cuoi: fileCuoi,
    Thoigian_batdau: thoigianBatdau,
    Thoigian_ketthuc: thoigianKetthuc,
    Nguoi_cham_1: nguoiCham1,
    Nguoi_cham_2: nguoiCham2,
    Diem_cua_NC1: lan1.diemNC1,
    Nhan_xet_cua_NC1: lan1.nhanxetNC1,
    Diem_cua_NC2: lan1.diemNC2,
    Nhan_xet_cua_NC2: lan1.nhanxetNC2,
    Diem_cua_NC1_lan_2: lan2.diemNC1,
    Nhan_xet_cua_NC1_lan_2: lan2.nhanxetNC1,
    Diem_cua_NC2_lan_2: lan2.diemNC2,
    Nhan_xet_cua_NC2_lan_2: lan2.nhanxetNC2,
    Diemnghiemthu_NC1: nghiemthu.diemNC1,
    Diemnghiemthu_NC2: nghiemthu.diemNC2
  };
  const fieldsOnlyOnCreate = {
    Chunhiem: chunhiem,
    Thanhvien: thanhvien
  };

  if (deanRowNumber === -1) {
    const newRow = new Array(deanValues[0].length).fill("");
    if ("ID" in deanMap) newRow[deanMap["ID"]] = Utilities.getUuid();
    if ("DangkyID" in deanMap) newRow[deanMap["DangkyID"]] = dangkyId;
    Object.keys(fieldsToWrite).forEach(function (col) {
      if (col in deanMap) newRow[deanMap[col]] = fieldsToWrite[col];
    });
    Object.keys(fieldsOnlyOnCreate).forEach(function (col) {
      if (col in deanMap) newRow[deanMap[col]] = fieldsOnlyOnCreate[col];
    });
    deanSheet.appendRow(newRow);
  } else {
    Object.keys(fieldsToWrite).forEach(function (col) {
      if (col in deanMap) deanSheet.getRange(deanRowNumber, deanMap[col] + 1).setValue(fieldsToWrite[col]);
    });
  }
  invalidateSheetCache(CONFIG.SHEET_DEAN);

  // ---- Lan truyen Madean + Tendean MOI NHAT xuong cac Sheet phia sau ----
  // TRU: Dangky (nguon), Phe_duyet_lan1 (dong bang), cot Tendean rieng cua DS_noplan2 (giu nguyen)
  // LUU Y: KHONG dong bo "Tendean" xuong DS_Phancong nua (chi Madean/Khoaphong) - Tendean o
  // DS_Phancong CHI duoc dien 1 lan duy nhat tu chinh Sheet Dangky (xem syncPhanCongFromDangKy_
  // trong PhanCong.gs), khong doi theo du DS_noplan2/DS_Deansangkien co doi ten sau nay hay khong.
  // (Ly do: DS_Phancong dung Khoaphong+Tendean lam 1 trong cac khoa doi chieu quan trong; de no
  // doi ten se lam sai lech voi ten GOC ben Dangky, gay tao du lieu trung lap.)
  updateColumnsByDangkyId_(CONFIG.SHEET_PHANCONG, dangkyId, { Madean: madean, Khoaphong: khoaphong }, false);
  updateColumnsByDangkyId_(CONFIG.SHEET_NOPLAN2, dangkyId, { Madean: madean }, false); // KHONG dong Tendean
  updateColumnsByDangkyId_(CONFIG.SHEET_PHEDUYET_LAN2, dangkyId, { Madean: madean, Tendean: tendean }, true);
  updateColumnsByDangkyId_(CONFIG.SHEET_PROGRESS, dangkyId, { Madean_sangkien: madean, Tendean: tendean }, true);
  updateColumnsByDangkyId_(CONFIG.SHEET_FILECHOT, dangkyId, { Madean: madean, Tendean: tendean }, false);
  updateColumnsByDangkyId_(CONFIG.SHEET_BCNGHIEMTHU, dangkyId, { Madean: madean, Tendean: tendean }, false);
  updateColumnsByDangkyId_(CONFIG.SHEET_NGHIEMTHU, dangkyId, { Madean: madean, Tendean: tendean }, true);
}

// Doc diem/nhan xet tu Phe_duyet_lan1 hoac lan2, gan dung vao "NC1"/"NC2" theo dung ten nguoi cham
function readPheDuyetScoresForDeansangkien_(sheetName, dangkyId, nguoiCham1, nguoiCham2) {
  const result = { diemNC1: "", nhanxetNC1: "", diemNC2: "", nhanxetNC2: "" };
  const rows = findAllRowsByColumnValue_(sheetName, "DangkyID", dangkyId);
  rows.forEach(function (r) {
    const map = r.map;
    const hoTen = "NguoiChamHoTen" in map ? String(r.row[map["NguoiChamHoTen"]] || "").trim() : "";
    const diem = "TongDiem" in map ? r.row[map["TongDiem"]] : "";
    const ykien = "YKienNhanXet" in map ? String(r.row[map["YKienNhanXet"]] || "") : "";
    if (hoTen && hoTen === nguoiCham1) {
      result.diemNC1 = diem; result.nhanxetNC1 = ykien;
    } else if (hoTen && hoTen === nguoiCham2) {
      result.diemNC2 = diem; result.nhanxetNC2 = ykien;
    }
  });
  return result;
}

// Rieng Nghiem thu: chi lay TongDiem (khong lay Nhan xet/Ket luan - khong lan xuong DS_Deansangkien
// theo dung thiet ke da chot)
function readNghiemThuScoresForDeansangkien_(dangkyId, nguoiCham1, nguoiCham2) {
  const result = { diemNC1: "", diemNC2: "" };
  const rows = findAllRowsByColumnValue_(CONFIG.SHEET_NGHIEMTHU, "DangkyID", dangkyId);
  rows.forEach(function (r) {
    const map = r.map;
    const hoTen = "NguoiChamHoTen" in map ? String(r.row[map["NguoiChamHoTen"]] || "").trim() : "";
    const diem = "TongDiem" in map ? r.row[map["TongDiem"]] : "";
    if (hoTen && hoTen === nguoiCham1) {
      result.diemNC1 = diem;
    } else if (hoTen && hoTen === nguoiCham2) {
      result.diemNC2 = diem;
    }
  });
  return result;
}

// Cap nhat 1 hoac nhieu cot theo DangkyID trong 1 Sheet.
// allowMultiple = true khi 1 dangkyId co the ung voi NHIEU dong trong Sheet do (Phe_duyet_lan2
// toi da 2 dong/de an; Tiendo co the co nhieu dong lich su cap nhat tien do).
function updateColumnsByDangkyId_(sheetName, dangkyId, colsToValues, allowMultiple) {
  const rows = allowMultiple
    ? findAllRowsByColumnValue_(sheetName, "DangkyID", dangkyId)
    : (function () {
        const r = findRowByColumnValue_(sheetName, "DangkyID", dangkyId);
        return r ? [r] : [];
      })();

  if (rows.length === 0) return;

  rows.forEach(function (r) {
    Object.keys(colsToValues).forEach(function (col) {
      if (col in r.map) r.sheet.getRange(r.rowNumber, r.map[col] + 1).setValue(colsToValues[col]);
    });
  });

  invalidateSheetCache(sheetName);
}

// ==========================================================
// GHI CHU VE DS_chisodean:
// Sheet nay lien ket theo DS_Deansangkien (cot "DeansangkienID"), KHONG lien ket thang toi Dangky
// nhu cac Sheet khac - vi cac dong trong DS_chisodean hien dang duoc Admin/nguoi dung tao/quan ly
// THU CONG (chua co man hinh web nao tu dong tao dong moi o day). Vi vay ban dong bo nay CHUA
// tu dong tao/cap nhat DS_chisodean - se bo sung khi man hinh Nghiem thu duoc xay dung, luc do
// se ro luong tao du lieu cho Sheet nay nhu the nao.
// ==========================================================

// ==========================================================
// XU LY DE AN BI "Đã loại" (Trang_thai = "Đã loại" trong DS_Deansangkien)
// Xem chi tiet trong khoi ham ben duoi.
// ==========================================================

// Xoa TAT CA cac dong khop 1 gia tri cot (dung khi de an bi "Đã loại" - can xoa han, khong
// chi cap nhat). Xoa tu DUOI LEN de tranh loi lech so dong khi xoa nhieu dong 1 luc.
function deleteRowsByColumnValue_(sheetName, colName, value) {
  if (!value) return 0;
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  const map = headerIndexMap(data[0]);
  if (!(colName in map)) return 0;

  let count = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][map[colName]] || "").trim() === String(value).trim()) {
      sheet.deleteRow(i + 1);
      count++;
    }
  }
  if (count > 0) invalidateSheetCache(sheetName);
  return count;
}

// De an co dang bi "Đã loại" hay khong (doc truc tiep tu DS_Deansangkien, khong qua cache de
// luon chinh xac tuc thi ngay sau khi Admin vua doi Trang thai)
function isDeAnDaLoai_(dangkyId) {
  if (!dangkyId) return false;
  const row = findRowByColumnValue_(CONFIG.SHEET_DEAN, "DangkyID", dangkyId);
  if (!row || !("Trang_thai" in row.map)) return false;
  return String(row.row[row.map["Trang_thai"]] || "").trim() === "Đã loại";
}

/**
 * Khi 1 de an duoc dat Trang_thai = "Đã loại" (dan Sheet hoac qua web deu goi ham nay): XOA HAN
 * moi du lieu lien quan o CAC SHEET PHU - CHI GIU LAI Dangky va DS_Deansangkien.
 * - DS_Phancong, Phe_duyet_lan1, Phe_duyet_lan2, DS_noplan2, Tiendo: xoa theo DangkyID.
 * - DS_chisodean: xoa theo DeansangkienID (= chinh ID cua dong DS_Deansangkien nay).
 * Sau khi xoa, syncPhanCongFromDangKy_ se KHONG tao lai dong DS_Phancong cho de an nay nua
 * (xem dieu kien kiem tra trong PhanCong.gs) cho toi khi Trang_thai duoc doi khac "Đã loại".
 */
function xoaDeAnDaLoaiKhoiCacSheetPhu_(dangkyId, deansangkienId) {
  if (!dangkyId) return;

  deleteRowsByColumnValue_(CONFIG.SHEET_PHANCONG, "DangkyID", dangkyId);
  deleteRowsByColumnValue_(CONFIG.SHEET_PHEDUYET_LAN1, "DangkyID", dangkyId);
  deleteRowsByColumnValue_(CONFIG.SHEET_PHEDUYET_LAN2, "DangkyID", dangkyId);
  deleteRowsByColumnValue_(CONFIG.SHEET_NOPLAN2, "DangkyID", dangkyId);
  deleteRowsByColumnValue_(CONFIG.SHEET_PROGRESS, "DangkyID", dangkyId);
  deleteRowsByColumnValue_(CONFIG.SHEET_FILECHOT, "DangkyID", dangkyId);
  deleteRowsByColumnValue_(CONFIG.SHEET_BCNGHIEMTHU, "DangkyID", dangkyId);
  deleteRowsByColumnValue_(CONFIG.SHEET_NGHIEMTHU, "DangkyID", dangkyId);

  if (deansangkienId) {
    deleteRowsByColumnValue_(CONFIG.SHEET_CHISO, "DeansangkienID", deansangkienId);
  }
}
