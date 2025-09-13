# RadixCanvas - Design Tool Demo
## Complete Product Requirements & Development Guide

---

## 🎯 Product Overview

### Vision Statement
A lightweight design canvas that demonstrates professional-grade design tool capabilities while showcasing deep integration with the Radix UI ecosystem and high-performance canvas optimization techniques.

### Target Audience
- **Primary**: Paper design tool hiring team
- **Secondary**: Design tool developers and Radix UI community

### Success Metrics
- Achieve consistent 60+ FPS with 100+ objects
- Demonstrate all core design tool interactions
- Showcase 8+ Radix UI components integration
- Complete professional-quality user experience

---

## 📋 Product Requirements Document (PRD)

### Epic 1: Canvas Foundation
**User Story**: As a designer, I need a responsive infinite canvas so I can create designs of any scale.

**Requirements:**
- Infinite scrollable canvas (minimum 10,000 x 10,000 virtual space)
- Smooth pan with mouse drag + keyboard arrows
- Zoom levels: 10% to 500% with smooth transitions
- Grid system with snap-to-grid option
- Canvas bounds visualization
- Performance target: 60+ FPS during all interactions

**Acceptance Criteria:**
- [ ] Mouse wheel zoom works smoothly
- [ ] Pan works with middle mouse button or space+drag
- [ ] Zoom centers on mouse cursor position
- [ ] Grid appears/disappears based on zoom level
- [ ] No lag during rapid zoom/pan operations

---

### Epic 2: Shape Tools
**User Story**: As a designer, I need basic shape creation tools so I can build my designs.

**Requirements:**
- Rectangle tool with click-drag creation
- Circle/Ellipse tool with click-drag creation
- Text tool with click-to-add functionality
- Line tool for simple drawings
- Each tool should show preview during creation

**Shape Properties:**
- Fill color (solid colors only for MVP)
- Stroke color and width
- Opacity/transparency
- Corner radius for rectangles
- Font family/size for text

**Acceptance Criteria:**
- [ ] Tool switching works instantly
- [ ] Shape preview appears during drag
- [ ] Shapes maintain aspect ratio with Shift key
- [ ] Text editing works inline
- [ ] All shapes render at consistent quality

---

### Epic 3: Selection & Manipulation
**User Story**: As a designer, I need to select and modify objects so I can refine my designs.

**Requirements:**
- Click to select individual objects
- Multi-select with Ctrl+click or drag selection box
- Selection handles for resize operations
- Drag to move selected objects
- Delete selected objects with Delete key
- Copy/paste functionality (Ctrl+C/Ctrl+V)

**Selection Feedback:**
- Selection highlight border
- 8-point resize handles for rectangles/circles
- 4-point resize handles for text
- Rotation handle (nice-to-have)
- Group selection indicators

**Acceptance Criteria:**
- [ ] Selection feedback is immediate
- [ ] Resize handles appear correctly positioned
- [ ] Dragging feels responsive and smooth
- [ ] Multi-select works intuitively
- [ ] Keyboard shortcuts work consistently

---

### Epic 4: Layer Management
**User Story**: As a designer, I need layer control so I can organize complex designs.

**Requirements:**
- Layer panel showing all objects
- Drag to reorder layers (z-index)
- Layer visibility toggle
- Layer naming/renaming
- Layer deletion
- Lock/unlock layers

**Layer Panel Features:**
- Thumbnail preview for each layer
- Object type icons
- Quick actions (visibility, lock, delete)
- Search/filter layers (nice-to-have)

**Acceptance Criteria:**
- [ ] Layer order matches visual stacking
- [ ] Reordering updates canvas immediately
- [ ] Hidden layers don't receive interactions
- [ ] Locked layers can't be modified
- [ ] Layer names can be edited inline

---

### Epic 5: Property Panel
**User Story**: As a designer, I need property controls so I can fine-tune object appearance.

