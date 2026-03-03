import { useEffect, useRef, useState } from "react";
import { subscribeWindowDragDrop } from "../../../services/dragDrop";
import { readClipboardFileAsDataUrl } from "../../../services/tauri";

const imageExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".tif",
];

function isImagePath(path: string) {
  const lower = path.toLowerCase();
  return imageExtensions.some((ext) => lower.endsWith(ext));
}

function isDragFileTransfer(types: readonly string[] | undefined) {
  if (!types || types.length === 0) {
    return false;
  }
  return (
    types.includes("Files") ||
    types.includes("public.file-url") ||
    types.includes("application/x-moz-file")
  );
}

function readFilesAsDataUrls(files: File[]) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        }),
    ),
  ).then((items) => items.filter(Boolean));
}

function readBlobsAsDataUrls(blobs: Blob[]) {
  return Promise.all(
    blobs.map(
      (blob) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(blob);
        }),
    ),
  ).then((items) => items.filter(Boolean));
}

async function readClipboardApiBlobs() {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.read !== "function"
  ) {
    return [];
  }
  try {
    const clipboardItems = await navigator.clipboard.read();
    const blobs: Blob[] = [];
    for (const clipboardItem of clipboardItems) {
      const binaryTypes = clipboardItem.types.filter((type) => !type.startsWith("text/"));
      for (const binaryType of binaryTypes) {
        try {
          const blob = await clipboardItem.getType(binaryType);
          if (blob.size > 0) {
            blobs.push(blob);
          }
        } catch {
          // Ignore partially unreadable clipboard variants.
        }
      }
    }
    return blobs;
  } catch {
    return [];
  }
}

function buildFileDedupKey(file: File) {
  return `${file.name}|${file.size}|${file.type}|${file.lastModified}`;
}

function getDragPosition(position: { x: number; y: number }) {
  return position;
}

function normalizeDragPosition(
  position: { x: number; y: number },
  lastClientPosition: { x: number; y: number } | null,
) {
  const scale = window.devicePixelRatio || 1;
  if (scale === 1 || !lastClientPosition) {
    return getDragPosition(position);
  }
  const logicalDistance = Math.hypot(
    position.x - lastClientPosition.x,
    position.y - lastClientPosition.y,
  );
  const scaled = { x: position.x / scale, y: position.y / scale };
  const scaledDistance = Math.hypot(
    scaled.x - lastClientPosition.x,
    scaled.y - lastClientPosition.y,
  );
  return scaledDistance < logicalDistance ? scaled : position;
}

type UseComposerImageDropArgs = {
  disabled: boolean;
  onAttachImages?: (paths: string[]) => void;
};

export function useComposerImageDrop({
  disabled,
  onAttachImages,
}: UseComposerImageDropArgs) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dropTargetRef = useRef<HTMLDivElement | null>(null);
  const lastClientPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    if (disabled) {
      return undefined;
    }
    unlisten = subscribeWindowDragDrop((event) => {
      if (!dropTargetRef.current) {
        return;
      }
      if (event.payload.type === "leave") {
        setIsDragOver(false);
        return;
      }
      const position = normalizeDragPosition(
        event.payload.position,
        lastClientPositionRef.current,
      );
      const rect = dropTargetRef.current.getBoundingClientRect();
      const isInside =
        position.x >= rect.left &&
        position.x <= rect.right &&
        position.y >= rect.top &&
        position.y <= rect.bottom;
      if (event.payload.type === "over" || event.payload.type === "enter") {
        setIsDragOver(isInside);
        return;
      }
      if (event.payload.type === "drop") {
        setIsDragOver(false);
        if (!isInside) {
          return;
        }
        const imagePaths = (event.payload.paths ?? [])
          .map((path) => path.trim())
          .filter(Boolean)
          .filter(isImagePath);
        if (imagePaths.length > 0) {
          onAttachImages?.(imagePaths);
        }
      }
    });
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [disabled, onAttachImages]);

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (disabled) {
      return;
    }
    if (isDragFileTransfer(event.dataTransfer?.types)) {
      lastClientPositionRef.current = { x: event.clientX, y: event.clientY };
      event.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragEnter = (event: React.DragEvent<HTMLElement>) => {
    handleDragOver(event);
  };

  const handleDragLeave = () => {
    if (isDragOver) {
      setIsDragOver(false);
      lastClientPositionRef.current = null;
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    setIsDragOver(false);
    lastClientPositionRef.current = null;
    const files = Array.from(event.dataTransfer?.files ?? []);
    const items = Array.from(event.dataTransfer?.items ?? []);
    const itemFiles = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    const filePaths = [...files, ...itemFiles]
      .map((file) => (file as File & { path?: string }).path ?? "")
      .filter(Boolean);
    const imagePaths = filePaths.filter(isImagePath);
    if (imagePaths.length > 0) {
      onAttachImages?.(imagePaths);
      return;
    }
    const fileImages = [...files, ...itemFiles].filter((file) =>
      file.type.startsWith("image/"),
    );
    if (fileImages.length === 0) {
      return;
    }
    const dataUrls = await readFilesAsDataUrls(fileImages);
    if (dataUrls.length > 0) {
      onAttachImages?.(dataUrls);
    }
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) {
      return;
    }
    const clipboardData = event.clipboardData;
    const items = Array.from(clipboardData?.items ?? []);
    const itemFiles = items
      .filter((item) => item.kind === "file" || item.type !== "text/plain")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    const pastedFiles = Array.from(clipboardData?.files ?? []);
    const pastedText =
      typeof clipboardData?.getData === "function" ? clipboardData.getData("text/plain") : "";
    const dedupedFiles = Array.from(
      new Map(
        [...itemFiles, ...pastedFiles].map((file) => [buildFileDedupKey(file), file]),
      ).values(),
    );
    if (dedupedFiles.length > 0) {
      if (!pastedText) {
        event.preventDefault();
      }
      const dataUrls = await readFilesAsDataUrls(dedupedFiles);
      if (dataUrls.length > 0) {
        onAttachImages?.(dataUrls);
      }
      return;
    }

    const clipboardApiBlobs = await readClipboardApiBlobs();
    if (clipboardApiBlobs.length > 0) {
      if (!pastedText) {
        event.preventDefault();
      }
      const dataUrls = await readBlobsAsDataUrls(clipboardApiBlobs);
      if (dataUrls.length > 0) {
        onAttachImages?.(dataUrls);
      }
      return;
    }

    const tauriDataUrl = await readClipboardFileAsDataUrl();
    if (!tauriDataUrl) {
      return;
    }
    if (!pastedText) {
      event.preventDefault();
    }
    onAttachImages?.([tauriDataUrl]);
  };

  const handlePasteFromKeyboard = async () => {
    if (disabled) {
      return;
    }

    const clipboardApiBlobs = await readClipboardApiBlobs();
    if (clipboardApiBlobs.length > 0) {
      const dataUrls = await readBlobsAsDataUrls(clipboardApiBlobs);
      if (dataUrls.length > 0) {
        onAttachImages?.(dataUrls);
        return;
      }
    }

    const tauriDataUrl = await readClipboardFileAsDataUrl();
    if (tauriDataUrl) {
      onAttachImages?.([tauriDataUrl]);
    }
  };

  return {
    dropTargetRef,
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handlePaste,
    handlePasteFromKeyboard,
  };
}
