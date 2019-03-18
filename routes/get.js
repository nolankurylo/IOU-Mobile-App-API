const express = require("express");
const router = express.Router();
var query = require(".././Tools/queries");
router.get("/", async (req, res) => {
  return res.status(200).send("This is Nolan's API");
});

router.get("/get_user_table_by_id/:id", async (req, res) => {
  text = `select id, username, email from account
where id = $1`;

  values = [req.params.id];
  data = {};
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    if (result.rowCount == 1) {
      data = result.rows[0];
    } else {
      return res.status(404).send("User not found");
    }
    return res.status(200).send(data);
  });
});

router.get("/get_amount/:id", (req, res) => {
  text = `WITH a AS (SELECT * FROM budget WHERE id = $1),
  b AS (SELECT * FROM used_budget WHERE id = $1)
  SELECT * FROM a INNER JOIN b ON a.id =b.id`;
  values = [req.params.id];
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    if (result.rowCount > 0) {
      return res.status(200).send({
        curr_amount: result.rows[0]["curr_amount"],
        amount: result.rows[0]["amount"]
      });
    } else {
      text = `WITH a AS (INSERT INTO used_budget (amount, id) VALUES (0, $1)) INSERT INTO budget (curr_amount, id) VALUES (0, $1)`;
      query(text, values, (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send({ error: "There was an internal error" });
        }
        return res.status(200).send({ curr_amount: 0 });
      });
    }
  });
});

module.exports = router;
