const { chromium } = require('playwright');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

function isValidMatch(text) {
  const t = text.toLowerCase();

  // must include Vikingur
  if (!t.includes("víkingur")) return false;

  // must include at least one opponent (basic filter: letters > numbers)
  const hasOpponent =
    /[a-záéíóúþæðö]/i.test(text.replace(/víkingur/gi, ""));

  return hasOpponent;
}

(async () => {
  try {
    console.log("Starting scraper...");

    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    const url =
      "https://www.ksi.is/leikir-felaga/felagslid/?club=2492&category=Fullor%C3%B0nir&dateFrom=2026-01-01&dateTo=2026-12-31";

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);

    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("tr"))
        .map(tr => tr.innerText.trim())
        .filter(t => t && t.length > 3);
    });

    await browser.close();

    console.log("Total rows:", rows.length);

    // 🔥 KEEP ONLY VÍKINGUR MATCHES
    const matches = rows.filter(isValidMatch);

    console.log("Víkingur matches found:", matches.length);

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
      "Match"
    ]);

    for (const m of matches) {
      await sheet.addRow({
        Match: m
      });
    }

    console.log("Google Sheet updated successfully");

  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    process.exit(1);
  }
})();
