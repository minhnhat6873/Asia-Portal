"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, LoaderCircle, Upload, X } from "lucide-react";

const TinyMceEditor = dynamic(
  () => import("@tinymce/tinymce-react").then(({ Editor }) => Editor),
  {
    ssr: false,
    loading: () => <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />,
  },
);

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  enableImageInsert?: boolean;
  uploadImage?: (file: File) => Promise<string>;
}

type ImageTab = "url" | "upload";
type PreviewStatus = "idle" | "loading" | "valid" | "invalid";

interface TinyMceEditorInstance {
  selection: {
    getBookmark(type?: number, normalized?: boolean): unknown;
    moveToBookmark(bookmark: unknown): void;
    getNode(): Element;
    select(node: Element): void;
  };
  insertContent(content: string): void;
  focus(): void;
  undoManager: { transact(callback: () => void): void };
  ui: {
    registry: {
      addButton(name: string, options: { icon?: string; text?: string; tooltip: string; onAction: () => void }): void;
      addContextToolbar(name: string, options: {
        predicate: (node: Element) => boolean;
        items: string;
        position: "node";
        scope: "node";
      }): void;
    };
  };
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function validateHttpsImageUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "",
  enableImageInsert = false,
  uploadImage,
}: RichTextEditorProps) {
  const editorRef = useRef<TinyMceEditorInstance | null>(null);
  const bookmarkRef = useRef<unknown>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const previewSequenceRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageMode, setImageMode] = useState<"insert" | "replace">("insert");
  const [tab, setTab] = useState<ImageTab>("url");
  const [imageUrl, setImageUrl] = useState("");
  const [validatedUrl, setValidatedUrl] = useState("");
  const [urlStatus, setUrlStatus] = useState<PreviewStatus>("idle");
  const [urlError, setUrlError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [filePreviewLoaded, setFilePreviewLoaded] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [altText, setAltText] = useState("");
  const [imageWidth, setImageWidth] = useState("");
  const [imageHeight, setImageHeight] = useState("");
  const [imageActionError, setImageActionError] = useState("");

  useEffect(() => {
    setFilePreviewLoaded(false);
    if (!selectedFile) {
      setFilePreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const resetDialog = () => {
    previewSequenceRef.current += 1;
    setDialogOpen(false);
    setImageUrl("");
    setValidatedUrl("");
    setUrlStatus("idle");
    setUrlError("");
    setSelectedFile(null);
    setFileError("");
    setIsUploading(false);
    setAltText("");
    setImageWidth("");
    setImageHeight("");
    setImageActionError("");
    bookmarkRef.current = null;
    selectedImageRef.current = null;
  };

  const openImageDialog = (editor: TinyMceEditorInstance, mode: "insert" | "replace", image?: HTMLImageElement) => {
    bookmarkRef.current = editor.selection.getBookmark(2, true);
    selectedImageRef.current = image ?? null;
    setImageMode(mode);
    setAltText(image?.getAttribute("alt") ?? "");
    setImageWidth(image?.getAttribute("width") ?? "");
    setImageHeight(image?.getAttribute("height") ?? "");
    setImageActionError("");
    setImageUrl("");
    setValidatedUrl("");
    setUrlStatus("idle");
    setUrlError("");
    setSelectedFile(null);
    setFileError("");
    setTab("url");
    setDialogOpen(true);
  };

  const checkUrl = () => {
    const safeUrl = validateHttpsImageUrl(imageUrl);
    setValidatedUrl("");
    setUrlError("");
    if (!safeUrl) {
      setUrlStatus("invalid");
      setUrlError("Đường dẫn hình ảnh không hợp lệ.");
      return;
    }

    const sequence = ++previewSequenceRef.current;
    setUrlStatus("loading");
    const image = new window.Image();
    image.onload = () => {
      if (previewSequenceRef.current !== sequence) return;
      setValidatedUrl(safeUrl);
      setUrlStatus("valid");
    };
    image.onerror = () => {
      if (previewSequenceRef.current !== sequence) return;
      setValidatedUrl("");
      setUrlStatus("invalid");
      setUrlError("Không thể tải hình ảnh từ URL này.");
    };
    image.src = safeUrl;
  };

  const handleFileSelection = (file: File | undefined) => {
    setSelectedFile(null);
    setFileError("");
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      setFileError("Định dạng hình ảnh không được hỗ trợ.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFileError("Hình ảnh vượt quá dung lượng 5 MB.");
      return;
    }
    setSelectedFile(file);
  };

  const confirmImage = async () => {
    const editor = editorRef.current;
    if (!editor || isUploading) return;

    let source = validatedUrl;
    if (tab === "upload") {
      if (!selectedFile || !uploadImage) return;
      setIsUploading(true);
      setFileError("");
      try {
        source = await uploadImage(selectedFile);
        const parsedSource = validateHttpsImageUrl(source);
        if (!parsedSource) throw new Error("Không thể tải hình ảnh lên Cloudinary. Vui lòng thử lại.");
        source = parsedSource;
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Không thể tải hình ảnh lên Cloudinary. Vui lòng thử lại.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    if (!source) return;
    const width = imageWidth.trim();
    const height = imageHeight.trim();
    if ((width && !/^\d{1,4}$/.test(width)) || (height && !/^\d{1,4}$/.test(height))) {
      setImageActionError("Kích thước ảnh phải là số nguyên dương.");
      return;
    }

    if (imageMode === "replace") {
      const selectedImage = selectedImageRef.current;
      if (!selectedImage?.isConnected) {
        setImageActionError("Không tìm thấy ảnh cần thay trong nội dung.");
        return;
      }
      editor.undoManager.transact(() => {
        selectedImage.setAttribute("src", source);
        selectedImage.setAttribute("alt", altText.trim());
        if (width) selectedImage.setAttribute("width", width);
        else selectedImage.removeAttribute("width");
        if (height) selectedImage.setAttribute("height", height);
        else selectedImage.removeAttribute("height");
        editor.selection.select(selectedImage);
      });
    } else {
      try {
        if (bookmarkRef.current) editor.selection.moveToBookmark(bookmarkRef.current);
      } catch {
        // Keep the current cursor position if TinyMCE cannot restore an expired bookmark.
      }
      const dimensions = `${width ? ` width="${escapeAttribute(width)}"` : ""}${height ? ` height="${escapeAttribute(height)}"` : ""}`;
      editor.undoManager.transact(() => editor.insertContent(`<img src="${escapeAttribute(source)}" alt="${escapeAttribute(altText.trim())}"${dimensions} />`));
    }
    editor.focus();
    resetDialog();
  };

  const deleteSelectedImage = (editor: TinyMceEditorInstance) => {
    const selectedImage = editor.selection.getNode();
    if (selectedImage.nodeName !== "IMG") return;
    editor.undoManager.transact(() => selectedImage.parentNode?.removeChild(selectedImage));
    editor.focus();
  };

  const init = {
    height: 260,
    placeholder,
    menubar: false,
    statusbar: false,
    branding: false,
    toolbar_mode: "wrap",
    plugins: ["lists", "link", "table", "image", "code", "fullscreen", "wordcount"],
    paste_data_images: false,
    automatic_uploads: false,
    font_family_formats: "Arial=Arial,Helvetica,sans-serif; Tahoma=Tahoma,Arial,sans-serif; Verdana=Verdana,Geneva,sans-serif; Georgia=Georgia,serif; Times New Roman='Times New Roman',Times,serif",
    toolbar: `undo redo | blocks fontfamily | bold italic underline | bullist numlist | link table${enableImageInsert ? " insertContentImage" : ""} | removeformat | code fullscreen`,
      setup: enableImageInsert ? (editor: TinyMceEditorInstance) => {
      editor.ui.registry.addButton("insertContentImage", {
        icon: "image",
        tooltip: "Chèn ảnh",
        onAction: () => openImageDialog(editor, "insert"),
      });
      editor.ui.registry.addButton("replaceContentImage", {
        text: "Thay ảnh",
        tooltip: "Thay ảnh đang chọn",
        onAction: () => {
          const selectedImage = editor.selection.getNode();
          if (selectedImage.nodeName === "IMG") openImageDialog(editor, "replace", selectedImage as HTMLImageElement);
        },
      });
      editor.ui.registry.addButton("deleteContentImage", {
        text: "Xóa ảnh",
        tooltip: "Xóa ảnh khỏi nội dung",
        onAction: () => deleteSelectedImage(editor),
      });
      editor.ui.registry.addContextToolbar("contentImageActions", {
        predicate: (node) => node.nodeName === "IMG",
        items: "replaceContentImage deleteContentImage",
        position: "node",
        scope: "node",
      });
    } : undefined,
    content_style: "body { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.65; }",
  };

  return (
    <>
      <TinyMceEditor
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
        value={value}
        disabled={disabled}
        rollback={false}
        onInit={(_event, editor: TinyMceEditorInstance) => { editorRef.current = editor; }}
        onEditorChange={onChange}
        init={init}
      />

      {dialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isUploading) resetDialog(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="insert-image-title" className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="insert-image-title" className="text-lg font-bold text-slate-900">{imageMode === "replace" ? "Thay ảnh" : "Chèn hình ảnh"}</h2>
              <button type="button" onClick={resetDialog} disabled={isUploading} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </header>

            <div className="px-5 pt-4">
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button type="button" disabled={isUploading} onClick={() => setTab("url")} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${tab === "url" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}><Link2 className="h-4 w-4" />Thêm bằng URL</button>
                <button type="button" disabled={isUploading} onClick={() => setTab("upload")} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${tab === "upload" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}><Upload className="h-4 w-4" />Tải từ máy tính</button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              {imageActionError && <p role="alert" className="text-sm text-rose-600">{imageActionError}</p>}
              {tab === "url" ? (
                <>
                  <div className="flex gap-2">
                    <input type="url" value={imageUrl} onChange={(event) => { previewSequenceRef.current += 1; setImageUrl(event.target.value); setValidatedUrl(""); setUrlStatus("idle"); setUrlError(""); }} placeholder="https://example.com/image.jpg" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                    <button type="button" onClick={checkUrl} disabled={urlStatus === "loading"} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-60">{urlStatus === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Xem trước</button>
                  </div>
                  {urlError && <p role="alert" className="text-sm text-rose-600">{urlError}</p>}
                  {validatedUrl && <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2"><img src={validatedUrl} alt="Xem trước hình ảnh" className="max-h-64 max-w-full object-contain" onError={() => { setValidatedUrl(""); setUrlStatus("invalid"); setUrlError("Không thể tải hình ảnh từ URL này."); }} /></div>}
                </>
              ) : (
                <>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { handleFileSelection(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Upload className="h-4 w-4" />{selectedFile ? "Chọn ảnh khác" : "Chọn hình ảnh"}</button>
                    <p className="text-xs text-slate-500">JPG, PNG, WEBP, GIF · tối đa 5 MB</p>
                  </div>
                  {selectedFile && <p className="truncate text-sm text-slate-600">{selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
                  {fileError && <p role="alert" className="text-sm text-rose-600">{fileError}</p>}
                  {filePreviewUrl && <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2"><img src={filePreviewUrl} alt="Xem trước hình ảnh đã chọn" className="max-h-64 max-w-full object-contain" onLoad={() => setFilePreviewLoaded(true)} onError={() => { setFilePreviewLoaded(false); setFileError("Không thể xem trước hình ảnh này."); }} /></div>}
                </>
              )}
              <label className="block text-sm font-medium text-slate-700">Mô tả ảnh (alt)<input value={altText} maxLength={300} onChange={(event) => setAltText(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">Chiều rộng (px)<input type="number" min={1} max={9999} value={imageWidth} onChange={(event) => setImageWidth(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
                <label className="block text-sm font-medium text-slate-700">Chiều cao (px)<input type="number" min={1} max={9999} value={imageHeight} onChange={(event) => setImageHeight(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={resetDialog} disabled={isUploading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
              <button type="button" onClick={() => void confirmImage()} disabled={isUploading || (tab === "url" ? urlStatus !== "valid" || !validatedUrl : !selectedFile || !filePreviewLoaded)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isUploading && <LoaderCircle className="h-4 w-4 animate-spin" />}{isUploading ? "Đang tải lên..." : imageMode === "replace" ? "Thay ảnh" : "Chèn hình ảnh"}</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
