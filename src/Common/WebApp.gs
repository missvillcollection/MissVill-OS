/**
 * เปิดหน้า MissVill OS เมื่อเข้าผ่าน Web App หรือ LIFF
 */
function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("MissVill OS")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}