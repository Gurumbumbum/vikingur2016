import requests
import csv
from datetime import datetime

# Your Google Sheets CSV link
CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTKGm68TxaqhiVGe9Q37iDbt6sbPbltuwJlDcKziPNt0Ut4dBnlcn_DauwnlzmjkmGF_JwSf1PF_k5X/pub?output=csv"

# Fetch sheet
response = requests.get(CSV_URL)
response.raise_for_status()

rows = csv.reader(response.text.splitlines())

# Skip header row
next(rows)

lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vikingur Calendar//EN"
]

for i, row in enumerate(rows):
    # Safety check (prevents crashes)
    if len(row) < 4:
        continue

    try:
        date = row[0].strip()
        home = row[1].strip()
        away = row[2].strip()
        location = row[3].strip()
        competition = row[4].strip() if len(row) > 4 else ""

        dt = datetime.strptime(date, "%Y-%m-%d %H:%M").strftime("%Y%m%dT%H%M%S")

        lines.append(f"""BEGIN:VEVENT
UID:vikingur-{i}
DTSTART:{dt}
SUMMARY:{home} vs {away}
LOCATION:{location}
DESCRIPTION:{competition}
END:VEVENT""")

    except Exception as e:
        # Skip broken rows instead of crashing
        print(f"Skipping row {i}: {row} بسبب {e}")
        continue

lines.append("END:VCALENDAR")

# Write ICS file
with open("vikingur.ics", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Calendar generated successfully")
