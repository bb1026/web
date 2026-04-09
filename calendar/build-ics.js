const fs = require('fs');

// 加载你的农历库
const lunarCode = fs.readFileSync('calendar/js/lunarCalendar.js', 'utf8');
eval(lunarCode);

// 生成中国节日、节气
function getCNEvents(years) {
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

          if (lunar.isSolarTerm) {
            title = `节气 ${lunar.solarTerm}`;
          } else if (lunar.isSolarFestival) {
            title = lunar.solarFestival;
          } else if (lunar.isLunarFestival) {
            title = lunar.lunarFestival;
          } else if (lunar.isOtherFestival) {
            title = lunar.otherFestival;
          }

          if (title) {
            events.push({ date: dateStr, title });
          }
        } catch (e) {}
      }
    }
  }
  return events;
}

// 生成 ICS
function makeICS(events) {
  let ics = `BEGIN:VCALENDAR
PRODID:-//BB1026//CN Holiday//ZH
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:中国节气节假日日历
X-WR-TIMEZONE:Asia/Shanghai
BEGIN:VTIMEZONE
TZID:Asia/Shanghai
END:VTIMEZONE
`;

  events.forEach((e, i) => {
    const dt = e.date.replace(/-/g, '');
    ics += `BEGIN:VEVENT
DTSTART;VALUE=DATE:${dt}
DTEND;VALUE=DATE:${dt}
SUMMARY:${e.title}
UID:${dt}-${i}@cn-holiday
TRANSP:TRANSPARENT
END:VEVENT
`;
  });

  ics += 'END:VCALENDAR';
  fs.writeFileSync('calendar/cn-holiday.ics', ics, 'utf8');
}

// 执行：近年 + 未来几年
const now = new Date().getFullYear();
const years = [now - 1, now, now + 1, now + 2, now + 3];
const cn = getCNEvents(years);
makeICS(cn);

console.log('✅ 中国节气节假日日历生成完成');