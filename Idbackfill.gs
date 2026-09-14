// ==========================================================
// TIEN ICH 1 LAN: dien ID + DangkyID (hoac DeansangkienID rieng cho DS_chisodean) cho DU LIEU CU
// dang chua co (do da ton tai truoc khi he thong dong bo theo ID duoc xay dung).
//
// BAT BUOC LAM TRUOC KHI CHAY: tu tay them cot vao 2 VI TRI DAU TIEN cua tung Sheet:
//   DS_Deansangkien : "ID", "DangkyID"
//   DS_Phancong     : "ID", "DangkyID"
//   Phe_duyet_lan1  : (da co "ID") -> chi can them "DangkyID"
//   Phe_duyet_lan2  : (da co "ID") -> chi can them "DangkyID"
//   DS_noplan2      : "ID", "DangkyID"
//   Tiendo          : (da co "ID") -> chi can them "DangkyID"
//   DS_chisodean    : "ID", "DeansangkienID"
//
// CACH DUNG:
// 1. Chay "chanDoanBackfillId" TRUOC (khong sua gi, chi bao cao) de xem co bao nhieu dong
//    doan duoc / khong doan duoc o tung Sheet (dong nao khong doan duoc se duoc liet ke so
//    dong that tren Sheet de tu kiem tra - thuong la do Khoaphong/Tendean bi lech chinh ta,
//    thua khoang trang, hoac dong do khong con khop voi dong nao trong Sheet Dangky nua).
// 2. Neu on, chay "backfillAllIds" de THAT SU dien DangkyID/DeansangkienID.
// 3. Chay tiep "syncAllDeansangkienFromDangky" de dien NOT cac truong con lai cua DS_Deansangkien
//    (Chu nhiem, Thanh vien, Thoi gian bat dau/ket thuc, File...) cho CA cac de an duoc COPY TU
//    FILE KHAC SANG (nhung de an nay chua tung qua man hinh Dang ky tren Web nen chua duoc tinh).
// 4. Chay xong ca 3 buoc, xoa file nay di.
//
// CACH DOAN: voi tung Sheet, dung Khoaphong+Tendean (hoac Madean neu 2 cot kia rong) de tim
// dung dong Dangky tuong ung, roi lay ID cua dong Dangky do lam DangkyID. Rieng DS_chisodean
// doi chieu qua DS_Deansangkien (Madean_sangkien+Tendean) de lay DeansangkienID.
// ==========================================================

// Xay ban do "Khoaphong+Tendean" VA "Madean" -> DangkyID, doc 1 lan dung lai cho ca script
function buildDangkyLookupMaps_() {
  const data = getSheetData(CONFIG.SHEET_DANGKY);
  const byKhoaTen = {};
  const byMadean = {};
  if (data.length < 2) return { byKhoaTen: byKhoaTen, byMadean: byMadean };

  const map = headerIndexMap(data[0]);
  if (!("ID" in map) || !("LoaiDangKy" in map)) return { byKhoaTen: byKhoaTen, byMadean: byMadean };

  data.slice(1).forEach(function (row) {
    const dangkyId = String(row[map["ID"]] || "").trim();
    if (!dangkyId) return;
    const loai = String(row[map["LoaiDangKy"]] || "").trim();
    const khoaKey = dangKyKhoaPhongFieldKey_(loai);
    const tenKey = dangKyTenDeAnFieldKey_(loai);
    if (khoaKey && tenKey && (khoaKey in map) && (tenKey in map)) {
      const khoa = String(row[map[khoaKey]] || "").trim();
      const ten = String(row[map[tenKey]] || "").trim();
      if (khoa && ten) byKhoaTen[khoa + "\u0001" + ten] = dangkyId;
    }
    const madean = "Madean" in map ? String(row[map["Madean"]] || "").trim() : "";
    if (madean) byMadean[madean] = dangkyId;
  });

  return { byKhoaTen: byKhoaTen, byMadean: byMadean };
}

// Tim dangkyId cho 1 dong o Sheet phu, dua vao khoaphong/tendean/madean da doc san tu dong do
function lookupDangkyId_(maps, khoaphong, tendean, madean) {
  if (khoaphong && tendean) {
    const byKt = maps.byKhoaTen[khoaphong + "\u0001" + tendean];
    if (byKt) return byKt;
  }
  if (madean && maps.byMadean[madean]) return maps.byMadean[madean];
  return "";
}

