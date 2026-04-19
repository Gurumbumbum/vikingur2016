const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

(async () => {
  try {
    console.log("Starting scraper...");

    // -----------------------------
    // 1. GOOGLE CREDENTIALS (GitHub Secret)
    // -----------------------------
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    // -----------------------------
    // 2. SCRAPE KSÍ
    // -----------------------------
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

    // -----------------------------
    // 3. CONNECT TO GOOGLE SHEETS (NEW API)
    // -----------------------------
    const doc = new GoogleSpreadsheet(SHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    // Clear old data (new API safe method)
    await sheet.clear();

    // Set headers
    await sheet.setHeaderRow([
      "DateTime",
      "Competition",
      "Home",
      "Away"
    ]);

    // -----------------------------
    // 4. WRITE DATA
    // -----------------------------
    for (const r of rows) {
      if (!r || r.length < 5) continue;

      try {
        await sheet.addRow({
          DateTime: r[0],
          Competition: r[1],
          Home: r[2],
          Away: r[4]
        });
      } catch (err) {
        console.log("Skipping row:", r);
      }
    }

    console.log("Google Sheet updated successfully");

  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    process.exit(1);
  }
})();
