import React, { useState } from 'react';
import JSZip from 'jszip';
import BubbleGenerator from './BubbleGenerator';
import AuthWrapper from './AuthWrapper';

const App: React.FC = () => {
  const [mainText, setText] = useState<string>('');
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<(Blob | null)[]>([]);

  const handleGenerated = (index: number, blob: Blob) => {
    const newImages = [...generatedImages];
    newImages[index] = blob;
    setGeneratedImages(newImages);
  };

  const handleDownloadAllAsZip = async () => {
    if (!generatedImages.length) return;
    
    const zip = new JSZip();
    generatedImages.forEach((blob, index) => {
      if (!blob) return;
      zip.file(`bubble_${index + 1}.png`, blob);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = "bubbles.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setDownloadStatus('ダウンロードしました');
    setTimeout(() => setDownloadStatus(''), 2000);
  };
  
  const textLines = mainText
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(block => block !== '');

  return (
    <AuthWrapper>
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>漫画の吹き出し生成ツール</h1>
      
      {textLines.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleDownloadAllAsZip}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: downloadStatus ? '#4CAF50' : '#FF5722',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            {downloadStatus || 'すべての吹き出しをダウンロード'}
          </button>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <textarea
          value={mainText}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: '100%',
            height: '200px',
            padding: '10px',
            marginBottom: '10px'
          }}
          placeholder="複数行のテキストを入力してください。空行で区切ることで別々の吹き出しになります。"
        />
      </div>

      {textLines.map((text, index) => (
        <BubbleGenerator
          key={index}
          text={text}
          index={index}
          onGenerated={handleGenerated}
        />
      ))}
    </div>
    </AuthWrapper>
  );
};

export default App;