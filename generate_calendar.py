import requests
import csv
from datetime import datetime
import hashlib

# Your Google Sheets CSV link
CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTKGm68TxaqhiVGe9Q37iDbt6sbPbltuwJlDcKziPNt0Ut4dBnlcn_DauwnlzmjkmGF_JwSf1PF_k5X/pub?output=csv"

def generate_uid(date, home, away):
    """Generate a stable UID for the event."""
    raw = f"{date}-{home}-{away}"
    return hashlib.md5(raw.encode()).hexdigest()

def main():
    try:
        print(f"Fetching CSV from {CSV_URL}...")
        response = requests.get(CSV_URL)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching sheet: {e}")
        return

    rows = csv.reader(response.text.splitlines())

    # Skip header row
    try:
        next(rows)
    except StopIteration:
        print("Sheet is empty")
        return

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Vikingur Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Víkingur R. Leikir",
        "X-WR-TIMEZONE:UTC"
    ]

    count = 0
    for i, row in enumerate(rows):
        # Safety check (prevents crashes)
        if len(row) < 3:
            continue

        try:
            date_str = row[0].strip()
            home = row[1].strip()
            away = row[2].strip()
            location = row[3].strip() if len(row) > 3 else ""
            competition = row[4].strip() if len(row) > 4 else ""

            if not date_str:
                continue

            # Parse date: 2026-03-31 14:00
            dt_obj = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
            dt_start = dt_obj.strftime("%Y%m%dT%H%M%S")
            
            # Assume 2 hour duration for safety if not specified
            import datetime as dt_mod
            dt_end = (dt_obj + dt_mod.timedelta(hours=2)).strftime("%Y%m%dT%H%M%S")

            uid = generate_uid(date_str, home, away)

            lines.append("BEGIN:VEVENT")
            lines.append(f"UID:{uid}@vikingur.ics")
            lines.append(f"DTSTAMP:{datetime.now().strftime('%Y%m%dT%H%M%S')}")
            lines.append(f"DTSTART:{dt_start}")
            lines.append(f"DTEND:{dt_end}")
            lines.append(f"SUMMARY:{home} vs {away}")
            lines.append(f"LOCATION:{location}")
            lines.append(f"DESCRIPTION:{competition}")
            lines.append("END:VEVENT")
            count += 1

        except Exception as e:
            print(f"Skipping row {i} due to error: {e}")
            continue

    lines.append("END:VCALENDAR")

    # Write ICS file
    try:
        with open("vikingur.ics", "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"Calendar generated successfully with {count} events.")
    except Exception as e:
        print(f"Error writing ICS file: {e}")

if __name__ == "__main__":
    main()
