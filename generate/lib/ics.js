function formatDate(dateStr) {
  return dateStr.replaceAll("-", "")
}

function nextDay(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function buildICS(events) {
  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Calendar API//EN
`

  for (const e of events) {
    const start = formatDate(e.date)
    const end = formatDate(nextDay(e.date))

    ics += `BEGIN:VEVENT
UID:${e.date}-${e.name}@calendar
DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z
SUMMARY:${e.name}
DTSTART;VALUE=DATE:${start}
DTEND;VALUE=DATE:${end}
DESCRIPTION:${e.description || ""}
END:VEVENT
`
  }

  ics += "END:VCALENDAR"
  return ics
}
