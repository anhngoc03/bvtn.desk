function doGet(e) {
  return HtmlService
    .createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Hệ thống đề án, sáng kiến cải tiến chất lượng")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}




// Dung de nhung 1 file HTML khac vao Index.html, vd: <?!= include('Stylesheet'); ?>
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
