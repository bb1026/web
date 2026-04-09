const lunarUrl = "https://0515364.xyz/calendar/js/lunarCalendar.js"

export async function getLunar(year) {
  const res = await fetch(lunarUrl)
  const code = await res.text()

  const module = {}
  const exports = {}
  eval(code) // lunarCalendar.js 必须导出 getCalendar(year)

  if (typeof module.getCalendar === "function") {
    return module.getCalendar(year)
  }

  return []
}
