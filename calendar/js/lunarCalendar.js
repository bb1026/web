// lunarCalendar.js
// ---------- 农历基础数据 ----------
const lunarInfo=[
0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
0x04afb,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0
];

// ---------- 阳历节日 ----------
const solarFestivals = {
  "01-01": "元旦",
  "05-01": "劳动节",
  "06-01": "儿童节",
  "10-01": "国庆节"
};

// ---------- 农历节日 ----------
const lunarFestivals = {
  "0101": "春节",
  "0115": "元宵节",
  "0202": "龙抬头",
  "0303": "上巳节",
  "0505": "端午节",
  "0707": "七夕节",
  "0715": "中元节",
  "0815": "中秋节",
  "0909": "重阳节",
  "1001": "寒衣节",
  "1015": "下元节",
  "1208": "腊八节",
  "1223": "北方小年",   // 北方：腊月二十三
  "1224": "南方小年"    // 南方：腊月二十四
};

// ---------- 其他纪念日 ----------
const otherFestivals = {
  "01-06": "世界儿童日",
  "01-09": "世界防治麻风日",
  "02-02": "世界湿地日",
  "02-04": "世界抗癌日",
  "02-14": "情人节",
  "03-01": "国际海豹日",
  "03-03": "全国爱耳日",
  "03-05": "学雷锋纪念日",
  "03-08": "妇女节",
  "03-12": "植树节",
  "03-14": "白色情人节",
  "03-20": "国际幸福日",
  "03-21": "世界睡眠日",
  "03-22": "世界水日",
  "03-23": "世界气象日",
  "04-01": "愚人节",
  "04-07": "世界卫生日",
  "04-22": "世界地球日",
  "05-04": "青年节",
  "05-12": "国际护士节",
  "05-15": "国际家庭日",
  "05-18": "国际博物馆日",
  "05-31": "世界无烟日",
  "06-05": "世界环境日",
  "06-08": "世界海洋日",
  "06-14": "世界献血者日",
  "06-21": "国际瑜伽日",
  "07-07": "七七事变",
  "07-11": "世界人口日",
  "08-09": "世界土著人民日",
  "08-12": "国际青年日",
  "08-15": "日本投降",
  "09-03": "抗日战争胜利纪念日",
  "09-08": "国际扫盲日",
  "09-16": "国际臭氧层保护日",
  "09-18": "918纪念日",
  "09-21": "国际和平日",
  "09-27": "世界旅游日",
  "10-04": "世界动物日",
  "10-10": "辛亥革命纪念日",
  "10-16": "世界粮食日",
  "10-24": "联合国日",
  "11-11": "光棍节",
  "11-20": "世界儿童日",
  "12-01": "世界艾滋病日",
  "12-05": "国际志愿人员日",
  "12-10": "世界人权日",
  "12-24": "长津湖胜利纪念日",
  "12-25": "圣诞节",
  "12-31": "跨年夜",
  "母亲节": { month: 5, weekday: 0, weekIndex: 2 }, // 5月第二个星期日
  "父亲节": { month: 6, weekday: 0, weekIndex: 3 }  // 6月第三个星期日
};

// ---------- 节气 ----------
const solarTerms=[
"小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨",
"立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑",
"白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"];
const sTermInfo=[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,
218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,
440795,462224,483532,504758];

