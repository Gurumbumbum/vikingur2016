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

  const karla = [];
  const kvenna = [];

  const cards = html.split('<div class="match-card');
  
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];

    const dateMatch = card.match(/<strong[^>]*class="date"[^>]*>([\s\S]+?)<\/strong>/i);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1].replace(/<[^>]+>/g, "").trim();

    const teams = [...card.matchAll(/<figcaption[^>]*>([\s\S]+?)<\/figcaption>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    if (teams.length < 2) continue;
    const home = teams[0];
    const away = teams[1];

    const footerParts = card.split(/<footer[^>]*>/i)[1]?.split(/<\/footer>/i)[0] || "";
    const pTags = [...footerParts.matchAll(/<p[^>]*>([\s\S]+?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
    const competition = (pTags[0] || "").trim();

    const timeLoc = (pTags[1] || "").trim();
    let time = "00:00";
    let location = "";
    if (timeLoc.includes("|")) {
      const parts = timeLoc.split("|").map(s => s.trim());
      time = parts[0] || "00:00";
      location = parts[1] || "";
    } else if (timeLoc.match(/\d{2}:\d{2}/)) {
      time = timeLoc.match(/\d{2}:\d{2}/)[0];
    }
    
    if (!time || time === "-:-") time = "00:00";

    // Set location to Víkin for home games
    if (home.includes("Víkingur R.")) {
      location = "Víkin";
    }

    const dateParts = dateStr.split(" ");
    if (dateParts.length < 3) continue;
    const dayNumeric = dateParts[1].replace(".", "").padStart(2, '0');
    const monthName = dateParts[2].toLowerCase();
    const month = String((MONTHS_IS[monthName] ?? 0) + 1).padStart(2, '0');
    const year = 2026; 

    const formattedDate = `${year}-${month}-${dayNumeric} ${time}`;

    const isKarla = competition.toLowerCase().includes("karla") || (competition.toLowerCase().includes("besta deild") && !competition.toLowerCase().includes("kvenna"));
    const isKvenna = competition.toLowerCase().includes("kvenna");

    if (home.includes("Víkingur R.") || away.includes("Víkingur R.")) {
        const matchObj = { Date: formattedDate, Home: home, Away: away, Location: location, Competition: competition };
        if (isKarla) karla.push(matchObj);
        else if (isKvenna) kvenna.push(matchObj);
    }
  }

  return { 
    karla: karla.sort((a, b) => a.Date.localeCompare(b.Date)),
    kvenna: kvenna.sort((a, b) => a.Date.localeCompare(b.Date))
  };
}

async function updateSheet(doc, sheetName, data) {
  let sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) {
    sheet = await doc.addSheet({ title: sheetName });
  }
  await sheet.clear();
  await sheet.setHeaderRow(["Date", "Home", "Away", "Location", "Competition"]);
  for (const row of data) {
    await sheet.addRow(row);
  }
}

(async () => {
  try {
    const { karla, kvenna } = await scrapeMatches();
    console.log(`Found ${karla.length} Karla matches and ${kvenna.length} Kvenna matches.`);

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
    
    // Ensure "Karla" is the first sheet and "Kvenna" exists
    await updateSheet(doc, "Karla", karla);
    await updateSheet(doc, "Kvenna", kvenna);

    console.log("Google Sheets updated successfully.");

  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
})();
