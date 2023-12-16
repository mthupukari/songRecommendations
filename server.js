const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const port = 5001;

const userName = String(process.env.MONGO_DB_USERNAME);
const password = String(process.env.MONGO_DB_PASSWORD);
const mongoDatabase = String(process.env.MONGO_DB_NAME);
const mongoCollection = String(process.env.MONGO_COLLECTION);

const uri = String(
  `mongodb+srv://${userName}:${password}@cluster0.n9oxilm.mongodb.net/?retryWrites=true&w=majority`
);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "templates")));

app.listen(port, () => {
  console.log(`Web server started and running at http://localhost:${port}`);
  process.stdout.write("Stop to shutdown server: ");
});

process.stdin.setEncoding("utf8");
process.stdin.on("data", (input) => {
  const command = input.trim();
  if (command === "stop") {
    console.log("Shutting down server");
    process.exit(0);
  }
});

app.get("/", (req, res) => {
  res.render("login", { message: "" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Connect to MongoDB
    await client.connect();

    // Access your database and collection
    const database = client.db(mongoDatabase);
    const collection = database.collection(mongoCollection);

    // Check if the user exists in MongoDB
    const user = await collection.findOne({ username, password });

    // Close the connection
    await client.close();

    if (user) {
      // User found, proceed with authenticated actions
      res.render("index", { recommendations: "" }); // You can redirect or render a different page
    } else {
      // User not found or credentials mismatch
      res.render("login", {
        message: "Invalid username or password. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error occurred during login:", error);
    res.status(500).send("Error logging in. Please try again.");
  }
});

app.get("/signup", (req, res) => {
  res.render("signUp", { message: "" });
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Connect to MongoDB
    await client.connect();

    // Access your database and collection
    const database = client.db(mongoDatabase);
    const collection = database.collection(mongoCollection);

    // Check if the username already exists
    const existingUser = await collection.findOne({ username });

    if (existingUser) {
      // If username already exists, send a message to the user
      res.render("signUp", {
        message: "Username already exists. Please choose a different username.",
      });
    } else {
      // Insert new user into MongoDB if the username is not found
      const result = await collection.insertOne({ username, password });
      console.log(result);

      // Close the connection
      await client.close();

      // Redirect or respond accordingly
      res.redirect("/"); // Redirect to login after signup
    }
  } catch (error) {
    console.error("Error occurred during sign up:", error);
    res.status(500).send("Error signing up. Please try again.");
  }
});

app.post("/index", async (req, res) => {
  const { song, artist } = req.body;

  const url = `https://genius-song-lyrics1.p.rapidapi.com/search/?q=${encodeURIComponent(
    song + " " + artist
  )}&per_page=10&page=1`;

  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "e05fb56deamshe2f473431154f9cp11bfc5jsn7a12e0f13f7e",
      "X-RapidAPI-Host": "genius-song-lyrics1.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    let songId = result["hits"][0]["result"]["id"];

    const url2 =
      "https://genius-song-lyrics1.p.rapidapi.com/song/recommendations/?id=" +
      songId;
    const options2 = {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": "e05fb56deamshe2f473431154f9cp11bfc5jsn7a12e0f13f7e",
        "X-RapidAPI-Host": "genius-song-lyrics1.p.rapidapi.com",
      },
    };

    let arr = [];

    try {
      const response = await fetch(url2, options2);
      const result = await response.json();
      let recs = result["song_recommendations"]["recommendations"];
      for (let i = 0; i < recs.length; i++) {
        arr.push(recs[i]["recommended_song"]["full_title"]);
      }
      res.render("index", { recommendations: arr });
    } catch (error) {
      res.render("index", { recommendations: ["Error: Could not find song"] });
    }
  } catch (error) {
    res.render("index", { recommendations: ["Error: Could not find song"] });
  }
});
