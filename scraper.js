const { GoogleSpreadsheet } = require("google-spreadsheet");

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";
const VIKINGUR_ID = 5364; // Based on observed API data

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
      // Check if it's a Víkingur match using ID or description
      const isVikingurHome = match.homeTeam === VIKINGUR_ID;
      const isVikingurAway = match.awayTeam === VIKINGUR_ID;
      const descMatches = (match.matchDescription || "").toLowerCase().includes("víkingur");

      return isVikingurHome || isVikingurAway || descMatches;
    });

    console.log("Víkingur matches found:", vikingurMatches.length);

    if (vikingurMatches.length === 0) {
      console.log("No matches found — check if API structure changed or Víkingur ID is correct.");
      return;
    }

    // 3. GOOGLE SHEETS AUTH
    if (!process.env.GOOGLE_CREDENTIALS) {
      throw new Error("Missing GOOGLE_CREDENTIALS environment variable");
    }
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
      "Location",
      "Competition"
    ]);

    // 4. WRITE DATA
    for (const match of vikingurMatches) {
      // Parse matchDescription for names if homeTeam/awayTeam are just IDs
      // Description format: "Home - Away Result"
      let home = "Unknown";
      let away = "Unknown";
      
      const desc = match.matchDescription || "";
      const teamPart = desc.split(/[0-9:]/)[0]; // Get everything before the score
      if (teamPart.includes("-")) {
        const parts = teamPart.split("-").map(s => s.trim());
        home = parts[0] || "Unknown";
        away = parts[1] || "Unknown";
      }

      // Format date
      const dt = new Date(match.matchDate);
      const day = String(dt.getDate()).padStart(2, '0');
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const year = dt.getFullYear();
      const hours = String(dt.getHours()).padStart(2, '0');
      const minutes = String(dt.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;

      await sheet.addRow({
        Date: formattedDate,
        Home: home,
        Away: away,
        Location: match.facility || "",
        Competition: match.name || ""
      });
    }

    console.log("Google Sheet updated successfully");

  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
})();
