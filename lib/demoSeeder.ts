
import { mediaStore } from './mediaStore';

/**
 * Generates a dummy video blob using Canvas and MediaRecorder.
 * This ensures the app is "batteries included" for testing.
 */
async function createMockVideoBlob(text: string, color: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  
  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    
    recorder.start();
    
    let frame = 0;
    const interval = setInterval(() => {
      // Draw background
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw text
      ctx.fillStyle = 'white';
      ctx.font = 'italic bold 60px serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      
      // Draw subtext
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`[ MOCK THREAD #${frame} ]`, canvas.width / 2, canvas.height / 2 + 80);
      
      frame++;
      if (frame > 60) { // 2 second video
        clearInterval(interval);
        recorder.stop();
      }
    }, 33);
  });
}

export async function seedMockData() {
  const demoKeys = [
    { key: '/videos/nana_1.mp4', text: 'James: "Happy Birthday Nana!"', color: '#1e293b' },
    { key: '/videos/nana_2.mp4', text: 'Lily: "We love you so much."', color: '#451a03' },
    { key: '/videos/nana_3.mp4', text: 'Uncle Bob: "Remember the lake?"', color: '#064e3b' },
    { key: '/videos/nana_4.mp4', text: 'Sarah: "You look amazing at 80."', color: '#4c1d95' },
    { key: '/videos/nana_5.mp4', text: 'Michael: "The heart of our family."', color: '#831843' },
    { key: '/videos/nana_6.mp4', text: 'Aunt May: "To many more years."', color: '#164e63' },
    { key: '/videos/nana_7.mp4', text: 'David: "Cheers to my old friend!"', color: '#171717' },
  ];

  for (const item of demoKeys) {
    const exists = await mediaStore.getVideoUrl(item.key);
    if (!exists) {
      console.log(`Seeding mock asset: ${item.key}`);
      const blob = await createMockVideoBlob(item.text, item.color);
      await mediaStore.saveVideo(item.key, blob);
    }
  }
}
