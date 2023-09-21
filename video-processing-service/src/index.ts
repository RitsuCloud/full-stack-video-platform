import express from 'express';
//import ffmpeg from 'fluent-ffmpeg';
import { convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo } from './storage';

//https://stackoverflow.com/questions/45555960/nodejs-fluent-ffmpeg-cannot-find-ffmpeg
//const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
//ffmpeg.setFfmpegPath(ffmpegPath);

setupDirectories();

const app = express();
app.use(express.json());

app.post('/process-video', async (req, res) => {
  // Get the bucket and filename from the Cloud Pub/Sub message
  let data;
  try{
    const message = Buffer.from(req.body.message.data, 'base64').toString('utf-8');
    data = JSON.parse(message);
    if (!data.name){ // data.name is the filename
      throw new Error('Invalid message payload received.');
    }
  } catch(error){
    console.error(error);
    return res.status(400).send('Bad Request: missing filename.')
  }

  const inputFileName = data.Name;
  const outputFileName = `processed-${inputFileName}`;

  // Download the raw video from Cloud Storage
  await downloadRawVideo(inputFileName);

  // convert the video to 360p
  try{
    convertVideo(inputFileName, outputFileName);
  } catch (err){
    Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outputFileName)
    ]);
    console.error(err);
    return res.status(500).send('internal Server Error: video processing failed.');
  }

  // Upload the processed video to Cloud Storage
  await uploadProcessedVideo(outputFileName);
  
  await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outputFileName)
  ]);

  return res.status(200).send('Processed finished and uploaded succuesfully.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});