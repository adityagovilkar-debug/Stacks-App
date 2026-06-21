"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "./Dialog";
import { BookForm } from "./BookForm";
import { useAddBook, useUpdateBook } from "@/lib/queries";
import { bookToInput, emptyBookInput, type Book, type BookInput } from "@/lib/types";

export function EditBookDialog({
  open,
  book,
  onClose,
}: {
  open: boolean;
  book?: Book;
  onClose: () => void;
}) {
  const add = useAddBook();
  const update = useUpdateBook();
  const [value, setValue] = useState<BookInput>(emptyBookInput());

  useEffect(() => {
    if (!open) return;
    setValue(book ? bookToInput(book) : emptyBookInput());
  }, [open, book]);

  async function save() {
    if (!value.title.trim()) return toast.error("A title is required");
    try {
      if (book) {
        await update.mutateAsync({ id: book.id, input: value });
        toast.success("Saved");
      } else {
        await add.mutateAsync(value);
        toast.success("Added to your library");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  const pending = add.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={book ? "Edit book" : "Add a book"}
      wide
      footer={
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={pending}>
            {pending ? "Saving…" : book ? "Save changes" : "Add book"}
          </button>
        </div>
      }
    >
      <BookForm value={value} onChange={setValue} />
    </Dialog>
  );
}
