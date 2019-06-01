var query = require(".././Tools/queries");
const bcrypt = require("bcryptjs");
const express = require("express");
const router = express.Router();
var emailValidator = require("email-validator");

router.post("/register", async (req, res) => {
  var body = req.body;
  var text = "select id, email from account where lower(email) = lower($1)";
  var values = [body.email];
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ error: "There was an error while querying for email" });
    }
    if (result.rowCount > 0) {
      return res.status(200).send({ error: "Email taken" });
    }
    text = "select id, username from account where lower(username) = lower($1)";
    values = [body.username];
    query(text, values, (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({ error: "There was an error while querying for username" });
      }
      if (result.rowCount > 0) {
        return res.status(200).send({ error: "Username already taken" });
      }
      // At this point, the user can be inserted into the database
      values = [
        body.username,
        body.email.toLowerCase(),
        bcrypt.hashSync(body.password, 8)
      ];
      text =
        "insert into account(username, email, password) values ($1, $2, $3)";
      query(text, values, (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send({
            error: "There was an error inserting new_user into table"
          });
        }
        //Now that the new user has been inserted into the db, get their info and send back to front-end
        text =
          "select id, username from account where lower(email) = lower($1)";
        values = [body.email];
        query(text, values, (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).send({
              error: "There was an error while querying for the new user"
            });
          }
          var newUser = result.rows[0];
          return res.status(200).send({ auth: true, user: newUser.id });
        });
      });
    });
  });
});

router.post("/login", async (req, res) => {
  console.log(req.body);
  var login = req.body.login.trim();
  var password = req.body.password.trim();
  var text;

  if (emailValidator.validate(login)) {
    text = 'select * from "account" where lower(email) = lower($1) limit 1';
  } else {
    text = 'select * from "account" where lower(username) = lower($1) limit 1';
  }
  values = [login];
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    if (result.rowCount < 1) {
      return res.status(401).send({ error: "No user found in the database" });
    }
    var passwordMatch = bcrypt.compareSync(password, result.rows[0].password);
    if (passwordMatch) {
      delete result.rows[0]["password"];
      console.log("Passwords match!");
      res.status(200).send({
        auth: true,
        message: "User logged in",
        user: result.rows[0].id
      });
    } else {
      console.log("Passwords do not match!");
      res.status(200).send({
        auth: false,
        message: "Incorrect username/password"
      });
    }
  });
});

router.post("/insert", async (req, res) => {
  values = [req.body.value, req.body.id];
  text = `WITH a AS (UPDATE budget SET curr_amount = curr_amount + $1 WHERE id = $2 RETURNING curr_amount) SELECT * FROM a`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({
      success: "New value inserted succesfully",
      updated_value: result.rows[0].curr_amount
    });
  });
});

router.post("/remove", async (req, res) => {
  values = [req.body.value, req.body.id];
  text = `WITH a AS (UPDATE budget SET curr_amount = curr_amount - $1 WHERE id = $2 RETURNING curr_amount) SELECT * FROM a`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({
      zerod: false,
      success: "New value inserted succesfully",
      updated_value: result.rows[0].curr_amount
    });
  });
});

router.post("/insert_new_purchase", async (req, res) => {
  values = [req.body.value, req.body.id];
  text = `WITH a AS (UPDATE used_budget SET amount = amount + $1 WHERE id = $2 RETURNING amount) SELECT * FROM a`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({
      success: "New purchase inserted succesfully",
      updated_value: result.rows[0].amount
    });
  });
});

router.post("/remove_friend/:user/:friend", async (req, res) => {
  values = [req.params.user, req.params.friend];
  text = `DELETE FROM friends WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_b_id = $1 AND user_a_id = $2)`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res
      .status(200)
      .send({
        success:
          "User: " +
          req.params.user +
          " and User: " +
          req.params.friend +
          " are no longer friends!"
      });
  });
});

router.post("/cancel_friend_request", async (req, res) => {
  values = [req.body.user_a_id, req.body.user_b_id]
  text = `DELETE FROM friends WHERE (user_a_id = $1 AND user_b_id = $2 AND status = 'req') OR (user_b_id = $1 AND user_a_id = $2 AND status = 'req')`;
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/new_friend_request", (req, res) => {
  values = [req.body.user_a_id, req.body.user_b_id]
  text = `INSERT INTO friends (user_a_id, user_b_id, status) VALUES ($1, $2,'req')`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/accept_friend_request", (req, res) => {
  values = [req.body.user_a_id, req.body.user_b_id]
  text = `UPDATE friends SET status = 'friends' WHERE user_a_id = $1 AND user_b_id = $2 AND status = 'req' RETURNING *`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    if(result.rowCount > 0){
      return res.status(200).send({ success: true });
    }
    else{
      return res.status(200).send({ success: false });
    }
    
  });
})

