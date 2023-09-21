import express from "express";
import Ffmpeg from "fluent-ffmpeg";


const app = express();
const port = 3000;

app.post("/process-video", (req, res) => {
  // Get path of the input video from the request body
  const inputFilePath = req.body.inputFilePath
  const outputFilePath = req.body.outputFilePath

  if (!inputFilePath || !outputFilePath){
    res.status(400).send("Bad request: Missing file path.") // clien error, gave up the wrong request
  }

  Ffmpeg(inputFilePath)
  .outputOptions("-vf", "scale=-1:360") // converting the video into 360p, vf = video file?
  .on("end", () => {

  })
  .on("erorr", (err) => {
    console.log(`An error occured: ${err.message}`);
    res.status(500).send(`Internal Server Erorr ${err.message}`);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});