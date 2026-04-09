import fetch from "node-fetch"

export async function getSingapore(year) {
  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/SG`
  )
  const data = await res.json()

  return applyObserved(
    data.map(d => ({
      name: d.localName,
      date: d.date,
      description: "Singapore Public Holiday"
    }))
  )
}

function applyObserved(events) {
  const result = [...events]
  for (const e of events) {
    const d = new Date(e.date)
    if (d.getDay() === 0) {
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      result.push({
        name: e.name + " (Observed)",
        date: next.toISOString().slice(0, 10),
        description: "Substitute Holiday"
      })
    }
  }
  return result
}
