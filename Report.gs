// ==========================================================
// BAO CAO (Admin: xem + thao tac; TVHĐ: chi xem, xem Auth.gs -> canAccessBaoCao)
// ==========================================================




/**
* Quy uoc ma de an/sang kien (de phong an, tu dong dung, KHONG can sua code khi sang nam moi):
*   ĐA/[nam ban hanh]/[STT]   -> de an cai tien
*   SK/[nam ban hanh]/[STT]   -> sang kien cai tien
* - "De an dang ky moi"        = ma bat dau "ĐA/" + NAM HIEN TAI
* - "De an nam truoc tiep tuc" = ma bat dau "ĐA/" + (NAM HIEN TAI - 1)
* - "Sang kien cai tien"       = ma bat dau "SK/" + NAM HIEN TAI
* Vi nam duoc lay dong (new Date().getFullYear()) nen sang nam moi KHONG can sua lai code,
* he thong se tu dong tinh lai theo nam hien tai moi lan bao cao duoc mo.
*/
function classifyMaDeAn_(maDeAn, currentYear, prevYear) {
 const ma = String(maDeAn || "").trim();
 if (ma.indexOf("ĐA/" + currentYear) === 0) return "newDeAn";
 if (ma.indexOf("ĐA/" + prevYear) === 0) return "oldDeAn";
 if (ma.indexOf("SK/" + currentYear) === 0) return "sangKien";
 return "other";
}




/**
* Bao cao (1): Thong ke so luong de an/sang kien dang quan ly, chia theo 3 nhom:
* - Đề án đăng ký mới (ĐA/[năm hiện tại])
* - Đề án của năm trước vẫn tiếp tục thực hiện (ĐA/[năm hiện tại - 1])
* - Sáng kiến cải tiến (SK/[năm hiện tại])
* Tra ve so luong va ty le % cua tung nhom (kem so luong "khac" - ma khong khop 3 nhom tren, vd
* de an tu 2 nam truoc do van chua duoc chot xong).
*/
function getReportDeAnStats(token) {
 const user = requireUser(token);
 if (!canAccessBaoCao(user)) {
   throw new Error("Bạn không có quyền xem báo cáo.");
 }




 const now = new Date();
 const currentYear = now.getFullYear();
 const prevYear = currentYear - 1;




 const data = getSheetData(CONFIG.SHEET_DEAN);




 const counts = { newDeAn: 0, oldDeAn: 0, sangKien: 0, other: 0 };




 if (data.length >= 2) {
   const map = headerIndexMap(data[0]);
   if ("Madean_sangkien" in map) {
     data.slice(1).forEach(function (row) {
       const ma = row[map["Madean_sangkien"]];
       const group = classifyMaDeAn_(ma, currentYear, prevYear);
       counts[group]++;
     });
   }
 }




 const total = counts.newDeAn + counts.oldDeAn + counts.sangKien + counts.other;




 function pct(n) {
   return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
 }




 return {
   currentYear: currentYear,
   prevYear: prevYear,
   total: total,
   items: [
     {
       key: "newDeAn",
       label: "Đề án đăng ký mới (ĐA/" + currentYear + ")",
       count: counts.newDeAn,
       percent: pct(counts.newDeAn)
     },
     {
       key: "oldDeAn",
       label: "Đề án năm trước tiếp tục thực hiện (ĐA/" + prevYear + ")",
       count: counts.oldDeAn,
       percent: pct(counts.oldDeAn)
     },
     {
       key: "sangKien",
       label: "Sáng kiến cải tiến (SK/" + currentYear + ")",
       count: counts.sangKien,
       percent: pct(counts.sangKien)
     },
     {
       key: "other",
       label: "Khác / chưa xác định năm",
       count: counts.other,
       percent: pct(counts.other)
     }
   ]
 };
}




