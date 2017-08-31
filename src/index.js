const {h, render} = require('preact');
const Arrive = require('arrive');

let stage = document.querySelector('.scrollyteller-stage');

if (stage) {
  init({
    target: stage,
    detail: stage.__SCROLLYTELLER__
  });
} else {
  console.log('waiting for the stage');
  // document.addEventListener('mark', init); // do better

  document.arrive(".scrollyteller-stage", function() {
    console.log('Stage has arrived...');
    stage = document.querySelector('.scrollyteller-stage');
    console.log('Initialising interactive...');
    init({
      target: stage,
      detail: stage.__SCROLLYTELLER__
    });
  });
  // Unbind all arrive events
  Arrive.unbindAllArrive();
}


function init(ev) {
  console.log(ev.target); // the stage element
  console.log(ev.detail); // the `activated` and `deactivated` marks (if any)

  const App = require('./components/App');
  render(<App />, stage, stage.firstChild);
}


if (module.hot) {
  module.hot.accept('./components/App', () => {
    try {
      init({
        target: stage,
        detail: stage.__SCROLLYTELLER__
      });
    } catch (err) {
      const ErrorBox = require('./components/ErrorBox');

      render(<ErrorBox error={err} />, stage, stage.firstChild);
    }
  });
}

if (process.env.NODE_ENV === 'development') {
  require('preact/devtools');
  
  console.debug(`[north-korea-missile-map] public path: ${__webpack_public_path__}`);
}
