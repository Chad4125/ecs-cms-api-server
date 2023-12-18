const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const port = 12561;

// MongoDB Connections
mongoose.connect('mongodb://172.30.144.132:27017/messageLog', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const renderJobConnection = mongoose.createConnection('mongodb://172.30.144.132:27017/renderJobManager', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Use a separate connection for Image model
const imageConnection = mongoose.createConnection('mongodb://172.30.144.132:27017/uploadedImageObj', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define MongoDB Schemas and Models
const messageSchema = new mongoose.Schema({
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const renderJobSchema = new mongoose.Schema({
  submitter: String,
  status: String,
});

const imageSchema = new mongoose.Schema({
    version: String,
    filename: String
  });

const Message = mongoose.model('Message', messageSchema);
const RenderJob = renderJobConnection.model('RenderJob', renderJobSchema);
const Image = imageConnection.model('Image', imageSchema);

// Increase the limit for the JSON parser (adjust the limit according to your needs)
app.use(bodyParser.json({ limit: '10mb' }));

// Increase the limit for the URL-encoded data parser (adjust the limit according to your needs)
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));



app.post('/save-image', async (req, res) => {
    try {
      const version = req.body.version;
      const filename = req.body.filename;
  
      // MongoDB에 이미지 정보 저장
      const newImage = new Image({ version, filename });
      await newImage.save();
  
      res.status(201).json({ message: 'Image information saved successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  



// Endpoint to receive and save text messages
app.post('/log', async (req, res) => {
  const { text } = req.body;

  try {
    const message = new Message({ text });
    await message.save();
    res.status(201).send('Message saved successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to retrieve the latest text messages
app.get('/latest', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 1;

    const latestMessages = await Message.find().sort({ timestamp: -1 }).limit(count);

    if (latestMessages.length > 0) {
      const messages = latestMessages.map(message => ({ text: message.text }));
      res.json({ messages });
    } else {
      res.status(404).send('No messages found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Express Routes for Render Job
app.post('/submitJob', async (req, res) => {
  try {
    const { submitter } = req.body;
    const newJob = new RenderJob({ submitter, status: 'Pending' });
    await newJob.save();
    res.status(201).json({ message: 'Job submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/viewStatus/:submitter', async (req, res) => {
  try {
    const submitter = req.params.submitter;
    const jobs = await RenderJob.find({ submitter });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/takeJob', async (req, res) => {
  try {
    const job = await RenderJob.findOneAndUpdate(
      { status: 'Pending' },
      { $set: { status: 'In Progress' } },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: 'No jobs available' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/updateStatus/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { status } = req.body;
    const updatedJob = await RenderJob.findByIdAndUpdate(
      jobId,
      { $set: { status } },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
