import fs from "fs"
import path from "path"
import { getSingapore } from "../lib/sg.js"
import { getLunar } from "../lib/lunar.js"
import { buildICS } from "../lib/ics.js"

const OUT_DIR = path.resolve("calendar")

async function generateYear(year) {
  let events = []

  // 🇸🇬 新加坡节假日
  const sg = await getSingapore(year)
  events.push(...sg)

  // 🌙 农历 & 节气
  const lunarEvents = await getLunar(year)
  events.push(...lunarEvents)

  const ics = buildICS(events)
  fs.writeFileSync(`${OUT_DIR}/${year}.ics`, ics)
  console.log(`Generated: ${OUT_DIR}/${year}.ics`)
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR)

  const now = new Date().getFullYear()
  const years = [now, now + 1]

  for (const y of years) {
    await generateYear(y)
  }
}

main()
