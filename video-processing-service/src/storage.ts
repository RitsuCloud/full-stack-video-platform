// Goal of this file
// 1. Google Cloud storage interaction (GCS)
// 2. Local file interaction 
import {Storage} from '@google-cloud/storage';
import { dir } from 'console';
import exp from 'constants';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

const storage = new Storage();

// this is where people going to upload video to, and we download it from here
const rawVideoBucketName = "ritsu-cloud-raw-videos";
// then once we processed the video, we upload it to here
const processedVideoBucketName = "ritsu-cloud-processed-videos";

// download to this directory
const localRawVideoPath = "./raw-videos";
// process to this directory, then we upload it and delete the raw and processed video
// from our local machine
const localProcessedVideoPath = "./processed-videos";

/**
 * Creates the local directories for raw and processed videos
 * So two different directories
 */
export function setupDirectories(){
  ensureDirectoryExistence(localRawVideoPath);
  ensureDirectoryExistence(localProcessedVideoPath);
}

/**
 * @param rawVideoName - Name of the file to convert from {@link localRawVideoPath}
 * @param processedVideoName - Name of the file to convert to {@link localProcessedVideoPath}
 * @return A promise that resolves when the video has been converted
 */
export function convertVideo(rawVideoName: string, processedVideoName: string){
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
    .outputOptions('-vf', 'scale=-1:360') // 360p
    .on('end', function() {
        console.log('Processing finished successfully');
        resolve();
    })
    .on('error', function(err: any) {
        console.log('An error occurred: ' + err.message);
        reject(err);
    })
    .save(`${localProcessedVideoPath}/${processedVideoName}`);
  })
}

/**
 * @param fileName - The name of the file to download from the
 * {@link rawVideoBucketName} bucket into the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been downloaded
 */
// async function ensures the function returns a promise, and wrap non promise in it
export async function downloadRawVideo(fileName: string){
  // Since download is a promise, we can use await to block any other code from running
  // until the promise resolves
  await storage.bucket(rawVideoBucketName)
  .file(fileName)
  .download({ destination: `${localRawVideoPath}/${fileName}`});

  console.log(
    `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`
  );
}

/**
 * @param fileName - The name of the file to upload from the 
 * {@link localProcessedVideoPath} to the bucket {@link processedVideoBucketName}
 * @returns A promise that resolves when the file has been uploaded
 */
export async function uploadProcessedVideo(fileName: string){
  const bucket = storage.bucket(processedVideoBucketName);
  
  await bucket.upload(`${localProcessedVideoPath}/${fileName}`,
   {destination: fileName}
  );

  console.log(
    `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`
  );

  await bucket.file(fileName).makePublic();
}

/**
 * @param fileName - The name of the file to be deleted from
 * {@link localRawVideoPath} folder.
 * @return A promise that resolves when the file has been deleted
 */
export function deleteRawVideo(fileName: string){
  return deleteFile(`${localRawVideoPath}/${fileName}`);
}

/**
 * @param fileName - the name of the file to be deleted from
 * {@link localProcessedVideoPath} folder.
 * @return A promise that resolves when the file has been deleted
 */
export function deleteProcessedVideo(fileName:string){
  return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * @param filePath - The path of the file to be removed
 * @return A promised that resolves when the file has been deleted
 */
function deleteFile(filePath: string): Promise<void>{
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err){
          console.log(`Failed to delete file at ${filePath}, err`);
          reject(err)
        }else{
          console.log(`Succuessfully deleted file at ${filePath}`);
          resolve
        }
      });
    }else{
      console.log(`File not found at ${filePath}, skipping the delete.`);
      reject("The file doesn't exist");
    }
  });
}

/**
 * Ensures a directory exists, create it if it doesn't
 * @param {string} dirPath - The directory path to check
 */
function ensureDirectoryExistence(dirPath: string){
  if (!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath, {recursive: true}); // recursive: true enables creating nested directory
    console.log(`Directory created at ${dirPath}`);
  }else{
    console.log("Directory has already been created");
  }
}