// Ap dung backfill DangkyID cho 1 Sheet phu (dung chung cho DS_Phancong, Phe_duyet_lan1/2,
// DS_noplan2, Tiendo). apply=false: chi dem, khong ghi.
function backfillSheetDangkyId_(sheetName, maps, apply) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { total: 0, filled: 0, unresolved: 0, unresolvedRows: [] };

  const map = headerIndexMap(values[0]);
  if (!("DangkyID" in map)) return { total: 0, filled: 0, unresolved: -1, unresolvedRows: [] }; // -1 = thieu cot DangkyID

  let total = 0, filled = 0, unresolved = 0;
  const unresolvedRows = [];

  for (let i = 1; i < values.length; i++) {
    const currentId = String(values[i][map["DangkyID"]] || "").trim();
    if (currentId) continue; // da co roi -> bo qua

    const khoaphong = "Khoaphong" in map ? String(values[i][map["Khoaphong"]] || "").trim() : "";
    const tendean = "Tendean" in map ? String(values[i][map["Tendean"]] || "").trim() : "";
    const madean = "Madean" in map ? String(values[i][map["Madean"]] || "").trim() : ("Madean_sangkien" in map ? String(values[i][map["Madean_sangkien"]] || "").trim() : "");

    // Dong hoan toan rong -> bo qua, khong tinh vao thong ke
    const hasAnyData = khoaphong || tendean || madean;
    if (!hasAnyData) continue;

    total++;
    const dangkyId = lookupDangkyId_(maps, khoaphong, tendean, madean);
    if (dangkyId) {
      filled++;
      if (apply) sheet.getRange(i + 1, map["DangkyID"] + 1).setValue(dangkyId);
      // Neu Sheet nay cung dang thieu "ID" rieng (DS_Phancong, DS_noplan2) thi dien luon cho gon
      if (apply && "ID" in map && !String(values[i][map["ID"]] || "").trim()) {
        sheet.getRange(i + 1, map["ID"] + 1).setValue(Utilities.getUuid());
      }
    } else {
      unresolved++;
      unresolvedRows.push(i + 1); // so dong THAT tren Sheet, de nguoi dung tu mo len kiem tra
    }
  }

  if (apply) invalidateSheetCache(sheetName);
  return { total: total, filled: filled, unresolved: unresolved, unresolvedRows: unresolvedRows };
}

// Rieng DS_Deansangkien: can ID rieng + DangkyID (giong cac Sheet phu khac ve DangkyID,
// nhung KHONG co san cot Madean/Tendean giong nhu tren - thuc ra co, dung chung logic duoc)
function backfillDeansangkien_(maps, apply) {
  return backfillSheetDangkyId_(CONFIG.SHEET_DEAN, maps, apply);
}

// Rieng DS_chisodean: doi chieu qua DS_Deansangkien (Madean_sangkien+Tendean), lay DeansangkienID
function backfillChiSoDean_(apply) {
  const deanData = getSheetData(CONFIG.SHEET_DEAN);
  const deanByKhoaTen = {};
  const deanByMadean = {};
  if (deanData.length >= 2) {
    const deanMap = headerIndexMap(deanData[0]);
    if ("ID" in deanMap) {
      deanData.slice(1).forEach(function (row) {
        const deanId = String(row[deanMap["ID"]] || "").trim();
        if (!deanId) return;
        const ten = "Tendean" in deanMap ? String(row[deanMap["Tendean"]] || "").trim() : "";
        const khoa = "Khoaphong" in deanMap ? String(row[deanMap["Khoaphong"]] || "").trim() : "";
        if (khoa && ten) deanByKhoaTen[khoa + "\u0001" + ten] = deanId;
        const madean = "Madean_sangkien" in deanMap ? String(row[deanMap["Madean_sangkien"]] || "").trim() : "";
        if (madean) deanByMadean[madean] = deanId;
      });
    }
  }

  const sheet = getSheet(CONFIG.SHEET_CHISO);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { total: 0, filled: 0, unresolved: 0, unresolvedRows: [] };

  const map = headerIndexMap(values[0]);
  if (!("DeansangkienID" in map)) return { total: 0, filled: 0, unresolved: -1, unresolvedRows: [] };

  let total = 0, filled = 0, unresolved = 0;
  const unresolvedRows = [];
  for (let i = 1; i < values.length; i++) {
    const currentId = String(values[i][map["DeansangkienID"]] || "").trim();
    if (currentId) continue;

    const khoa = "Khoaphong" in map ? String(values[i][map["Khoaphong"]] || "").trim() : "";
    const ten = "Tendean" in map ? String(values[i][map["Tendean"]] || "").trim() : "";
    const madean = "Madean_sangkien" in map ? String(values[i][map["Madean_sangkien"]] || "").trim() : "";
    if (!khoa && !ten && !madean) continue;

    total++;
    let deanId = "";
    if (khoa && ten && deanByKhoaTen[khoa + "\u0001" + ten]) deanId = deanByKhoaTen[khoa + "\u0001" + ten];
    else if (madean && deanByMadean[madean]) deanId = deanByMadean[madean];

    if (deanId) {
      filled++;
      if (apply) sheet.getRange(i + 1, map["DeansangkienID"] + 1).setValue(deanId);
      if (apply && "ID" in map && !String(values[i][map["ID"]] || "").trim()) {
        sheet.getRange(i + 1, map["ID"] + 1).setValue(Utilities.getUuid());
      }
    } else {
      unresolved++;
      unresolvedRows.push(i + 1);
    }
  }

  if (apply) invalidateSheetCache(CONFIG.SHEET_CHISO);
  return { total: total, filled: filled, unresolved: unresolved, unresolvedRows: unresolvedRows };
}

