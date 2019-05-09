const express = require("express");
const router = express.Router();
var query = require(".././Tools/queries");
router.get("/", async (req, res) => {
  console.log("You hit Nolan's API");
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

router.get("/get_friends/:user_id", async (req, res) => {
  values = [req.params.user_id];
  text = `WITH A AS (SELECT * FROM friends AS a INNER JOIN account AS b ON a.user_a_id = b.id OR (a.user_b_id = b.id) WHERE a.user_a_id = $1 OR a.user_b_id = $1)
  SELECT  DISTINCT ON (id)* FROM A`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ friends: result.rows });
  });
});

router.get("/get_friend_requests/:user_id", (req, res) => {
  values = [req.params.user_id]
  text = `WITH A as(SELECT * FROM friends WHERE user_b_id = $1 AND status ='req')
  SELECT * FROM A INNER JOIN account ON A.user_a_id = account.id`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ friends: result.rows });
  });
})

router.get("/get_users/:user_id", async (req, res) => {
  values = [req.params.user_id];
 text = `WITH A AS (SELECT * FROM friends WHERE user_a_id = $1 OR user_b_id = $1)
  SELECT * FROM account LEFT JOIN A ON account.id = A.user_b_id OR account.id = A.user_a_id WHERE id != $1`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ users: result.rows });
  });
});

router.get("/get_friends/:user_id/:house_id", async (req, res) => {
  values = [req.params.user_id, req.params.house_id];
 text = `WITH A AS (SELECT * FROM friends WHERE (user_a_id = $1 OR user_b_id = $1) AND status ='friends'),
 b AS (SELECT * FROM account INNER JOIN A ON account.id = A.user_b_id OR account.id = A.user_a_id WHERE id != $1),
 c AS (SELECT house_id, user_id, name FROM houses WHERE house_id = $2)
SELECT * FROM b LEFT JOIN c ON b.id = c.user_id`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ friends: result.rows });
  });
});

router.get("/cancel_house/:house_id", async (req, res) => {
  values = [req.params.house_id];
 text = `DELETE FROM houses WHERE house_id = $1`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({success: true});
  });
});

router.get("/get_houses/:user_id", async (req, res) => {
  values = [req.params.user_id];
 text = `SELECT * FROM houses WHERE user_id = $1`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({houses: result.rows});
  });
});

router.get("/get_house/:house_id", async (req, res) => {
  values = [req.params.house_id];
 text = `SELECT * FROM account INNER JOIN houses ON account.id = houses.user_id WHERE house_id = $1`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({house: result.rows});
  });
});

router.get("/verify_house_name/:name", async (req, res) => {
  text = `select * from houses where name = $1;`
  values = [req.params.name]
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    if(result.rowCount > 0){
      return res.status(200).send({ success: false });
    }
    else{
      return res.status(200).send({ success: true });
    }
  });
});

module.exports = router;