/**
* Bao cao (2): Cong tac phe duyet - CHI tinh de an/sang kien dang ky NAM HIEN TAI (ma "ĐA/[nam
* hien tai]" hoac "SK/[nam hien tai]", giong het cach loc cua Bao cao 1) - LOAI HAN "de an cu
* tiep tuc" ("ĐA/[nam truoc]") ra khoi bao cao nay, du no van co the dang co mat trong DS_Phancong.
* Don vi tinh la "luot cham": 1 de an/sang kien can DU 2 luot (2 nguoi cham) moi lan phe duyet.
* Giao dien KHONG con chia tab con - luon tra ve DAY DU ca Lan 1, Lan 2 VA Tong hop cong don gian
* trong 1 lan goi duy nhat, client tu ve toan bo cac bang/bieu do tu ket qua nay.
*/
function getReportPheDuyetStats(token) {
 const user = requireUser(token);
 if (!canAccessBaoCao(user)) {
   throw new Error("Bạn không có quyền xem báo cáo.");
 }




 const now = new Date();
 const currentYear = now.getFullYear();
 const prevYear = currentYear - 1;




 // Danh sach de an/sang kien trong PHAM VI (nguon: DS_Phancong, giong het getPheDuyetDeAnList),
 // CHI giu lai nhom "newDeAn" (ĐA/nam hien tai) va "sangKien" (SK/nam hien tai).
 const pcData = getSheetData(CONFIG.SHEET_PHANCONG);
 const inScope = [];
 if (pcData.length >= 2) {
   const pcMap = headerIndexMap(pcData[0]);
   if (("Madean" in pcMap) && ("Khoaphong" in pcMap) && ("Tendean" in pcMap)) {
     pcData.slice(1).forEach(function (row) {
       const madean = String(row[pcMap["Madean"]] || "").trim();
       if (!madean) return;
       const group = classifyMaDeAn_(madean, currentYear, prevYear);
       if (group !== "newDeAn" && group !== "sangKien") return;
       inScope.push({
         dangkyId: "DangkyID" in pcMap ? String(row[pcMap["DangkyID"]] || "").trim() : "",
         madean: madean,
         khoaphong: String(row[pcMap["Khoaphong"]] || "").trim(),
         tendean: String(row[pcMap["Tendean"]] || "").trim()
       });
     });
   }
 }




 // Dem so phieu (= so luot cham) da nop trong 1 Sheet Phe_duyet_lanX, gom theo tung de an
 // (uu tien khop theo DangkyID - on dinh nhat; fallback theo Madean cho du lieu cu chua co ID).
 function countPhieuBySheet_(sheetName) {
   const counts = {};
   const data = getSheetData(sheetName);
   if (data.length < 2) return counts;
   const map = headerIndexMap(data[0]);
   if (!("Madean" in map)) return counts;
   data.slice(1).forEach(function (r) {
     const madean = String(r[map["Madean"]] || "").trim();
     if (!madean) return;
     const dangkyId = "DangkyID" in map ? String(r[map["DangkyID"]] || "").trim() : "";
     const key = dangkyId || ("madean:" + madean);
     counts[key] = (counts[key] || 0) + 1;
   });
   return counts;
 }




 const countsLan1 = countPhieuBySheet_(CONFIG.SHEET_PHEDUYET_LAN1);
 const countsLan2 = countPhieuBySheet_(CONFIG.SHEET_PHEDUYET_LAN2);
 function keyFor_(item) { return item.dangkyId || ("madean:" + item.madean); }




 // Bang chi tiet: 1 dong / 1 de an, kem so luot cua tung lan + tong
 const details = inScope.map(function (item) {
   const key = keyFor_(item);
   const l1 = countsLan1[key] || 0;
   const l2 = countsLan2[key] || 0;
   return {
     khoaphong: item.khoaphong,
     tendean: item.tendean,
     luotLan1: l1,
     luotLan2: l2,
     tong: l1 + l2
   };
 });
 details.sort(function (a, b) {
   const c = a.khoaphong.localeCompare(b.khoaphong, "vi", { sensitivity: "base" });
   if (c !== 0) return c;
   return a.tendean.localeCompare(b.tendean, "vi", { sensitivity: "base" });
 });




 const totalDeAn = inScope.length;




 // Bang chi so (STT/Chi so/Lan 1/Lan 2/Tong) - don vi la LUOT (moi de an can DU 2 luot/lan)
 function summarizeLan_(counts) {
   const can = totalDeAn * 2;
   let da = 0;
   inScope.forEach(function (item) { da += (counts[keyFor_(item)] || 0); });
   const chua = can - da;
   return { can: can, da: da, chua: chua };
 }




 const sumLan1 = summarizeLan_(countsLan1);
 const sumLan2 = summarizeLan_(countsLan2);
 const sumTong = {
   can: sumLan1.can + sumLan2.can,
   da: sumLan1.da + sumLan2.da,
   chua: sumLan1.chua + sumLan2.chua
 };




 // Cung 2 Sheet Phe_duyet_lan1/lan2 do, nhung tinh theo DON VI DE AN (khong nhan doi): "da" =
 // de an DA DU 2 phieu o lan do, "chua" = phan con lai. Dung rieng cho khoi "So de an, sang
 // kien" tren giao dien (khac khoi "So luot cham" o duoi, von tinh theo tung phieu rieng le).
 function summarizeLanDeAn_(counts) {
   let da = 0;
   inScope.forEach(function (item) { if ((counts[keyFor_(item)] || 0) >= 2) da++; });
   return { can: totalDeAn, da: da, chua: totalDeAn - da };
 }




 const sumLan1DeAn = summarizeLanDeAn_(countsLan1);
 const sumLan2DeAn = summarizeLanDeAn_(countsLan2);
 const sumTongDeAn = {
   can: sumLan1DeAn.can + sumLan2DeAn.can,
   da: sumLan1DeAn.da + sumLan2DeAn.da,
   chua: sumLan1DeAn.chua + sumLan2DeAn.chua
 };




 function pctOf_(n, total) { return total > 0 ? Math.round((n / total) * 1000) / 10 : 0; }




 return {
   currentYear: currentYear,
   totalDeAn: totalDeAn,
   chiSoRows: [
     { label: "Số lượt cần phê duyệt", lan1: sumLan1.can, lan2: sumLan2.can, tong: sumTong.can },
     { label: "Số lượt đã phê duyệt", lan1: sumLan1.da, lan2: sumLan2.da, tong: sumTong.da },
     { label: "Số lượt chưa phê duyệt", lan1: sumLan1.chua, lan2: sumLan2.chua, tong: sumTong.chua }
   ],
   pieLan1: [
     { label: "Đã phê duyệt", count: sumLan1.da, percent: pctOf_(sumLan1.da, sumLan1.can) },
     { label: "Chưa phê duyệt", count: sumLan1.chua, percent: pctOf_(sumLan1.chua, sumLan1.can) }
   ],
   pieLan2: [
     { label: "Đã phê duyệt", count: sumLan2.da, percent: pctOf_(sumLan2.da, sumLan2.can) },
     { label: "Chưa phê duyệt", count: sumLan2.chua, percent: pctOf_(sumLan2.chua, sumLan2.can) }
   ],
   pieTong: [
     { label: "Đã phê duyệt", count: sumTong.da, percent: pctOf_(sumTong.da, sumTong.can) },
     { label: "Chưa phê duyệt", count: sumTong.chua, percent: pctOf_(sumTong.chua, sumTong.can) }
   ],
   // Khoi "So de an, sang kien" - CUNG 5 cot (STT/Chi so/Lan1/Lan2/Tong) nhung don vi la DE AN
   chiSoRowsDeAn: [
     { label: "Số đề án, sáng kiến cần phê duyệt", lan1: sumLan1DeAn.can, lan2: sumLan2DeAn.can, tong: sumTongDeAn.can },
     { label: "Số đề án, sáng kiến đã phê duyệt", lan1: sumLan1DeAn.da, lan2: sumLan2DeAn.da, tong: sumTongDeAn.da },
     { label: "Số đề án, sáng kiến chưa phê duyệt", lan1: sumLan1DeAn.chua, lan2: sumLan2DeAn.chua, tong: sumTongDeAn.chua }
   ],
   pieLan1DeAn: [
     { label: "Đã phê duyệt", count: sumLan1DeAn.da, percent: pctOf_(sumLan1DeAn.da, sumLan1DeAn.can) },
     { label: "Chưa phê duyệt", count: sumLan1DeAn.chua, percent: pctOf_(sumLan1DeAn.chua, sumLan1DeAn.can) }
   ],
   pieLan2DeAn: [
     { label: "Đã phê duyệt", count: sumLan2DeAn.da, percent: pctOf_(sumLan2DeAn.da, sumLan2DeAn.can) },
     { label: "Chưa phê duyệt", count: sumLan2DeAn.chua, percent: pctOf_(sumLan2DeAn.chua, sumLan2DeAn.can) }
   ],
   pieTongDeAn: [
     { label: "Đã phê duyệt", count: sumTongDeAn.da, percent: pctOf_(sumTongDeAn.da, sumTongDeAn.can) },
     { label: "Chưa phê duyệt", count: sumTongDeAn.chua, percent: pctOf_(sumTongDeAn.chua, sumTongDeAn.can) }
   ],
   details: details
 };
}




