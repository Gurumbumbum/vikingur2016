import requests
import csv
import hashlib
from datetime import datetime, timedelta
import sys

# Google Sheets CSV export URL
SHEET_ID = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc"

def generate_ics(sheet_name, output_filename):
    # Map sheet name to GID (or just use sheet index if GID is unknown)
    # Since we use sheet names "Karla" and "Kvenna", we might need the GID.
    # However, for simplicity, we can also use the published CSV links if they are individual.
    # A better way is to use the TAB name in the export URL:
    # https://docs.google.com/spreadsheets/d/[ID]/gviz/tq?tqx=out:csv&sheet=[NAME]
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={sheet_name}"
    
    print(f"Fetching data for {sheet_name} from: {url}")
    
    try:
        response = requests.get(url)
        response.encoding = 'utf-8'
        lines = response.text.splitlines()
        reader = csv.DictReader(lines)
        
        ics_content = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Vikingur Calendar//EN",
            "CALSCALE:GREGORIAN",
            f"X-WR-CALNAME:Víkingur R. - {sheet_name}",
            "X-WR-TIMEZONE:UTC"
        ]
        
        for row in reader:
            # The CSV from gviz might have quoted values or headers that DictReader handles
            # Row keys: Date, Home, Away, Location, Competition
            date_str = row.get('Date', '').strip('"')
            home = row.get('Home', '').strip('"')
            away = row.get('Away', '').strip('"')
            location = row.get('Location', '').strip('"')
            competition = row.get('Competition', '').strip('"')
            
            if not date_str or not home:
                continue

            # Parse "2026-04-10 19:15"
            dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
            dt_end = dt + timedelta(hours=2) # Assume 2 hours per match
            
            # Stable UID based on Date and Teams
            uid_seed = f"{date_str}-{home}-{away}".encode('utf-8')
            uid = hashlib.md5(uid_seed).hexdigest() + "@vikingur.ics"
            
            ics_content.append("BEGIN:VEVENT")
            ics_content.append(f"UID:{uid}")
            ics_content.append(f"DTSTAMP:{datetime.now().strftime('%Y%MT%H%M%S')}")
            ics_content.append(f"DTSTART:{dt.strftime('%Y%m%dT%H%M%S')}")
            ics_content.append(f"DTEND:{dt_end.strftime('%Y%m%dT%H%M%S')}")
            ics_content.append(f"SUMMARY:{home} vs {away}")
            ics_content.append(f"LOCATION:{location}")
            ics_content.append(f"DESCRIPTION:{competition}")
            ics_content.append("END:VEVENT")
        
        ics_content.append("END:VCALENDAR")
        
        with open(output_filename, "w", encoding="utf-8") as f:
            f.write("\n".join(ics_content))
            
        print(f"Successfully generated {output_filename}")

    except Exception as e:
        print(f"Error generating {output_filename}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Default fallback
        generate_ics("Karla", "vikingur_karla.ics")
        generate_ics("Kvenna", "vikingur_kvenna.ics")
    else:
        generate_ics(sys.argv[1], sys.argv[2])
