const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const { Upload } = require("@aws-sdk/lib-storage");

const { Readable } = require('stream');

ffmpeg.setFfmpegPath(ffmpegPath);


const getS3Instance = () => {
  return new S3Client();
}

const ReadableFromBuffer = async (stream) => {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Readable.from(Buffer.concat(chunks))
};

module.exports.createGif = async (event) => {
  const bucketInstance = getS3Instance();

  const getVideoObjectCommand = new GetObjectCommand({
    Bucket: event.bucket,
    Key: event.key,
  });

  const videoStream = await bucketInstance.send(getVideoObjectCommand);

  const readable = await ReadableFromBuffer(videoStream.Body);

  const processStream = ffmpeg(readable)
    .size('480x320')
    .fps(3)
    .format('gif')

  const uploadParams = {
    Bucket: event.gif + '-gif',
    Key: event.key + 'gif',
    Body: processStream.pipe()
  }

  const upload = new Upload({
    client: bucketInstance,
    params: uploadParams
  });

  try {
    const response = await upload.done();
    console.log("File uploaded to S3:", response);
  } catch (error) {
    console.error("S3 upload error:", error);
  };
}