**Requirements:**
- Color picker for fill and stroke
- Opacity slider (0-100%)
- Size controls (width/height)
- Position controls (x/y coordinates)
- Stroke width control
- Text properties (font, size, alignment)

**Dynamic Properties:**
- Panel updates based on selected object type
- Multi-selection shows common properties
- Real-time preview of changes
- Input validation and constraints

**Acceptance Criteria:**
- [ ] Color changes reflect immediately on canvas
- [ ] Sliders provide smooth value changes
- [ ] Numerical inputs accept keyboard entry
- [ ] Properties persist during selection changes
- [ ] Invalid values are handled gracefully

---

### Epic 6: Export & Persistence
**User Story**: As a designer, I need to save and export my work so I can share and continue later.

**Requirements:**
- Export as PNG (raster)
- Export as SVG (vector)
- Save/load project files (JSON)
- Export selection only option
- Custom export dimensions

**Export Options:**
- Quality settings for PNG
- Background transparency option
- Zoom level for export
- File naming conventions

**Acceptance Criteria:**
- [ ] PNG exports match canvas appearance
- [ ] SVG exports are valid and scalable
- [ ] Project files save complete state
- [ ] Loading restores exact design state
- [ ] Export dialog is intuitive

---

## 🎨 Design Principles

### 1. **Performance First**
- Every interaction must feel immediate (< 16ms response time)
- Optimize rendering pipeline for 60+ FPS
- Use dirty rectangle rendering for minimal redraws
- Implement object pooling for frequent operations

### 2. **Radix-Native Experience**
- All UI components use Radix primitives
- Maintain consistent design language with Radix
- Leverage Radix accessibility features
- Follow Radix naming conventions and patterns

### 3. **Professional Polish**
- Pixel-perfect alignment and spacing
- Smooth micro-animations for state changes
- Consistent visual hierarchy
- High-quality iconography (Lucide React)

### 4. **Intuitive Interactions**
- Follow industry-standard design tool conventions
- Provide clear visual feedback for all actions
- Support keyboard shortcuts for power users
- Graceful error handling and recovery

### 5. **Extensible Architecture**
- Modular component structure
- Clean separation of concerns
- Type-safe interfaces throughout
- Easy to add new tools and features

---

## 🛠 Technical Architecture

### Component Structure
```
src/
├── components/
│   ├── Canvas/
│   │   ├── InfiniteCanvas.tsx
│   │   ├── CanvasRenderer.tsx
│   │   ├── SelectionLayer.tsx
│   │   └── GridLayer.tsx
│   ├── Tools/
│   │   ├── ToolSelector.tsx
│   │   ├── RectangleTool.tsx
│   │   ├── CircleTool.tsx
│   │   └── TextTool.tsx
│   ├── Panels/
│   │   ├── LayerPanel.tsx
│   │   ├── PropertyPanel.tsx
│   │   └── ExportDialog.tsx
│   └── UI/
│       ├── ColorPicker.tsx
│       ├── OpacitySlider.tsx
│       └── NumericInput.tsx
├── hooks/
│   ├── useCanvas.ts
│   ├── useSelection.ts
│   ├── useViewport.ts
│   └── usePerformance.ts
├── types/
│   ├── canvas.ts
│   ├── objects.ts
│   └── tools.ts
└── utils/
    ├── rendering.ts
    ├── geometry.ts
    └── export.ts
```

### Data Models
```typescript
interface CanvasObject {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'line';
  bounds: Rectangle;
  style: ObjectStyle;
  transform: Transform;
  layer: number;
  visible: boolean;
  locked: boolean;
  isDirty: boolean; // Performance optimization flag
}

interface ObjectStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  // Type-specific properties
  cornerRadius?: number; // Rectangle
  fontSize?: number;     // Text
  fontFamily?: string;   // Text
}

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  bounds: Rectangle;
}

interface ToolState {
  activeTool: ToolType;
  isDrawing: boolean;
  previewObject?: CanvasObject;
}
```

