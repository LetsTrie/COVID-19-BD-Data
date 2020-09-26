exports.objectToCSV = (obj) => {
  let fields = Object.keys(obj[0]);
  let replacer = (key, value) => (value === null ? '' : value);
  let csv = obj.map((row) =>
    fields
      .map((fieldName) => JSON.stringify(row[fieldName], replacer))
      .join(',')
  );
  csv.unshift(fields.join(','));
  csv = csv.join('\r\n');
  return csv;
};
