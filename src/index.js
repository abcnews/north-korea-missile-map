const { h, render } = require("preact");
const Arrive = require("arrive");

let stage = document.querySelector(".scrollyteller-stage");
//test
if (stage) {
  init({
    target: stage,
    detail: stage.__SCROLLYTELLER__
  });
} else {
  // console.log('waiting for the stage');

  document.arrive(".scrollyteller-stage", function() {
    // console.log('Stage has arrived...');
    stage = document.querySelector(".scrollyteller-stage");
    // console.log('Initialising interactive...');
    init({
      target: stage,
      detail: stage.__SCROLLYTELLER__
    });
    // Unbind arrive listener
    document.unbindArrive();
  });
}

function init(ev) {
  const App = require("./components/App");
  render(<App />, stage, stage.firstChild);
}

if (module.hot) {
  module.hot.accept("./components/App", () => {
    try {
      init({
        target: stage,
        detail: stage.__SCROLLYTELLER__
      });
    } catch (err) {
      const ErrorBox = require("./components/ErrorBox");

      render(<ErrorBox error={err} />, stage, stage.firstChild);
    }
  });
}

if (process.env.NODE_ENV === "development") {
  require("preact/devtools");

  console.debug(
    `[north-korea-missile-map] public path: ${__webpack_public_path__}`
  );
}
