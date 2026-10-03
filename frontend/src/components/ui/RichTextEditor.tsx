"use client";

import dynamic from "next/dynamic";

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
}

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
}: RichTextEditorProps) {
  return (
    <TinyMceEditor
      apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
      value={value}
      disabled={disabled}
      rollback={false}
      onEditorChange={onChange}
      init={{
        height: 260,
        menubar: false,
        statusbar: false,
        branding: false,
        plugins: ["lists", "link", "table", "code", "fullscreen", "wordcount"],
        font_family_formats: "Arial=Arial,Helvetica,sans-serif; Tahoma=Tahoma,Arial,sans-serif; Verdana=Verdana,Geneva,sans-serif; Georgia=Georgia,serif; Times New Roman='Times New Roman',Times,serif",
        toolbar: "undo redo | blocks fontfamily | bold italic underline | bullist numlist | link table | removeformat | code fullscreen",
        content_style: "body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.65; }",
      }}
    />
  );
}
