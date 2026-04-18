"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  Brush,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  EyeOff,
  Image as ImageIcon,
  MousePointer2,
  Redo2,
  RectangleHorizontal,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
  X,
  ZoomIn,
} from "lucide-react"

type EditorImage = {
  id?: string
  url: string
  title?: string
}

type StrokePoint = {
  x: number
  y: number
}

type Stroke = {
  kind: "freehand" | "line" | "rectangle" | "circle" | "highlight" | "blur-area" | "redact"
  color: string
  size: number
  points: StrokePoint[]
}

type TextLayer = {
  id: string
  x: number
  y: number
  text: string
  color: string
  size: number
}

type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

type CropDragMode =
  | "create"
  | "move"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"

type Mode =
  | "select"
  | "view"
  | "draw"
  | "line"
  | "rectangle"
  | "circle"
  | "crop"
  | "highlight"
  | "blur-area"
  | "redact"
  | "erase"
  | "text"

type Props = {
  images: EditorImage[]
  index: number
  open: boolean
  onClose: () => void
  onIndexChange?: (index: number) => void
  onSave?: (blob: Blob, image: EditorImage) => Promise<Partial<EditorImage> | void> | Partial<EditorImage> | void
}

type EditorHistoryState = {
  sourceImageUrl: string
  brightness: number
  contrast: number
  saturation: number
  blur: number
  grayscale: number
  sepia: number
  hueRotate: number
  zoom: number
  rotation: number
  flipX: boolean
  flipY: boolean
  cropRatio: "free" | "1:1" | "4:3" | "16:9"
  cropRect: CropRect | null
  draftCropRect: CropRect | null
  brushColor: string
  brushSize: number
  markupOpacity: number
  textValue: string
  textColor: string
  textSize: number
  strokes: Stroke[]
  textLayers: TextLayer[]
}

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 780

