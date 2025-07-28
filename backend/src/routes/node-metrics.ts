import { Router, Request, Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';

const router = Router();

// Ping endpoint for latency measurement
router.get('/ping', (_req: Request, res: Response) => {
  res.status(200).send('pong');
});

// Speed test endpoint for bandwidth measurement
router.get('/speedtest', (_req: Request, res: Response) => {
  // Create a 1MB file of random data for speed testing
  const fileSize = 1024 * 1024; // 1MB
  const chunkSize = 64 * 1024; // 64KB chunks
  let bytesSent = 0;

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', fileSize);

  function sendChunk() {
    const remaining = fileSize - bytesSent;
    const size = Math.min(chunkSize, remaining);
    
    if (size <= 0) {
      res.end();
      return;
    }

    // Generate random data
    const buffer = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }

    const canContinue = res.write(buffer);
    bytesSent += size;

    if (canContinue) {
      sendChunk();
    } else {
      res.once('drain', sendChunk);
    }
  }

  sendChunk();
});

export default router; 