router.post("/decline_friend_request", (req, res) => {
  values = [req.body.user_a_id, req.body.user_b_id]
  text = `DELETE FROM friends WHERE user_a_id = $1 AND user_b_id = $2 AND status = 'req' RETURNING *`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    if(result.rowCount > 0){
      return res.status(200).send({ success: true });
    }
    else{
      return res.status(200).send({ success: false });
    }
    
  });
})
// WITH a as(SELECT column1 AS usr FROM (values(26),(27), (28)) AS v),
//  b AS (SELECT column1 AS usr1 FROM (values(26),(27), (28)) AS v1),
// c AS (SELECT * FROM a CROSS JOIN b WHERE a.usr != b.usr1)
// INSERT INTO houses (house_id, name, user_id, other_user) SELECT 43, 'work', usr, usr1 FROM c

router.post("/add_new_house", (req, res) => {
  text = `WITH first AS (SELECT nextval('house_id_seq')),
  a AS (SELECT column1 AS usr FROM (values `
  for(var i = 0; i < req.body.house.length; i++){
    text += "(" + req.body.house[i] + ")"
    if (i == req.body.house.length - 1){
      break;
    }
    else{
      text += ", "
    }
  }
  text += `) AS v), b AS (SELECT usr AS usr1 FROM a),
  c AS (SELECT * FROM a CROSS JOIN b WHERE a.usr != b.usr1),
  d AS (SELECT * FROM c INNER JOIN first ON TRUE)
  INSERT INTO houses (house_id, name, user_id, other_user) SELECT nextval, '`
  + req.body.name + `', ` + `usr, usr1 FROM d returning *`
  values = []
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true, house_id: result.rows[0].house_id });
  })
})

router.post("/add_friend_to_house", (req, res) => {
  values = [req.body.user_id, req.body.house_id, req.body.name]
  text = `INSERT INTO houses (user_id, house_id, name) VALUES ($1, $2, $3);`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/remove_friend_from_house", (req, res) => {
  values = [req.body.user_id, req.body.house_id]
  text = `DELETE FROM houses WHERE user_id = $1 and house_id = $2;`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/add_money_iou", (req, res) => {
  users = req.body.users
  curr_user = req.body.user_id
  if(users.length < 1){
    return res.status(400).send({ error: "No users added for this transaction" });
  }
  amount = (req.body.amount / (users.length + 1)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  text = `BEGIN; `
  for (var i = 0; i < users.length; i++){
    text += `UPDATE houses SET amount = amount + `+ amount + ` WHERE user_id = ` + curr_user + ` AND other_user = ` + users[i] + `; `
    text += `UPDATE houses SET amount = amount - `+ amount + ` WHERE user_id = ` + users[i] + ` AND other_user = ` + curr_user + `; `
    text += `insert into ious (user_id, other_user, house_id, amount, description) values (` + curr_user + `, ` + users[i] + `, ` + req.body.house_id + `, ` + amount.toString() + `, '` + req.body.description + `'); `
  }
  text += `END;`
  values = []
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/add_object_iou", (req, res) => {
  users = req.body.users
  curr_user = req.body.user_id
  if(users.length < 1){
    return res.status(400).send({ error: "No users added for this transaction" });
  }
  object = req.body.object
  text = `BEGIN; `
  for (var i = 0; i < users.length; i++){
    text += `UPDATE houses SET items = items + 1 WHERE (user_id = ` + curr_user + ` AND other_user = ` + users[i] + ` AND 
    house_id = `+ req.body.house_id +`) OR (user_id = ` + users[i] + ` AND other_user = ` + curr_user + ` AND house_id = `+ req.body.house_id + `); `
    text += `insert into ious (user_id, other_user, house_id, object) values (` + curr_user + `, ` + users[i] + `, ` + req.body.house_id + `, '` + object.toString() + `'); `
  }
  text += `END;`
  values = []
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/settle_object_iou", (req, res) => {
    values = [req.body.id, req.body.user_id, req.body.other_user, req.body.house_id]
    text = `WITH a AS (DELETE FROM ious WHERE id = $1)
    UPDATE houses SET items = items - 1 WHERE 
    (user_id = $2 AND other_user = $3 AND house_id = $4)
    OR (user_id = $3 AND other_user = $2 AND house_id = $4);`
  
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/settle_money_iou", (req, res) => {
  values = [req.body.user_id, req.body.other_user, req.body.house_id]
  text = `WITH a AS (DELETE FROM ious WHERE (amount is not null and 
    user_id = $1 and other_user = $2 and house_id = $3) or (amount 
    is not null and user_id = $2 and other_user = $1 and house_id = $3))
    UPDATE houses SET amount = 0 where (user_id = $1 and other_user = $2 
    and house_id = $3) or (user_id = $2 and other_user = $1 and house_id = $3)`

  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/insert_necessity", (req, res) => {
  values = [req.body.added_by, req.body.house_id, req.body.item, req.body.description]
  text = `insert into necessities (added_by, house_id, item, description) values ($1, $2, $3, $4);`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})

router.post("/resolve_necessity_item", (req, res) => {
  values = [req.body.house_id, req.body.id]
  text = `delete from necessities where house_id = $1 and id = $2;`
  query(text, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({ error: "There was an internal error" });
    }
    return res.status(200).send({ success: true });
  });
})
module.exports = router;
