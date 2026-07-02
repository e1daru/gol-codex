"use client";

import { CheckCircle2, Clock3, Send, XCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { SubmissionStatus } from "@/lib/submissions/types";
import { validateName } from "@/lib/submissions/validation";

type StoredSubmission = {
  id: string;
  token: string;
  status: SubmissionStatus;
  name?: string;
  created_at?: string;
  approved_at?: string | null;
};

const STORAGE_KEY = "conway-name-wall-submissions";
const LEGACY_STORAGE_KEY = "conway-name-wall-submission";

export function SubmitClient() {
  const [name, setName] = useState("");
  const [submissions, setSubmissions] = useState<StoredSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validation = useMemo(() => validateName(name), [name]);
  const visibleLength = name.trim().length;

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const legacyStored = window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!stored && !legacyStored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored ?? legacyStored ?? "[]") as StoredSubmission | StoredSubmission[];
      const nextSubmissions = Array.isArray(parsed) ? parsed : [parsed];
      setSubmissions(nextSubmissions);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSubmissions));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const pendingSubmissions = submissions.filter((submission) => submission.status === "pending");

    if (pendingSubmissions.length === 0) {
      return;
    }

    let cancelled = false;

    async function pollStatus() {
      const updates = await Promise.all(
        pendingSubmissions.map(async (currentSubmission) => {
          try {
            const response = await fetch(`/api/submissions/${currentSubmission.id}?token=${encodeURIComponent(currentSubmission.token)}`, {
              cache: "no-store"
            });

            if (!response.ok) {
              return currentSubmission;
            }

            const payload = (await response.json()) as StoredSubmission;
            return { ...currentSubmission, ...payload, token: currentSubmission.token };
          } catch {
            return currentSubmission;
          }
        })
      );

      if (cancelled) {
        return;
      }

      setSubmissions((current) => {
        const updateById = new Map(updates.map((submission) => [submission.id, submission]));
        const nextSubmissions = current.map((submission) => updateById.get(submission.id) ?? submission);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSubmissions));
        return nextSubmissions;
      });
    }

    pollStatus();
    const interval = window.setInterval(pollStatus, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [submissions]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!validation.ok) {
      setError(validation.reason);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ name: validation.value })
      });
      const payload = (await response.json()) as StoredSubmission & { error?: string };

      if (!response.ok) {
        setError(payload.error || "Submission failed.");
        return;
      }

      const nextSubmission = { ...payload, name: validation.value };
      setSubmissions((current) => {
        const nextSubmissions = [nextSubmission, ...current].slice(0, 12);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSubmissions));
        return nextSubmissions;
      });
      setName("");
    } catch {
      setError("Submission service is offline.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearLocalHistory() {
    setSubmissions([]);
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  return (
    <main className="submit-shell">
      <section className="submit-panel">
        <div className="submit-mark">LIFE</div>
        <h1>Join the wall</h1>

        <form className="submit-form" onSubmit={onSubmit}>
          <div className="submit-field">
            <div className="field-topline">
              <label htmlFor="name">Name or message</label>
              <span>{visibleLength}/16</span>
            </div>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              inputMode="text"
              maxLength={16}
              autoComplete="name"
              placeholder="Ada"
              aria-invalid={!validation.ok && name ? true : undefined}
              aria-describedby="submit-field-message"
            />
          </div>
          <p id="submit-field-message" className={error || (!validation.ok && name) ? "form-error" : "field-message"}>
            {error || (!validation.ok && name ? validation.reason : " ")}
          </p>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            <Send size={18} />
            {isSubmitting ? "Sending" : "Submit"}
          </button>
        </form>

        {submissions.length > 0 ? <SubmissionHistory submissions={submissions} onClear={clearLocalHistory} /> : null}
      </section>
    </main>
  );
}

function SubmissionHistory({
  submissions,
  onClear
}: {
  submissions: StoredSubmission[];
  onClear: () => void;
}) {
  return (
    <div className="submit-history">
      <div className="history-header">
        <h2>Recent submissions</h2>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="submission-list">
        {submissions.map((submission) => (
          <SubmissionStatusPanel submission={submission} key={submission.id} />
        ))}
      </div>
    </div>
  );
}

function SubmissionStatusPanel({ submission }: { submission: StoredSubmission }) {
  const statusCopy = {
    pending: {
      icon: <Clock3 size={20} />,
      title: "Queued",
      text: "Waiting for host review."
    },
    approved: {
      icon: <CheckCircle2 size={20} />,
      title: "Live",
      text: "Watch the screen."
    },
    rejected: {
      icon: <XCircle size={20} />,
      title: "Not added",
      text: "Try another text."
    }
  }[submission.status];

  return (
    <article className="status-panel compact-status">
      <div className={`status-icon status-${submission.status}`}>{statusCopy.icon}</div>
      <div>
        <h3>{statusCopy.title}</h3>
        <p>{statusCopy.text}</p>
        {submission.name ? <strong>{submission.name}</strong> : null}
      </div>
    </article>
  );
}
