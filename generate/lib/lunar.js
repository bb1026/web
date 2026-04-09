// lib/lunar.js
import { getCalendar } from "../calendar/js/lunarCalendar.js"

export async function getLunar(year) {
  if (typeof getCalendar === "function") {
    return getCalendar(year)
  }
  return []
}
