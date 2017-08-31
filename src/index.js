const {h, render} = require('preact');

const root = document.querySelector('[data-north-korea-missile-map-root]');

function init() {
  const App = require('./components/App');

  render(<App />, root, root.firstChild);
}

init();

if (module.hot) {
  module.hot.accept('./components/App', () => {
    try {
      init();
    } catch (err) {
      const ErrorBox = require('./components/ErrorBox');

      render(<ErrorBox error={err} />, root, root.firstChild);
    }
  });
}

if (process.env.NODE_ENV === 'development') {
  require('preact/devtools');
  
  console.debug(`[north-korea-missile-map] public path: ${__webpack_public_path__}`);
}
