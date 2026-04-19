from datetime import datetime

fixtures = [
    ("2026-04-10 20:15", "Vikingur vs Breidablik", "Víkingsvöllur, Reykjavík"),
    ("2026-04-17 18:30", "KA Akureyri vs Vikingur", "Akureyri"),
]

lines = ["BEGIN:VCALENDAR", "VERSION:2.0"]

for i, (dt, title, loc) in enumerate(fixtures):
    dt = datetime.strptime(dt, "%Y-%m-%d %H:%M").strftime("%Y%m%dT%H%M%S")

    lines.append(f"""BEGIN:VEVENT
UID:vikingur-{i}
DTSTART:{dt}
SUMMARY:{title}
LOCATION:{loc}
END:VEVENT""")

lines.append("END:VCALENDAR")

with open("vikingur.ics", "w") as f:
    f.write("\n".join(lines))
