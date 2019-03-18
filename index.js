var path = require("path");
var query = require("./Tools/queries");
var express = require("express");
var app = express();
var schedule = require("node-schedule");
const port = 3000;

app.use(express.json());
app.use("/", require("./routes/get"));
app.use("/", require("./routes/post"));

var j = schedule.scheduleJob("0 11 19 * * *", function() {
  console.log("testing");
  // text = `delete from temp_user where (now() - interval '24 hours' > timestamp)`
  // values = []
  // query(text, values, (err, result) => {})
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
