const React = require("react");
const { render } = require("react-dom");
const { whenOdysseyLoaded } = require("@abcnews/env-utils");
const { getMountValue, selectMounts } = require("@abcnews/mount-utils");
import App from "./components/App";

const PROJECT_NAME = "north-korea-missile-ranges";
const root = document.querySelector(`#northkoreamissilemount`);

let scrollyteller;

function init() {
  
  console.log(scrollyteller)
  render(<App scrollyteller={scrollyteller} />, scrollyteller.mountNode);
}

// init();

whenOdysseyLoaded
  .then(() => {
    const [appMountEl] = selectMounts("northkoreamissilemount");

    console.log(appMountEl);

    scrollyteller = require("@abcnews/scrollyteller").loadScrollyteller(
      "globe",
      "u-full",
      "mark"
    );

    if (appMountEl) {
      init();
    }
  })
  .catch((e) => console.error(e));

if (module.hot) {
  module.hot.accept("./components/App", () => {
    try {
      init();
    } catch (err) {
      const ErrorBox = require("./components/ErrorBox");
      render(<ErrorBox error={err} />, root);
    }
  });
}

if (process.env.NODE_ENV === "development") {
  console.debug(`[${PROJECT_NAME}] public path: ${__webpack_public_path__}`);
}
