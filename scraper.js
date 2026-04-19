const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

function cleanRow(r) {
  if (!r || r.length < 3) return null;

  return {
    Date: r[0] || "",
    Competition: r[1] || "",
    Home: r[2] || "",
    Away: r[r.length - 1] || ""
  };
}

(async () => {
  try {
    console.log("Starting scraper...");

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

    console.log("Raw rows:", rows.length);

    // -----------------------
    // CLEAN ROWS (NO OVER-FILTERING)
    // -----------------------
    const matches = rows
      .map(cleanRow)
      .filter(r =>
        r &&
        r.Date &&
        r.Competition &&
        r.Home &&
        r.Away &&
        r.Date.length > 5
      );

    console.log("Valid matches:", matches.length);

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
      await sheet.addRow(m);
    }

    console.log("Google Sheet updated successfully");

  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    process.exit(1);
  }
})();
