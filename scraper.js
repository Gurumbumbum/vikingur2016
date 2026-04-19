const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

(async () => {
  try {
    console.log("Starting scraper...");

    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    // -----------------------
    // SCRAPE KSÍ (already filtered to Víkingur)
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

    console.log("Raw rows:", rows.length);

    // -----------------------
    // FILTER ONLY REAL MATCH ROWS
    // -----------------------
    const matches = rows.filter(r =>
      r &&
      r.length >= 4 &&
      r[0] && r[0].length > 3 &&   // date exists
      r[1] && r[2] && r[3]         // teams exist
    );

    console.log("Clean matches:", matches.length);

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
    for (const m of matches) {
      await sheet.addRow({
        Date: m[0] || "",
        Competition: m[1] || "",
        Home: m[2] || "",
        Away: m[3] || ""
      });
    }

    console.log("Google Sheet updated successfully");

  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    process.exit(1);
  }
})();
