# web小工具
[我的网站](https://www.0515364.xyz) - https://www.0515364.xyz
# lunarCalendar.js 使用方法

[lunarCalendar.js](https://raw.githack.com/bb1026/web/main/js/lunarCalendar.js) 提供农历、节气、节日计算功能。

---

## 网页使用

在你的 HTML 中引入 `lunarCalendar.js`：

```html
<script src="https://raw.githack.com/bb1026/web/main/js/lunarCalendar.js"></script>
<script>
  // 示例：获取某个日期的农历信息
  const date = new Date(2025, 1, 14); // 2025-02-14
  const lunar = LunarCalendar.solarToLunar(date);
  console.log(lunar); 
</script>
{
  "date": "2025-09-17",
  "weekday": "星期三",
  "lunarYear": 2025,
  "lunarMonth": 7,
  "lunarDay": 25,
  "lunarMonthName": "七",
  "lunarDayName": "廿五",
  "isLeapMonth": false,
  "zodiac": "蛇",
  "isLeapYear": false,
  "leapMonth": 6,
  "solarFestival": "",
  "isSolarFestival": false,
  "lunarFestival": "",
  "isLunarFestival": false,
  "otherFestival": null,
  "isOtherFestival": true,
  "solarTerm": "",
  "isSolarTerm": false
}