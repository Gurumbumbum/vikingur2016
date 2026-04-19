import requests
import csv
from datetime import datetime

CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTKGm68TxaqhiVGe9Q37iDbt6sbPbltuwJlDcKziPNt0Ut4dBnlcn_DauwnlzmjkmGF_JwSf1PF_k5X/pub?gid=0&single=true&output=csv"

data = requests.get(CSV_URL).text
rows = csv.reader(data.splitlines())

next(rows)  # skip header

lines = ["BEGIN:VCALENDAR", "VERSION:2.0"]

for i, row in enumerate(rows):
    date, home, away, location, competition = row

    dt = datetime.strptime(date, "%Y-%m-%d %H:%M").strftime("%Y%m%dT%H%M%S")

    lines.append(f"""BEGIN:VEVENT
UID:vikingur-{i}
DTSTART:{dt}
SUMMARY:{home} vs {away}
LOCATION:{location}
DESCRIPTION:{competition}
END:VEVENT""")

lines.append("END:VCALENDAR")

with open("vikingur.ics", "w") as f:
    f.write("\n".join(lines))
