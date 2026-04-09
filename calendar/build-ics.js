const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { parse, format } = dateFns;

// 加载你的农历库
const lunarScript = fs.readFileSync('calendar/js/lunarCalendar.js', 'utf8');
eval(lunarScript);

// ==============================================
// 1. 抓取新加坡公假（自动年份）
// ==============================================
async function getSGHolidays() {
  const url = 'https://www.mom.gov.sg/employment-practices/public-holidays';
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const $ = cheerio.load(res.data);
  const events = [];

  $('.public-holiday__year').each((i, el) => {
    const yearText = $(el).find('h2').text().trim();
    const yearMatch = yearText.match(/20\d{2}/);
    if (!yearMatch) return;

    $(el).find('tbody tr').each((i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 2) return;

      let dateStr = $(tds[0]).text().trim();
      let name = $(tds[1]).text().trim();

      const replaceMatch = name.match(/\(\s*([A-Za-z]+, \d+ [A-Za-z]+ \d+)\s*\)/);
      if (replaceMatch) {
        dateStr = replaceMatch[1];
        name = name.replace(/\(.+\)/, '').trim() + ' (补假)';
      }

      try {
        const date = format(parse(dateStr, 'd MMM yyyy', new Date()), 'yyyy-MM-dd');
        events.push({ date, title: `新加坡·${name}` });
      } catch (e) {}
    });
  });

  return events;
}

// ==============================================
// 2. 遍历日期获取节气、节日（用你提供的 LunarCalendar）
// ==============================================
function getCNDays(years) {
  const events = [];

  for (const y of years) {
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= 31; d++) {
        try {
          const date = new Date(y, m, d);
          if (date.getMonth() !== m) continue;

          const lunar = LunarCalendar.solarToLunar(date);
          const dateStr = lunar.date;

          let title = '';
          if (lunar.isSolarTerm) title = `节气·${lunar.solarTerm}`;
          else if (lunar.isSolarFestival) title = `节日·${lunar.solarFestival}`;
          else if (lunar.isLunarFestival) title = `农历·${lunar.lunarFestival}`;
          else if (lunar.isOtherFestival) title = `节日·${lunar.otherFestival}`;

          if (title) {
            events.push({ date: dateStr, title });
          }
        } catch (e) {}
      }
    }
  }

  return events;
}

// ==============================================
// 3. 生成 ICS
// ==============================================
function makeICS(events) {
  let ics = `BEGIN:VCALENDAR
PRODID:-//BB1026//CN-SG Holiday//ZH
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:中新节气节假日日历
X-WR-TIMEZONE:Asia/Singapore
BEGIN:VTIMEZONE
TZID:Asia/Singapore
END:VTIMEZONE
`;

  events.forEach((e, i) => {
    const dt = e.date.replace(/-/g, '');
    ics += `BEGIN:VEVENT
DTSTART;VALUE=DATE:${dt}
DTEND;VALUE=DATE:${dt}
SUMMARY:${e.title}
UID:${dt}-${i}@bb1026
TRANSP:TRANSPARENT
END:VEVENT
`;
  });

  ics += 'END:VCALENDAR';
  fs.writeFileSync('calendar/sino-sg-holiday.ics', ics, 'utf8');
}

// ==============================================
// 执行
// ==============================================
(async () => {
  const now = new Date().getFullYear();
  const years = [now - 1, now, now + 1, now + 2, now + 3];

  const sg = await getSGHolidays();
  const cn = getCNDays(years);

  makeICS([...cn, ...sg]);
  console.log('✅ 生成完成：calendar/sino-sg-holiday.ics');
})();