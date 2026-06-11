import fs from "fs";

// 模拟更新逻辑（以后换成真实抓取）
function updateData() {
  console.log("Fetching latest railway data...");

  // TODO: 接 12306 或开源数据源
  const newSchedule = fs.readFileSync("./data/schedule.csv", "utf8");

  fs.writeFileSync("./data/schedule.csv", newSchedule);
}

updateData();
