import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Undo2,
  Redo2,
  Eraser,
} from "lucide-react";

/** Editor visual de texto enriquecido (sin código) para descripciones del catálogo. */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 160,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-editor outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current && !(next === "" && current === "<p></p>")) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className="mt-1 rounded-xl border border-input bg-muted/30"
        style={{ minHeight: minHeight + 44 }}
      />
    );
  }

  const btn = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-lg transition ${
      active
        ? "bg-[var(--brand-orange)] text-white"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div className="mt-1 overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        <button type="button" aria-label="Negrita" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Cursiva" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" aria-label="Título" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Subtítulo" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" aria-label="Lista" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Lista numerada" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Cita" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" aria-label="Quitar formato" className={btn(false)} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <Eraser className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Deshacer" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Rehacer" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 py-2 text-sm">
        {editor.isEmpty && placeholder && (
          <p className="pointer-events-none absolute text-sm text-muted-foreground">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
