const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
const mongoose = require("mongoose");


app.use(
  cors({
    origin: "https://visapilot.netlify.app", // Specify your frontend domain here
    methods: ["GET", "POST", "PUT", "DELETE"], // Adjust methods as needed
    allowedHeaders: ["Content-Type"], // You can add more headers if needed
  })
);

app.use(express.json());
// app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3tilc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {

    const usersCollection = client.db("socialDB").collection("socialusers");
    const postsCollection = client.db("socialDB").collection("posts");

    
// POST endpoint for user registration
app.post("/users", async (req, res) => {
  const { name, email, photo, password, createdAt } = req.body;

  try {
    // Check if user already exists by email
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      // If the user exists, return a success message
      return res.status(200).json({ message: "User already exists." });
    }

    // Create new user object
    const newUser = {
      name,
      email,
      photo,
      password, // Ensure password is hashed before storing
      createdAt,
    };

    // Insert new user into the collection
    await usersCollection.insertOne(newUser);

    // Respond with success message
    res.status(201).json({ message: "User saved successfully!" });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ error: "Failed to save user." });
  }
});

    
   



app.get("/users", async (req, res) => {
  const { email } = req.query; // Assume the email is sent in the query parameter

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {

    // Find all users except the current user
    const users = await usersCollection.find({ email: { $ne: email } }).toArray();

    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});





const messagesCollection = client.db("socialDB").collection("messages");

// Endpoint to save a message
// app.post("/messages", async (req, res) => {
//   const { sender, receiver, text, timestamp } = req.body;

//   try {
//     const message = {
//       sender,
//       receiver,
//       text,
//       timestamp,
//     };

//     const result = await messagesCollection.insertOne(message);
//     res.status(201).json({ success: true, message: "Message sent!", result });
//   } catch (error) {
//     console.error("Error saving message:", error);
//     res.status(500).json({ success: false, error: "Failed to send message." });
//   }
// });



// Fetch messages for a user
// app.get("/messages", async (req, res) => {
//   const userEmail = req.query.user;

//   if (!userEmail) {
//     return res.status(400).json({ success: false, error: "Missing user email." });
//   }

//   try {
//     const messages = await messagesCollection
//       .find({ $or: [{ sender: userEmail }, { receiver: userEmail }] })
//       .sort({ timestamp: 1 }) // Sort by timestamp, most recent first
//       .toArray();

//     res.status(200).json({ success: true, messages });
//   } catch (error) {
//     console.error("Error fetching messages:", error);
//     res.status(500).json({ success: false, error: "Failed to fetch messages." });
//   }
// });




// Fetch all messages for a user
app.get("/messages", async (req, res) => {
  const { user, chatWith } = req.query;

  if (!user) {
    return res.status(400).json({ success: false, error: "User email is required." });
  }

  try {
    let query;

    // If chatWith is provided, fetch messages between two users
    if (chatWith) {
      query = {
        $or: [
          { sender: user, receiver: chatWith },
          { sender: chatWith, receiver: user },
        ],
      };
    } else {
      // Fetch unique users who interacted with the logged-in user
      query = {
        $or: [
          { sender: user },
          { receiver: user },
        ],
      };
    }

    const messages = await messagesCollection.find(query).toArray();

    if (chatWith) {
      // Return all messages between the logged-in user and the specified user
      return res.status(200).json({ success: true, messages });
    } else {
      // Extract unique participants for conversation list
      const usersSet = new Set();
      messages.forEach((msg) => {
        if (msg.sender !== user) usersSet.add(msg.sender);
        if (msg.receiver !== user) usersSet.add(msg.receiver);
      });
      const uniqueUsers = Array.from(usersSet);
      return res.status(200).json({ success: true, users: uniqueUsers });
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, error: "Failed to fetch messages." });
  }
});


// Save a new message
app.post("/messages", async (req, res) => {
  const { sender, receiver, text, timestamp, imageUrl } = req.body;

  // Ensure required fields are provided (either text or image should be there)
  if (!sender || !receiver || !timestamp) {
    return res.status(400).json({ success: false, error: "Sender, receiver, and timestamp are required." });
  }

  try {
    // Create new message object, optionally include imageUrl if provided
    const newMessage = {
      sender,
      receiver,
      text: text || "", // Ensure text is either provided or an empty string
      imageUrl: imageUrl || "", // Optional image URL
      timestamp,
    };

    // Insert the message into the database
    const result = await messagesCollection.insertOne(newMessage);

    // If the insertion was successful, send a response
    if (result.acknowledged) {
      res.status(201).json({ success: true, message: "Message sent successfully." });
    } else {
      res.status(500).json({ success: false, error: "Failed to send message." });
    }
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ success: false, error: "Failed to save message." });
  }
});





  // Post Route (No Schema)
  app.post("/posts", async (req, res) => {
    const { text, image, author, authorName, date } = req.body;

    // Ensure that either text or image is provided
    if (!text && !image) {
      return res.status(400).json({ success: false, error: "Post must contain either text or an image." });
    }

    try {
      // Prepare the new post data
      const newPost = {
        text,
        image,
        author,
        authorName,
        date, // The current date passed from the frontend
      };

      // Save the post to the 'posts' collection in the 'socialDB' database
      const result = await postsCollection.insertOne(newPost);

      if (result.acknowledged) {
        res.status(201).json({ success: true, message: "Post submitted successfully!", post: newPost });
      } else {
        res.status(500).json({ success: false, error: "Failed to submit post." });
      }
    } catch (error) {
      console.error("Error submitting post:", error);
      res.status(500).json({ success: false, error: "Failed to submit post." });
    }
  });



// Get all posts from the postsCollection
app.get("/posts", async (req, res) => {
  try {
    // Access the database and collection directly via mongoose connection
    const posts = await postsCollection.find().toArray();
    
    // Send the posts back as a JSON response
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    
    // Return an error response
    res.status(500).json({ success: false, error: "Failed to fetch posts." });
  }
});





// Fetch posts by author's email
app.get("/posts", async (req, res) => {
  const { authorEmail } = req.query; // Get email from query params
  try {
    const posts = await mongoose.connection.db
      .collection("posts")
      .find({ authorEmail })  // Filter posts by authorEmail
      .toArray();
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch posts." });
  }
});



app.delete("/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Log the ID being used for deletion
    console.log("Attempting to delete post with id:", id);

    const result = await postsCollection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    res.status(200).json({ success: true, message: "Post deleted successfully." });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ success: false, error: "Failed to delete post." });
  }
});





    

    





























    // Send a ping to confirm a successful connection

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("visa server is running");
});

app.listen(port, () => {
  console.log(`visa server is running on port: ${port}`);
});
