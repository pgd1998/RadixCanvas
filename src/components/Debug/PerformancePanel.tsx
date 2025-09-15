import React, { useState, useEffect } from 'react';
import { performanceMonitor, createStressTestObjects, type PerformanceMetrics } from '../../utils/performance';
import { Activity, Zap, HardDrive, Layers, Clock, TestTube } from 'lucide-react';

interface PerformancePanelProps {
  objectCount: number;
  onStressTest?: (objects: any[]) => void;
  onClearObjects?: () => void;
}

export function PerformancePanel({ objectCount, onStressTest, onClearObjects }: PerformancePanelProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    performanceMonitor.updateObjectCount(objectCount);
  }, [objectCount]);

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe(setMetrics);
    return unsubscribe;
  }, []);

  const getStatusColor = (value: number, goodThreshold: number, okThreshold: number) => {
    if (value >= goodThreshold) return 'var(--color-success)';
    if (value >= okThreshold) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const getMemoryColor = (mb: number) => {
    if (mb < 100) return 'var(--color-success)';
    if (mb < 200) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const handleStressTest = (count: number) => {
    if (onStressTest) {
      const stressObjects = createStressTestObjects(count);
      onStressTest(stressObjects);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--color-bg-secondary)',
          border: '2px solid var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'all var(--transition-fast)',
          animation: 'pulse 2s infinite',
          boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)'
        }}
        title="🚀 Performance Monitor - Click to see 60+ FPS!"
      >
        <Activity size={20} color="var(--color-accent)" />
        <style>{`
          @keyframes pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 0 0 8px rgba(99, 102, 241, 0);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
            }
          }
        `}</style>
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        width: '320px',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-md)',
        zIndex: 1000,
        boxShadow: 'var(--shadow-lg)',
        fontSize: '13px'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-md)',
        paddingBottom: 'var(--spacing-sm)',
        borderBottom: '1px solid var(--color-border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <Activity size={16} color="var(--color-accent)" />
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Performance Monitor
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-secondary)'
          }}
        >
          ✕
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
        {/* FPS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Zap size={14} color={getStatusColor(metrics?.fps || 0, 60, 45)} />
          <span style={{ flex: 1 }}>FPS:</span>
          <span style={{ 
            fontWeight: 600, 
            color: getStatusColor(metrics?.fps || 0, 60, 45) 
          }}>
            {metrics?.fps || 0}
          </span>
        </div>

        {/* Render Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Clock size={14} color={getStatusColor(20 - (metrics?.renderTime || 20), 15, 10)} />
          <span style={{ flex: 1 }}>Render Time:</span>
          <span style={{ 
            fontWeight: 600, 
            color: getStatusColor(20 - (metrics?.renderTime || 20), 15, 10)
          }}>
            {metrics?.renderTime?.toFixed(1) || '0.0'}ms
          </span>
        </div>

        {/* Memory Usage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <HardDrive size={14} color={getMemoryColor(metrics?.memoryUsage || 0)} />
          <span style={{ flex: 1 }}>Memory:</span>
          <span style={{ 
            fontWeight: 600, 
            color: getMemoryColor(metrics?.memoryUsage || 0)
          }}>
            {metrics?.memoryUsage || 0}MB
          </span>
        </div>

        {/* Object Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Layers size={14} color="var(--color-text-secondary)" />
          <span style={{ flex: 1 }}>Objects:</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {objectCount}
          </span>
        </div>
      </div>

      {/* Performance Status */}
      <div style={{
        marginTop: 'var(--spacing-md)',
        padding: 'var(--spacing-sm)',
        borderRadius: 'var(--radius-md)',
        background: metrics && performanceMonitor.isPerformancePoor() 
          ? 'rgba(239, 68, 68, 0.1)' 
          : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${metrics && performanceMonitor.isPerformancePoor() 
          ? 'var(--color-error)' 
          : 'var(--color-success)'}`
      }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 500,
          color: metrics && performanceMonitor.isPerformancePoor() 
            ? 'var(--color-error)' 
            : 'var(--color-success)'
        }}>
          {metrics && performanceMonitor.isPerformancePoor() 
            ? '⚠️ Performance Issues Detected' 
            : '✅ Performance Good'}
        </div>
      </div>

      {/* Stress Testing */}
      <div style={{
        marginTop: 'var(--spacing-md)',
        paddingTop: 'var(--spacing-sm)',
        borderTop: '1px solid var(--color-border-light)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-sm)'
        }}>
          <TestTube size={14} color="var(--color-text-secondary)" />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            Stress Testing
          </span>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-xs)'
        }}>
          <button
            onClick={() => handleStressTest(50)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            +50
          </button>
          <button
            onClick={() => handleStressTest(100)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            +100
          </button>
          <button
            onClick={() => handleStressTest(200)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: 'var(--color-warning)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            +200
          </button>
        </div>
        
        {onClearObjects && (
          <button
            onClick={onClearObjects}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '11px',
              background: 'var(--color-error)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            Clear All Objects
          </button>
        )}
      </div>

      {/* Tips */}
      <div style={{
        marginTop: 'var(--spacing-sm)',
        fontSize: '10px',
        color: 'var(--color-text-muted)',
        fontStyle: 'italic'
      }}>
        Target: 60+ FPS, &lt;16ms render, &lt;100MB memory
      </div>
    </div>
  );
}