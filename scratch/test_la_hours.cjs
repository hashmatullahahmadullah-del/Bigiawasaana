const now = new Date();
const laString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
const laDate = new Date(laString);
const day = laDate.getDay();
const hours = laDate.getHours();
const minutes = laDate.getMinutes();
const currentMinutes = hours * 60 + minutes;

console.log('LA Date String:', laString);
console.log('Day (0=Sun, 6=Sat):', day);
console.log('Hours:', hours, 'Minutes:', minutes, 'Total minutes:', currentMinutes);

const openMinutes = 13 * 60; // 13:00 = 780
const closeMinutes = 22 * 60 + 30; // 22:30 = 1350

let status;
if (day === 0) {
  status = { isOpen: false, text: 'Closed Today · Opens Monday 1:00 PM', stateClass: 'closed' };
} else if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
  status = { isOpen: true, text: 'Open Now · Closes 10:30 PM', stateClass: 'open' };
} else if (currentMinutes < openMinutes) {
  status = { isOpen: false, text: 'Closed · Opens Today at 1:00 PM', stateClass: 'busy' };
} else {
  const nextDay = day === 6 ? 'Monday' : 'Tomorrow';
  status = { isOpen: false, text: `Closed for Tonight · Opens ${nextDay} 1:00 PM`, stateClass: 'closed' };
}

console.log('Calculated Status:', status);
