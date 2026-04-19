const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

(async () => {
  try {
    console.log("Starting scraper...");

    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    const url =
      "https://www.ksi.is/leikir-felaga/felagslid/?club=2492&category=Fullor%C3%B0nir&dateFrom=2026-01-01&dateTo=2026-12-31";

    await page.goto(url, { waitUntil: "networkidle" });

    // 🔥 IMPORTANT: wait for actual table rows
    await page.waitForSelector("tr", { timeout: 15000 });

    const rows = await page.$$eval("tr", trs =>
      trs.map(tr => {
        const tds = tr.querySelectorAll("td");
        return Array.from(tds).map(td => td.innerText.trim());
      })
    );

    console.log("Raw rows scraped:", rows.length);

    // 🔥 KEEP ONLY REAL DATA ROWS
    const matches = rows.filter(r =>
      r &&
      r.length >= 4 &&
      r.some(cell => cell && cell.length > 3)
    );

    console.log("Valid matches:", matches.length);

    await browser.close();

    // -----------------------
    // GOOGLE SHEETS
    // -----------------------
    const doc = new GoogleSpreadsheet(SHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    await sheet.clear();

    await sheet.setHeaderRow([
      "Date",
      "Competition",
      "Home",
      "Away"
    ]);

    // -----------------------
    // WRITE DATA
    // -----------------------
    for (const r of matches) {
      await sheet.addRow({
        Date: r[0] || "",
        Competition: r[1] || "",
        Home: r[2] || "",
        Away: r[3] || ""
      });
    }

    console.log("Google Sheet updated successfully");

  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    process.exit(1);
  }
})();
