// icsDescription.js
// 兼容浏览器和 Scriptable

const icsEvents = [
    // 公历节日
    { summary: "元旦", description: "元旦（1月1日），公历新年，标志新一年的开始。" },
    { summary: "情人节", description: "情人节（2月14日），情侣互送礼物和表达爱意的日子。" },
    { summary: "妇女节", description: "国际妇女节（3月8日），纪念女性在社会、经济、文化和政治领域的重要贡献。" },
    { summary: "白色情人节", description:"白色情人节（3月14日），起源于日本，作为情人节的延续，通常由男性回赠礼物。"},
    { summary: "愚人节", description: "愚人节（4月1日），源于西方的民间节日，以开玩笑和恶作剧为主。"},
    
    { summary: "劳动节", description: "国际劳动节（5月1日），表彰劳动者贡献，倡导劳动权益。" },
    { summary: "护士节", description: "护士节（5月12日），表彰护士在医疗卫生事业中的贡献，弘扬敬业精神" },
    { summary: "母亲节", description: "母亲节，每年5月的第二个星期日，用于表达对母亲的敬爱与感恩。" },
    { summary: "世界无烟日", description: "世界无烟日（5月31日）：由世界卫生组织发起，呼吁人们关注吸烟危害，倡导无烟环境。"},
    { summary: "儿童节", description: "国际儿童节（6月1日），关注儿童健康成长和权利保护。" },
    
    { summary: "父亲节", description: "父亲节，每年6月的第三个星期日，用于表达对父亲的敬意和感恩。" },
    { summary: "教师节", description: "教师节（9月10日）：尊师重道，表彰教师的贡献。"},
    { summary: "万圣节", description: "万圣节（10月31日），源自西方的纪念亡灵节日，儿童会化妆“讨糖”。" },
    { summary: "感恩节", description: "感恩节（每年11月第四个星期四），起源于美国，感谢收获与祝福。" },
    { summary: "圣诞节", description: "圣诞节（12月25日）：纪念耶稣基督诞生，庆祝爱与团聚。" },
    
    { summary: "开斋节", description: "开斋节（Hari Raya Puasa），伊斯兰教节日，标志斋戒月结束，庆祝与家人团聚。" },
    { summary: "哈芝节", description: "哈芝节（Hari Raya Haji），伊斯兰教节日，纪念亚伯拉罕献祭，举行宰牲仪式。" },
    { summary: "屠妖节", description: "屠妖节（Deepavali），印度教节日，象征光明战胜黑暗。" },
    
    // 新加坡节日
    { summary: "国庆日", description: "新加坡国庆日（8月9日），庆祝新加坡独立。", monthDay: "0809" },
    
    // 中国节日
    { summary: "植树节", description: "植树节（3月12日），鼓励人民植树造林，绿化环境。" },
    { summary: "青年节", description: "青年节（5月4日），纪念五四运动，激励青年爱国奋斗。" },
    { summary: "建党节", description: "建党节（7月1日），纪念中国共产党成立。" },
    { summary: "七七事变", description: "七七事变：1937年7月7日，日本进攻卢沟桥，引发全面抗日战争。" },
    { summary: "建军节", description: "建军节（8月1日），纪念中国人民解放军建军。" },
    
    { summary: "日本投降", description: "1945年8月15日，日本宣布无条件投降，中国抗日战争胜利纪念日。" },
    { summary: "918事变纪念日", description: "918事变，又称柳条湖事件，1931年9月18日，日本关东军炸毁南满铁路柳条湖段，嫁祸中国军队并迅速占领沈阳，开启全面侵占东北三省的行动。每年的9月18日，中国举行纪念活动以警示国人铭记历史。" },
    { summary: "国庆节", description: "中国国庆节（10月1日），纪念中华人民共和国成立。", monthDay: "1001" },
    { summary: "辛亥革命纪念日", description: "辛亥革命纪念日（10月10日）：纪念1911年爆发的辛亥革命，推翻清朝封建统治。"},

    // 农历节日（中国）
    { summary: "春节", description: "春节，农历正月初一，俗称过年，是中国最重要的传统节日。" },
    { summary: "元宵节", description: "元宵节，农历正月十五，赏花灯、吃元宵，庆祝新春延续。" },
    { summary: "龙抬头", description: "龙抬头，农历二月初二，象征春季开始，万物苏醒。" },
    { summary: "上巳节", description: "上巳节，农历三月初三，古人踏青、祭祀和祈福的传统节日。" },
    
    { summary: "端午节", description: "端午节，农历五月初五，纪念屈原，赛龙舟、吃粽子的传统节日。" },
    { summary: "七夕节", description: "七夕节，农历七月初七，牛郎织女相会的节日，也称乞巧节。" },
    { summary: "中元节", description: "中元节，农历七月十五，祭祀祖先和超度亡灵的传统节日。" },
    { summary: "中秋节", description: "中秋节，农历八月十五，赏月与团圆的传统节日。" },
    { summary: "重阳节", description: "重阳节，农历九月初九，登高、赏菊、敬老爱老的传统节日。" },
    
    { summary: "寒衣节", description: "寒衣节，农历十月初一，祭祖烧纸衣以保先人过冬。" },
    { summary: "腊八节", description: "腊八节，农历十二月初八，祭祀祖先并喝腊八粥的传统节日。" },
    { summary: "除夕", description: "除夕，农历最后一天夜晚，除旧迎新、阖家团圆的重要日子。" },
    
    // 24节气
    { summary: "立春", description: "立春，二十四节气之首，标志春季开始。" },
    { summary: "雨水", description: "雨水，表示降水开始，气温回升，农事活动开始。" },
    { summary: "惊蛰", description: "惊蛰，春雷始鸣，万物复苏。" },
    { summary: "春分", description: "春分，昼夜平分，春季中期，万物生长。" },
    { summary: "清明", description: "清明，气清景明，适合踏青祭祖。" },
    
    { summary: "谷雨", description: "谷雨，春季最后一个节气，雨生百谷。" },
    { summary: "立夏", description: "立夏，夏季开始，气温升高，农作物生长旺盛。" },
    { summary: "小满", description: "小满，麦类作物颗粒开始饱满，尚未成熟。" },
    { summary: "芒种", description: "芒种，麦类作物成熟，适合种植水稻。" },
    { summary: "夏至", description: "夏至，白昼最长，气温升高明显。" },
    
    { summary: "小暑", description: "小暑，表示天气开始炎热，但未到最热。" },
    { summary: "大暑", description: "大暑，一年中最热时期。" },
    { summary: "立秋", description: "立秋，秋季开始，气温逐渐下降。" },
    { summary: "处暑", description: "处暑，暑气逐渐消退。" },
    { summary: "白露", description: "白露，气温下降，草木叶上有露珠。" },
    
    { summary: "秋分", description: "秋分，昼夜平分，秋季中期。" },
    { summary: "寒露", description: "寒露，天气转凉，露水增寒。" },
    { summary: "霜降", description: "霜降，气温下降明显，出现初霜。" },
    { summary: "立冬", description: "立冬，冬季开始，万物收藏。" },
    { summary: "小雪", description: "小雪，开始降雪，但量不大。" },
    
    { summary: "大雪", description: "大雪，天气寒冷，雪量增大。" },
    { summary: "冬至", description: "冬至，白昼最短，黑夜最长，进入冬季中期。" },
    { summary: "小寒", description: "小寒，寒冷开始，气温较低。" },
    { summary: "大寒", description: "大寒，一年中最冷时期。" }
];

