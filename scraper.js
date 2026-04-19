const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url = "https://www.ksi.is/leikir-felaga/felagslid/?club=2492&category=Fullor%C3%B0nir&dateFrom=2026-01-01&dateTo=2026-12-31";

  await page.goto(url, { waitUntil: "networkidle" });

  await page.waitForTimeout(5000);

  const rows = await page.$$eval("table tbody tr", trs =>
    trs.map(tr => {
      const tds = tr.querySelectorAll("td");
      return Array.from(tds).map(td => td.innerText.trim());
    })
  );

  console.log("Matches found:", rows.length);

  rows.forEach(r => console.log(r));

  await browser.close();
})();
