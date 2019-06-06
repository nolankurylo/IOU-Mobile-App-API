const express = require("express");
const router = express.Router();
var query = require(".././Tools/queries");
router.get("/", async (req, res) => {
  console.log("You hit Nolan's API");
  return res.status(200).send("This is Nolan's API :)");
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
 text = `with a as (DELETE FROM houses WHERE house_id = $1)
 delete from ious where house_id = $1`;
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
 text = `SELECT distinct on (name) * FROM houses WHERE user_id = $1`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({houses: result.rows});
  });
});

router.get("/get_house/:house_id/:user_id", async (req, res) => {
  values = [req.params.house_id, req.params.user_id];
  text = `WITH a as(SELECT DISTINCT ON (username) * FROM account INNER JOIN houses ON 
  account.id = houses.other_user WHERE house_id = $1 AND user_id = $2)
  SELECT * FROM a ORDER BY CASE WHEN amount < 0 THEN 1 WHEN amount > 0 
  THEN 2 WHEN amount = 0  THEN 3 END asc, amount desc`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    house = result.rows
    values = [req.params.house_id]
    text = `SELECT count(*) FROM necessities WHERE house_id = $1`
    query(text, values, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ error: "There was an internal error" });
      }
      return res.status(200).send({house: house, necessities: result.rows[0]});
    })
  });
});

router.get("/verify_house_name/:name/:user_id", async (req, res) => {
  text = `select * from houses where (name = $1 and user_id = $2) or (name = $1 and other_user = $2);`
  values = [req.params.name, req.params.user_id]
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

router.get("/get_history/:user_id/:other_user/:house_id", async (req, res) => {
  values = [req.params.user_id, req.params.other_user, req.params.house_id];
  text = `SELECT * FROM ious WHERE (user_id = $1 AND other_user = $2 AND house_id = $3) OR user_id = $2 AND other_user = $1 AND house_id = $3`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({history: result.rows});
  });
});

router.get("/get_necessities/:house_id", async (req, res) => {
  values = [req.params.house_id];
  text = `WITH a AS( SELECT id AS user_id, username FROM account)
  SELECT * FROM necessities INNER JOIN a ON necessities.added_by = a.user_id WHERE house_id = $1`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({necessities: result.rows});
  });
});

router.get("/get_new_possible_friends/:house_id/:user_id", async (req, res) => {
  values = [req.params.house_id, req.params.user_id];
  text = `WITH a as(SELECT DISTINCT (user_id) user_id FROM houses WHERE house_id = $1 AND user_id != $2),
b AS (SELECT user_a_id AS id FROM friends WHERE user_b_id = $2 AND status = 'friends'),
c AS (SELECT user_b_id AS id FROM friends WHERE user_a_id = $2 AND status = 'friends'),
d AS (SELECT * FROM b UNION SELECT * FROM c)
SELECT * FROM d NATURAL JOIN account WHERE id NOT IN (SELECT * FROM a)`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({users: result.rows});
  });
});



module.exports = router;
