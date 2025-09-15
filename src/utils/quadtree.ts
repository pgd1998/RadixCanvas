import type { CanvasObject } from '../types/objects';

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuadTreeNode {
  bounds: Rectangle;
  objects: CanvasObject[];
  children: QuadTreeNode[] | null;
  level: number;
}

/**
 * Ultra-high performance Quadtree implementation for spatial indexing
 * Provides O(log n) object queries instead of O(n) linear searches
 */
export class QuadTree {
  private root: QuadTreeNode;
  private readonly maxObjects: number;
  private readonly maxLevels: number;
  
  constructor(bounds: Rectangle, maxObjects = 8, maxLevels = 12) {
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.root = {
      bounds: { ...bounds },
      objects: [],
      children: null,
      level: 0
    };
  }
  
  /**
   * Clear all objects from the quadtree
   */
  clear(): void {
    this.clearNode(this.root);
  }
  
  private clearNode(node: QuadTreeNode): void {
    node.objects.length = 0;
    if (node.children) {
      node.children.forEach(child => this.clearNode(child));
      node.children = null;
    }
  }
  
  /**
   * Insert an object into the quadtree
   */
  insert(obj: CanvasObject): void {
    this.insertObject(this.root, obj);
  }
  
  private insertObject(node: QuadTreeNode, obj: CanvasObject): void {
    if (node.children !== null) {
      const index = this.getIndex(node, obj);
      if (index !== -1) {
        this.insertObject(node.children[index], obj);
        return;
      }
    }
    
    node.objects.push(obj);
    
    if (node.objects.length > this.maxObjects && node.level < this.maxLevels) {
      if (node.children === null) {
        this.split(node);
      }
      
      let i = 0;
      while (i < node.objects.length) {
        const index = this.getIndex(node, node.objects[i]);
        if (index !== -1) {
          const removedObj = node.objects.splice(i, 1)[0];
          this.insertObject(node.children![index], removedObj);
        } else {
          i++;
        }
      }
    }
  }
  
