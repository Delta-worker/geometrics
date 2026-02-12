import React, { useMemo, useRef, useEffect, useState } from 'react';
import './Histogram.css';

export default function Histogram({ 
  data = [], 
  column = '', 
  title = 'Histogram',
  width = 400,
  height = 300,
  binCount = 20,
  color = '#e94560'
}) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, value: 0, count: 0 });

  // Calculate histogram bins
  const bins = useMemo(() => {
    if (!data.length || !column) return [];
    
    const values = data.map(d => parseFloat(d[column])).filter(v => !isNaN(v));
    if (!values.length) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (min === max) {
      return [{ range: [min, min], count: values.length, center: min }];
    }
    
    const binWidth = (max - min) / binCount;
    const histogram = Array(binCount).fill(null).map((_, i) => ({
      range: [min + i * binWidth, min + (i + 1) * binWidth],
      count: 0,
      center: min + (i + 0.5) * binWidth
    }));
    
    values.forEach(v => {
      const binIndex = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
      if (histogram[binIndex]) {
        histogram[binIndex].count++;
      }
    });
    
    return histogram;
  }, [data, column, binCount]);

  // Draw histogram on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bins.length) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, width, height);
    
    // Chart dimensions
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxCount = Math.max(...bins.map(b => b.count), 1);
    const barWidth = chartWidth / bins.length;
    
    // Draw bars
    bins.forEach((bin, i) => {
      const barHeight = (bin.count / maxCount) * chartHeight;
      const x = padding.left + i * barWidth;
      const y = padding.top + chartHeight - barHeight;
      
      // Bar gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, `${color}88`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    });
    
    // Draw axes
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    const yStep = Math.ceil(maxCount / 5);
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + chartHeight - (i / 5) * chartHeight;
      const label = Math.round(i * yStep);
      ctx.fillText(label.toString(), padding.left - 8, y + 4);
      
      // Grid line
      ctx.strokeStyle = '#0a0a1520';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }
    
    // X-axis labels (first and last)
    ctx.textAlign = 'center';
    if (bins.length > 0) {
      ctx.fillText(bins[0].range[0].toFixed(1), padding.left + 5, height - 10);
      ctx.fillText(bins[bins.length - 1].range[1].toFixed(1), width - padding.right - 5, height - 10);
    }
    
    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 20);
    
  }, [bins, width, height, title, color]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !bins.length) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = { left: 50, right: 20 };
    const chartWidth = width - padding.left - padding.right;
    
    const binIndex = Math.floor((x - padding.left) / (chartWidth / bins.length));
    const bin = bins[binIndex];
    
    if (bin) {
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
        value: bin.center.toFixed(2),
        count: bin.count
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  if (!column || !data.length) {
    return (
      <div className="histogram-container" style={{ width, height }}>
        <div className="histogram-placeholder">
          <span className="placeholder-icon">📊</span>
          <p>Select a numeric column to visualize</p>
        </div>
      </div>
    );
  }

  return (
    <div className="histogram-container" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'crosshair' }}
      />
      {tooltip.visible && (
        <div 
          className="histogram-tooltip"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="tooltip-value">Value: ~{tooltip.value}</div>
          <div className="tooltip-count">Count: {tooltip.count}</div>
        </div>
      )}
    </div>
  );
}
