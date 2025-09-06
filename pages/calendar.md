BEGIN:VCALENDAR / END:VCALENDAR
整个文件是一个日历对象。所有事件都要放在这对标签之间。

PRODID:-//0515364.xyz//My Calendar//CN
日历生产者标识（Producer Identifier），这里写的是 0515364.xyz，表示这是你的网站生成的日历。

VERSION:2.0
iCalendar 版本号，必须是 2.0。

CALSCALE:GREGORIAN
使用公历（Gregorian calendar）。

METHOD:PUBLISH
表示这个日历是发布给别人订阅的（而不是请求会议邀请之类的）。

X-WR-CALNAME:我的订阅日历
日历的名字（在 Apple/Google 日历里显示的标题）。

X-WR-TIMEZONE:Asia/Shanghai
日历的默认时区。

BEGIN:VEVENT / END:VEVENT
说明这里是一条事件记录。

UID:qqsb@0515364.xyz
唯一标识（Unique ID）。客户端靠它判断是不是同一个事件。

DTSTAMP:20250906T020000Z
事件被创建/修改的时间（UTC）。2025-09-06 02:00:00。

SUMMARY:七七事变
事件标题，显示在日历上。

DTSTART;VALUE=DATE:20250707
事件开始日期（2025-07-07，全天）。

DTEND;VALUE=DATE:20250708
事件结束日期（2025-07-08，exclusive，不包含这天）。
这意味着事件只占用 2025-07-07 一整天。

RRULE:FREQ=YEARLY
重复规则：每年重复一次。
所以这个事件会在 2025-07-07、2026-07-07、2027-07-07… 自动出现。

DESCRIPTION:七七事变
事件描述/备注。


每年同一天：
RRULE:FREQ=YEARLY

每年同月同日，限制到某月：
RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=10 （等价于上面）

每月同一天：
RRULE:FREQ=MONTHLY;BYMONTHDAY=15

每周某天：
RRULE:FREQ=WEEKLY;BYDAY=MO

复杂例子：每年 5 月第 2 个星期日（母亲节）：
RRULE:FREQ=YEARLY;BYMONTH=5;BYDAY=2SU
