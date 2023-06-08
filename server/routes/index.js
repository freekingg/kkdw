const fs = require("fs");

const route = (app) => {
  fs.readdirSync(__dirname).forEach((file) => {
    if (file === "index.js") {
      return;
    }
    const route = require(`./${file}`);
    app.use(route.routes()).use(route.allowedMethods());
  });
};
module.exports = route;
