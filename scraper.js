const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

(async () => {
  try {
    console.log("Starting scraper...");

    // -----------------------
    // Load credentials
    // -----------------------
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    // -----------------------
    // SCRAPE KSÍ
    // -----------------------
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

    // -----------------------
    // GOOGLE SHEETS (FIXED API v4)
    // -----------------------
    const doc = new GoogleSpreadsheet(SHEET_ID);

    // NEW METHOD (this replaces useServiceAccountAuth)
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    // Clear old data
    await sheet.clear();

    // Set headers
    await sheet.setHeaderRow([
      "DateTime",
      "Competition",
      "Home",
      "Away"
    ]);

    // -----------------------
    // WRITE DATA
    // -----------------------
    for (const r of rows) {
      if (!r || r.length < 5) continue;

      await sheet.addRow({
        DateTime: r[0],
        Competition: r[1],
        Home: r[2],
        Away: r[4]
      });
    }

    console.log("Google Sheet updated successfully");

  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    process.exit(1);
  }
})();
