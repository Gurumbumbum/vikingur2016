const { GoogleSpreadsheet } = require("google-spreadsheet");

const SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc";
const SOURCE_URL = "https://vikingur.is/knattspyrna/leikir-og-urslit/";

const MONTHS_IS = {
  "janúar": 0, "febrúar": 1, "mars": 2, "apríl": 3, "maí": 4, "júní": 5,
  "júlí": 6, "ágúst": 7, "september": 8, "október": 9, "nóvember": 10, "desember": 11
};

async function scrapeMatches() {
  console.log(`Fetching HTML from ${SOURCE_URL}...`);
  const res = await fetch(SOURCE_URL);
  const html = await res.text();

  const matches = [];
  // Split by match-card to isolate each game
  const cards = html.split('<div class="match-card');
  
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];

    // 1. Extract Date (e.g., "Mánudagur 27. apríl")
    const dateMatch = card.match(/<strong[^>]*class="date"[^>]*>([\s\S]+?)<\/strong>/i);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1].replace(/<[^>]+>/g, "").trim();

    // 2. Extract Teams (from figcaptions)
    const teams = [...card.matchAll(/<figcaption[^>]*>([\s\S]+?)<\/figcaption>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    if (teams.length < 2) continue;
    const home = teams[0];
    const away = teams[1];

    // 3. Extract Competition (first <p> in footer)
    const footerParts = card.split(/<footer[^>]*>/i)[1]?.split(/<\/footer>/i)[0] || "";
    const pTags = [...footerParts.matchAll(/<p[^>]*>([\s\S]+?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    const competition = (pTags[0] || "").trim();

    // 4. Extract Time & Location (second <p> in footer: "19:15 | Víkingsvöllur")
    const timeLoc = (pTags[1] || "").trim();
    let time = "00:00";
    let location = "";
    if (timeLoc.includes("|")) {
      const parts = timeLoc.split("|").map(s => s.trim());
      time = parts[0] || "00:00";
      location = parts[1] || "";
    } else {
      time = timeLoc || "00:00";
    }

    // 5. Parse Date and Time into YYYY-MM-DD HH:mm
    const dateParts = dateStr.split(" ");
    if (dateParts.length < 3) continue;
    const dayNumeric = dateParts[1].replace(".", "").padStart(2, '0');
    const monthName = dateParts[2].toLowerCase();
    const month = String((MONTHS_IS[monthName] ?? 0) + 1).padStart(2, '0');
    const year = 2026; 

    // Robust time extraction
    let time = "00:00";
    if (timeLoc.includes("|")) {
      time = timeLoc.split("|")[0].trim();
    } else if (timeLoc.match(/\d{2}:\d{2}/)) {
      time = timeLoc.match(/\d{2}:\d{2}/)[0];
    }
    
    // Fallback if time is not confirmd
    if (!time || time === "-:-") time = "00:00";

    const formattedDate = `${year}-${month}-${dayNumeric} ${time}`;

    // 6. Filter: Only include first team games (Víkingur R.)
    // Avoid youth teams, women's team (unless specified), or different clubs
    const isVikingurR = home.includes("Víkingur R.") || away.includes("Víkingur R.");
    const isFirstTeam = competition.toLowerCase().includes("karla") || competition.toLowerCase().includes("besta deild");

    if (isVikingurR && isFirstTeam) {
      matches.push({
        Date: formattedDate,
        Home: home,
        Away: away,
        Location: location,
        Competition: competition
      });
    }
  }

  return matches.sort((a, b) => a.Date.localeCompare(b.Date));
}

(async () => {
  try {
    const matches = await scrapeMatches();
    console.log(`Found ${matches.length} Víkingur R. matches. Sorting chronologically...`);

    if (matches.length === 0) {
      console.log("No matches found — check if website structure changed.");
      return;
    }

    // Google Sheets Sync
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
    await sheet.setHeaderRow(["Date", "Home", "Away", "Location", "Competition"]);

    for (const match of matches) {
      await sheet.addRow(match);
    }

    console.log("Google Sheet updated successfully from Víkingur.is");

  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
})();
