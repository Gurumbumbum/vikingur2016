const fetch = require("node-fetch");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";

(async () => {
  try {
    console.log("Fetching matches from API...");

    // 1. FETCH DATA FROM API
    const res = await fetch(
      "https://bestadeildin.is/API/ksi_leikir.php?deild=karla"
    );

    const data = await res.json();

    console.log("Total matches from API:", data.length);

    // 2. FILTER VÍKINGUR MATCHES
    const vikingurMatches = data.filter(match => {
      const home = (match.home || "").toLowerCase();
      const away = (match.away || "").toLowerCase();

      return (
        home.includes("víkingur") ||
        away.includes("víkingur")
      );
    });

    console.log("Víkingur matches found:", vikingurMatches.length);

    if (vikingurMatches.length === 0) {
      console.log("No matches found — check API structure.");
      return;
    }

    // 3. GOOGLE SHEETS AUTH
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    const doc = new GoogleSpreadsheet(SHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, "\n"),
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    await sheet.clear();

    await sheet.setHeaderRow([
      "Date",
      "Home",
      "Away",
      "Competition"
    ]);

    // 4. WRITE DATA
    for (const match of vikingurMatches) {
      await sheet.addRow({
        Date: match.date || match.time || "",
        Home: match.home || "",
        Away: match.away || "",
        Competition: match.competition || ""
      });
    }

    console.log("Google Sheet updated successfully");

  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
})();
