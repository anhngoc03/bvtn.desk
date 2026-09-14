// ==========================================================
// TIEN ICH: KIEM TRA CAC LINK FILE DINH KEM (Sheet Dangky + DS_noplan2) CO THUC SU MO DUOC
// HAY KHONG. Bao cao ro dong nao co van de va ly do (khong doc duoc ID tu link, hoac file
// khong con truy cap duoc tren Drive - vd bi xoa, hoac bi doi quyen chia se).
//
// CACH DUNG: chay ham "kiemTraFileDinhKem", xem log.
// ==========================================================

// Tach ID file tu 1 URL Drive, ho tro ca 2 dinh dang pho bien (giong het logic ben client -
// JavaScript.html -> extractDriveFileId_): "/d/FILE_ID/..." va "?id=FILE_ID"/"&id=FILE_ID"
function extractDriveFileIdServer_(url) {
  const s = String(url || "");
  let m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

function kiemTraMotFile_(rowLabel, url) {
  if (!url) return; // o rong -> khong co gi de kiem tra, khong tinh la loi

  const fileId = extractDriveFileIdServer_(url);
  if (!fileId) {
    Logger.log(rowLabel + ": ❌ Link không đúng định dạng URL Drive nhận diện được (\"" + url + "\") - không thể nhúng/mở.");
    return;
  }

  try {
    const file = DriveApp.getFileById(fileId);
    file.getName(); // thu doc thuoc tinh - neu khong con truy cap duoc se nem loi o day
    Logger.log(rowLabel + ": ✅ OK (" + file.getName() + ")");
  } catch (e) {
    Logger.log(rowLabel + ": ❌ Không truy cập được file trên Drive (có thể đã bị xóa, hoặc quyền chia sẻ đã đổi) - " + e.message);
  }
}

function kiemTraFileDinhKem() {
  Logger.log("=== Kiểm tra file ở Sheet Dangky ===");
  const dangkyData = getSheetData(CONFIG.SHEET_DANGKY);
  if (dangkyData.length >= 2) {
    const map = headerIndexMap(dangkyData[0]);
    const fileCols = ["DA_File", "DACu_File", "SK_File"].filter(function (c) { return c in map; });
    dangkyData.slice(1).forEach(function (row, i) {
      const rowNumber = i + 2;
      fileCols.forEach(function (col) {
        const url = String(row[map[col]] || "").trim();
        if (url) kiemTraMotFile_("Dangky dòng " + rowNumber + " (cột " + col + ")", url);
      });
    });
  } else {
    Logger.log("Sheet Dangky đang trống.");
  }

  Logger.log("=== Kiểm tra file ở Sheet DS_noplan2 ===");
  const np2Data = getSheetData(CONFIG.SHEET_NOPLAN2);
  if (np2Data.length >= 2) {
    const map = headerIndexMap(np2Data[0]);
    if ("File" in map) {
      np2Data.slice(1).forEach(function (row, i) {
        const rowNumber = i + 2;
        const url = String(row[map["File"]] || "").trim();
        if (url) kiemTraMotFile_("DS_noplan2 dòng " + rowNumber, url);
      });
    }
  } else {
    Logger.log("Sheet DS_noplan2 đang trống.");
  }

  Logger.log("=== Hoàn tất kiểm tra. Dòng nào có ❌ thì cần Admin tự kiểm tra lại link/quyền chia sẻ file đó trên Google Drive. ===");
}
