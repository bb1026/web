export default {
  async fetch(request) {
    const url = new URL(request.url);

    const now = new Date();
    const year = parseInt(url.searchParams.get("year")) || now.getFullYear();

    // 默认返回 当前年 + 下一年（订阅更实用）
    const years = url.searchParams.get("year")
      ? [year]
      : [year, year + 1];

    // 加载农历库
    const lunarJs = await fetch(
      "https://raw.githack.com/bb1026/web/main/calendar/js/lunarCalendar.js"
    ).then(r => r.text());

    const LunarCalendar = (new Function(lunarJs + "; return LunarCalendar;"))();

    function nextDay(dateStr) {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10).replace(/-/g, '');
    }

    function nowUTC() {
      return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//0515364 Calendar//CN
CALSCALE:GREGORIAN
X-WR-CALNAME:中国节气节日
X-WR-TIMEZONE:Asia/Shanghai
`;

    let uidIndex = 0;

    for (const y of years) {
      for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= 31; d++) {
          const date = new Date(y, m, d);
          if (date.getMonth() !== m) continue;

          const lunar = LunarCalendar.solarToLunar(date);

          let title = '';
          if (lunar.isSolarTerm) title = lunar.solarTerm;
          else if (lunar.isLunarFestival) title = lunar.lunarFestival;
          else if (lunar.isSolarFestival) title = lunar.solarFestival;

          if (!title) continue;

          const dt = lunar.date.replace(/-/g, '');
          const dtEnd = nextDay(lunar.date);

          ics += `BEGIN:VEVENT
UID:${dt}-${uidIndex++}@0515364
DTSTAMP:${nowUTC()}
DTSTART;VALUE=DATE:${dt}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:${title}
END:VEVENT
`;
        }
      }
    }

    ics += "END:VCALENDAR";

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",

        // 👉 自动更新关键
        "Cache-Control": "no-cache"
      }
    });
  }
};