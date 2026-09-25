import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Server, Package, Globe } from 'lucide-react';
import type { ServiceDefinition } from '../../../types';

interface ServiceNodeProps {
  data: {
    service: ServiceDefinition;
    isSelected?: boolean;
    isHighlighted?: boolean;
    isDimmed?: boolean;
    isSearchMatch?: boolean;
  };
}

export const ServiceNode = memo(({ data }: ServiceNodeProps) => {
  const { service, isSelected, isHighlighted, isDimmed, isSearchMatch } = data;
  const isContainer = service.type === 'docker-service';

  // Sandy/secondary color for services
  const accentColor = '#F4A460';

  return (
    <div
      className="node-card relative rounded-lg cursor-pointer overflow-hidden transition-all duration-200"
      style={{
        width: 250,
        height: 90,
        boxSizing: 'border-box',
        border: '1px solid',
        borderColor: isSearchMatch
          ? '#E35336'
          : isSelected
          ? accentColor
          : isHighlighted
          ? 'rgba(244,164,96,0.5)'
          : 'var(--border)',
        backgroundColor: 'var(--surface)',
        opacity: isDimmed ? 0.22 : 1,
        boxShadow: isSearchMatch
          ? '0 0 0 2.5px #E35336, 0 0 20px rgba(227,83,54,0.45)'
          : isSelected
          ? `0 0 0 2px rgba(244,164,96,0.25), 0 4px 16px rgba(0,0,0,0.12)`
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: accentColor }}
      />

      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8, height: 8,
          backgroundColor: 'var(--border-strong)',
          border: '2px solid var(--surface)',
        }}
      />

      <div className="px-3 py-3 pl-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'rgba(244,164,96,0.12)',
              border: '1px solid rgba(244,164,96,0.25)',
            }}
          >
            {isContainer
              ? <Server className="w-3.5 h-3.5" style={{ color: accentColor }} />
              : <Package className="w-3.5 h-3.5" style={{ color: accentColor }} />}
          </div>
          <div className="min-w-0">
            <h4 className="font-mono font-semibold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
              {service.name}
            </h4>
            <span className="text-[10px] truncate block" style={{ color: 'var(--text-muted)' }}>
              {service.image || service.path || service.type}
            </span>
          </div>
        </div>

        {service.ports && service.ports.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {service.ports.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border"
                style={{
                  backgroundColor: 'rgba(244,164,96,0.08)',
                  borderColor: 'rgba(244,164,96,0.2)',
                  color: accentColor,
                }}
              >
                <Globe className="w-2.5 h-2.5" />
                {p}
              </span>
            ))}
          </div>
        )}

        {service.dependsOn && service.dependsOn.length > 0 && (
          <div
            className="mt-2 pt-1.5 border-t text-[10px] flex items-center gap-1"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <span>Depends on:</span>
            <span className="font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
              {service.dependsOn.join(', ')}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 8, height: 8,
          backgroundColor: accentColor,
          border: '2px solid var(--surface)',
          opacity: isSelected ? 1 : 0.6,
        }}
      />
    </div>
  );
});

ServiceNode.displayName = 'ServiceNode';
