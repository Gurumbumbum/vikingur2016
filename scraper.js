const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

(async () => {
  try {
    console.log("Starting scraper...");

    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    const browser = await chromium.launch({
      headless: true
    });

    const page = await browser.newPage();

    const url =
      "https://www.ksi.is/leikir-felaga/felagslid/?club=2492&category=Fullor%C3%B0nir&dateFrom=2026-01-01&dateTo=2026-12-31";

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // 🔥 WAIT FOR REAL CONTENT (IMPORTANT FIX)
    await page.waitForTimeout(10000);

    // 🔥 DEBUG: confirm page is actually loaded
    const title = await page.title();
    console.log("Page title:", title);

    const rows = await page.evaluate(() => {
      const trs = document.querySelectorAll("tr");

      return Array.from(trs)
        .map(tr => {
          const tds = tr.querySelectorAll("td");
          return Array.from(tds).map(td => td.innerText.trim());
        })
        .filter(r => r && r.length >= 4);
    });

    await browser.close();

    console.log("Rows found:", rows.length);

    if (rows.length === 0) {
      console.log("❌ No data found — page is JS-rendered or blocked.");
    }

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

    for (const r of rows) {
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
