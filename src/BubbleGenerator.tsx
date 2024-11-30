import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';

interface BubbleGeneratorProps {
  text: string;
  index: number;
  onGenerated: (index: number, blob: Blob) => void;
}

const SCALE_FACTOR = 4;
const CHAR_HEIGHT = 28 * SCALE_FACTOR;
const LINE_SPACING = 34 * SCALE_FACTOR;
const STROKE_WIDTH = 4 * SCALE_FACTOR;
const HORIZONTAL_MARGIN = 19 * SCALE_FACTOR;  // 8から12に増加
const VERTICAL_MARGIN = 15 * SCALE_FACTOR;
const SAFETY_MARGIN = 1.3;

const BubbleGenerator: React.FC<BubbleGeneratorProps> = ({ text, index, onGenerated }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const processText = (text: string): string => {
    let processed = text;
  
    processed = processed.replace(/[\uff61-\uff9f]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );

    const replacements: [RegExp, string][] = [
      [/([！!])\?/g, '⁉︎'],
      [/!{2,}/g, '‼︎'],
      [/！{2,}/g, '‼︎'],
      [/[！!]/g, '!'],
      [/[？?]/g, '?'],
      [/\.\.\./g, '・・・'],
      [/…/g, '・・・'],
      [/ー/g, '｜'],
      [/〜/g, '≀'],
      [/[（(]/g, '︵'],
      [/[）)]/g, '︶'],
    ];

    replacements.forEach(([pattern, replacement]) => {
      processed = processed.replace(pattern, replacement);
    });

    processed = processed.replace(/[a-zA-Z0-9]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) + 0xFEE0)
    );

    return processed;
  };

  const drawBubble = (isForDownload = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const processedText = processText(text);
    const lines = processedText.split('\n');
    const maxChars = Math.max(...lines.map(line => line.length));
    const lineCount = Math.max(lines.length, 1);

    const baseTextHeight = maxChars * CHAR_HEIGHT;
    const baseTextWidth = lineCount * LINE_SPACING;
    const textHeight = Math.ceil(baseTextHeight * SAFETY_MARGIN);
    const textWidth = Math.ceil(baseTextWidth * SAFETY_MARGIN);

    const height = textHeight + (VERTICAL_MARGIN * 2);
    const width = textWidth + (HORIZONTAL_MARGIN * 2);

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width / SCALE_FACTOR}px`;
    canvas.style.height = `${height / SCALE_FACTOR}px`;

    ctx.scale(SCALE_FACTOR, SCALE_FACTOR);
    ctx.clearRect(0, 0, width / SCALE_FACTOR, height / SCALE_FACTOR);

    const centerX = width / (2 * SCALE_FACTOR);
    const centerY = height / (2 * SCALE_FACTOR);
    const ellipseWidth = (width - STROKE_WIDTH) / (2 * SCALE_FACTOR);
    const ellipseHeight = (height - STROKE_WIDTH) / (2 * SCALE_FACTOR);

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, ellipseWidth, ellipseHeight, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = STROKE_WIDTH / SCALE_FACTOR;
    ctx.stroke();

    ctx.fillStyle = 'black';
    ctx.font = 'bold 24px "Hiragino Kaku Gothic ProN", "MS Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const startX = centerX + ((lineCount - 1) * LINE_SPACING / SCALE_FACTOR / 2);
    const startY = centerY - ((maxChars * CHAR_HEIGHT / SCALE_FACTOR) / 2) + (CHAR_HEIGHT / SCALE_FACTOR / 2);

    lines.forEach((line, lineIndex) => {
      const chars = line.split('');
      const lineX = startX - (lineIndex * LINE_SPACING / SCALE_FACTOR);
      let charY = startY;

      chars.forEach((char, charIndex) => {
        const isKutouten = /[、。]/.test(char);
        const isSymbol = /[⁉︎‼︎]/.test(char);
        
        if (isKutouten) {
          const adjustX = CHAR_HEIGHT * 0.45 / SCALE_FACTOR;
          const adjustY = CHAR_HEIGHT * 0.5 / SCALE_FACTOR;
          const prevCharY = charY - CHAR_HEIGHT / SCALE_FACTOR;
          ctx.fillText(char, lineX + adjustX, prevCharY + adjustY);
          charY += CHAR_HEIGHT * 0.7 / SCALE_FACTOR;
        } else {
          ctx.fillText(char, lineX, charY);
          charY += CHAR_HEIGHT / SCALE_FACTOR;
        }
      });
    });

    if (isForDownload) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      const isInsideEllipse = (x: number, y: number): boolean => {
        const normalizedX = (x - centerX * SCALE_FACTOR) / (ellipseWidth * SCALE_FACTOR);
        const normalizedY = (y - centerY * SCALE_FACTOR) / (ellipseHeight * SCALE_FACTOR);
        return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
      };

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (!isInsideEllipse(x, y)) {
            data[i + 3] = 0;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    if (isForDownload && onGenerated) {
      canvas.toBlob((blob) => {
        if (blob) onGenerated(index, blob);
      }, 'image/png');
    }

    return canvas;
  };

  const copyToClipboard = async () => {
    const canvas = drawBubble(true);
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
        }, 'image/png');
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました', err);
    }
  };

  useEffect(() => {
    drawBubble(true);
  }, [text]);

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ 
        position: 'relative',
        border: '1px solid #ccc',
        padding: '20px',
        backgroundColor: '#f9f9f9',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: '#4a5568',
          color: 'white',
          padding: '4px 8px',
          borderBottomRightRadius: '4px',
          fontSize: '14px'
        }}>
          #{index + 1}
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          marginTop: '20px'
        }}>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              border: '1px solid #ccc'
            }}
          />
          <button
            onClick={copyToClipboard}
            style={{
              padding: '8px 16px',
              backgroundColor: copySuccess ? '#4CAF50' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            {copySuccess ? 'コピーしました' : 'クリップボードにコピー'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BubbleGenerator;