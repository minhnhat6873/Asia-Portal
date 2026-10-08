'use client';

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { defineFilePond, type FilePondEntry } from "filepond";
import { locale } from "filepond/locales/vi-vn.js";
import "filepond/types/react";

const avatarLocale = {
  ...locale,
  descriptionBrowse: "Chọn {{maxFilesUnit}}",
  descriptionBrowseDrop: "Thả {{maxFilesUnit}} vào đây hoặc duyệt",
  descriptionBrowseDropSelect: "Thả {{maxFilesUnit}} vào đây, duyệt hoặc chọn từ:",
  descriptionBrowseSelect: "Duyệt hoặc chọn {{maxFilesUnit}} từ:",
};

interface AvatarUploaderProps {
  onFileChange: (file: File | null) => void;
  onExistingAvatarRemove?: () => void;
  /** Avatar URL already saved for the employee being edited. */
  initialAvatarUrl?: string;
  label?: string;
  emptyHelperText?: string;
  selectedHelperText?: string;
  existingHelperText?: string;
  imageAlt?: string;
  pickerAriaLabel?: string;
  removeAriaLabel?: string;
  changeLabel?: string;
  inputId?: string;
  inputName?: string;
}

export default function AvatarUploader({
  onFileChange,
  onExistingAvatarRemove,
  initialAvatarUrl = "",
  label = "Ảnh đại diện",
  emptyHelperText = "Kéo thả hoặc chọn ảnh JPEG, PNG, WebP (tối đa 5 MB). Ảnh hiển thị theo khung 4:3.",
  selectedHelperText = "Ảnh mới sẽ thay thế khi lưu hồ sơ.",
  existingHelperText = "Đang giữ ảnh đại diện hiện tại.",
  imageAlt = "Xem trước ảnh đại diện",
  pickerAriaLabel = "Chọn ảnh đại diện",
  removeAriaLabel = "Bỏ ảnh đại diện",
  changeLabel = "Thay ảnh",
  inputId = "employee-avatar-upload",
  inputName = "avatar",
}: AvatarUploaderProps) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : ""),
    [selectedFile],
  );
  const visibleAvatarUrl = previewUrl || initialAvatarUrl;
  const hasAvatar = Boolean(visibleAvatarUrl);

  useEffect(() => {
    if (!customElements.get("file-pond")) {
      defineFilePond({ locale: avatarLocale });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearSelectedFile = (errorMessage = "") => {
    setSelectedFile(null);
    setMessage(errorMessage);
    onFileChange(null);
  };

  const acceptFile = (file?: File) => {
    if (!file) {
      clearSelectedFile();
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      clearSelectedFile("Ch\u1ec9 ch\u1ea5p nh\u1eadn \u1ea3nh JPEG, PNG ho\u1eb7c WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      clearSelectedFile("\u1ea2nh \u0111\u1ea1i di\u1ec7n t\u1ed1i \u0111a 5 MB.");
      return;
    }

    setSelectedFile(file);
    setMessage("");
    onFileChange(file);
  };

  const handleEntriesChange = (event: CustomEvent<FilePondEntry[]>) => {
    const firstEntry = event.detail[0];
    const file = firstEntry && "file" in firstEntry ? firstEntry.file : undefined;
    acceptFile(file);
  };

  const handleNativeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  };

  const handleEmptyPickerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (hasAvatar) return;

    event.preventDefault();
    nativeInputRef.current?.click();
  };

  const handleEmptyPickerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (hasAvatar || (event.key !== "Enter" && event.key !== " ")) return;

    event.preventDefault();
    nativeInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    if (selectedFile) {
      clearSelectedFile();
      return;
    }

    setMessage("");
    onExistingAvatarRemove?.();
    onFileChange(null);
  };

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        ref={nativeInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleNativeFileChange}
      />

      <div
        className={"employee-avatar-picker " + (hasAvatar ? "employee-avatar-picker--filled" : "employee-avatar-picker--empty")}
        onClick={handleEmptyPickerClick}
        onKeyDown={handleEmptyPickerKeyDown}
        role={hasAvatar ? undefined : "button"}
        tabIndex={hasAvatar ? undefined : 0}
        aria-label={hasAvatar ? undefined : pickerAriaLabel}
      >
        {hasAvatar ? (
          <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-[4/3] w-full bg-slate-100">
              <Image
                src={visibleAvatarUrl}
                alt={imageAlt}
                fill
                unoptimized
                sizes="360px"
                className="object-cover object-top"
              />
              <button
                type="button"
                onClick={handleRemoveAvatar}
                aria-label={removeAriaLabel}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-3 py-2.5">
              <button
                type="button"
                onClick={() => nativeInputRef.current?.click()}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                {changeLabel}
              </button>
            </div>
          </div>
        ) : (
          <file-pond
            id={inputId}
            name={inputName}
            accept="image/jpeg,image/png,image/webp"
            multiple={false}
            maxFiles={1}
            maxSize="5MB"
            noAttribution
            className="employee-avatar-pond block"
            onentrieschange={handleEntriesChange}
          >
            <input type="file" accept="image/jpeg,image/png,image/webp" />
          </file-pond>
        )}
      </div>

      <p className={"mt-2 flex items-center gap-1.5 text-xs " + (message ? "text-rose-600" : hasAvatar ? "text-emerald-700" : "text-slate-500")}>
        <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + (message ? "bg-rose-500" : hasAvatar ? "bg-emerald-500" : "bg-slate-300")} />
        {message || (hasAvatar
          ? (selectedFile ? selectedHelperText : existingHelperText)
          : emptyHelperText)}
      </p>
    </div>
  );
}