function formatBackfillResult_(label, r) {
  if (r.unresolved === -1) return label + ": THIẾU cột cần thiết (chưa thêm cột), bỏ qua.";
  const rowsNote = (r.unresolvedRows && r.unresolvedRows.length > 0) ? " [dòng: " + r.unresolvedRows.join(", ") + "]" : "";
  return label + ": " + r.filled + "/" + r.total + " dòng dò được (còn " + r.unresolved + " dòng không đoán được)" + rowsNote + ".";
}

// BUOC 1: chi xem bao cao, KHONG sua gi ca
function chanDoanBackfillId() {
  const maps = buildDangkyLookupMaps_();
  Logger.log(formatBackfillResult_("DS_Deansangkien", backfillDeansangkien_(maps, false)));
  Logger.log(formatBackfillResult_("DS_Phancong", backfillSheetDangkyId_(CONFIG.SHEET_PHANCONG, maps, false)));
  Logger.log(formatBackfillResult_("Phe_duyet_lan1", backfillSheetDangkyId_(CONFIG.SHEET_PHEDUYET_LAN1, maps, false)));
  Logger.log(formatBackfillResult_("Phe_duyet_lan2", backfillSheetDangkyId_(CONFIG.SHEET_PHEDUYET_LAN2, maps, false)));
  Logger.log(formatBackfillResult_("DS_noplan2", backfillSheetDangkyId_(CONFIG.SHEET_NOPLAN2, maps, false)));
  Logger.log(formatBackfillResult_("Tiendo", backfillSheetDangkyId_(CONFIG.SHEET_PROGRESS, maps, false)));
  Logger.log(formatBackfillResult_("DS_chisodean", backfillChiSoDean_(false)));
}

// BUOC 2: THAT SU dien. Chay backfillDeansangkien_ TRUOC vi DS_chisodean can DS_Deansangkien
// da co ID day du roi moi doi chieu duoc.
function backfillAllIds() {
  const maps = buildDangkyLookupMaps_();
  Logger.log(formatBackfillResult_("DS_Deansangkien", backfillDeansangkien_(maps, true)));
  Logger.log(formatBackfillResult_("DS_Phancong", backfillSheetDangkyId_(CONFIG.SHEET_PHANCONG, maps, true)));
  Logger.log(formatBackfillResult_("Phe_duyet_lan1", backfillSheetDangkyId_(CONFIG.SHEET_PHEDUYET_LAN1, maps, true)));
  Logger.log(formatBackfillResult_("Phe_duyet_lan2", backfillSheetDangkyId_(CONFIG.SHEET_PHEDUYET_LAN2, maps, true)));
  Logger.log(formatBackfillResult_("DS_noplan2", backfillSheetDangkyId_(CONFIG.SHEET_NOPLAN2, maps, true)));
  Logger.log(formatBackfillResult_("Tiendo", backfillSheetDangkyId_(CONFIG.SHEET_PROGRESS, maps, true)));
  Logger.log(formatBackfillResult_("DS_chisodean", backfillChiSoDean_(true)));
  Logger.log("Hoan tat backfill ID. TIEP THEO: chay ham syncAllDeansangkienFromDangky() de dien not cac truong con lai (Chu nhiem, Thanh vien, Thoi gian...) cho DS_Deansangkien.");
}

// BUOC 3 (CHAY SAU KHI DA XONG backfillAllIds): dong bo lai TOAN BO DS_Deansangkien tu du lieu
// hien co trong Sheet Dangky - can thiet cho cac de an duoc COPY TU FILE KHAC SANG, vi nhung de an
// do chua tung di qua man hinh Dang ky/Sua tren Web nen chua bao gio duoc bo may dong bo trung tam
// (SyncEngine.gs) tinh toan cac truong Chu nhiem/Thanh vien/Thoi gian bat dau/ket thuc/File...
function syncAllDeansangkienFromDangky() {
  const data = getSheetData(CONFIG.SHEET_DANGKY);
  if (data.length < 2) { Logger.log("Sheet Dangky đang trống."); return; }

  const map = headerIndexMap(data[0]);
  if (!("ID" in map)) { Logger.log('Sheet Dangky đang thiếu cột "ID".'); return; }

  let count = 0;
  let errorCount = 0;
  data.slice(1).forEach(function (row) {
    const dangkyId = String(row[map["ID"]] || "").trim();
    if (!dangkyId) return;
    try {
      syncEngineRebuildAndPropagate_(dangkyId);
      count++;
    } catch (e) {
      errorCount++;
      Logger.log("Lỗi đồng bộ dòng có ID=" + dangkyId + ": " + e.message);
    }
  });

  Logger.log("Đã đồng bộ lại " + count + " đề án/sáng kiến (" + errorCount + " dòng bị lỗi, xem chi tiết ở log phía trên).");
}