  /**
   * Split a node into four quadrants
   */
  private split(node: QuadTreeNode): void {
    const subWidth = node.bounds.width / 2;
    const subHeight = node.bounds.height / 2;
    const x = node.bounds.x;
    const y = node.bounds.y;
    
    node.children = [
      // Northeast
      {
        bounds: { x: x + subWidth, y: y, width: subWidth, height: subHeight },
        objects: [],
        children: null,
        level: node.level + 1
      },
      // Northwest
      {
        bounds: { x: x, y: y, width: subWidth, height: subHeight },
        objects: [],
        children: null,
        level: node.level + 1
      },
      // Southwest
      {
        bounds: { x: x, y: y + subHeight, width: subWidth, height: subHeight },
        objects: [],
        children: null,
        level: node.level + 1
      },
      // Southeast
      {
        bounds: { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
        objects: [],
        children: null,
        level: node.level + 1
      }
    ];
  }
  
  /**
   * Get the quadrant index for an object
   */
  private getIndex(node: QuadTreeNode, obj: CanvasObject): number {
    const objBounds = {
      x: obj.bounds.x + obj.transform.x,
      y: obj.bounds.y + obj.transform.y,
      width: obj.bounds.width,
      height: obj.bounds.height
    };
    
    const verticalMidpoint = node.bounds.x + node.bounds.width / 2;
    const horizontalMidpoint = node.bounds.y + node.bounds.height / 2;
    
    const topQuadrant = objBounds.y < horizontalMidpoint && 
                       objBounds.y + objBounds.height < horizontalMidpoint;
    const bottomQuadrant = objBounds.y > horizontalMidpoint;
    
    if (objBounds.x < verticalMidpoint && objBounds.x + objBounds.width < verticalMidpoint) {
      if (topQuadrant) return 1; // Northwest
      if (bottomQuadrant) return 2; // Southwest
    } else if (objBounds.x > verticalMidpoint) {
      if (topQuadrant) return 0; // Northeast
      if (bottomQuadrant) return 3; // Southeast
    }
    
    return -1; // Object doesn't fit in any quadrant
  }
  
  /**
   * Retrieve all objects in a given region (viewport culling)
   */
  retrieve(bounds: Rectangle): CanvasObject[] {
    const foundObjects: CanvasObject[] = [];
    this.retrieveObjects(foundObjects, this.root, bounds);
    return foundObjects;
  }
  
  private retrieveObjects(
    returnObjects: CanvasObject[], 
    node: QuadTreeNode, 
    bounds: Rectangle
  ): void {
    if (!this.boundsIntersect(node.bounds, bounds)) {
      return;
    }
    
    // Add objects from current node
    for (const obj of node.objects) {
      const objBounds = {
        x: obj.bounds.x + obj.transform.x,
        y: obj.bounds.y + obj.transform.y,
        width: obj.bounds.width,
        height: obj.bounds.height
      };
      
      if (this.boundsIntersect(objBounds, bounds)) {
        returnObjects.push(obj);
      }
    }
    
    // Recursively check children
    if (node.children) {
      for (const child of node.children) {
        this.retrieveObjects(returnObjects, child, bounds);
      }
    }
  }
  
  /**
   * Find objects at a specific point (for clicking/selection)
   */
  queryPoint(x: number, y: number): CanvasObject[] {
    const foundObjects: CanvasObject[] = [];
    this.queryPointRecursive(foundObjects, this.root, x, y);
    return foundObjects;
  }
  
  private queryPointRecursive(
    returnObjects: CanvasObject[],
    node: QuadTreeNode,
    x: number,
    y: number
  ): void {
    if (!this.pointInBounds(x, y, node.bounds)) {
      return;
    }
    
    // Check objects in current node
    for (const obj of node.objects) {
      const objBounds = {
        x: obj.bounds.x + obj.transform.x,
        y: obj.bounds.y + obj.transform.y,
        width: obj.bounds.width,
        height: obj.bounds.height
      };
      
      if (this.pointInBounds(x, y, objBounds)) {
        returnObjects.push(obj);
      }
    }
    
    // Recursively check children
    if (node.children) {
      for (const child of node.children) {
        this.queryPointRecursive(returnObjects, child, x, y);
      }
    }
  }
  
  /**
   * Check if two rectangles intersect
   */
  private boundsIntersect(bounds1: Rectangle, bounds2: Rectangle): boolean {
    return !(
      bounds1.x > bounds2.x + bounds2.width ||
      bounds1.x + bounds1.width < bounds2.x ||
      bounds1.y > bounds2.y + bounds2.height ||
      bounds1.y + bounds1.height < bounds2.y
    );
  }
  
  /**
   * Check if a point is within bounds
   */
  private pointInBounds(x: number, y: number, bounds: Rectangle): boolean {
    return x >= bounds.x && 
           x <= bounds.x + bounds.width && 
           y >= bounds.y && 
           y <= bounds.y + bounds.height;
  }
  
  /**
   * Rebuild the entire tree (call when objects change significantly)
   */
  rebuild(objects: CanvasObject[]): void {
    this.clear();
    objects.forEach(obj => {
      if (obj.visible) {
        this.insert(obj);
      }
    });
  }
  
  /**
   * Get tree statistics for debugging
   */
  getStats(): {
    totalNodes: number;
    maxDepth: number;
    totalObjects: number;
    averageObjectsPerLeaf: number;
  } {
    const stats = { totalNodes: 0, maxDepth: 0, totalObjects: 0, leafNodes: 0 };
    this.collectStats(this.root, stats);
    
    return {
      totalNodes: stats.totalNodes,
      maxDepth: stats.maxDepth,
      totalObjects: stats.totalObjects,
      averageObjectsPerLeaf: stats.leafNodes > 0 ? stats.totalObjects / stats.leafNodes : 0
    };
  }
  
  private collectStats(node: QuadTreeNode, stats: any, depth = 0): void {
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    stats.totalObjects += node.objects.length;
    
    if (!node.children) {
      stats.leafNodes++;
    } else {
      node.children.forEach(child => this.collectStats(child, stats, depth + 1));
    }
  }
}