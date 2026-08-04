import React, { useRef, useState } from 'react';
import { Download, Share2, Sparkles } from 'lucide-react';

export interface BestSubmission {
  username: string;
  memeUrl: string;
  prompt: string;
  score: number;
}

interface MemeOfTheMatchCardProps {
  bestSubmission: BestSubmission;
}

const MemeOfTheMatchCard: React.FC<MemeOfTheMatchCardProps> = ({ bestSubmission }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const generateCanvas = (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = 700;
      canvas.height = 850;

      // 1. Background
      ctx.fillStyle = '#FFDDAB';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Thick Bento Border
      ctx.strokeStyle = '#131010';
      ctx.lineWidth = 12;
      ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

      // 3. Top Banner
      ctx.fillStyle = '#D98324';
      ctx.fillRect(40, 40, canvas.width - 80, 70);
      ctx.strokeStyle = '#131010';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, canvas.width - 80, 70);

      ctx.fillStyle = '#131010';
      ctx.font = '900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔥 MEME OF THE MATCH 🔥', canvas.width / 2, 85);

      // 4. Prompt Bubble Box
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(40, 130, canvas.width - 80, 120);
      ctx.strokeRect(40, 130, canvas.width - 80, 120);

      ctx.fillStyle = '#131010';
      ctx.font = 'bold 22px sans-serif';
      const promptText = `"${bestSubmission.prompt}"`;
      // Simple word wrapping
      const words = promptText.split(' ');
      let line = '';
      let y = 175;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > canvas.width - 120 && i > 0) {
          ctx.fillText(line, canvas.width / 2, y);
          line = words[i] + ' ';
          y += 32;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width / 2, y);

      // 5. Load Meme Image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw centered meme box
        const imgBoxX = 50;
        const imgBoxY = 270;
        const imgBoxW = 600;
        const imgBoxH = 430;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
        ctx.strokeStyle = '#131010';
        ctx.lineWidth = 6;
        ctx.strokeRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);

        // Keep aspect ratio
        const scale = Math.min(
          (imgBoxW - 20) / img.width,
          (imgBoxH - 20) / img.height
        );
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = imgBoxX + (imgBoxW - drawW) / 2;
        const drawY = imgBoxY + (imgBoxH - drawH) / 2;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // 6. Footer bar
        ctx.fillStyle = '#5F8B4C';
        ctx.fillRect(40, 720, canvas.width - 80, 70);
        ctx.strokeRect(40, 720, canvas.width - 80, 70);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 24px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Cooked by @${bestSubmission.username}`, 65, 764);

        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`+${bestSubmission.score} PTS`, canvas.width - 65, 764);

        // 7. Watermark
        ctx.fillStyle = '#131010';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PLAY AT MEMEGAME.APP', canvas.width / 2, 820);

        resolve(canvas);
      };

      img.onerror = () => {
        // Fallback if image fails to load
        ctx.fillStyle = '#131010';
        ctx.font = 'italic 20px sans-serif';
        ctx.fillText('[Meme Image]', canvas.width / 2, 480);
        resolve(canvas);
      };

      img.src = bestSubmission.memeUrl;
    });
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `meme-of-the-match-${bestSubmission.username}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to generate meme card PNG:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `meme-of-the-match-${bestSubmission.username}.png`, {
          type: 'image/png',
        });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Meme of the Match - MemeGame',
            text: `Check out this winning meme cooked by @${bestSubmission.username}!`,
            files: [file],
          });
        } else {
          // Fall back to download if Web Share is not available
          handleDownload();
        }
        setIsGenerating(false);
      });
    } catch (e) {
      console.error('Failed to share meme card:', e);
      setIsGenerating(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className="bg-[#FFDDAB] rounded-2xl p-5 sm:p-6 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] mb-8 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4 border-b-2 border-[#131010]/10 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#D98324]" strokeWidth={2.5} />
          <h3 className="text-base font-black text-[#131010] font-poppins uppercase tracking-wider">
            Meme of the Match
          </h3>
        </div>
        <span className="text-xs font-bold bg-[#D98324] text-white px-2.5 py-0.5 rounded-full border border-[#131010]">
          +{bestSubmission.score} PTS
        </span>
      </div>

      {/* Prompt Display */}
      <div className="bg-white border-2 border-[#131010] rounded-xl p-3 mb-4 shadow-[2px_2px_0px_0px_#131010]">
        <p className="text-sm sm:text-base font-bold text-[#131010] text-center italic">
          "{bestSubmission.prompt}"
        </p>
      </div>

      {/* Meme Image Preview */}
      <div className="bg-white border-2 border-[#131010] rounded-xl overflow-hidden mb-4 shadow-[3px_3px_0px_0px_#131010] max-h-72 flex items-center justify-center">
        <img
          src={bestSubmission.memeUrl}
          alt="Meme of the Match"
          className="max-h-72 w-full object-contain bg-slate-100"
        />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs sm:text-sm font-black text-[#131010]">
          Cooked by <span className="text-[#5F8B4C]">@{bestSubmission.username}</span>
        </span>
        <span className="text-[10px] font-bold font-courier text-[#131010]/50 tracking-widest">
          MEMEGAME • WINNER
        </span>
      </div>

      {/* Export Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 text-[#131010] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none rounded-xl font-bold text-xs uppercase transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" strokeWidth={2.5} />
          {isGenerating ? 'Generating...' : 'Download Card (PNG)'}
        </button>

        <button
          onClick={handleShare}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#D98324] hover:bg-[#c4741e] text-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none rounded-xl font-bold text-xs uppercase transition-all disabled:opacity-50"
        >
          <Share2 className="w-4 h-4" strokeWidth={2.5} />
          Share
        </button>
      </div>
    </div>
  );
};

export default MemeOfTheMatchCard;
