const cheerio = require('cheerio');
const request = require('request-promise');
const fs = require('fs').promises;

const { getAllDaysWithinRange, formatDate } = require('./helper/time');
const { objectToCSV } = require('./helper/csv');

// From 08 March 2020 to today
let daylist = getAllDaysWithinRange('2020-03-08');

let dayMapping = {};
let finalData = [];

daylist.forEach((day, index) => {
  dayMapping[day] = index;
  finalData[index] = {
    Date: day,
    'Daily Test': null,
    Confirmed: null,
    Recovered: null,
    Death: null,
    Isolation: null,
    Quarantine: null,
    Released: null,
    'Total Tested': null,
    'Total Cases': null,
    'Total Recovered': null,
    'Total Death': null,
    'Case Rate': null,
  };
});

/*
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  ||| Get Data From DGHS |||
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
*/

let DGHS = 'http://dashboard.dghs.gov.bd/webportal/pages/covid19.php';
let formData = { form: { period: 'LAST_6_MONTH' } };

let promise1 = request.post(DGHS, formData);

/*
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  ||| Get Data From Wikipedia |||
  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
*/

let WikiLink = 'https://en.wikipedia.org/wiki/COVID-19_pandemic_in_Bangladesh';

let promise2 = request.post(WikiLink);

// Resolve All Promises

Promise.all([promise1, promise2])
  .then(async (res) => {
    try {
      let data = await fs.readFile('./data/data.json', 'utf-8');
      recheckFile(data);
    } catch (err) {
      console.error(err);
    }

    getDataFromDghs(res[0]);
    getDataFromWiki(res[1]);

    await fs.writeFile('./data/data.json', JSON.stringify(finalData));
    await fs.writeFile('./data/data.csv', objectToCSV(finalData));
  })
  .catch((err) => console.log(err));

function getDataFromDghs(body) {
  let $ = cheerio.load(body);
  console.log(`Getting data from: ${DGHS}`);
  labtest_case($);
  confirmedDeath($);
  isolation($);
  quarantine_Released($);
}

function recheckFile(data) {
  console.log(`Getting data from: previous JSON file`);
  data = JSON.parse(data);
  data.forEach((d) => {
    Object.keys(d).forEach((k) => {
      if (d[k]) {
        finalData[dayMapping[d['Date']]][k] = d[k];
      }
    });
  });
}

function getDataFromWiki(wikiBody) {
  let $ = cheerio.load(wikiBody);

  dataFromWiki($);
}

function dataFromWiki($) {
  let selector = 'table:nth-child(140) > tbody > tr';
  const body = $(selector);
  if (body.length >= 212) console.log(`Getting data from: ${WikiLink}`);
  body.each((i, em) => {
    if (i <= 1) return;
    let td = $(em).find('td');
    let date = formatDate($(td[0]).contents().first().text().trim());

    finalData[dayMapping[date]] = {
      ...finalData[dayMapping[date]],
      Date: date,
      'Daily Test': formatAmount($, td, 5),
      Confirmed: formatAmount($, td, 6),
      Recovered: formatAmount($, td, 8),
      Death: formatAmount($, td, 7),
      'Total Tested': formatAmount($, td, 1),
      'Total Cases': formatAmount($, td, 2),
      'Total Recovered': formatAmount($, td, 4),
      'Total Death': formatAmount($, td, 3),
    };
  });
}

function formatAmount($, td, index) {
  let val = $(td[index]).contents().first().text().trim().split(',').join('');
  return val ? +val : null;
}

function labtest_case($) {
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
  let data = JSON.parse(`[${substr}]`).slice(1);

  for (let d of data) {
    finalData[dayMapping[d[0]]] = {
      ...finalData[dayMapping[d[0]]],
      'Daily Test': d[1],
      Confirmed: d[2],
      'Case Rate': d[3],
    };
  }
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

  dates.forEach((d, i) => {
    finalData[dayMapping[d]] = {
      ...finalData[dayMapping[d]],
      Death: death[i],
    };
  });
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

  dates.forEach((d, i) => {
    finalData[dayMapping[d]] = {
      ...finalData[dayMapping[d]],
      Isolation: nIsolation[i],
    };
  });
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

  dates.forEach((d, i) => {
    finalData[dayMapping[d]] = {
      ...finalData[dayMapping[d]],
      Quarantine: quarantine[i],
      Released: released[i],
    };
  });
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
