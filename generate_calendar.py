import os
import json
import hashlib
from datetime import datetime, timedelta
import sys
import gspread
from google.oauth2.service_account import Credentials

def generate_ics(sheet_name, output_filename):
    print(f"Generating calendar for: {sheet_name}")
    
    try:
        # 1. Setup Authentication (same as scraper.js)
        creds_json = os.environ.get('GOOGLE_CREDENTIALS')
        if not creds_json:
            print("ERROR: GOOGLE_CREDENTIALS environment variable not set.")
            return

        creds_dict = json.loads(creds_json)
        scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
        client = gspread.authorize(creds)

        # 2. Open Sheet
        doc_id = "1Bbbwh0tWFtg8lJGJ4MV4noFVqe-Nh_F7XL334A1jIcc"
        doc = client.open_by_key(doc_id)
        sheet = doc.worksheet(sheet_name)
        
        # 3. Get all records
        records = sheet.get_all_records()
        print(f"Found {len(records)} records in {sheet_name} tab.")
        
        ics_content = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Vikingur Calendar//EN",
            "CALSCALE:GREGORIAN",
            f"X-WR-CALNAME:Víkingur R. - {sheet_name}",
            "X-WR-TIMEZONE:UTC"
        ]
        
        for row in records:
            # Row keys: Date, Home, Away, Location, Competition
            date_str = str(row.get('Date', '')).strip()
            home = str(row.get('Home', '')).strip()
            away = str(row.get('Away', '')).strip()
            location = str(row.get('Location', '')).strip()
            competition = str(row.get('Competition', '')).strip()
            
            if not date_str or not home:
                continue

            try:
                # Parse "2026-04-10 19:15"
                dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
                dt_end = dt + timedelta(hours=2)
                
                # Stable UID
                uid_seed = f"{date_str}-{home}-{away}".encode('utf-8')
                uid = hashlib.md5(uid_seed).hexdigest() + "@vikingur.ics"
                
                ics_content.append("BEGIN:VEVENT")
                ics_content.append(f"UID:{uid}")
                ics_content.append(f"DTSTAMP:{datetime.now().strftime('%Y%m%dT%H%M%SZ')}")
                ics_content.append(f"DTSTART:{dt.strftime('%Y%m%dT%H%M%SZ')}")
                ics_content.append(f"DTEND:{dt_end.strftime('%Y%m%dT%H%M%SZ')}")
                ics_content.append(f"SUMMARY:{home} vs {away}")
                ics_content.append(f"LOCATION:{location}")
                ics_content.append(f"DESCRIPTION:{competition}")
                ics_content.append("END:VEVENT")
            except Exception as parse_err:
                print(f"Skipping row due to date error: {date_str} - {parse_err}")
        
        ics_content.append("END:VCALENDAR")
        
        with open(output_filename, "w", encoding="utf-8") as f:
            f.write("\n".join(ics_content))
            
        print(f"Successfully generated {output_filename}")

    except Exception as e:
        print(f"Error generating {output_filename}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        generate_ics("Karla", "vikingur_karla.ics")
        generate_ics("Kvenna", "vikingur_kvenna.ics")
    else:
        generate_ics(sys.argv[1], sys.argv[2])
