const cheerio = require('cheerio');
const request = require('request-promise');
const fs = require('fs').promises;

const { getAllDaysWithinRange } = require('./helper/time');
const { objectToCSV } = require('./helper/csv');

let COLUMN_SIZE = 8;

/*
 Columns:
 -------- 
 0: Date
 1: Test
 2: Confirmed Case
 3: Case Rate
 4: Confirmed Death
 5: Isolation
 6: Quarantine 
 7: Released

 */

// From 26 March 2020 to today
let daylist = getAllDaysWithinRange('2020-03-26');

let dayMapping = {};
let finalData = [];

daylist.forEach((day, index) => {
  dayMapping[day] = index;
  finalData[index] = new Array(COLUMN_SIZE).fill(null);
});

let URL = 'http://dashboard.dghs.gov.bd/webportal/pages/covid19.php';
let formData = { form: { period: 'LAST_6_MONTH' } };

request
  .post(URL, formData)
  .then(LetsStartScraping)
  .catch((err) => console.log(err));

async function LetsStartScraping(body) {
  const $ = cheerio.load(body);

  let data;

  // date, labTest, confirmedCase, caseRate
  data = date_LabTest_confirmedCase_CaseRate($);
  for (let i = 1; i < data.length; i++) {
    const mainIndex = dayMapping[data[i][0]];
    finalData[mainIndex][0] = data[i][0]; // Date
    finalData[mainIndex][1] = data[i][1]; // Lab Test
    finalData[mainIndex][2] = data[i][2]; // Confirmed Case
    finalData[mainIndex][3] = data[i][3]; // Case Rate
  }

  // confirmedDeath
  data = confirmedDeath($);
  for (let i = 0; i < data.length; i++) {
    const mainIndex = dayMapping[data[i][0]];
    finalData[mainIndex][0] = data[i][0]; // Date
    finalData[mainIndex][4] = data[i][1]; // Confirmed Death
  }

  // isolation
  data = isolation($);
  for (let i = 0; i < data.length; i++) {
    const mainIndex = dayMapping[data[i][0]];
    finalData[mainIndex][0] = data[i][0]; // Date
    finalData[mainIndex][5] = data[i][1]; // isolation
  }

  data = quarantine_Released($);
  for (let i = 0; i < data.length; i++) {
    const mainIndex = dayMapping[data[i][0]];
    finalData[mainIndex][0] = data[i][0]; // Date
    finalData[mainIndex][6] = data[i][1]; // quarantine
    finalData[mainIndex][7] = data[i][2]; // released
  }

  // Object
  const eachDayObject = finalData.map((f) => ({
    date: f[0],
    test: f[1],
    confirmed: f[2],
    caseRate: f[3],
    death: f[4],
    isolation: f[5],
    quarantine: f[6],
    released: f[7],
  }));

  const csv = objectToCSV(eachDayObject);

  await fs.writeFile('./data/data.json', JSON.stringify(eachDayObject));
  await fs.writeFile('./data/data.csv', csv);
}

function date_LabTest_confirmedCase_CaseRate($) {
  let script = $('body > script:nth-child(25)')[0].children[0].data;
  script = script.replace(/\s\s+/g, ' ');

  let str_from = 'google.visualization.arrayToDataTable(';
  let str_to = ');';
  let substr = script
    .substring(
      script.indexOf(str_from) + str_from.length,
      script.indexOf(str_to, script.indexOf(str_from))
    )
    .trim();

  substr = substr.replace(/\'/g, '"');
  substr = substr.replace(', {role: "annotation"} ', '');
  substr = substr.replace('[ [', '[');
  substr = substr.replace('], ]', ']');
  return JSON.parse(`[${substr}]`).slice(1);
}

function confirmedDeath($) {
  let script = $('body > script:nth-child(26)')[0].children[0].data;
  script = script.replace(/\s\s+/g, ' ');

  // Parsing
  let str_from = 'categories: [';
  let str_to = ', ] }';
  const dates = getSubstr(script, str_from, str_to);

  // Parsing
  str_from = 'data: [';
  str_to = ',],';
  const death = getSubstr(script, str_from, str_to);

  let result = [];
  dates.forEach((d, i) => result.push([d, death[i]]));
  return result;
}

function isolation($) {
  let script = $('body > script:nth-child(30)')[0].children[0].data;
  script = script.replace(/\s\s+/g, ' ');

  // Parsing
  let str_from = 'categories: [';
  let str_to = ', ], crosshair: true }, ';
  const dates = getSubstr(script, str_from, str_to);

  // Parsing
  str_from = 'data: [';
  str_to = ',] } ] });';
  const nIsolation = getSubstr(script, str_from, str_to);

  let result = [];
  dates.forEach((d, i) => result.push([d, nIsolation[i]]));
  return result;
}

function quarantine_Released($) {
  let script = $('body > script:nth-child(27)')[0].children[0].data;
  script = script.replace(/\s\s+/g, ' ');

  let str_from, str_to;

  // Parsing
  str_from = 'categories: [';
  str_to = ', ], crosshair: true }, ';
  const dates = getSubstr(script, str_from, str_to);

  // Parsing
  str_from = 'data: [';
  str_to = ',] },';
  const quarantine = getSubstr(script, str_from, str_to);

  // Parsing
  str_from = `{ name: 'Released', data: [`;
  str_to = ',] } ] }';
  const released = getSubstr(script, str_from, str_to);

  let result = [];
  dates.forEach((d, i) => result.push([d, quarantine[i], released[i]]));
  return result;
}

function getSubstr(script, str_from, str_to) {
  let substr = script
    .substring(
      script.indexOf(str_from) + str_from.length,
      script.indexOf(str_to, script.indexOf(str_from))
    )
    .trim();
  substr = substr.replace(/\'/g, '"');
  return JSON.parse(`[${substr}]`);
}
