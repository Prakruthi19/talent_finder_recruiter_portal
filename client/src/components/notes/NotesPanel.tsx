import { FormEvent, useState } from "react";
import { formatDateTime } from "../../lib/format";
import type { Note } from "../../types";

/** An append-only note log — reused on Candidate Detail and Submission Detail. */
export function NotesPanel({
  notes,
  isLoading,
  onAdd,
}: {
  notes: Note[] | undefined;
  isLoading: boolean;
  onAdd: (body: string) => Promise<unknown>;
}) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onAdd(trimmed);
      setBody("");
    } catch {
      setError("Couldn't save the note.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Notes</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note — e.g. 'called, not interested' or 'strong on system design'"
          rows={2}
          maxLength={1000}
          className="w-full min-w-0 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
        <div className="flex items-center justify-between">
          {error ? <p className="text-xs text-red-600">{error}</p> : <span />}
          <button
            type="submit"
            disabled={!body.trim() || isSubmitting}
            className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Add note"}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-col divide-y divide-slate-100 border-t border-slate-100">
        {isLoading ? (
          <p className="py-3 text-xs text-slate-400">Loading notes...</p>
        ) : !notes || notes.length === 0 ? (
          <p className="py-3 text-xs text-slate-400">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="py-3">
              <p className="whitespace-pre-line text-sm text-slate-700">{note.body}</p>
              <p className="mt-1 text-xs text-slate-400">
                {note.author.name} · {formatDateTime(note.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
