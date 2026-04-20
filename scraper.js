const { GoogleSpreadsheet } = require("google-spreadsheet");

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";
const VIKINGUR_ID = 5364; 

(async () => {
  try {
    console.log("Fetching matches from API...");

    const res = await fetch(
      "https://bestadeildin.is/API/ksi_leikir.php?deild=karla"
    );

    const data = await res.json();
    console.log("Total matches from API:", data.length);

    const vikingurMatches = data.filter(match => {
      const isVikingurHome = match.homeTeam === VIKINGUR_ID;
      const isVikingurAway = match.awayTeam === VIKINGUR_ID;
      const descMatches = (match.matchDescription || "").toLowerCase().includes("víkingur");
      return isVikingurHome || isVikingurAway || descMatches;
    });

    console.log("Víkingur matches found:", vikingurMatches.length);

    if (vikingurMatches.length === 0) {
      console.log("No matches found.");
      return;
    }

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

    for (const match of vikingurMatches) {
      let home = "Unknown";
      let away = "Unknown";
      
      const desc = match.matchDescription || "";
      // Robust split: Match everything before the score (e.g. "4:0" or "-:-")
      // We look for the first occurrence of " [score] " or just the score at the end
      const scoreMatch = desc.match(/\s+([0-9]+:[0-9]+|-:-)$/);
      const namesOnly = scoreMatch ? desc.substring(0, scoreMatch.index) : desc;
      
      if (namesOnly.includes(" - ")) {
        const parts = namesOnly.split(" - ").map(s => s.trim());
        home = parts[0] || "Unknown";
        away = parts[1] || "Unknown";
      }

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
