let today = new Date();

exports.formatDate = (d) => {
  let day = new Date(d)
    .toLocaleString('en-us', { month: 'long', day: 'numeric' })
    .split(' ');
  day[1] = day[1].padStart(2, '0');
  return day.join('-');
};

exports.getAllDaysWithinRange = (st, en = today) => {
  let days = [];
  st = new Date(st);
  while (st <= en) {
    let day = this.formatDate(st)
    days.push(day);
    st.setDate(st.getDate() + 1);
  }
  return days;
};