/**
* Bao cao (3): Ket qua phe duyet - CHI tinh de an/sang kien dang ky NAM HIEN TAI (giong het pham
* vi Bao cao 1/2). Nguon du lieu CHINH: Sheet DS_Deansangkien - noi da co san NC1/NC2/Diem TB
* moi lan (tinh sang boi cong thuc co san trong Sheet, khong can doc lai Phe_duyet_lan1/lan2 va
* tu ghep NC1/NC2 - nhanh hon nhieu). Rieng bieu do cot diem trung binh tung tieu chi BAT BUOC
* phai doc rieng 2 Sheet Phe_duyet_lan1/lan2, vi diem tung tieu chi (Diem1..Diem10) KHONG duoc
* luu lai o DS_Deansangkien (Sheet do chi co Tong diem/Diem TB, khong co diem tung tieu chi).
*
* QUY UOC (thieu du lieu -> hien "-", ap dung DOC LAP tung o, khong phai tat-ca-hoac-khong-gi):
* - NC1/NC2: neu o tuong ung trong Sheet dang trong (chua cham) -> hien "-".
* - Diem lech / Diem TB: CHI tinh khi CA HAI NC1 va NC2 deu da co gia tri; thieu 1 trong 2 ->
*   ca hai o Diem lech va Diem TB deu hien "-" (khong dung truc tiep gia tri Diem_TB_lan1/lan_2
*   co san trong Sheet cho truong hop nay, de dam bao nhat quan voi quy tac "chua du 2 phieu").
* - Duyet_Khongduyet: gia tri dung DUNG BANG "Duyệt" hoac "Không duyệt" (dung ten cot co san);
*   bat ky gia tri nao khac (rong, dang cho...) deu duoc xem la "chua co ket qua" va bi LOAI KHOI
*   MAU SO tinh % o khoi "Tong ket" (van hien trong danh sach chi tiet voi cot Ket qua = "-").
*/
function getReportPheDuyetKetQua(token) {
 const user = requireUser(token);
 if (!canAccessBaoCao(user)) {
   throw new Error("Bạn không có quyền xem báo cáo.");
 }




 const now = new Date();
 const currentYear = now.getFullYear();
 const prevYear = currentYear - 1;




 const deanData = getSheetData(CONFIG.SHEET_DEAN);
 const inScope = [];
 if (deanData.length >= 2) {
   const map = headerIndexMap(deanData[0]);
   if (("Madean_sangkien" in map) && ("Khoaphong" in map) && ("Tendean" in map)) {
     function numOrBlank_(row, key) {
       if (!(key in map)) return "";
       const v = row[map[key]];
       if (v === "" || v === null || v === undefined) return "";
       const n = parseFloat(v);
       return isNaN(n) ? "" : n;
     }
     deanData.slice(1).forEach(function (row) {
       const madean = String(row[map["Madean_sangkien"]] || "").trim();
       if (!madean) return;
       const group = classifyMaDeAn_(madean, currentYear, prevYear);
       if (group !== "newDeAn" && group !== "sangKien") return;
       inScope.push({
         madean: madean,
         khoaphong: String(row[map["Khoaphong"]] || "").trim(),
         tendean: String(row[map["Tendean"]] || "").trim(),
         loai: group === "newDeAn" ? "ĐA" : "SK",
         nc1Lan1: numOrBlank_(row, "Diem_cua_NC1"),
         nc2Lan1: numOrBlank_(row, "Diem_cua_NC2"),
         nc1Lan2: numOrBlank_(row, "Diem_cua_NC1_lan_2"),
         nc2Lan2: numOrBlank_(row, "Diem_cua_NC2_lan_2"),
         duyetKhongDuyet: "Duyet_Khongduyet" in map ? String(row[map["Duyet_Khongduyet"]] || "").trim() : ""
       });
     });
   }
 }




 // Xay 1 dong Danh sach chi tiet cho 1 lan cu the - Diem lech/Diem TB CHI tinh khi ca 2 deu co
 function buildDetailRow_(item, nc1, nc2) {
   const hasBoth = nc1 !== "" && nc2 !== "";
   return {
     khoaphong: item.khoaphong,
     tendean: item.tendean,
     nc1: nc1 === "" ? "-" : nc1,
     nc2: nc2 === "" ? "-" : nc2,
     diemLech: hasBoth ? Math.round(Math.abs(nc1 - nc2) * 10) / 10 : "-",
     diemTB: hasBoth ? Math.round(((nc1 + nc2) / 2) * 10) / 10 : "-",
     loai: item.loai
   };
 }




 function sortDetails_(list) {
   list.sort(function (a, b) {
     const c = a.khoaphong.localeCompare(b.khoaphong, "vi", { sensitivity: "base" });
     if (c !== 0) return c;
     return a.tendean.localeCompare(b.tendean, "vi", { sensitivity: "base" });
   });
   return list;
 }




 const detailsLan1 = sortDetails_(inScope.map(function (item) { return buildDetailRow_(item, item.nc1Lan1, item.nc2Lan1); }));
 const detailsLan2 = sortDetails_(inScope.map(function (item) { return buildDetailRow_(item, item.nc1Lan2, item.nc2Lan2); }));




 // Phan nhom Diem lech (rieng Lan 2) - CHI tinh tren de an DA DU 2 phieu (Diem lech khac "-").
 // "01-10" duoc hieu bao gom ca 0 (truong hop 2 nguoi cham diem giong het nhau).
 const diemLechBuckets = [
   { label: "Từ 01 đến 10 điểm", min: 0, max: 10, count: 0 },
   { label: "Từ 11 đến 20 điểm", min: 11, max: 20, count: 0 },
   { label: "Từ 21 đến 50 điểm", min: 21, max: 50, count: 0 },
   { label: "Trên 50 điểm", min: 51, max: Infinity, count: 0 }
 ];
 let tongCoDiemLech = 0;
 detailsLan2.forEach(function (row) {
   if (row.diemLech === "-") return;
   tongCoDiemLech++;
   const bucket = diemLechBuckets.find(function (b) { return row.diemLech >= b.min && row.diemLech <= b.max; });
   if (bucket) bucket.count++;
 });
 const diemLechGroups = diemLechBuckets.map(function (b) {
   return { label: b.label, count: b.count, percent: tongCoDiemLech > 0 ? Math.round((b.count / tongCoDiemLech) * 1000) / 10 : 0 };
 });




 // Diem trung binh tung tieu chi (Lan 1 va Lan 2), tach rieng DA va SK - phai doc rieng
 // Phe_duyet_lan1/lan2 vi diem tung tieu chi khong luu o DS_Deansangkien.
 function tieuChiAveragesForSheet_(sheetName) {
   const data = getSheetData(sheetName);
   const sums = { DA: new Array(10).fill(0), SK: new Array(10).fill(0) };
   const counts = { DA: 0, SK: 0 };
   if (data.length >= 2) {
     const map = headerIndexMap(data[0]);
     if ("Madean" in map) {
       data.slice(1).forEach(function (row) {
         const madean = String(row[map["Madean"]] || "").trim();
         if (!madean) return;
         const group = classifyMaDeAn_(madean, currentYear, prevYear);
         if (group !== "newDeAn" && group !== "sangKien") return;
         const loai = group === "newDeAn" ? "DA" : "SK";
         counts[loai]++;
         for (let i = 1; i <= 10; i++) {
           const key = "Diem" + i;
           sums[loai][i - 1] += key in map ? (parseFloat(row[map[key]]) || 0) : 0;
         }
       });
     }
   }
   function avgList_(loai, labels) {
     const n = counts[loai];
     return labels.map(function (label, i) {
       return { label: label, avg: n > 0 ? Math.round((sums[loai][i] / n) * 100) / 100 : 0 };
     });
   }
   return { da: avgList_("DA", PHEDUYET_TIEUCHI_DA), sk: avgList_("SK", PHEDUYET_TIEUCHI_SK) };
 }




 const tieuChiLan1 = tieuChiAveragesForSheet_(CONFIG.SHEET_PHEDUYET_LAN1);
 const tieuChiLan2 = tieuChiAveragesForSheet_(CONFIG.SHEET_PHEDUYET_LAN2);




 // Khoi "Tong ket" - Duyet/Khong duyet dua tren cot Duyet_Khongduyet (da chot san trong Sheet).
 // De an chua co gia tri hop le (rong/dang cho) bi LOAI KHOI MAU SO % nhung VAN hien trong
 // danh sach chi tiet (cot Ket qua = "-").
 let soDuyet = 0, soKhongDuyet = 0;
 const tongKetDetails = sortDetails_(inScope.map(function (item) {
   const kq = item.duyetKhongDuyet;
   if (kq === "Duyệt") soDuyet++;
   else if (kq === "Không duyệt") soKhongDuyet++;
   return { khoaphong: item.khoaphong, tendean: item.tendean, ketqua: (kq === "Duyệt" || kq === "Không duyệt") ? kq : "-" };
 }));
 const tongCoKetQua = soDuyet + soKhongDuyet;
 function pctKetQua_(n) { return tongCoKetQua > 0 ? Math.round((n / tongCoKetQua) * 1000) / 10 : 0; }




 return {
   currentYear: currentYear,
   detailsLan1: detailsLan1,
   detailsLan2: detailsLan2,
   diemLechGroups: diemLechGroups,
   tieuChiLan1: tieuChiLan1,
   tieuChiLan2: tieuChiLan2,
   tongKet: {
     items: [
       { label: "Số đề án, sáng kiến được duyệt", count: soDuyet, percent: pctKetQua_(soDuyet) },
       { label: "Số đề án, sáng kiến không được duyệt", count: soKhongDuyet, percent: pctKetQua_(soKhongDuyet) }
     ],
     details: tongKetDetails
   }
 };
}
