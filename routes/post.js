var query = require(".././Tools/queries");
const bcrypt = require("bcrypt");
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

router.post("/get_users", async (req, res) => {
  values = [req.body.user_id];
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

router.post("/add_friend", (req, res) => {
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
module.exports = router;
