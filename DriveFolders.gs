// ==========================================================
// CAC THU MUC GOOGLE DRIVE DUNG DE LUU FILE CUA HE THONG
// - Day la file DUY NHAT can sua moi khi doi/tao thu muc Drive moi (vd sang nam moi).
// - KHONG can dung/sua Config.gs - chi can sua 3 dong id o duoi day, roi luu lai.
// - Cach lay ID: mo thu muc Drive -> nhin duong dan tren trinh duyet, dang
//   https://drive.google.com/drive/folders/<ID_O_DAY> -> copy dung phan <ID_O_DAY>.
//
// LUU Y KY THUAT: co tinh dung 1 HAM (function) thay vi 1 bien (const) o day, vi Apps Script
// nap tat ca cac file .gs cua du an theo thu tu ten file (bang chu cai) truoc khi chay - neu
// dung "const" o day va "Config.gs" (chu C, dung truoc chu D trong bang chu cai) co the doc
// bien nay TRUOC KHI file nay kip chay, se bao loi. Dung ham thi KHONG bi loi nay, vi ham trong
// Apps Script luon san sang de goi bat ke thu tu file nao.
// ==========================================================
function getDriveFolderIds_() {
  return {
    // Thu muc luu file minh chung o man hinh "Cap nhat tien do thuc hien"
    TIEN_DO: "1bS07Pm6yPxSuX9i9q2UWknKIf6y0m8lv",

    // Thu muc luu file dinh kem khi nop phieu o man hinh "Dang ky"
    DANG_KY: "1nwA7u-eYnDBLZhIqlYb2NQo13hMIZ_1i",

    // Thu muc luu file dinh kem o man hinh "Gui lai sau phe duyet"
    NOP_LAN_2: "1HzR3-F8nSZxZLaInMmHbm_UxrfHZFN-b",

    // Thu muc luu file dinh kem o man hinh "Gui ban hoan chinh" (File_chot)
    FILE_CHOT: "1aaS3Ey33woILZegVA8XeAP97OWS80WlL",

    // Thu muc luu file dinh kem o man hinh "Bao cao nghiem thu" (BC_nghiemthu)
    BC_NGHIEM_THU: "1GVNW6A7OMc9B0QOW7Ho13N5CsPbT7Fi6"
  };
}