/**
 * 根据 SUMMARY 和可选月日获取 DESCRIPTION
 * @param {string} input - 输入标题（至少两个字）
 * @param {string} [monthDay] - 可选月日（MMDD），仅用于公历节日区分重名
 * @returns {string} description - 对应的描述，如果找不到返回输入
 */
function getDescriptionBySummary(input, monthDay) {
    if (!input || input.length < 2) return input;

    // 完全匹配
    let event = icsEvents.find(ev => ev.summary === input && (!ev.monthDay || ev.monthDay === monthDay));

    // 模糊匹配
    if (!event) {
        const candidates = icsEvents.filter(ev => ev.summary.includes(input));
        if (candidates.length === 1) {
            event = candidates[0];
        } else if (candidates.length > 1) {
            // 尝试用月日区分公历节日
            if (monthDay) {
                const match = candidates.find(ev => ev.monthDay === monthDay);
                if (match) event = match;
            }
            if (!event) event = candidates[0]; // 仍然取第一个
        }
    }

    return event ? event.description : input;
}

// Browser & NodeJS 兼容导出
if (typeof module !== "undefined" && module.exports) {
    module.exports = { getDescriptionBySummary };
}
if (typeof window !== "undefined") {
    window.getDescriptionBySummary = getDescriptionBySummary;
}

// let desc = getDescriptionBySummary("国庆", "1001");
// console.log(desc);