// ---------- 生肖 ----------
const zodiac=["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
const lunarMonthName=["正","二","三","四","五","六","七","八","九","十","冬","腊"];
const lunarDayName=["","初一","初二","初三","初四","初五","初六","初七","初八","初九","初十",
"十一","十二","十三","十四","十五","十六","十七","十八","十九","二十",
"廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十"];

function toFixed(n){return n<10?"0"+n:n;}
function lYearDays(y){let sum=348;for(let i=0x8000;i>0x8;i>>=1){sum+=(lunarInfo[y-1900]&i)?1:0;}return sum+leapDays(y);}

function leapMonth(y){return lunarInfo[y-1900]&0xf;}

function leapDays(y){return leapMonth(y)?((lunarInfo[y-1900]&0x10000)?30:29):0;}

function monthDays(y,m){return (lunarInfo[y-1900]&(0x10000>>m))?30:29;}

// ---------- 节气 ----------
function solarTerm(y,n){
  const baseDate = new Date(Date.UTC(1900,0,6,2,5)); // 基准时间
  const sTermInfo=[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,
    218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,
    440795,462224,483532,504758];
  const yearMs = 31556925974.7; // 平太阳年毫秒数
  const ms = yearMs*(y-1900) + sTermInfo[n]*60000;
  const dateUTC = new Date(baseDate.getTime() + ms);

  // 转换为本地时间
  const localDate = new Date(dateUTC.getTime() + dateUTC.getTimezoneOffset()*60000);

  // 修正日期误差，取整到天
  return new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
}

function getWeekday(date){return ["日","一","二","三","四","五","六"][date.getDay()];}

// 阳历转农历
function solarToLunar(y,m,d){
  let offset,temp=0;
  const baseDate = new Date(Date.UTC(1900, 0, 31));
  const objDate = new Date(Date.UTC(y, m - 1, d));
  offset = Math.floor((objDate - baseDate) / 86400000);
  let lunarYear=1900,lunarMonth=1,lunarDay=1,isLeap=false;
  for(let i=1900;i<2101 && offset>0;i++){
    temp=lYearDays(i);
    if(offset-temp<0)break;
    offset-=temp;
    lunarYear++;
  }
  const leap=leapMonth(lunarYear);
  for(let i=1;i<13 && offset>=0;i++){
    if(leap>0 && i==(leap+1) && !isLeap){--i;isLeap=true;temp=leapDays(lunarYear);}
    else temp=monthDays(lunarYear,i);
    if(isLeap && i==(leap+1))isLeap=false;
    offset-=temp;
    if(!isLeap) lunarMonth=i;
  }
  lunarDay=offset+temp+1;
  if(lunarDay>monthDays(lunarYear,lunarMonth)) lunarDay=lunarDay-temp;
  const monthName=(lunarMonth<=12?lunarMonthName[lunarMonth-1]:"");
  const dayName=lunarDayName[lunarDay];
  return {lunarYear,lunarMonth,lunarDay,isLeapMonth:isLeap,monthName,dayName};
}

// 农历转阳历（近似，支持非闰月）
function lunarToSolar(lunarYear,lunarMonth,lunarDay,isLeapMonth=false){
  let offset=0;
  for(let y=1900;y<lunarYear;y++) offset+=lYearDays(y);
  const leap=leapMonth(lunarYear);
  for(let m=1;m<lunarMonth;m++){
    offset+=monthDays(lunarYear,m);
    if(m===leap) offset+=leapDays(lunarYear);
  }
  if(isLeapMonth && leap===lunarMonth) offset+=monthDays(lunarYear,lunarMonth);
  offset+=lunarDay-1;
  const baseDate=new Date(Date.UTC(1900,0,31));
  return new Date(baseDate.getTime()+offset*86400000);
}

// 获取生肖
function getZodiac(year){return zodiac[(year-4)%12];}
// 公历闰年
function isLeapYear(year){return (year%4===0 && year%100!==0)||(year%400===0);}

// 获取一年日历
// ---------- 浮动节日判断（母亲节、父亲节） ----------
function getFloatingFestival(year, month, day) {
  for (let key of ["母亲节", "父亲节"]) {
    const fest = otherFestivals[key];
    if (!fest || fest.month !== month) continue;

    let weekdayCount = 0;
    for (let d = 1; d <= 31; d++) {
      const current = new Date(year, month - 1, d);
      if (current.getMonth() + 1 !== month) break;
      if (current.getDay() === fest.weekday) {
        weekdayCount++;
        if (weekdayCount === fest.weekIndex && current.getDate() === day) {
          return key; // 返回“母亲节”或“父亲节”名称
        }
      }
    }
  }
  return "";
}

// ---------- 获取一年日历 ----------
function getYearCalendar(year) {
  const result = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = getWeekday(d);
    const lunar = solarToLunar(y, m, day);

    // 阳历节日（固定日期）
    const solarF = solarFestivals[toFixed(m) + "-" + toFixed(day)] || "";

    // 农历节日（含除夕判断）
    let lunarF = lunarFestivals[toFixed(lunar.lunarMonth) + toFixed(lunar.lunarDay)] || "";
    if (lunar.lunarMonth === 12) {
      const lastDay = monthDays(lunar.lunarYear, 12);
      if ((lunar.lunarDay === 29 && lastDay === 29) || (lunar.lunarDay === 30 && lastDay === 30)) {
        lunarF = "除夕";
      }
    }
    const isLunarFestival = lunarF !== "";

    // 其他纪念日（固定日期 + 浮动节日）
    let otherF = otherFestivals[toFixed(m) + "-" + toFixed(day)] || getFloatingFestival(y, m, day);
    const isOtherFestival = otherF !== "";

    // 节气
    let term = "";
    let isSolarTerm = false;
    for (let i = 0; i < 24; i++) {
      const tDate = solarTerm(y, i);
      if (tDate.getFullYear() === y && tDate.getDate() === day && tDate.getMonth() + 1 === m) {
        term = solarTerms[i];
        isSolarTerm = true;
        break;
      }
    }

    result.push({
      date: `${y}-${toFixed(m)}-${toFixed(day)}`,
      weekday: `星期${weekday}`,
      lunarYear: lunar.lunarYear,
      lunarMonth: lunar.lunarMonth,
      lunarDay: lunar.lunarDay,
      lunarMonthName: lunar.monthName,
      lunarDayName: lunar.dayName,
      isLeapMonth: lunar.isLeapMonth,
      zodiac: getZodiac(lunar.lunarYear),
      isLeapYear: isLeapYear(y),
      leapMonth: leapMonth(y),
      solarFestival: solarF,
      isSolarFestival: solarF !== "",
      lunarFestival: lunarF,
      isLunarFestival: isLunarFestival,
      otherFestival: otherF,
      isOtherFestival: isOtherFestival,
      solarTerm: term,
      isSolarTerm: isSolarTerm
    });
  }

  return result;
}

