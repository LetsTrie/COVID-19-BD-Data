const csvtojson = require("csvtojson");
const {objectToCSV} = require("../helper/csv");
const fs = require('fs/promises');

(async () => {
  const CSV = await csvtojson().fromFile('./data.csv');
  const data = {};
  for(let d of CSV) {
    if(!data[d.location]) {
      data[d.location] = {
        continent: d.continent,
        location: d.location,
        avg_new_tests_per_million: 0,
        new_tests_per_thousand_count: 0,
        gdp_per_capita: parseFloat(d.gdp_per_capita),
        population: parseFloat(d.population),
        population_density: parseFloat(d.population_density),
        avg_hospital_beds_per_thousand: 0,
        hospital_beds_per_thousand_count: 0,
        avg_new_cases_per_million: 0,
        new_cases_per_million_count: 0,
      };
    }
    if(d.new_tests_per_thousand) {
      data[d.location].new_tests_per_thousand_count++;
      data[d.location].avg_new_tests_per_million += parseFloat(d.new_tests_per_thousand);
    }

    if(d.hospital_beds_per_thousand) {
      data[d.location].hospital_beds_per_thousand_count++;
      data[d.location].avg_hospital_beds_per_thousand += parseFloat(d.hospital_beds_per_thousand);
    }
    if(d.new_cases_per_million) {
      data[d.location].new_cases_per_million_count++;
      data[d.location].avg_new_cases_per_million += parseFloat(d.new_cases_per_million);
    }
  }

  const finalArray = [];
  for(let key in data) {
    let allokay = true;
    for(let subkey in data[key]) {
      if(!data[key][subkey]) {
        allokay = false;
      }
    }

    if(!allokay) continue;

    if(data[key].new_tests_per_thousand_count) {
      data[key].avg_new_tests_per_million /=  data[key].new_tests_per_thousand_count;
      data[key].avg_new_tests_per_million *= 1000;
      data[key].avg_new_tests_per_million = data[key].avg_new_tests_per_million.toFixed(5);
    }
    if(data[key].hospital_beds_per_thousand_count) {
      data[key].avg_hospital_beds_per_thousand /= data[key].hospital_beds_per_thousand_count;

      data[key].avg_hospital_beds_per_thousand = data[key].avg_hospital_beds_per_thousand.toFixed(5);
    }
    if(data[key].new_cases_per_million_count) {
      data[key].avg_new_cases_per_million /=  data[key].new_cases_per_million_count;

      data[key].avg_new_cases_per_million = data[key].avg_new_cases_per_million.toFixed(5);
    }
    delete data[key].new_tests_per_thousand_count;
    delete data[key].hospital_beds_per_thousand_count;
    delete data[key].new_cases_per_million_count;
    finalArray.push(data[key]);
  }
  finalObject = objectToCSV(finalArray);
  await fs.writeFile('modified_data.csv', finalObject);
})()