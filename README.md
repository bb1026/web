# web小工具
[我的网站](https://www.0515364.xyz) - https://www.0515364.xyz
# lunarCalendar.js 使用方法

[lunarCalendar.js](https://raw.githack.com/bb1026/web/main/calendar/js/lunarCalendar.js) 提供农历、节气、节日计算功能。

---

## 网页使用

在你的 HTML 中引入 `lunarCalendar.js`：

```html
<script src="https://raw.githack.com/bb1026/web/main/calendar/js/lunarCalendar.js"></script>
<script>
  // 示例：获取某个日期的农历信息
  const date = new Date(2025, 1, 14); // 2025-02-14
  const lunar = LunarCalendar.solarToLunar(date);
  console.log(lunar); 
</script>
返回的 JSON格式
{
  "date": "2026-01-01",
  "weekday": "星期四",
  "lunarYear": 2025,
  "lunarMonth": 11,
  "lunarDay": 12,
  "lunarMonthName": "冬",
  "lunarDayName": "十二",
  "isLeapMonth": false,
  "zodiac": "蛇",
  "isLeapYear": false,
  "leapMonth": 0,
  "solarFestival": "元旦",
  "isSolarFestival": true,
  "lunarFestival": "",
  "isLunarFestival": false,
  "otherFestival": "",
  "isOtherFestival": false,
  "solarTerm": "",
  "isSolarTerm": false
}
