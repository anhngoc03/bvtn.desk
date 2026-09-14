// ==========================================================
// TIEN ICH: KIEM TRA DONG BO NGUOI CHAM giua DS_Phancong (nguon goc) va DS_Deansangkien
// (Nguoi_cham_1/Nguoi_cham_2), va doi chieu voi ten nguoi cham thuc te da nop trong
// Phe_duyet_lan1 / Phe_duyet_lan2 (NguoiChamHoTen). CHI BAO CAO, khong tu sua gi ca.
//
// CACH DUNG: chay ham "kiemTraDongBoNguoiCham", xem log de biet dong nao dang lech.
// ==========================================================
function kiemTraDongBoNguoiCham() {
  const pcData = getSheetData(CONFIG.SHEET_PHANCONG);
  if (pcData.length < 2) { Logger.log("DS_Phancong đang trống."); return; }
  const pcMap = headerIndexMap(pcData[0]);

  const deanData = getSheetData(CONFIG.SHEET_DEAN);
  const deanMap = deanData.length >= 2 ? headerIndexMap(deanData[0]) : {};
  const deanByDangkyId = {};
  if (deanData.length >= 2 && "DangkyID" in deanMap) {
    deanData.slice(1).forEach(function (row) {
      const id = String(row[deanMap["DangkyID"]] || "").trim();
      if (id) deanByDangkyId[id] = row;
    });
  }

  const lan1Data = getSheetData(CONFIG.SHEET_PHEDUYET_LAN1);
  const lan1Map = lan1Data.length >= 2 ? headerIndexMap(lan1Data[0]) : {};
  const lan2Data = getSheetData(CONFIG.SHEET_PHEDUYET_LAN2);
  const lan2Map = lan2Data.length >= 2 ? headerIndexMap(lan2Data[0]) : {};

  function nguoiChamDaNop_(data, map, dangkyId) {
    if (!("DangkyID" in map) || !("NguoiChamHoTen" in map)) return [];
    return data.slice(1)
      .filter(function (r) { return String(r[map["DangkyID"]] || "").trim() === dangkyId; })
      .map(function (r) { return String(r[map["NguoiChamHoTen"]] || "").trim(); })
      .filter(Boolean);
  }

  let checked = 0;
  let mismatchCount = 0;

  pcData.slice(1).forEach(function (row, i) {
    const rowNumber = i + 2;
    const madean = "Madean" in pcMap ? String(row[pcMap["Madean"]] || "").trim() : "";
    if (!madean) return;

    const dangkyId = "DangkyID" in pcMap ? String(row[pcMap["DangkyID"]] || "").trim() : "";
    const tendean = "Tendean" in pcMap ? String(row[pcMap["Tendean"]] || "").trim() : "";
    const nc1 = "Nguoicham1" in pcMap ? String(row[pcMap["Nguoicham1"]] || "").trim() : "";
    const nc2 = "Nguoicham2" in pcMap ? String(row[pcMap["Nguoicham2"]] || "").trim() : "";

    checked++;
    const issues = [];

    if (!dangkyId) {
      issues.push('Dòng này ở DS_Phancong đang THIẾU "DangkyID" - chưa thể đối chiếu được, cần backfill trước.');
    } else {
      const deanRow = deanByDangkyId[dangkyId];
      if (!deanRow) {
        issues.push("Không tìm thấy dòng tương ứng trong DS_Deansangkien (DangkyID=" + dangkyId + ").");
      } else {
        const deanNc1 = "Nguoi_cham_1" in deanMap ? String(deanRow[deanMap["Nguoi_cham_1"]] || "").trim() : "";
        const deanNc2 = "Nguoi_cham_2" in deanMap ? String(deanRow[deanMap["Nguoi_cham_2"]] || "").trim() : "";
        if (deanNc1 !== nc1) {
          issues.push('Người chấm 1 LỆCH: DS_Phancong="' + nc1 + '" nhưng DS_Deansangkien="' + deanNc1 + '".');
        }
        if (deanNc2 !== nc2) {
          issues.push('Người chấm 2 LỆCH: DS_Phancong="' + nc2 + '" nhưng DS_Deansangkien="' + deanNc2 + '".');
        }
      }

      // Doi chieu voi ten thuc te da nop phieu (chi canh bao, khong bat buoc phai khop 100% vi
      // co the nguoi cham chua nop phieu nao ca - do la binh thuong)
      const daNopLan1 = nguoiChamDaNop_(lan1Data, lan1Map, dangkyId);
      const daNopLan2 = nguoiChamDaNop_(lan2Data, lan2Map, dangkyId);
      daNopLan1.concat(daNopLan2).forEach(function (ten) {
        if (ten && ten !== nc1 && ten !== nc2) {
          issues.push('Có phiếu phê duyệt đã nộp bởi "' + ten + '" nhưng người này KHÔNG có trong Người chấm 1/2 hiện tại của DS_Phancong (có thể do đã đổi người chấm sau khi họ đã nộp phiếu).');
        }
      });
    }

    if (issues.length > 0) {
      mismatchCount++;
      Logger.log("--- DS_Phancong dòng " + rowNumber + " (Mã đề án=\"" + madean + "\", Tên đề án=\"" + tendean + "\") ---");
      issues.forEach(function (msg) { Logger.log("  ⚠ " + msg); });
    }
  });

  Logger.log("=== Đã kiểm tra " + checked + " dòng, phát hiện " + mismatchCount + " dòng có vấn đề. ===");
  if (mismatchCount > 0) {
    Logger.log("Gợi ý: với dòng thiếu DangkyID, chạy backfillAllIds() trong IdBackfill.gs trước. Với dòng lệch dữ liệu, chạy syncAllDeansangkienFromDangky() để tính lại, hoặc tự sửa tay nếu vẫn còn lệch sau đó.");
  }
}
