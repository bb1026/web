# 🚄 China Railway Data

Open dataset for train stations, trains and schedules.

## 📦 Data

- stations.csv → station list
- trains.csv → train list
- schedule.csv → stop-by-stop timetable

## 🔄 Update

Auto updated daily via GitHub Actions.

## 📡 Usage

Raw CSV:

https://raw.githubusercontent.com/bb1026/web/railway-data/main/data/schedule.csv

===============================================

railway-data/
├── README.md
├── schema/
│   ├── stations.schema.json
│   ├── trains.schema.json
│   └── schedule.schema.json
│
├── data/
│   ├── stations.csv
│   ├── trains.csv
│   └── schedule.csv
│
├── scripts/
│   ├── validate.js
│   ├── merge.js
│   └── build-index.js
│
└── .github/
    └── workflows/
        └── daily-update.yml