'use client';

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { defineFilePond, type FilePondEntry } from "filepond";
import { locale } from "filepond/locales/vi-vn.js";
import "filepond/types/react";

interface AvatarUploaderProps {
  onFileChange: (file: File | null) => void;
}

export default function AvatarUploader({ onFileChange }: AvatarUploaderProps) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const hasFile = selectedFile !== null;
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : ""),
    [selectedFile],
  );

  useEffect(() => {
    if (!customElements.get("file-pond")) {
      defineFilePond({ locale });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearSelection = (errorMessage = "") => {
    setSelectedFile(null);
    setMessage(errorMessage);
    onFileChange(null);
  };

  const handleEntriesChange = (event: CustomEvent<FilePondEntry[]>) => {
    const firstEntry = event.detail[0];
    const file = firstEntry && "file" in firstEntry ? firstEntry.file : undefined;

    if (!file) {
      clearSelection();
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      clearSelection("Ch\u1ec9 ch\u1ea5p nh\u1eadn \u1ea3nh JPEG, PNG ho\u1eb7c WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      clearSelection("\u1ea2nh \u0111\u1ea1i di\u1ec7n t\u1ed1i \u0111a 5 MB.");
      return;
    }

    setSelectedFile(file);
    setMessage("");
    onFileChange(file);
  };

  return (
    <div>
      <label htmlFor="employee-avatar-upload" className="mb-1.5 block text-sm font-bold text-slate-700">
        {"\u1ea2nh \u0111\u1ea1i di\u1ec7n"}
      </label>

      <div className={"employee-avatar-picker " + (hasFile ? "employee-avatar-picker--filled" : "employee-avatar-picker--empty")}>
        <file-pond
          id="employee-avatar-upload"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          multiple={false}
          maxFiles={1}
          maxSize="5MB"
          noBrowse={hasFile}
          noDrop={hasFile}
          noAttribution
          className="employee-avatar-pond block"
          onentrieschange={handleEntriesChange}
        >
          <input type="file" accept="image/jpeg,image/png,image/webp" />
        </file-pond>

        {previewUrl && (
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[360px] overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200">
            <Image
              src={previewUrl}
              alt="Xem tr\u01b0\u1edbc \u1ea3nh \u0111\u1ea1i di\u1ec7n"
              fill
              unoptimized
              sizes="360px"
              className="object-cover object-top"
            />
          </div>
        )}
      </div>

      <p className={"mt-2 flex items-center gap-1.5 text-xs " + (message ? "text-rose-600" : hasFile ? "text-emerald-700" : "text-slate-500")}>
        <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + (message ? "bg-rose-500" : hasFile ? "bg-emerald-500" : "bg-slate-300")} />
        {message ||
          (hasFile
            ? "\u0110\u00e3 ch\u1ecdn 1 \u1ea3nh. H\u00e3y x\u00f3a \u1ea3nh hi\u1ec7n t\u1ea1i n\u1ebfu mu\u1ed1n ch\u1ecdn \u1ea3nh kh\u00e1c."
            : "JPEG, PNG ho\u1eb7c WebP, t\u1ed1i \u0111a 5 MB. \u1ea2nh hi\u1ec3n th\u1ecb theo khung 4:3.")}
      </p>
    </div>
  );
}
