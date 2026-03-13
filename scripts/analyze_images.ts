import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

async function main() {
  const zai = await ZAI.create();
  
  const imagesToAnalyze = [
    '/home/z/my-project/upload/images.png',
    '/home/z/my-project/upload/Sans titre.png',
    '/home/z/my-project/upload/V.png'
  ];
  
  for (const imagePath of imagesToAnalyze) {
    if (!fs.existsSync(imagePath)) continue;
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    
    console.log(`\n=== Analyzing: ${path.basename(imagePath)} ===\n`);
    
    try {
      const response = await zai.chat.completions.createVision({
        model: 'glm-4.6v',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Décris cette image en détail. Est-ce un jeu de course moto/drag racing? Quel style graphique? Que voit-on exactement (route, moto, environnement, perspective, décors)? Décris la composition et l\'ambiance visuelle.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ],
        thinking: { type: 'disabled' }
      });
      
      console.log(response.choices?.[0]?.message?.content);
    } catch (err: any) {
      console.error('Error:', err?.message);
    }
  }
}

main();
