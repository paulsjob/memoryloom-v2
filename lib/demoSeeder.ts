
import { mediaStore } from './mediaStore';

/**
 * Generates a dummy audio blob using OscillatorNode.
 */
async function createMockAudioBlob(): Promise<Blob> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const destination = audioCtx.createMediaStreamDestination();
  const recorder = new MediaRecorder(destination.stream);
  const chunks: Blob[] = [];

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
  oscillator.connect(destination);

  return new Promise((resolve) => {
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/wav' }));
    
    recorder.start();
    oscillator.start();
    
    setTimeout(() => {
      oscillator.stop();
      recorder.stop();
    }, 2000); // 2 second beep
  });
}

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
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = 'italic bold 60px serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'black';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      
      ctx.shadowBlur = 0;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(`[ NARRATIVE THREAD ACTIVE • ${frame} ]`, canvas.width / 2, canvas.height / 2 + 80);
      
      frame++;
      if (frame > 60) {
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

  // Seed a demo audio track
  const audioKey = '/audio/demo_track.wav';
  const audioExists = await mediaStore.getVideoUrl(audioKey);
  if (!audioExists) {
    const audioBlob = await createMockAudioBlob();
    await mediaStore.saveVideo(audioKey, audioBlob);
  }
}
