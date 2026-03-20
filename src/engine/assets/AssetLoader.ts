export type AssetType = "image" | "audio";

export interface LoadedImage {
  type: "image";
  element: HTMLImageElement;
  width: number;
  height: number;
}

export interface LoadedAudio {
  type: "audio";
  element: HTMLAudioElement;
}

export type LoadedAsset = LoadedImage | LoadedAudio;

interface CachedEntry {
  asset: LoadedAsset;
  lastAccess: number;
}

export class AssetLoader {
  private cache = new Map<string, CachedEntry>();
  private assetRoot: string = "";
  private roomAssets = new Map<string, Set<string>>();
  private maxImages = 64;
  private maxAudio = 16;

  setAssetRoot(root: string): void {
    this.assetRoot = root.endsWith("/") ? root : root + "/";
  }

  setLruLimits(maxImages: number, maxAudio: number): void {
    this.maxImages = maxImages;
    this.maxAudio = maxAudio;
  }

  private resolvePath(relativePath: string): string {
    if (
      relativePath.startsWith("http") ||
      relativePath.startsWith("/") ||
      relativePath.startsWith("data:") ||
      relativePath.startsWith("blob:")
    ) {
      return relativePath;
    }
    return this.assetRoot + relativePath;
  }

  private touch(resolved: string): void {
    const entry = this.cache.get(resolved);
    if (entry) entry.lastAccess = performance.now();
  }

  registerRoomAssets(roomId: string, paths: string[]): void {
    const resolved = new Set(paths.map((p) => this.resolvePath(p)));
    this.roomAssets.set(roomId, resolved);
  }

  releaseRoom(roomId: string): void {
    const held = this.roomAssets.get(roomId);
    if (!held) return;
    this.roomAssets.delete(roomId);

    const stillNeeded = new Set<string>();
    for (const paths of this.roomAssets.values()) {
      for (const p of paths) stillNeeded.add(p);
    }

    for (const resolved of held) {
      if (!stillNeeded.has(resolved)) {
        this.cache.delete(resolved);
      }
    }
  }

  private enforceLimit(): void {
    let imageCount = 0;
    let audioCount = 0;
    for (const entry of this.cache.values()) {
      if (entry.asset.type === "image") imageCount++;
      else audioCount++;
    }

    if (imageCount > this.maxImages) {
      this.evictOldest("image", imageCount - this.maxImages);
    }
    if (audioCount > this.maxAudio) {
      this.evictOldest("audio", audioCount - this.maxAudio);
    }
  }

  private evictOldest(type: AssetType, count: number): void {
    const roomPinned = new Set<string>();
    for (const paths of this.roomAssets.values()) {
      for (const p of paths) roomPinned.add(p);
    }

    const candidates: { key: string; lastAccess: number }[] = [];
    for (const [key, entry] of this.cache) {
      if (entry.asset.type === type && !roomPinned.has(key)) {
        candidates.push({ key, lastAccess: entry.lastAccess });
      }
    }

    candidates.sort((a, b) => a.lastAccess - b.lastAccess);
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      this.cache.delete(candidates[i].key);
    }
  }

  async loadImage(path: string): Promise<LoadedImage> {
    const resolved = this.resolvePath(path);
    const cached = this.cache.get(resolved);
    if (cached && cached.asset.type === "image") {
      this.touch(resolved);
      return cached.asset;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const asset: LoadedImage = {
          type: "image",
          element: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        this.cache.set(resolved, { asset, lastAccess: performance.now() });
        this.enforceLimit();
        resolve(asset);
      };
      img.onerror = () => {
        console.warn(`[AssetLoader] Failed to load image: ${resolved}`);
        const placeholder = this.createPlaceholderImage(path);
        const asset: LoadedImage = {
          type: "image",
          element: placeholder,
          width: placeholder.naturalWidth || 200,
          height: placeholder.naturalHeight || 100,
        };
        this.cache.set(resolved, { asset, lastAccess: performance.now() });
        resolve(asset);
      };
      img.src = resolved;
    });
  }

  async loadAudio(path: string): Promise<LoadedAudio> {
    const resolved = this.resolvePath(path);
    const cached = this.cache.get(resolved);
    if (cached && cached.asset.type === "audio") {
      this.touch(resolved);
      return cached.asset;
    }

    return new Promise((resolve) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => {
        const asset: LoadedAudio = { type: "audio", element: audio };
        this.cache.set(resolved, { asset, lastAccess: performance.now() });
        this.enforceLimit();
        resolve(asset);
      };
      audio.onerror = () => {
        console.warn(`[AssetLoader] Failed to load audio: ${resolved}`);
        const asset: LoadedAudio = { type: "audio", element: new Audio() };
        this.cache.set(resolved, { asset, lastAccess: performance.now() });
        resolve(asset);
      };
      audio.src = resolved;
      audio.load();
    });
  }

  private createPlaceholderImage(path: string): HTMLImageElement {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#2a4a3a";
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = "#5a8a6a";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`[Missing]`, 100, 44);
    ctx.fillText(path.split("/").pop() ?? path, 100, 60);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  getCachedImage(path: string): LoadedImage | null {
    const resolved = this.resolvePath(path);
    const entry = this.cache.get(resolved);
    if (entry && entry.asset.type === "image") {
      this.touch(resolved);
      return entry.asset;
    }
    return null;
  }

  getCachedAudio(path: string): LoadedAudio | null {
    const resolved = this.resolvePath(path);
    const entry = this.cache.get(resolved);
    if (entry && entry.asset.type === "audio") {
      this.touch(resolved);
      return entry.asset;
    }
    return null;
  }

  async preload(paths: { images?: string[]; audio?: string[] }): Promise<void> {
    const promises: Promise<unknown>[] = [];
    if (paths.images) {
      for (const p of paths.images) promises.push(this.loadImage(p));
    }
    if (paths.audio) {
      for (const p of paths.audio) promises.push(this.loadAudio(p));
    }
    await Promise.allSettled(promises);
  }

  clear(): void {
    this.cache.clear();
    this.roomAssets.clear();
  }
}
