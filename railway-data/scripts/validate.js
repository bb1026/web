import fs from "fs";
import csv from "csv-parser";

function checkFile(file) {
  const rows = [];
  fs.createReadStream(file)
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", () => {
      console.log(`✔ ${file}: ${rows.length} rows`);
    });
}

checkFile("./data/stations.csv");
checkFile("./data/trains.csv");
checkFile("./data/schedule.csv");
