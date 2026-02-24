import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Trash2, Circle, Square, Type, Undo, Redo, Download, Pen } from 'lucide-react';

const PhotoAnnotation = ({ imageSrc, onSave, width = 500 }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('circle');
  const [color, setColor] = useState('#ff0000');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.height / img.width;
      canvas.width = width;
      canvas.height = width * aspectRatio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveToHistory();
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc, width]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadFromHistory(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadFromHistory(newIndex);
    }
  };

  const loadFromHistory = (index) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[index];
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    
    if (tool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'circle') {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(history[historyIndex], 0, 0);
      const radius = Math.sqrt(
        Math.pow(coords.x - ctx.startX, 2) + Math.pow(coords.y - ctx.startY, 2)
      );
      ctx.beginPath();
      ctx.arc(ctx.startX, ctx.startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(coords.x - ctx.startX, 2) + Math.pow(coords.y - ctx.startY, 2)
      );
      ctx.beginPath();
      ctx.arc(ctx.startX, ctx.startY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    setIsDrawing(false);
    saveToHistory();
  };

  const clearAnnotations = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      saveToHistory();
    };
    img.src = imageSrc;
  };

  const saveAnnotations = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const downloadAnnotated = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `annotated-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleMouseDown = (e) => {
    const coords = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.startX = coords.x;
    ctx.startY = coords.y;
    startDrawing(e);
  };

  if (!imageLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <Card className="p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Annotate:</span>
          <Button
            variant={tool === 'pen' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('pen')}
            className={tool === 'pen' ? 'bg-slate-900' : ''}
          >
            <Pen className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === 'circle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('circle')}
            className={tool === 'circle' ? 'bg-slate-900' : ''}
          >
            <Circle className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
            title="Choose color"
          />
          
          <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={clearAnnotations} className="text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="border border-slate-200 rounded-lg cursor-crosshair touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      
      <div className="flex gap-2 mt-3">
        <Button variant="outline" onClick={downloadAnnotated} className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button onClick={saveAnnotations} className="flex-1 bg-green-600 hover:bg-green-700">
          Save Annotated Photo
        </Button>
      </div>
    </Card>
  );
};

export default PhotoAnnotation;
