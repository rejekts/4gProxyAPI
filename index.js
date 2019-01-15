const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();

// app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
// app.use(bodyParser.json({ limit: "50mb" }));
// app.enable("trust proxy");
// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

app.use(express.static(path.join(__dirname, "client/build")));

app.get("*", function(req, res) {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

app.listen(5000, () => console.log("Frontend listening on port 5000"));