export default function PhotoEditorModal({ images, index, open, onClose, onIndexChange, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragTextRef = useRef<string | null>(null)
  const dragStrokeRef = useRef<number | null>(null)
  const strokeRef = useRef<Stroke | null>(null)
  const dragStartPointRef = useRef<StrokePoint | null>(null)
  const dragStrokeOriginRef = useRef<StrokePoint[] | null>(null)
  const dragTextOriginRef = useRef<StrokePoint | null>(null)
  const cropStartRef = useRef<StrokePoint | null>(null)
  const cropDragModeRef = useRef<CropDragMode | null>(null)
  const cropOriginRef = useRef<CropRect | null>(null)
  const isRestoringHistoryRef = useRef(false)

  const safeImages = Array.isArray(images)
    ? images.filter((image): image is EditorImage => Boolean(image && typeof image.url === "string"))
    : []
  const currentImage = safeImages[index]
  const [mode, setMode] = useState<Mode>("view")
  const [sourceImageUrl, setSourceImageUrl] = useState<string>("")
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [blur, setBlur] = useState(0)
  const [grayscale, setGrayscale] = useState(0)
  const [sepia, setSepia] = useState(0)
  const [hueRotate, setHueRotate] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flipX, setFlipX] = useState(false)
  const [flipY, setFlipY] = useState(false)
  const [cropRatio, setCropRatio] = useState<"free" | "1:1" | "4:3" | "16:9">("free")
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [draftCropRect, setDraftCropRect] = useState<CropRect | null>(null)
  const [compareOriginal, setCompareOriginal] = useState(false)
  const [brushColor, setBrushColor] = useState("#ff5a36")
  const [brushSize, setBrushSize] = useState(8)
  const [markupOpacity, setMarkupOpacity] = useState(100)
  const [textValue, setTextValue] = useState("Add your note")
  const [textColor, setTextColor] = useState("#ffffff")
  const [textSize, setTextSize] = useState(30)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [activeTextId, setActiveTextId] = useState<string | null>(null)
  const [activeStrokeIndex, setActiveStrokeIndex] = useState<number | null>(null)
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState<EditorHistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [overrideImages, setOverrideImages] = useState<EditorImage[] | null>(null)

  const hasMultipleImages = safeImages.length > 1
  const displayImages = overrideImages && overrideImages.length === safeImages.length ? overrideImages : safeImages
  const currentDisplayImage = displayImages[index] || currentImage

  const filterStyle = useMemo(() => {
    if (compareOriginal) {
      return "none"
    }

    return [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      `blur(${blur}px)`,
      `grayscale(${grayscale}%)`,
      `sepia(${sepia}%)`,
      `hue-rotate(${hueRotate}deg)`,
    ].join(" ")
  }, [blur, brightness, compareOriginal, contrast, grayscale, hueRotate, saturation, sepia])

  useEffect(() => {
    if (!open || !currentImage?.url) {
      return
    }

    setOverrideImages(null)
    setSourceImageUrl(currentImage.url)
    const img = new window.Image()
    img.onload = () => {
      imageRef.current = img
      drawCanvas()
    }
    img.src = currentImage.url
  }, [currentImage?.url, open])

  const getHistorySnapshot = (): EditorHistoryState => ({
    sourceImageUrl,
    brightness,
    contrast,
    saturation,
    blur,
    grayscale,
    sepia,
    hueRotate,
    zoom,
    rotation,
    flipX,
    flipY,
    cropRatio,
    cropRect,
    draftCropRect,
    brushColor,
    brushSize,
    markupOpacity,
    textValue,
    textColor,
    textSize,
    strokes,
    textLayers,
  })

  const restoreHistorySnapshot = (snapshot: EditorHistoryState) => {
    isRestoringHistoryRef.current = true
    setSourceImageUrl(snapshot.sourceImageUrl)
    setBrightness(snapshot.brightness)
    setContrast(snapshot.contrast)
    setSaturation(snapshot.saturation)
    setBlur(snapshot.blur)
    setGrayscale(snapshot.grayscale)
    setSepia(snapshot.sepia)
    setHueRotate(snapshot.hueRotate)
    setZoom(snapshot.zoom)
    setRotation(snapshot.rotation)
    setFlipX(snapshot.flipX)
    setFlipY(snapshot.flipY)
    setCropRatio(snapshot.cropRatio)
    setCropRect(snapshot.cropRect)
    setDraftCropRect(snapshot.draftCropRect)
    setBrushColor(snapshot.brushColor)
    setBrushSize(snapshot.brushSize)
    setMarkupOpacity(snapshot.markupOpacity)
    setTextValue(snapshot.textValue)
    setTextColor(snapshot.textColor)
    setTextSize(snapshot.textSize)
    setStrokes(snapshot.strokes)
    setTextLayers(snapshot.textLayers)
    setActiveTextId(null)
    setActiveStrokeIndex(null)

    const img = new window.Image()
    img.onload = () => {
      imageRef.current = img
      isRestoringHistoryRef.current = false
      drawCanvas()
    }
    img.src = snapshot.sourceImageUrl
  }

  const undo = () => {
    if (historyIndex <= 0) {
      return
    }
    const nextIndex = historyIndex - 1
    const snapshot = history[nextIndex]
    if (!snapshot) {
      return
    }
    setHistoryIndex(nextIndex)
    restoreHistorySnapshot(snapshot)
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) {
      return
    }
    const nextIndex = historyIndex + 1
    const snapshot = history[nextIndex]
    if (!snapshot) {
      return
    }
    setHistoryIndex(nextIndex)
    restoreHistorySnapshot(snapshot)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    drawCanvas()
  }, [open, filterStyle, zoom, rotation, flipX, flipY, strokes, textLayers, compareOriginal, cropRect, draftCropRect, cropRatio])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mode === "crop") {
          event.preventDefault()
          cancelCrop()
          return
        }
        setActiveTextId(null)
        onClose()
        return
      }
      if (event.key === "ArrowLeft" && hasMultipleImages) {
        event.preventDefault()
        goToPrevious()
        return
      }
      if (event.key === "ArrowRight" && hasMultipleImages) {
        event.preventDefault()
        goToNext()
        return
      }

      const isModifierUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z"
      const isModifierRedo =
        ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y")
      const isPlainRedo = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "r"

      if (isModifierRedo || (isPlainRedo && mode !== "text")) {
        event.preventDefault()
        redo()
        return
      }

      if (isModifierUndo) {
        event.preventDefault()
        undo()
        return
      }

      if (mode === "text" && activeTextId) {
        if (event.key === "Enter") {
          event.preventDefault()
          setActiveTextId(null)
          return
        }

        if (event.key === "Backspace") {
          event.preventDefault()
          setTextLayers((prev) =>
            prev
              .map((layer) =>
                layer.id === activeTextId
                  ? { ...layer, text: layer.text.slice(0, -1) }
                  : layer
              )
              .filter((layer) => layer.id !== activeTextId || layer.text.length > 0)
          )
          return
        }

        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          event.preventDefault()
          setTextLayers((prev) =>
            prev.map((layer) =>
              layer.id === activeTextId
                ? { ...layer, text: `${layer.text}${event.key}` }
                : layer
            )
          )
        }
      }

      if (mode === "crop" && event.key === "Enter") {
        event.preventDefault()
        void applyCrop(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeTextId, hasMultipleImages, mode, onClose, open, index, safeImages.length, draftCropRect, cropRect, cropRatio, history, historyIndex])

  useEffect(() => {
    if (!open || !sourceImageUrl || isRestoringHistoryRef.current) {
      return
    }

    const snapshot = getHistorySnapshot()
    const serialized = JSON.stringify(snapshot)
    const currentSerialized = historyIndex >= 0 ? JSON.stringify(history[historyIndex]) : null
    if (serialized === currentSerialized) {
      return
    }

    setHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1)
      nextHistory.push(snapshot)
      return nextHistory.slice(-80)
    })
    setHistoryIndex((prev) => Math.min(prev + 1, 79))
  }, [
    open,
    sourceImageUrl,
    brightness,
    contrast,
    saturation,
    blur,
    grayscale,
    sepia,
    hueRotate,
    zoom,
    rotation,
    flipX,
    flipY,
    cropRatio,
    cropRect,
    draftCropRect,
    brushColor,
    brushSize,
    markupOpacity,
    textValue,
    textColor,
    textSize,
    strokes,
    textLayers,
  ])

  useEffect(() => {
    if (!open) {
      resetEditor()
    }
  }, [open])

  const resetEditor = () => {
    setMode("view")
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setBlur(0)
    setGrayscale(0)
    setSepia(0)
    setHueRotate(0)
    setZoom(1)
    setRotation(0)
    setFlipX(false)
    setFlipY(false)
    setCropRatio("free")
    setCropRect(null)
    setDraftCropRect(null)
    setCompareOriginal(false)
    setBrushColor("#ff5a36")
    setBrushSize(8)
    setMarkupOpacity(100)
    setTextValue("Add your note")
    setTextColor("#ffffff")
    setTextSize(30)
    setStrokes([])
    setTextLayers([])
    setActiveTextId(null)
    setActiveStrokeIndex(null)
    setIsPointerDown(false)
    setHistory([])
    setHistoryIndex(-1)
    dragTextRef.current = null
    dragStrokeRef.current = null
    strokeRef.current = null
    dragStartPointRef.current = null
    dragStrokeOriginRef.current = null
    dragTextOriginRef.current = null
    cropStartRef.current = null
    cropDragModeRef.current = null
    cropOriginRef.current = null
  }

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return { x: 0, y: 0 }
    }

    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    }
  }

  const findTextLayer = (x: number, y: number) => {
    for (let i = textLayers.length - 1; i >= 0; i -= 1) {
      const layer = textLayers[i]
      if (!layer) {
        continue
      }
      const text = typeof layer.text === "string" ? layer.text : ""
      const width = Math.max(text.length * layer.size * 0.52, layer.size)
      const height = layer.size * 1.2
      if (x >= layer.x && x <= layer.x + width && y <= layer.y && y >= layer.y - height) {
        return layer.id
      }
    }

    return null
  }

  const distanceToSegment = (point: StrokePoint, start: StrokePoint, end: StrokePoint) => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    if (dx === 0 && dy === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y)
    }
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
    const projX = start.x + t * dx
    const projY = start.y + t * dy
    return Math.hypot(point.x - projX, point.y - projY)
  }

  const findStrokeLayer = (point: StrokePoint) => {
    for (let i = strokes.length - 1; i >= 0; i -= 1) {
      const stroke = strokes[i]
      if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
        continue
      }
      const threshold = Math.max(stroke.size, 14)
      if (stroke.points.length === 1) {
        if (Math.hypot(point.x - stroke.points[0].x, point.y - stroke.points[0].y) <= threshold) {
          return i
        }
        continue
      }
      for (let j = 1; j < stroke.points.length; j += 1) {
        const start = stroke.points[j - 1]
        const end = stroke.points[j]
        if (!start || !end) {
          continue
        }
        if (distanceToSegment(point, start, end) <= threshold) {
          return i
        }
      }
    }
    return -1
  }

  const eraseAtPoint = (point: StrokePoint) => {
    const textId = findTextLayer(point.x, point.y)
    if (textId) {
      setTextLayers((prev) => prev.filter((layer) => layer.id !== textId))
      if (activeTextId === textId) {
        setActiveTextId(null)
      }
      return true
    }

    const strokeIndex = findStrokeLayer(point)
    if (strokeIndex >= 0) {
      setStrokes((prev) => prev.filter((_, index) => index !== strokeIndex))
      if (activeStrokeIndex === strokeIndex) {
        setActiveStrokeIndex(null)
      }
      return true
    }

    return false
  }

  const clampCropRect = (rect: CropRect) => {
    const x = Math.max(0, Math.min(rect.x, CANVAS_WIDTH - 20))
    const y = Math.max(0, Math.min(rect.y, CANVAS_HEIGHT - 20))
    const width = Math.max(20, Math.min(rect.width, CANVAS_WIDTH - x))
    const height = Math.max(20, Math.min(rect.height, CANVAS_HEIGHT - y))
    return { x, y, width, height }
  }

  const getActiveCropRect = () => draftCropRect || cropRect

  const getCropHandle = (point: StrokePoint, rect: CropRect | null) => {
    if (!rect) {
      return null
    }

    const handles = [
      { name: "resize-nw" as const, x: rect.x, y: rect.y },
      { name: "resize-ne" as const, x: rect.x + rect.width, y: rect.y },
      { name: "resize-sw" as const, x: rect.x, y: rect.y + rect.height },
      { name: "resize-se" as const, x: rect.x + rect.width, y: rect.y + rect.height },
    ]

    for (const handle of handles) {
      if (Math.hypot(point.x - handle.x, point.y - handle.y) <= 18) {
        return handle.name
      }
    }

    if (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    ) {
      return "move" as const
    }

    return null
  }

  const getVisibleCropRect = () => {
    const activeCrop = mode === "crop" ? draftCropRect || cropRect : cropRect
    if (activeCrop && activeCrop.width > 10 && activeCrop.height > 10) {
      return activeCrop
    }

    if (cropRatio !== "free") {
      const [ratioW, ratioH] = cropRatio.split(":").map(Number)
      const targetRatio = ratioW / ratioH
      const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT

      if (canvasRatio > targetRatio) {
        const width = CANVAS_HEIGHT * targetRatio
        return {
          x: (CANVAS_WIDTH - width) / 2,
          y: 0,
          width,
          height: CANVAS_HEIGHT,
        }
      }

      const height = CANVAS_WIDTH / targetRatio
      return {
        x: 0,
        y: (CANVAS_HEIGHT - height) / 2,
        width: CANVAS_WIDTH,
        height,
      }
    }

    return null
  }

  const getStrokeBounds = (stroke: Stroke) => {
    const validPoints = Array.isArray(stroke.points) ? stroke.points.filter(Boolean) : []
    if (validPoints.length === 0) {
      return null
    }
    const xs = validPoints.map((point) => point.x)
    const ys = validPoints.map((point) => point.y)
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    }
  }

  const buildRenderedCanvas = (options?: {
    includeCropOverlay?: boolean
    cropOutput?: boolean
    cropOverride?: CropRect | null
  }) => {
    const image = imageRef.current
    if (!image) {
      return null
    }

    const includeCropOverlay = options?.includeCropOverlay ?? false
    const cropForOutput = options?.cropOutput ?? false
    const visibleCropRect = options?.cropOverride ?? getVisibleCropRect()

    const fullCanvas = document.createElement("canvas")
    fullCanvas.width = CANVAS_WIDTH
    fullCanvas.height = CANVAS_HEIGHT
    const ctx = fullCanvas.getContext("2d")
    if (!ctx) {
      return null
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = "#0b1220"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const scale = Math.min(CANVAS_WIDTH / image.width, CANVAS_HEIGHT / image.height) * 0.9
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale

    ctx.save()
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale((flipX ? -1 : 1) * zoom, (flipY ? -1 : 1) * zoom)
    ctx.filter = filterStyle
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()

    strokes.forEach((stroke) => {
      if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
        return
      }

      ctx.save()
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.lineWidth = stroke.kind === "highlight" ? stroke.size * 2 : stroke.size
      ctx.strokeStyle = stroke.color
      ctx.globalCompositeOperation = "source-over"
      ctx.globalAlpha = stroke.kind === "highlight" ? Math.min(markupOpacity / 100, 0.45) : markupOpacity / 100

      if (stroke.kind === "rectangle") {
        const start = stroke.points[0]
        const end = stroke.points[1] || start
        ctx.strokeRect(start?.x ?? 0, start?.y ?? 0, (end?.x ?? 0) - (start?.x ?? 0), (end?.y ?? 0) - (start?.y ?? 0))
      } else if (stroke.kind === "blur-area") {
        const start = stroke.points[0]
        const end = stroke.points[1] || start
        const x = Math.min(start?.x ?? 0, end?.x ?? 0)
        const y = Math.min(start?.y ?? 0, end?.y ?? 0)
        const width = Math.abs((end?.x ?? 0) - (start?.x ?? 0))
        const height = Math.abs((end?.y ?? 0) - (start?.y ?? 0))
        ctx.save()
        ctx.filter = "blur(14px)"
        ctx.drawImage(fullCanvas, x, y, width, height, x, y, width, height)
        ctx.restore()
        ctx.strokeStyle = "#38bdf8"
        ctx.lineWidth = 2
        ctx.setLineDash([8, 6])
        ctx.strokeRect(x, y, width, height)
      } else if (stroke.kind === "redact") {
        const start = stroke.points[0]
        const end = stroke.points[1] || start
        const x = Math.min(start?.x ?? 0, end?.x ?? 0)
        const y = Math.min(start?.y ?? 0, end?.y ?? 0)
        const width = Math.abs((end?.x ?? 0) - (start?.x ?? 0))
        const height = Math.abs((end?.y ?? 0) - (start?.y ?? 0))
        ctx.fillStyle = "rgba(2, 6, 23, 0.95)"
        ctx.fillRect(x, y, width, height)
        ctx.strokeStyle = "#f43f5e"
        ctx.lineWidth = 2
        ctx.setLineDash([8, 6])
        ctx.strokeRect(x, y, width, height)
      } else if (stroke.kind === "circle") {
        const start = stroke.points[0]
        const end = stroke.points[1] || start
        const centerX = ((start?.x ?? 0) + (end?.x ?? 0)) / 2
        const centerY = ((start?.y ?? 0) + (end?.y ?? 0)) / 2
        const radiusX = Math.abs((end?.x ?? 0) - (start?.x ?? 0)) / 2
        const radiusY = Math.abs((end?.y ?? 0) - (start?.y ?? 0)) / 2
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, Math.max(radiusX, 1), Math.max(radiusY, 1), 0, 0, Math.PI * 2)
        ctx.stroke()
      } else if (stroke.kind === "line") {
        const start = stroke.points[0]
        const end = stroke.points[1] || start
        ctx.beginPath()
        ctx.moveTo(start?.x ?? 0, start?.y ?? 0)
        ctx.lineTo(end?.x ?? 0, end?.y ?? 0)
        ctx.stroke()
        const angle = Math.atan2((end?.y ?? 0) - (start?.y ?? 0), (end?.x ?? 0) - (start?.x ?? 0))
        const headLength = Math.max(12, stroke.size * 2)
        ctx.beginPath()
        ctx.moveTo(end?.x ?? 0, end?.y ?? 0)
        ctx.lineTo((end?.x ?? 0) - headLength * Math.cos(angle - Math.PI / 6), (end?.y ?? 0) - headLength * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(end?.x ?? 0, end?.y ?? 0)
        ctx.lineTo((end?.x ?? 0) - headLength * Math.cos(angle + Math.PI / 6), (end?.y ?? 0) - headLength * Math.sin(angle + Math.PI / 6))
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(stroke.points[0]?.x ?? 0, stroke.points[0]?.y ?? 0)
        stroke.points.slice(1).forEach((point) => {
          if (!point) return
          ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
      }
      ctx.restore()
    })

    textLayers.forEach((layer) => {
      if (!layer) {
        return
      }
      ctx.save()
      ctx.font = `700 ${layer.size}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillStyle = layer.color
      ctx.globalAlpha = markupOpacity / 100
      ctx.shadowColor = "rgba(0,0,0,0.45)"
      ctx.shadowBlur = 12
      const label = typeof layer.text === "string" ? layer.text : ""
      ctx.fillText(layer.id === activeTextId ? `${label}|` : label, layer.x, layer.y)
      ctx.restore()
    })

    if (activeTextId) {
      const activeLayer = textLayers.find((layer) => layer.id === activeTextId)
      if (activeLayer) {
        const label = typeof activeLayer.text === "string" ? activeLayer.text : ""
        const width = Math.max(label.length * activeLayer.size * 0.52, activeLayer.size)
        const height = activeLayer.size * 1.2
        ctx.save()
        ctx.strokeStyle = "#38bdf8"
        ctx.lineWidth = 2
        ctx.setLineDash([8, 6])
        ctx.strokeRect(activeLayer.x - 8, activeLayer.y - height, width + 16, height + 16)
        ctx.restore()
      }
    }

    if (activeStrokeIndex !== null && strokes[activeStrokeIndex]) {
      const bounds = getStrokeBounds(strokes[activeStrokeIndex])
      if (bounds) {
        ctx.save()
        ctx.strokeStyle = "#38bdf8"
        ctx.lineWidth = 2
        ctx.setLineDash([8, 6])
        ctx.strokeRect(bounds.x - 10, bounds.y - 10, Math.max(bounds.width, 10) + 20, Math.max(bounds.height, 10) + 20)
        ctx.restore()
      }
    }

    if (includeCropOverlay && visibleCropRect) {
      const { x, y, width, height } = visibleCropRect
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.rect(x, y, width, height)
      ctx.fillStyle = "rgba(2, 6, 23, 0.68)"
      ctx.fill("evenodd")
      ctx.strokeStyle = "#f97316"
      ctx.lineWidth = 2
      ctx.setLineDash([10, 8])
      ctx.strokeRect(x, y, width, height)
      const handleSize = 12
      const handles = [
        { x, y },
        { x: x + width, y },
        { x, y: y + height },
        { x: x + width, y: y + height },
      ]
      ctx.setLineDash([])
      ctx.fillStyle = "#fff7ed"
      handles.forEach((handle) => {
        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        ctx.strokeStyle = "#ea580c"
        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
      })
      ctx.restore()
    }

    if (!cropForOutput || !visibleCropRect) {
      return fullCanvas
    }

    const outputCanvas = document.createElement("canvas")
    outputCanvas.width = Math.round(visibleCropRect.width)
    outputCanvas.height = Math.round(visibleCropRect.height)
    const outputCtx = outputCanvas.getContext("2d")
    if (!outputCtx) {
      return fullCanvas
    }
    outputCtx.drawImage(
      fullCanvas,
      visibleCropRect.x,
      visibleCropRect.y,
      visibleCropRect.width,
      visibleCropRect.height,
      0,
      0,
      visibleCropRect.width,
      visibleCropRect.height
    )
    return outputCanvas
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event)

    if (mode === "select") {
      const textId = findTextLayer(point.x, point.y)
      if (textId) {
        const layer = textLayers.find((item) => item.id === textId)
        if (!layer) {
          return
        }
        setActiveTextId(textId)
        setActiveStrokeIndex(null)
        dragTextRef.current = textId
        dragTextOriginRef.current = { x: layer.x, y: layer.y }
        dragStartPointRef.current = point
        setIsPointerDown(true)
        return
      }

      const strokeIndex = findStrokeLayer(point)
      if (strokeIndex >= 0) {
        setActiveStrokeIndex(strokeIndex)
        setActiveTextId(null)
        dragStrokeRef.current = strokeIndex
        dragStartPointRef.current = point
        dragStrokeOriginRef.current = strokes[strokeIndex]?.points.map((item) => ({ ...item })) || null
        setIsPointerDown(true)
        return
      }

      setActiveTextId(null)
      setActiveStrokeIndex(null)
      return
    }

    if (mode === "erase") {
      eraseAtPoint(point)
      setIsPointerDown(true)
      return
    }

    if (mode === "crop") {
      const activeCrop = getActiveCropRect()
      const cropHandle = getCropHandle(point, activeCrop)
      cropStartRef.current = point
      cropDragModeRef.current = cropHandle || "create"
      cropOriginRef.current = activeCrop ? { ...activeCrop } : null

      if (!activeCrop || !cropHandle) {
        setDraftCropRect({
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
        })
      } else {
        setDraftCropRect(activeCrop)
      }
      setIsPointerDown(true)
      return
    }

    if (
      mode === "draw" ||
      mode === "line" ||
      mode === "rectangle" ||
      mode === "circle" ||
      mode === "highlight" ||
      mode === "blur-area" ||
      mode === "redact"
    ) {
      const nextStroke: Stroke = {
        kind:
          mode === "draw"
            ? "freehand"
            : mode === "line"
              ? "line"
              : mode === "rectangle"
              ? "rectangle"
              : mode === "circle"
                  ? "circle"
                  : mode === "highlight"
                    ? "highlight"
                    : mode === "blur-area"
                      ? "blur-area"
                      : "redact",
        color: brushColor,
        size: mode === "blur-area" || mode === "redact" ? Math.max(20, brushSize * 4) : brushSize,
        points: [point],
      }
      strokeRef.current = nextStroke
      setStrokes((prev) => [...prev, nextStroke])
      setIsPointerDown(true)
      return
    }

    if (mode === "text") {
      const existingTextId = findTextLayer(point.x, point.y)
      if (existingTextId) {
        dragTextRef.current = existingTextId
        const layer = textLayers.find((item) => item.id === existingTextId)
        dragTextOriginRef.current = layer ? { x: layer.x, y: layer.y } : null
        dragStartPointRef.current = point
        setActiveTextId(existingTextId)
        setActiveStrokeIndex(null)
        setIsPointerDown(true)
        return
      }

      const nextId = `text-${Date.now()}`
      setTextLayers((prev) => [
        ...prev,
        {
          id: nextId,
          x: point.x,
          y: point.y,
          text: textValue,
          color: textColor,
          size: textSize,
        },
      ])
      setActiveTextId(nextId)
      setActiveStrokeIndex(null)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDown) {
      return
    }

    const point = getCanvasPoint(event)

    if (mode === "select") {
      if (dragTextRef.current && dragStartPointRef.current && dragTextOriginRef.current) {
        const dx = point.x - dragStartPointRef.current.x
        const dy = point.y - dragStartPointRef.current.y
        setTextLayers((prev) =>
          prev.map((layer) =>
            layer.id === dragTextRef.current
              ? { ...layer, x: dragTextOriginRef.current!.x + dx, y: dragTextOriginRef.current!.y + dy }
              : layer
          )
        )
        return
      }

      if (dragStrokeRef.current !== null && dragStartPointRef.current && dragStrokeOriginRef.current) {
        const dx = point.x - dragStartPointRef.current.x
        const dy = point.y - dragStartPointRef.current.y
        setStrokes((prev) =>
          prev.map((stroke, index) =>
            index === dragStrokeRef.current
              ? {
                  ...stroke,
                  points: dragStrokeOriginRef.current!.map((originPoint) => ({
                    x: originPoint.x + dx,
                    y: originPoint.y + dy,
                  })),
                }
              : stroke
          )
        )
      }
      return
    }

    if (mode === "crop") {
      const cropStart = cropStartRef.current
      const dragMode = cropDragModeRef.current
      const cropOrigin = cropOriginRef.current
      if (!cropStart || !dragMode) {
        return
      }

      if (dragMode === "create") {
        setDraftCropRect(
          clampCropRect({
            x: Math.min(cropStart.x, point.x),
            y: Math.min(cropStart.y, point.y),
            width: Math.abs(point.x - cropStart.x),
            height: Math.abs(point.y - cropStart.y),
          })
        )
        return
      }

      if (!cropOrigin) {
        return
      }

      const dx = point.x - cropStart.x
      const dy = point.y - cropStart.y

      if (dragMode === "move") {
        setDraftCropRect(
          clampCropRect({
            x: cropOrigin.x + dx,
            y: cropOrigin.y + dy,
            width: cropOrigin.width,
            height: cropOrigin.height,
          })
        )
        return
      }

      const nextRect = { ...cropOrigin }
      if (dragMode === "resize-nw") {
        nextRect.x = cropOrigin.x + dx
        nextRect.y = cropOrigin.y + dy
        nextRect.width = cropOrigin.width - dx
        nextRect.height = cropOrigin.height - dy
      } else if (dragMode === "resize-ne") {
        nextRect.y = cropOrigin.y + dy
        nextRect.width = cropOrigin.width + dx
        nextRect.height = cropOrigin.height - dy
      } else if (dragMode === "resize-sw") {
        nextRect.x = cropOrigin.x + dx
        nextRect.width = cropOrigin.width - dx
        nextRect.height = cropOrigin.height + dy
      } else if (dragMode === "resize-se") {
        nextRect.width = cropOrigin.width + dx
        nextRect.height = cropOrigin.height + dy
      }

      setDraftCropRect(
        clampCropRect({
          x: nextRect.width >= 20 ? nextRect.x : cropOrigin.x + cropOrigin.width - 20,
          y: nextRect.height >= 20 ? nextRect.y : cropOrigin.y + cropOrigin.height - 20,
          width: Math.max(20, nextRect.width),
          height: Math.max(20, nextRect.height),
        })
      )
      return
    }

    if (mode === "erase") {
      eraseAtPoint(point)
      return
    }

    if (
      (mode === "draw" ||
        mode === "line" ||
        mode === "rectangle" ||
        mode === "circle" ||
        mode === "highlight" ||
        mode === "blur-area" ||
        mode === "redact") &&
      strokeRef.current
    ) {
      if (mode === "draw" || mode === "highlight") {
        strokeRef.current.points.push(point)
      } else {
        strokeRef.current.points = [strokeRef.current.points[0], point]
      }
      setStrokes((prev) => {
        const next = [...prev]
        next[next.length - 1] = { ...strokeRef.current! }
        return next
      })
      return
    }

    if (mode === "text" && dragTextRef.current) {
      if (dragStartPointRef.current && dragTextOriginRef.current) {
        const dx = point.x - dragStartPointRef.current.x
        const dy = point.y - dragStartPointRef.current.y
        setTextLayers((prev) =>
          prev.map((layer) =>
            layer.id === dragTextRef.current
              ? { ...layer, x: dragTextOriginRef.current!.x + dx, y: dragTextOriginRef.current!.y + dy }
              : layer
          )
        )
      }
    }
  }

  const handlePointerUp = () => {
    setIsPointerDown(false)
    dragTextRef.current = null
    dragStrokeRef.current = null
    dragStartPointRef.current = null
    dragStrokeOriginRef.current = null
    dragTextOriginRef.current = null
    strokeRef.current = null
    cropStartRef.current = null
    cropDragModeRef.current = null
    cropOriginRef.current = null
  }

  const clearCrop = () => {
    setCropRect(null)
    setDraftCropRect(null)
    setCropRatio("free")
  }

  const cancelCrop = () => {
    setDraftCropRect(cropRect)
    setMode("view")
  }

  const applyCrop = async (commitImmediately = false) => {
    let nextCrop = draftCropRect && draftCropRect.width >= 20 && draftCropRect.height >= 20
      ? clampCropRect(draftCropRect)
      : null

    if (!nextCrop && cropRatio !== "free") {
      nextCrop = getVisibleCropRect()
    }

    if (!nextCrop) {
      setMode("view")
      return
    }

    if (!commitImmediately) {
      setCropRect(nextCrop)
      setMode("view")
      return
    }

    const croppedCanvas = buildRenderedCanvas({
      includeCropOverlay: false,
      cropOutput: true,
      cropOverride: nextCrop,
    })

    if (!croppedCanvas) {
      setCropRect(nextCrop)
      setMode("view")
      return
    }

    const nextUrl = croppedCanvas.toDataURL("image/png", 0.96)
    const img = new window.Image()
    img.onload = () => {
      imageRef.current = img
      setSourceImageUrl(nextUrl)
      setCropRect(null)
      setDraftCropRect(null)
      setCropRatio("free")
      setStrokes([])
      setTextLayers([])
      setActiveTextId(null)
      setMode("view")
    }
    img.src = nextUrl
  }

  const applyCenteredCropRatio = () => {
    if (cropRatio === "free") {
      setDraftCropRect(cropRect)
      return
    }

    const [ratioW, ratioH] = cropRatio.split(":").map(Number)
    const targetRatio = ratioW / ratioH
    const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT

    if (canvasRatio > targetRatio) {
      const width = CANVAS_HEIGHT * targetRatio
      setDraftCropRect({
        x: (CANVAS_WIDTH - width) / 2,
        y: 0,
        width,
        height: CANVAS_HEIGHT,
      })
      return
    }

    const height = CANVAS_WIDTH / targetRatio
    setDraftCropRect({
      x: 0,
      y: (CANVAS_HEIGHT - height) / 2,
      width: CANVAS_WIDTH,
      height,
    })
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const renderedCanvas = buildRenderedCanvas({
      includeCropOverlay: mode === "crop" || cropRatio !== "free" || Boolean(cropRect),
      cropOutput: false,
    })
    if (!renderedCanvas) {
      return
    }
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.drawImage(renderedCanvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  const applyPreset = (preset: "clean" | "cinematic" | "blueprint" | "warm") => {
    if (preset === "clean") {
      setBrightness(104)
      setContrast(108)
      setSaturation(110)
      setBlur(0)
      setGrayscale(0)
      setSepia(0)
      setHueRotate(0)
    }

    if (preset === "cinematic") {
      setBrightness(92)
      setContrast(124)
      setSaturation(86)
      setBlur(0)
      setGrayscale(0)
      setSepia(18)
      setHueRotate(-8)
    }

    if (preset === "blueprint") {
      setBrightness(112)
      setContrast(132)
      setSaturation(70)
      setBlur(0)
      setGrayscale(24)
      setSepia(0)
      setHueRotate(18)
    }

    if (preset === "warm") {
      setBrightness(106)
      setContrast(102)
      setSaturation(120)
      setBlur(0)
      setGrayscale(0)
      setSepia(26)
      setHueRotate(-12)
    }
  }

  const buildOutputCanvas = () => {
    return buildRenderedCanvas({
      includeCropOverlay: false,
      cropOutput: Boolean(cropRect || cropRatio !== "free"),
      cropOverride: cropRect,
    })
  }

  const exportImage = (mimeType: "image/png" | "image/jpeg" | "image/webp") => {
    const exportCanvas = buildOutputCanvas()
    if (!exportCanvas) {
      return
    }

    const link = document.createElement("a")
    const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"
    link.href = exportCanvas.toDataURL(mimeType, 0.96)
    link.download = `${currentImage?.title || "edited-photo"}.${extension}`
    link.click()
  }

  const saveEditedCopy = async () => {
    const canvas = canvasRef.current
    if (!canvas || !currentImage || !onSave || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      const outputCanvas = buildOutputCanvas() || canvas
      const blob = await new Promise<Blob | null>((resolve) => outputCanvas.toBlob(resolve, "image/png", 0.96))
      if (!blob) {
        throw new Error("Could not generate image")
      }
      const savedImage = await onSave(blob, currentImage)
      if (savedImage?.url) {
        setSourceImageUrl(savedImage.url)
        setOverrideImages((prev) => {
          const baseImages = prev && prev.length === safeImages.length ? prev : safeImages
          return baseImages.map((imageItem, imageIndex) =>
            imageIndex === index
              ? { ...imageItem, ...savedImage, url: savedImage.url || imageItem.url }
              : imageItem
          )
        })
        const nextImg = new window.Image()
        nextImg.onload = () => {
          imageRef.current = nextImg
          drawCanvas()
        }
        nextImg.src = savedImage.url
      }
    } finally {
      setIsSaving(false)
    }
  }

  const goToPrevious = () => {
    if (!onIndexChange || safeImages.length <= 1) {
      return
    }
    onIndexChange((index - 1 + safeImages.length) % safeImages.length)
  }

  const goToNext = () => {
    if (!onIndexChange || safeImages.length <= 1) {
      return
    }
    onIndexChange((index + 1) % safeImages.length)
  }

  if (!open || !currentImage) {
    return null
  }

  return (
    <div className="photo-editor-modal fixed inset-0 z-50 overflow-hidden bg-[rgba(246,241,255,0.92)] backdrop-blur-sm">
      <div className="flex h-screen max-h-screen flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[rgba(224,211,255,0.9)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,243,255,0.98)_100%)] px-5 py-4 text-slate-900">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-orange-400">Photo Studio</div>
            <h2 className="text-xl font-semibold">{currentDisplayImage?.title || currentImage.title || "Image Editor"}</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasMultipleImages && (
              <>
                <button onClick={goToPrevious} className="rounded-full border border-[rgba(224,211,255,0.92)] bg-white p-2 text-slate-700 hover:bg-[#f8f4ff]" aria-label="Previous image">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={goToNext} className="rounded-full border border-[rgba(224,211,255,0.92)] bg-white p-2 text-slate-700 hover:bg-[#f8f4ff]" aria-label="Next image">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-full border border-[rgba(224,211,255,0.92)] bg-white p-2 text-slate-700 hover:bg-[#f8f4ff]" aria-label="Close editor">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
          <aside className="min-h-0 overflow-y-auto border-r border-[rgba(224,211,255,0.9)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,242,255,0.98)_100%)] p-4 text-slate-900">
            <div className="space-y-5">
              <section className="rounded-3xl border border-[rgba(224,211,255,0.9)] bg-white/90 p-4 shadow-[0_18px_44px_rgba(196,180,243,0.16)]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-orange-300" />
                  Quick Tools
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode("select")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "select" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><MousePointer2 className="h-4 w-4" />Select</span></button>
                  <button onClick={() => setMode("view")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "view" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}>Preview</button>
                  <button onClick={() => setMode("draw")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "draw" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><Brush className="h-4 w-4" />Draw</span></button>
                  <button onClick={() => setMode("line")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "line" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><ArrowRight className="h-4 w-4" />Arrow</span></button>
                  <button onClick={() => setMode("rectangle")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "rectangle" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><RectangleHorizontal className="h-4 w-4" />Box</span></button>
                  <button onClick={() => setMode("circle")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "circle" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><Circle className="h-4 w-4" />Circle</span></button>
                  <button onClick={() => setMode("crop")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "crop" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><RectangleHorizontal className="h-4 w-4" />Crop</span></button>
                  <button onClick={() => setMode("highlight")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "highlight" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><Brush className="h-4 w-4" />Highlight</span></button>
                  <button onClick={() => setMode("blur-area")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "blur-area" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Blur Area</span></button>
                  <button onClick={() => setMode("redact")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "redact" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><EyeOff className="h-4 w-4" />Redact</span></button>
                  <button onClick={() => setMode("erase")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "erase" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><Eraser className="h-4 w-4" />Erase</span></button>
                  <button onClick={() => setMode("text")} className={`rounded-2xl border px-3 py-2 text-sm ${mode === "text" ? "border-orange-300 bg-[linear-gradient(135deg,#fff1e8_0%,#fde6ff_100%)] text-[#b45309]" : "border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] text-slate-700 hover:bg-[#f6f0ff]"}`}><span className="inline-flex items-center gap-2"><Type className="h-4 w-4" />Text</span></button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setRotation((prev) => prev - 90)} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] p-2 text-slate-700 hover:bg-[#f6f0ff]"><RotateCcw className="h-4 w-4" /></button>
                  <button onClick={() => setRotation((prev) => prev + 90)} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] p-2 text-slate-700 hover:bg-[#f6f0ff]"><RotateCw className="h-4 w-4" /></button>
                  <button onClick={() => setFlipX((prev) => !prev)} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] p-2 text-slate-700 hover:bg-[#f6f0ff]"><FlipHorizontal className="h-4 w-4" /></button>
                  <button onClick={() => setFlipY((prev) => !prev)} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] p-2 text-slate-700 hover:bg-[#f6f0ff]"><FlipVertical className="h-4 w-4" /></button>
                  <button onClick={() => setZoom((prev) => Math.min(prev + 0.1, 2.6))} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] p-2 text-slate-700 hover:bg-[#f6f0ff]"><ZoomIn className="h-4 w-4" /></button>
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] p-2 text-slate-700 hover:bg-[#f6f0ff]"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                  <button onClick={redo} disabled={historyIndex >= history.length - 1} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] p-2 text-slate-700 hover:bg-[#f6f0ff] disabled:cursor-not-allowed disabled:opacity-50">
                    <Redo2 className="h-4 w-4" />
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-[rgba(224,211,255,0.9)] bg-white/90 p-4 shadow-[0_18px_44px_rgba(196,180,243,0.16)]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="h-4 w-4 text-sky-300" />
                  Looks
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => applyPreset("clean")} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] px-3 py-2 text-sm text-slate-700 hover:bg-[#f6f0ff]">Clean</button>
                  <button onClick={() => applyPreset("cinematic")} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] px-3 py-2 text-sm text-slate-700 hover:bg-[#f6f0ff]">Cinematic</button>
                  <button onClick={() => applyPreset("blueprint")} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] px-3 py-2 text-sm text-slate-700 hover:bg-[#f6f0ff]">Blueprint</button>
                  <button onClick={() => applyPreset("warm")} className="rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] px-3 py-2 text-sm text-slate-700 hover:bg-[#f6f0ff]">Warm</button>
                </div>
              </section>

              <section className="rounded-3xl border border-[rgba(224,211,255,0.9)] bg-white/90 p-4 shadow-[0_18px_44px_rgba(196,180,243,0.16)]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
                  Adjustments
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ["Brightness", brightness, setBrightness, 0, 200],
                    ["Contrast", contrast, setContrast, 0, 200],
                    ["Saturation", saturation, setSaturation, 0, 200],
                    ["Blur", blur, setBlur, 0, 16],
                    ["Grayscale", grayscale, setGrayscale, 0, 100],
                    ["Sepia", sepia, setSepia, 0, 100],
                    ["Hue", hueRotate, setHueRotate, -180, 180],
                  ].map(([label, value, setter, min, max]) => (
                    <label key={label as string} className="block">
                      <div className="mb-1 flex items-center justify-between text-slate-600">
                        <span>{label as string}</span>
                        <span>{value as number}</span>
                      </div>
                      <input
                        type="range"
                        min={min as number}
                        max={max as number}
                        value={value as number}
                        onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))}
                        className="w-full accent-orange-400"
                      />
                    </label>
                  ))}
                  <label className="block">
                    <div className="mb-1 flex items-center justify-between text-slate-600">
                      <span>Zoom</span>
                      <span>{zoom.toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.6" max="2.6" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-orange-400" />
                  </label>
                  <label className="block">
                    <div className="mb-1 flex items-center justify-between text-slate-600">
                      <span>Crop</span>
                      <span>{cropRatio}</span>
                    </div>
                    <select
                      value={cropRatio}
                      onChange={(event) => setCropRatio(event.target.value as "free" | "1:1" | "4:3" | "16:9")}
                      className="w-full rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] px-3 py-2 text-slate-900 outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="1:1">1:1</option>
                      <option value="4:3">4:3</option>
                      <option value="16:9">16:9</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-[rgba(224,211,255,0.9)] bg-white/90 p-4 shadow-[0_18px_44px_rgba(196,180,243,0.16)]">
                <div className="mb-3 text-sm font-semibold">Markup</div>
                <div className="space-y-3 text-sm">
                  <label className="block">
                    <div className="mb-1 text-slate-600">Brush / Text Color</div>
                    <input type="color" value={mode === "text" ? textColor : brushColor} onChange={(event) => mode === "text" ? setTextColor(event.target.value) : setBrushColor(event.target.value)} className="h-11 w-full rounded-xl border border-[rgba(224,211,255,0.9)] bg-transparent" />
                  </label>
                  <label className="block">
                    <div className="mb-1 flex items-center justify-between text-slate-600">
                      <span>{mode === "text" ? "Text Size" : "Brush Size"}</span>
                      <span>{mode === "text" ? textSize : brushSize}</span>
                    </div>
                    <input type="range" min="4" max="60" value={mode === "text" ? textSize : brushSize} onChange={(event) => mode === "text" ? setTextSize(Number(event.target.value)) : setBrushSize(Number(event.target.value))} className="w-full accent-orange-400" />
                  </label>
                  <label className="block">
                    <div className="mb-1 flex items-center justify-between text-slate-600">
                      <span>Opacity</span>
                      <span>{markupOpacity}%</span>
                    </div>
                    <input type="range" min="10" max="100" value={markupOpacity} onChange={(event) => setMarkupOpacity(Number(event.target.value))} className="w-full accent-orange-400" />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-slate-600">Text</div>
                    <input value={textValue} onChange={(event) => setTextValue(event.target.value)} className="w-full rounded-2xl border border-[rgba(224,211,255,0.9)] bg-[#fbf8ff] px-3 py-2 text-slate-900 outline-none ring-0 placeholder:text-slate-400" placeholder="Click image to place text" />
                  </label>
                </div>
              </section>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] p-4 sm:p-6">
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
                  {mode === "select" && "Select and drag text or markup"}
                  {mode === "view" && "Preview mode"}
                  {mode === "draw" && "Draw on the photo"}
                  {mode === "line" && "Add arrow annotations"}
                  {mode === "rectangle" && "Draw boxes around areas"}
                  {mode === "circle" && "Draw circles around areas"}
                  {mode === "crop" && "Drag to create crop, drag inside to move, drag corners to resize"}
                  {mode === "highlight" && "Highlight areas"}
                  {mode === "blur-area" && "Blur a selected area"}
                  {mode === "redact" && "Black out sensitive areas"}
                  {mode === "erase" && "Click or drag to remove markup"}
                  {mode === "text" && "Click to place text, then type"}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {mode === "text" && (
                    <>
                      <button onClick={() => setTextSize((prev) => Math.max(12, prev - 4))} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">A-</button>
                      <div className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700">Text {textSize}px</div>
                      <button onClick={() => setTextSize((prev) => Math.min(96, prev + 4))} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">A+</button>
                    </>
                  )}
                  {mode === "crop" && (
                    <>
                      <button onClick={applyCenteredCropRatio} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">Use Ratio Frame</button>
                      <button onClick={() => void applyCrop(true)} className="rounded-full border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/30">Apply Crop</button>
                      <button onClick={cancelCrop} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">Cancel Crop</button>
                      <button onClick={clearCrop} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">Clear Crop</button>
                    </>
                  )}
                  <button onMouseDown={() => setCompareOriginal(true)} onMouseUp={() => setCompareOriginal(false)} onMouseLeave={() => setCompareOriginal(false)} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">Hold to compare</button>
                  <button onClick={resetEditor} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">Reset</button>
                  {onSave && (
                    <button
                      onClick={saveEditedCopy}
                      disabled={isSaving}
                      className="rounded-full border border-emerald-300/30 bg-emerald-500/20 px-5 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button onClick={() => exportImage("image/png")} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"><span className="inline-flex items-center gap-2"><Download className="h-4 w-4" />Export PNG</span></button>
                <button onClick={() => exportImage("image/jpeg")} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">JPG</button>
                <button onClick={() => exportImage("image/webp")} className="rounded-full border border-[rgba(224,211,255,0.38)] bg-white/90 px-4 py-2 text-sm text-slate-700 hover:bg-[#f8f4ff]">WEBP</button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[32px] border border-white/10 bg-black/30 p-3 shadow-2xl shadow-black/30">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block h-auto max-h-full w-full max-w-6xl rounded-[28px] border border-white/10 bg-slate-950 object-contain"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>

          </main>
        </div>
      </div>
    </div>
  )
}
