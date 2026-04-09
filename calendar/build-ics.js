const fs = require('fs');
const vm = require('vm');
const axios = require('axios');
const cheerio = require('cheerio');
const { parse, format } = require('date-fns');

// 加载农历库（从仓库根目录找）
const lunarCode = fs.readFileSync('calendar/js/lunarCalendar.js', 'utf8');
vm.runInThisContext(lunarCode);

// 抓取新加坡公假，自动识别所有年份
async function fetchSGHolidays() {
  const url = 'https://www.mom.gov.sg/employment-practices/public-holidays';
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const $ = cheerio.load(res.data);
  const events = [];

  $('.public-holiday__year').each((i, yearEl) => {
    const yearText = $(yearEl).find('h2').text().trim();
    const yearMatch = yearText.match(/20\d{2}/);
    if (!yearMatch) return;

    $(yearEl).find('tbody tr').each((i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 2) return;

      let rawDate = $(tds[0]).text().trim();
      let name = $(tds[1]).text().trim();

      const replaceMatch = name.match(/\(\s*([A-Za-z]+,\s*\d+\s+[A-Za-z]+\s+\d{4})\s*\)/);
      if (replaceMatch) {
        rawDate = replaceMatch[1];
        name = name.replace(/\(.+\)/, '').trim() + ' (补假)';
      }

      try {
        const dateObj = parse(rawDate, 'd MMM yyyy', new Date());
        const date = format(dateObj, 'yyyy-MM-dd');
        events.push({ date, title: `新加坡·${name}` });
      } catch (e) {}
    });
  });

  return events;
}

// 中国节气、农历节日、法定假日（自动年份）
function getCNEvents() {
  const events = [];
  const currentYear = new Date().getFullYear();
  const years = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
    currentYear + 3,
    currentYear + 4,
    currentYear + 5
  ];

  years.forEach(y => {
    for (let m = 1; m <= 12; m++) {
      try {
        const days = lunarSolar(y, m);
        days.forEach(day => {
          const date = `${y}-${String(m).padStart(2, '0')}-${String(day.k).padStart(2, '0')}`;
          if (day.jq) events.push({ date, title: `节气·${day.jq}` });
          if (day.lunarFestival) events.push({ date, title: `农历·${day.lunarFestival}` });
        });
      } catch (e) {}
    }

    try {
      const cnHoliday = getChinaHoliday(y);
      Object.entries(cnHoliday).forEach(([date, name]) => {
        events.push({ date, title: `中国·${name}` });
      });
    } catch (e) {}
  });

  return events;
}

// 生成 ICS 到 calendar/sino-sg-holiday.ics
function generateICS(events) {
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
  console.log('✅ ICS 已生成：calendar/sino-sg-holiday.ics');
}

// 执行
(async () => {
  try {
    const sg = await fetchSGHolidays();
    const cn = getCNEvents();
    generateICS([...cn, ...sg]);
  } catch (err) {
    console.error('❌ 错误：', err);
    process.exit(1);
  }
})();