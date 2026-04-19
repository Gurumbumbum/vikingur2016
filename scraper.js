const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// YOUR SHEET ID
const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

(async () => {
  // 1. SCRAPE KSÍ
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url =
    "https://www.ksi.is/leikir-felaga/felagslid/?club=2492&category=Fullor%C3%B0nir&dateFrom=2026-01-01&dateTo=2026-12-31";

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  const rows = await page.$$eval("table tbody tr", trs =>
    trs.map(tr => {
      const tds = tr.querySelectorAll("td");
      return Array.from(tds).map(td => td.innerText.trim());
    })
  );

  await browser.close();

  console.log("Matches found:", rows.length);

  // 2. CONNECT TO GOOGLE SHEETS
  const doc = new GoogleSpreadsheet(SHEET_ID);

  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  // clear old data
  await sheet.clearRows();

  // headers
  await sheet.setHeaderRow([
    "DateTime",
    "Competition",
    "Home",
    "Away"
  ]);

  // 3. WRITE DATA
  for (const r of rows) {
    if (r.length < 5) continue;

    try {
      await sheet.addRow({
        DateTime: r[0],
        Competition: r[1],
        Home: r[2],
        Away: r[4]
      });
    } catch (err) {
      console.log("Skipping row:", r, err.message);
    }
  }

  console.log("Google Sheet updated successfully");
})();
