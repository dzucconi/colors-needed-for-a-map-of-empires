import axios from 'axios';
import parameters from 'queryparams';

window.parameters = parameters;

const DOM = {
  app: document.getElementById('app'),
};

const STATE = {
  colors: [],
};

const fetch = amount =>
  axios.get(`http://www.slowverb.com/verse.json?model=colors&n=${amount}`)
    .then(({ data: colors }) => colors);

const swap = i => {
  return fetch(1).then(colors => {
    STATE.colors[i] = colors[0];
    render();
  });
};

window.swap = swap;

const represent = xs => {
  const str = xs.map(x => x.split(' ').map(w => w[0]).join(''));
  const n = xs.reduce((memo, x) => memo = memo+ x.length, 0);
  return [n].concat(str).join('-');
};

const render = () =>
  DOM.app.innerHTML = `
    <a class='permalink' target='_blank' href='?${STATE.colors.map((color, i) => `colors[${i}]=${color}`).join('&')}'>
      ${represent(STATE.colors)}
    </a>

    <hr>

    ${STATE.colors.map((color, i) => `
      <a class='color' href='#' onclick='swap(${i}); return false;'>${color}</a>
    `).join('')}

    <hr>

    <a class='reset' href='?'></a>
  `;

export default () => {
  const { amount, colors } = parameters({ amount: 4 });

  if (colors) {
    STATE.colors = colors;
    return render();
  }

  fetch(amount).then(colors => {
    STATE.colors = colors;
    render();
  });
};