### Performance Optimization Strategy

#### 1. Rendering Pipeline
```typescript
class CanvasRenderer {
  private dirtyRegions: Rectangle[] = [];
  private objectPool = new ObjectPool<CanvasObject>();
  
  render() {
    // Only redraw dirty regions
    this.dirtyRegions.forEach(region => {
      this.clearRegion(region);
      this.renderObjectsInRegion(region);
    });
    
    this.dirtyRegions = [];
  }
  
  markDirty(bounds: Rectangle) {
    this.dirtyRegions.push(bounds);
  }
}
```

#### 2. Viewport Culling
```typescript
function getVisibleObjects(objects: CanvasObject[], viewport: ViewportState): CanvasObject[] {
  return objects.filter(obj => 
    intersects(obj.bounds, viewport.bounds)
  );
}
```

#### 3. Event Optimization
```typescript
// Throttle mouse move events for performance
const throttledMouseMove = useCallback(
  throttle((e: MouseEvent) => handleMouseMove(e), 16), // ~60fps
  [handleMouseMove]
);
```

---

## 🧩 Radix Integration Guide

### Required Radix Components

#### 1. Tool Selector (`@radix-ui/react-dropdown-menu`)
```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

function ToolSelector() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="tool-button">
        <RectangleIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="tool-dropdown">
          <DropdownMenu.Item onClick={() => setTool('rectangle')}>
            Rectangle
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => setTool('circle')}>
            Circle
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => setTool('text')}>
            Text
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

#### 2. Color Picker (`@radix-ui/react-popover`)
```tsx
import * as Popover from '@radix-ui/react-popover';

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Popover.Root>
      <Popover.Trigger className="color-swatch" style={{ backgroundColor: value }} />
      <Popover.Portal>
        <Popover.Content className="color-picker-panel">
          <div className="color-grid">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                className="color-option"
                style={{ backgroundColor: color }}
                onClick={() => onChange(color)}
              />
            ))}
          </div>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <Popover.Arrow className="color-picker-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

#### 3. Layer Panel (`@radix-ui/react-accordion`)
```tsx
import * as Accordion from '@radix-ui/react-accordion';

function LayerPanel({ objects }: LayerPanelProps) {
  return (
    <div className="layer-panel">
      <h3>Layers</h3>
      <Accordion.Root type="single" collapsible defaultValue="layers">
        <Accordion.Item value="layers">
          <Accordion.Header>
            <Accordion.Trigger>
              Objects ({objects.length})
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            {objects.map(obj => (
              <LayerItem key={obj.id} object={obj} />
            ))}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
```

#### 4. Property Controls (`@radix-ui/react-slider`)
```tsx
import * as Slider from '@radix-ui/react-slider';

function OpacityControl({ value, onChange }: OpacityControlProps) {
  return (
    <div className="property-control">
      <label>Opacity</label>
      <Slider.Root
        className="opacity-slider"
        value={[value]}
        onValueChange={([newValue]) => onChange(newValue)}
        max={100}
        min={0}
        step={1}
      >
        <Slider.Track className="slider-track">
          <Slider.Range className="slider-range" />
        </Slider.Track>
        <Slider.Thumb className="slider-thumb" />
      </Slider.Root>
      <span className="opacity-value">{value}%</span>
    </div>
  );
}
```

