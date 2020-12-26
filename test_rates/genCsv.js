const csvtojson = require('csvtojson');
const { objectToCSV } = require('../helper/csv');
const fs = require('fs/promises');

(async () => {
  const CSV = await csvtojson().fromFile('./data.csv');
  const data = {};
  for (let d of CSV) {
    if(!d.continent) continue;
    if (!data[d.location]) {
      data[d.location] = {
        continent: d.continent,
        location: d.location,

        avg_new_tests_per_million: 0,
        avg_hospital_beds_per_thousand: 0,
        avg_new_cases_per_million: 0,
        avg_positive_rate: 0,
        avg_reproduction_rate: 0,

        gdp_per_capita: parseFloat(d.gdp_per_capita),
        human_development_index: parseFloat(d.human_development_index),
        handwashing_facilities: parseFloat(d.handwashing_facilities),
        population: parseFloat(d.population),
        population_density: parseFloat(d.population_density),
        
        new_tests_per_thousand_count: 0,
        hospital_beds_per_thousand_count: 0,
        new_cases_per_million_count: 0,
        positive_rate_count: 0,
        reproduction_rate_count: 0
      };
    }
    if(d.positive_rate) {
      data[d.location].positive_rate_count++;
      data[d.location].avg_positive_rate += parseFloat(d.positive_rate);
    }

    if(d.reproduction_rate) {
      data[d.location].reproduction_rate_count++;
      data[d.location].avg_reproduction_rate += parseFloat(d.reproduction_rate);
    }
    
    if (d.new_tests_per_thousand) {
      data[d.location].new_tests_per_thousand_count++;
      data[d.location].avg_new_tests_per_million += parseFloat(
        d.new_tests_per_thousand
      );
    }

    if (d.hospital_beds_per_thousand) {
      data[d.location].hospital_beds_per_thousand_count++;
      data[d.location].avg_hospital_beds_per_thousand += parseFloat(
        d.hospital_beds_per_thousand
      );
    }
    if (d.new_cases_per_million) {
      data[d.location].new_cases_per_million_count++;
      data[d.location].avg_new_cases_per_million += parseFloat(
        d.new_cases_per_million
      );
    }
  }

  const finalArray = [];
  let tmp;
  for (let key in data) {
    if (data[key].new_tests_per_thousand_count) {
      tmp = data[key].avg_new_tests_per_million;
      tmp = ((tmp / data[key].new_tests_per_thousand_count) * 1000).toFixed(5);
      data[key].avg_new_tests_per_million = tmp;
    }
    if (data[key].hospital_beds_per_thousand_count) {
      tmp = data[key].avg_hospital_beds_per_thousand;
      tmp = (tmp / data[key].hospital_beds_per_thousand_count).toFixed(5);
      data[key].avg_hospital_beds_per_thousand = tmp;
    }
    if (data[key].new_cases_per_million_count) {
      tmp = data[key].avg_new_cases_per_million;
      tmp = (tmp / data[key].new_cases_per_million_count).toFixed(5);
      data[key].avg_new_cases_per_million = tmp;
    }
    if(data[key].positive_rate_count) {
      tmp = data[key].avg_positive_rate;
      tmp = (tmp / data[key].positive_rate_count).toFixed(5);
      data[key].avg_positive_rate = tmp;
    }
    if(data[key].reproduction_rate_count) {
      tmp = data[key].avg_reproduction_rate;
      tmp = (tmp / data[key].reproduction_rate_count).toFixed(5);
      data[key].avg_reproduction_rate = tmp;
    }
    
    delete data[key].new_tests_per_thousand_count;
    delete data[key].hospital_beds_per_thousand_count;
    delete data[key].new_cases_per_million_count;
    delete data[key].positive_rate_count;
    delete data[key].reproduction_rate_count;

    for (let subkey in data[key]) {
      if (!data[key][subkey]) {
        data[key][subkey] = null;
      }
    }
    if(data[key].avg_new_tests_per_million) {
      finalArray.push(data[key]);
    }
  }
  finalObject = objectToCSV(finalArray);
  await fs.writeFile('modified_data.csv', finalObject);
})();
