let events = JSON.parse(localStorage.getItem('events')) || [];

function getMonthCalendar(year, month) {
  const first = new Date(year, month, 1),
        last = new Date(year, month + 1, 0),
        today = new Date();
  let html = `<h3>${first.toLocaleString('default', {month:'long'})} ${year}</h3>`;
  html += '<table class="calendar-table"><tr>';
  for (let d = 0; d < 7; ++d) html += `<th>${['Su','Mo','Tu','We','Th','Fr','Sa'][d]}</th>`;
  html += '</tr><tr>';
  for (let i = 0; i < first.getDay(); ++i) html += '<td></td>';
  for (let day = 1; day <= last.getDate(); ++day) {
    let curr = new Date(year, month, day);
    let foundEvent = events.find(ev => ev.date === curr.toISOString().slice(0,10));
    let isToday = curr.toDateString() === today.toDateString();
    let className = '';
    let title = '';
    let style = isToday ? 'border:2px solid #d4af37' : '';
    if (foundEvent) {
      title = foundEvent.title;
      if (foundEvent.type === 'milestone') className = 'event-day milestone-day';
      else if (foundEvent.type === 'reminder') className = 'event-day reminder-day';
      else className = 'event-day';
    }
    html += `<td class="${className}" title="${title}" style="${style}">${day}</td>`;
    if ((curr.getDay() + 1)%7 === 0 && day !== last.getDate()) html += '</tr><tr>';
  }
  html += '</tr></table>';
  html += `<ul>`;
  events.filter(ev => {
    let [y, m] = ev.date.split('-');
    return parseInt(y) === year && parseInt(m) === month + 1;
  }).forEach(ev => html += `<li>${ev.date}: ${ev.title} (${ev.type || 'normal'}) <button onclick="delEvent('${ev.date}')">Remove</button></li>`);
  html += `</ul>
    <button onclick="prevMonth()">Previous Month</button>
    <button onclick="nextMonth()">Next Month</button>`;
  return html;
}

let currMonth = new Date().getMonth();
let currYear = new Date().getFullYear();

function renderCal() {
  document.getElementById('calendarContainer').innerHTML = getMonthCalendar(currYear, currMonth);
}
window.prevMonth = function() {
  if (currMonth === 0) { currMonth = 11; currYear--; }
  else currMonth--;
  renderCal();
};
window.nextMonth = function() {
  if (currMonth === 11) { currMonth = 0; currYear++; }
  else currMonth++;
  renderCal();
};
window.delEvent = function(date) {
  events = events.filter(ev => ev.date !== date);
  localStorage.setItem('events', JSON.stringify(events));
  renderCal();
};
document.getElementById('eventForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const d = document.getElementById('eventDate').value;
  const title = document.getElementById('eventTitle').value.trim();
  const type = document.getElementById('eventType').value;
  if (d && title) {
    events.push({ date: d, title, type });
    localStorage.setItem('events', JSON.stringify(events));
    renderCal();
    this.reset();
  }
});
renderCal();