// ---------- 获取某一天 ----------
function getDayInfo(year, month, day) {
  const calendar = getYearCalendar(year);
  return calendar.find(d => d.date === `${year}-${toFixed(month)}-${toFixed(day)}`) || null;
}

// ---------- 辅助函数：不足两位补零 ----------
function toFixed(n) {
  return n < 10 ? "0" + n : n;
}

// 获取某一月
function getMonthCalendar(year,month){
  const yearCal=getYearCalendar(year);
  return yearCal.filter(d=>new Date(d.date).getMonth()+1===month);
}

// 获取某一周（从指定日期开始的7天）
function getWeekCalendar(startDate){ 
  const start=new Date(startDate);
  const week=[];
  for(let i=0;i<7;i++){
    const d=new Date(start);
    d.setDate(start.getDate()+i);
    week.push(getDayInfo(d.getFullYear(),d.getMonth()+1,d.getDate()));
  }
  return week;
}

// ---------- 网页端获取某年的节气和节日 ----------
function getYearFestivalsAndTerms(year) {
  const allDays = getYearCalendar(year);
  const result = [];

  allDays.forEach(day => {
    if (day.isSolarTerm) {
      result.push({
        type: "节气",
        name: day.solarTerm,
        date: day.date,
        weekday: day.weekday,
        lunar: `${day.lunarMonthName}月${day.lunarDayName}`
      });
    }
    if (day.isSolarFestival) {
      result.push({
        type: "阳历节日",
        name: day.solarFestival,
        date: day.date,
        weekday: day.weekday,
        lunar: `${day.lunarMonthName}月${day.lunarDayName}`
      });
    }
    if (day.isLunarFestival) {
      result.push({
        type: "农历节日",
        name: day.lunarFestival,
        date: day.date,
        weekday: day.weekday,
        lunar: `${day.lunarMonthName}月${day.lunarDayName}`
      });
    }
    if (day.isOtherFestival) {
      result.push({
        type: "其他节日",
        name: day.otherFestival,
        date: day.date,
        weekday: day.weekday,
        lunar: `${day.lunarMonthName}月${day.lunarDayName}`
      });
    }
  });

  return result;
}

// ---------- 对外接口 ----------
const LunarCalendar = {
  solarToLunar,
  lunarToSolar,
  getDayInfo,
  getWeekCalendar,
  getMonthCalendar,
  getYearCalendar,
  getYearFestivalsAndTerms
};

// ---------- 通用挂载 ----------
if (typeof module !== "undefined" && module.exports) {
  module.exports = LunarCalendar;   // Node.js
} else if (typeof window !== "undefined") {
  window.LunarCalendar = LunarCalendar; // 浏览器
} else {
  this.LunarCalendar = LunarCalendar;   // Scriptable eval
}

// 示例：获取2026年12月25日信息
// console.log(LunarCalendar.getDayInfo(2026,12,25));

// 如果在网页端或 Scriptable 中使用
// <script src="https://raw.githack.com/bb1026/web/main/calendar/js/lunarCalendar.js"></script>
// module.exports = LunarCalendar; 
// Node.js 可用
// export default LunarCalendar;     
// ES6 module 可用

// 获取一年
// const year2026 = LunarCalendar.getYearCalendar(2026);
// console.log(JSON.stringify(year2026, null, 2));
// 
// 获取一个月
// const december = LunarCalendar.getMonthCalendar(2026, 12);
// console.log(JSON.stringify(december, null, 2));
// 
// 获取一周
// const weekInfo = LunarCalendar.getWeekCalendar("2026-02-17");
// console.log(JSON.stringify(weekInfo, null, 2));
// 
// 获取一天
// const dayInfo = LunarCalendar.getDayInfo(2026, 02, 16);
// console.log(JSON.stringify(dayInfo, null, 2));
// 
// 阳历 -> 农历
// const lunar = LunarCalendar.solarToLunar(2026,12,25);
// console.log(lunar);

// 农历 -> 阳历
// const solar = LunarCalendar.lunarToSolar(2026,11,16,false);
// console.log(solar);
