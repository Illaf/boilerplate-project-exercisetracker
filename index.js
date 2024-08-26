const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

app.use(cors());
app.use(express.json()); // Ensure this is before your routes
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// MongoDB connection
const connectString = process.env.MONGO_URI;
mongoose.connect(connectString);

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('Error connecting to MongoDB:', err);
});

// Define schemas and models
const userSchema = new mongoose.Schema({
  username: String,
  exercises: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
});
const exerciseSchema = new mongoose.Schema({
  username:mongoose.Schema.Types.String,
  description: String,
  duration: Number,
  date: Date,
  userId: mongoose.Schema.Types.ObjectId,
});

const User = mongoose.model("User", userSchema);
 //const Exercise= mongoose.model('Exercise',exerciseSchema);
// Handle user creation
app.post("/api/users", async (req, res) => {
  console.log("Request Body:", req.body);  // Check the incoming request body

  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const user = new User({ username });
    const savedUser = await user.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});
app.get("/api/users",async(req,res)=>{
  
try {
  const userList= await User.find();
  return res.json(userList)
} catch (error) {
  console.log("error",error)
}
  
})
// app.post('/api/users/:_id/exercises', async (req, res) => {
//   try {
//     const { _id } = req.params;
//     let { description, duration, date } = req.body;

//     // Default date to current date if not provided
//     if (!date) {
//       date = new Date();
//     } else {
//       date = new Date(date);
//     }

//     // Find the user by ID
//     const user = await User.findById(_id);

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Add new exercise to user's log
//     const exercise = {
//       description: description,
//       duration: parseInt(duration),
//       date: date.toDateString() // Format the date as required
//     };

//     user.exercises.push(exercise);
//     await user.save();

//     // Respond with the updated user and the added exercise
//     res.json({
//       _id: user._id,
//       username: user.username,
//       description: exercise.description,
//       duration: exercise.duration,
//       date: exercise.date
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "An error occurred while adding the exercise" });
//   }
// });

// app.get("/api/users/:_id/logs",async(req,res)=>{
//   try {
//     const {_id} = req.params;
//     const {from,to} = req.query;

//     const user= await User.findById(_id);
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     let exercises = user.exercises;

//     if (from || to) {
//       const fromDate = from ? new Date(from) : null;
//       const toDate = to ? new Date(to) : null;

//       exercises = exercises.filter(ex => {
//         const exDate = new Date(ex.date);
//         return (!fromDate || exDate >= fromDate) && (!toDate || exDate <= toDate);
//       });
//     }
//     res.json({
//       _id: user._id,
//       username: user.username,
//       count: exercises.length,
//       log: exercises
//     });
//   } catch (error) {
//     return res.json({error: error})
//   }
  
// })
// POST /api/users/:_id/exercises - Add an exercise to the user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    let { description, duration, date } = req.body;

    // Validate and set default values
    if (!description || !duration) {
      return res.status(400).json({ error: "Description and duration are required" });
    }

    // Default date to the current date if not provided
    if (!date) {
      date = new Date();
    } else {
      date = new Date(date);
    }

    // Find the user by ID
    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Add the new exercise to the user's exercises array
    const newExercise = {
      description: String(description),
      duration: Number(duration),
      date: date
    };

    user.exercises.push(newExercise);

    // Save the updated user document with the new exercise
    await user.save();

    // Respond with the updated user and the added exercise
    res.json({
      _id: user._id,
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString() // Format the date to string
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while adding the exercise" });
  }
});

// GET /api/users/:_id/logs - Retrieve exercise logs of the user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    // Find the user by ID
    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Filter exercises by date range if provided
    let exercises = user.exercises;

    if (from) {
      const fromDate = new Date(from);
      exercises = exercises.filter(ex => ex.date >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      exercises = exercises.filter(ex => ex.date <= toDate);
    }

    // Limit the number of exercises returned if limit is provided
    if (limit) {
      exercises = exercises.slice(0, Number(limit));
    }

    // Return the user's exercise log with the count of exercises
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString() // Convert to string format
      }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while retrieving the exercise logs" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
