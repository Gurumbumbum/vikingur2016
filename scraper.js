const { GoogleSpreadsheet } = require("google-spreadsheet");

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";
const VIKINGUR_ID = 5364; // Víkingur Reykjavík

// List of API endpoints to fetch from to ensure full coverage
const ENDPOINTS = [
  "https://bestadeildin.is/API/ksi_leikir.php?deild=karla",      // General Men's leagues
  "https://bestadeildin.is/API/ksi_leikir.php?felag=5364",       // All Víkingur R. club matches
  "https://bestadeildin.is/API/ksi_leikir.php?id=7059683",       // Mjólkurbikarinn 2026 (Cup)
  "https://bestadeildin.is/API/ksi_leikir.php?id=7025605",       // Meistarakeppni 2026 (Super Cup)
];

(async () => {
  try {
    console.log("Fetching matches from multiple API sources...");

    const allMatchesMap = new Map();

    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url);
        const data = await res.json();
        console.log(`Fetched ${data.length} matches from: ${url}`);

        for (const match of data) {
          // Check if it's a Víkingur REYKJAVÍK match
          const isVikingurHome = match.homeTeam === VIKINGUR_ID;
          const isVikingurAway = match.awayTeam === VIKINGUR_ID;
          
          // Refined text search: must include "Víkingur R" or NOT include "Ó."
          const desc = (match.matchDescription || "").toLowerCase();
          const mentionsVikingur = desc.includes("víkingur");
          const mentionsReykjavik = desc.includes("víkingur r.");
          const isOlafsvik = desc.includes("víkingur ó.") || desc.includes("víkingur ólafs");

          // We include if IDs match OR (it mentions Víkingur AND is not Ólafsvík)
          if (isVikingurHome || isVikingurAway || (mentionsVikingur && !isOlafsvik)) {
            const key = match.matchId || match.id || `${match.matchDate}-${match.matchDescription}`;
            allMatchesMap.set(key, match);
          }
        }
      } catch (e) {
        console.warn(`Could not fetch from ${url}: ${e.message}`);
      }
    }

    const vikingurMatches = Array.from(allMatchesMap.values())
      .sort((a, b) => a.matchDate - b.matchDate);

    console.log(`Total unique Víkingur R. matches found: ${vikingurMatches.length}`);

    if (vikingurMatches.length === 0) {
      console.log("No matches found.");
      return;
    }

    // Google Sheets Auth
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
      const scoreMatch = desc.match(/\s+([0-9]+:[0-9]+|-:-)$/);
      const namesOnly = scoreMatch ? desc.substring(0, scoreMatch.index) : desc;
      
      if (namesOnly.includes(" - ")) {
        const parts = namesOnly.split(" - ").map(s => s.trim());
        home = parts[0] || "Unknown";
        away = parts[1] || "Unknown";
      } else {
          home = namesOnly;
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

    console.log("Google Sheet updated (filtered for Víkingur R. only).");

  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
})();
