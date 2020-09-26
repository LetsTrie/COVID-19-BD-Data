let today = new Date();

exports.getAllDaysWithinRange = (st, en = today) => {
  let days = [];
  st = new Date(st);
  while (st <= en) {
    let day = st
      .toLocaleString('en-us', { month: 'long', day: 'numeric' })
      .split(' ');
    day[1] = day[1].padStart(2, '0');
    day = day.join('-');
    days.push(day);
    st.setDate(st.getDate() + 1);
  }
  return days;
};