#### 5. Export Dialog (`@radix-ui/react-dialog`)
```tsx
import * as Dialog from '@radix-ui/react-dialog';

function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="export-dialog">
          <Dialog.Title>Export Design</Dialog.Title>
          <Dialog.Description>
            Choose export format and settings
          </Dialog.Description>
          
          <div className="export-options">
            <RadioGroup defaultValue="png">
              <RadioGroupItem value="png" id="png">
                <label htmlFor="png">PNG (Raster)</label>
              </RadioGroupItem>
              <RadioGroupItem value="svg" id="svg">
                <label htmlFor="svg">SVG (Vector)</label>
              </RadioGroupItem>
            </RadioGroup>
          </div>
          
          <div className="dialog-actions">
            <Dialog.Close asChild>
              <button className="cancel-button">Cancel</button>
            </Dialog.Close>
            <button className="export-button" onClick={handleExport}>
              Export
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## 🎯 Implementation Roadmap

### Week 1: Foundation
**Days 1-2: Project Setup**
- [ ] Initialize React + TypeScript + Vite project
- [ ] Install Radix UI components
- [ ] Set up Tailwind CSS
- [ ] Create basic project structure
- [ ] Set up performance monitoring

**Days 3-4: Canvas Foundation**
- [ ] Implement InfiniteCanvas component
- [ ] Add pan/zoom functionality
- [ ] Create basic rendering pipeline
- [ ] Add grid system
- [ ] Implement viewport state management

**Days 5-7: Basic Shape Tools**
- [ ] Rectangle tool with click-drag
- [ ] Circle tool with click-drag
- [ ] Text tool with click-to-add
- [ ] Tool switching mechanism
- [ ] Shape preview during creation

### Week 2: Interaction & Polish
**Days 1-2: Selection System**
- [ ] Click to select objects
- [ ] Multi-selection with drag box
- [ ] Selection handles and feedback
- [ ] Drag to move objects
- [ ] Basic keyboard shortcuts

**Days 3-4: UI Panels**
- [ ] Layer panel with Radix Accordion
- [ ] Property panel with Radix controls
- [ ] Color picker with Radix Popover
- [ ] Tool selector with Radix Dropdown
- [ ] Responsive layout

**Days 5-7: Export & Final Polish**
- [ ] Export dialog with Radix Dialog
- [ ] PNG/SVG export functionality
- [ ] Save/load project files
- [ ] Performance optimization pass
- [ ] Bug fixes and polish

---

## 📊 Performance Targets

### Frame Rate Goals
- **Idle state**: Stable 60 FPS
- **During pan/zoom**: Maintain 60 FPS
- **With 50 objects**: 60 FPS sustained
- **With 100 objects**: 45+ FPS minimum
- **During shape creation**: Smooth preview rendering

### Memory Management
- Object pooling for temporary objects
- Efficient event listener cleanup
- Canvas texture optimization
- Garbage collection friendly patterns

### Optimization Techniques
1. **Dirty Rectangle Rendering**: Only redraw changed areas
2. **Viewport Culling**: Only render visible objects
3. **Event Throttling**: Limit mouse move event frequency
4. **Layer Separation**: Separate static and dynamic content
5. **Batch Updates**: Group DOM updates together

---

## 🧪 Testing Strategy

### Unit Tests
- Canvas utilities (geometry, transformations)
- Object manipulation functions
- Export/import functionality
- Performance helper functions

### Integration Tests
- Tool switching workflows
- Selection and manipulation
- Layer management operations
- Export complete designs

### Performance Tests
- FPS measurement during interactions
- Memory usage monitoring
- Canvas rendering benchmarks
- Large object count stress tests

### Manual Testing Checklist
- [ ] All Radix components work correctly
- [ ] Keyboard shortcuts function
- [ ] Canvas interactions feel smooth
- [ ] Export files are valid
- [ ] Responsive design works
- [ ] Cross-browser compatibility

---

## 📝 Documentation Requirements

### Code Documentation
- TypeScript interfaces for all data structures
- JSDoc comments for complex functions
- Performance optimization explanations
- Radix integration examples

### User Documentation
- Feature overview with screenshots
- Keyboard shortcut reference
- Performance tips and limitations
- Technical architecture overview

### Portfolio Presentation
- Live demo with sample designs
- Performance metrics dashboard
- Code walkthrough video
- Written case study explaining decisions

---

This comprehensive guide provides everything needed to build a professional-quality design tool demo that directly addresses Paper's requirements while showcasing deep Radix ecosystem integration and performance optimization expertise.
