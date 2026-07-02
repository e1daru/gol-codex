"use client";

import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { Check, LogOut, Mail, Pause, Play, RefreshCw, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AdminSubmission } from "@/lib/submissions/types";
import { validateName } from "@/lib/submissions/validation";

type QueueResponse = {
  submissions?: AdminSubmission[];
  error?: string;
};

type SettingsResponse = {
  enabled?: boolean;
  error?: string;
};

type DisplayAction = "pause" | "play" | "reset" | "seed";
type DisplayControlPayload =
  | {
      action: DisplayAction;
      seed?: string;
    }
  | {
      action: "speed";
      fps: number;
    };

export function AdminClient() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const controlsChannelRef = useRef<RealtimeChannel | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [adminName, setAdminName] = useState("");
  const [speedFps, setSpeedFps] = useState(10);
  const [autoApprove, setAutoApprove] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isSendingName, setIsSendingName] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));

    const channel = supabase.channel("display-controls");
    channel.subscribe();
    controlsChannelRef.current = channel;

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!session) {
      return;
    }

    refreshQueue();
    refreshSettings();
    const interval = window.setInterval(refreshQueue, 3000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !email) {
      return;
    }

    setIsSendingLink(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`
      }
    });

    setIsSendingLink(false);
    setMessage(error ? error.message : "Check your email for the admin sign-in link.");
  }

  async function refreshQueue() {
    if (!session) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/submissions?status=pending", {
        headers: {
          authorization: `Bearer ${session.access_token}`
        },
        cache: "no-store"
      });
      const payload = (await response.json()) as QueueResponse;

      if (!response.ok) {
        setMessage(payload.error || "Unable to load the queue.");
        return;
      }

      setSubmissions(payload.submissions ?? []);
      setMessage(null);
    } catch {
      setMessage("Admin API is offline.");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshSettings() {
    if (!session) {
      return;
    }

    try {
      const response = await fetch("/api/admin/settings/auto-approve", {
        headers: {
          authorization: `Bearer ${session.access_token}`
        },
        cache: "no-store"
      });
      const payload = (await response.json()) as SettingsResponse;

      if (!response.ok) {
        setMessage(payload.error || "Unable to load display settings.");
        return;
      }

      setAutoApprove(payload.enabled === true);
    } catch {
      setMessage("Admin settings API is offline.");
    }
  }

  async function toggleAutoApprove(nextEnabled: boolean) {
    if (!session) {
      return;
    }

    const previousEnabled = autoApprove;
    setAutoApprove(nextEnabled);
    setIsSavingSettings(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/settings/auto-approve", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      const payload = (await response.json()) as SettingsResponse;

      if (!response.ok) {
        setAutoApprove(previousEnabled);
        setMessage(payload.error || "Unable to save auto-approve setting.");
        return;
      }

      setAutoApprove(payload.enabled === true);
      setMessage(payload.enabled ? "Auto-approve enabled." : "Auto-approve disabled.");
    } catch {
      setAutoApprove(previousEnabled);
      setMessage("Admin settings API is offline.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function moderate(id: string, action: "approve" | "reject") {
    if (!session) {
      return;
    }

    const response = await fetch(`/api/admin/submissions/${id}/${action}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`
      }
    });

    const payload = (await response.json()) as QueueResponse;

    if (!response.ok) {
      setMessage(payload.error || "Moderation failed.");
      return;
    }

    setSubmissions((current) => current.filter((submission) => submission.id !== id));
  }

  async function sendApprovedName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    const validation = validateName(adminName);

    if (!validation.ok) {
      setMessage(validation.reason);
      return;
    }

    setIsSendingName(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ name: validation.value })
      });
      const payload = (await response.json()) as QueueResponse & { submission?: AdminSubmission };

      if (!response.ok) {
        setMessage(payload.error || "Unable to send to display.");
        return;
      }

      setAdminName("");
      setMessage("Sent to display.");
    } catch {
      setMessage("Admin API is offline.");
    } finally {
      setIsSendingName(false);
    }
  }

  async function sendSpecialArt(name: "Codex Logo" | "Codex Terminal" | "Codex Cloud" | "Codex Goblin" | "Unicorn Mafia", label: string) {
    if (!session) {
      return;
    }

    setIsSendingName(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ name })
      });
      const payload = (await response.json()) as QueueResponse & { submission?: AdminSubmission };

      if (!response.ok) {
        setMessage(payload.error || `Unable to send ${label}.`);
        return;
      }

      setMessage(`${label} sent to display.`);
    } catch {
      setMessage("Admin API is offline.");
    } finally {
      setIsSendingName(false);
    }
  }

  async function sendDisplayControl(payload: DisplayControlPayload) {
    const channel = controlsChannelRef.current;

    if (!channel) {
      setMessage("Display control channel is not connected.");
      return;
    }

    await channel.send({
      type: "broadcast",
      event: "display-control",
      payload
    });
  }

  async function sendDisplayAction(action: DisplayAction) {
    await sendDisplayControl(action === "seed" ? { action, seed: createControlSeed("admin-seed") } : { action });
  }

  async function sendSpeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendDisplayControl({ action: "speed", fps: speedFps });
    setMessage(`Display speed set to ${speedFps} generations/sec.`);
  }

  if (!supabase) {
    return (
      <main className="admin-shell">
        <section className="admin-panel">
          <h1>Admin</h1>
          <p className="form-error">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to sign in.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-shell">
        <section className="admin-panel auth-panel">
          <div className="admin-mark">HOST</div>
          <h1>Admin sign in</h1>
          <form className="submit-form" onSubmit={sendMagicLink}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="host@example.com"
            />
            <button type="submit" className="primary-button" disabled={isSendingLink}>
              <Mail size={18} />
              {isSendingLink ? "Sending" : "Send link"}
            </button>
          </form>
          {message ? <p className="admin-message">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <header className="admin-header">
          <div>
            <div className="admin-mark">HOST</div>
            <h1>Approval queue</h1>
          </div>
          <button type="button" className="icon-button light" title="Sign out" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} />
          </button>
        </header>

        <div className="admin-controls" aria-label="Display controls">
          <button type="button" className="tool-button" onClick={() => sendDisplayAction("pause")}>
            <Pause size={17} />
            Pause
          </button>
          <button type="button" className="tool-button" onClick={() => sendDisplayAction("play")}>
            <Play size={17} />
            Play
          </button>
          <button type="button" className="tool-button" onClick={() => sendDisplayAction("reset")}>
            <RotateCcw size={17} />
            Reset
          </button>
          <button type="button" className="tool-button" onClick={() => sendDisplayAction("seed")}>
            <Sparkles size={17} />
            Seed
          </button>
          <button type="button" className="tool-button" onClick={refreshQueue} disabled={isLoading}>
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <form className="speed-control" onSubmit={sendSpeed}>
          <label htmlFor="speed-fps">Display speed</label>
          <div>
            <input
              id="speed-fps"
              type="range"
              min="2"
              max="24"
              step="1"
              value={speedFps}
              onChange={(event) => setSpeedFps(Number(event.target.value))}
            />
            <output htmlFor="speed-fps">{speedFps} gen/sec</output>
            <button type="submit" className="tool-button">
              Apply
            </button>
          </div>
        </form>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={autoApprove}
            disabled={isSavingSettings}
            onChange={(event) => toggleAutoApprove(event.currentTarget.checked)}
          />
          <span>Auto-approve public submissions</span>
        </label>

        <div className="codex-actions" aria-label="Special pixel art">
          <button type="button" className="codex-button" onClick={() => sendSpecialArt("Codex Logo", "Codex wordmark")} disabled={isSendingName}>
            <Sparkles size={17} />
            Wordmark
          </button>
          <button
            type="button"
            className="codex-button"
            onClick={() => sendSpecialArt("Codex Terminal", "Codex terminal logo")}
            disabled={isSendingName}
          >
            <Sparkles size={17} />
            Terminal
          </button>
          <button type="button" className="codex-button" onClick={() => sendSpecialArt("Codex Cloud", "Codex cloud logo")} disabled={isSendingName}>
            <Sparkles size={17} />
            Cloud
          </button>
          <button type="button" className="codex-button" onClick={() => sendSpecialArt("Codex Goblin", "Codex goblin")} disabled={isSendingName}>
            <Sparkles size={17} />
            Goblin
          </button>
          <button type="button" className="codex-button" onClick={() => sendSpecialArt("Unicorn Mafia", "Unicorn")} disabled={isSendingName}>
            <Sparkles size={17} />
            Unicorn
          </button>
        </div>

        <form className="admin-send-form" onSubmit={sendApprovedName}>
          <label htmlFor="admin-name">Send directly to display</label>
          <div>
            <input
              id="admin-name"
              value={adminName}
              onChange={(event) => setAdminName(event.target.value)}
              maxLength={16}
              placeholder="Ada"
            />
            <button type="submit" className="primary-button" disabled={isSendingName}>
              <Send size={17} />
              {isSendingName ? "Sending" : "Send"}
            </button>
          </div>
        </form>

        {message ? <p className="admin-message">{message}</p> : null}

        <div className="queue-list">
          {submissions.length === 0 ? (
            <div className="empty-queue">No pending names</div>
          ) : (
            submissions.map((submission) => (
              <article className="queue-item" key={submission.id}>
                <div>
                  <strong>{submission.name}</strong>
                  <time>{new Date(submission.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
                <div className="queue-actions">
                  <button type="button" className="approve-button" title="Approve" onClick={() => moderate(submission.id, "approve")}>
                    <Check size={18} />
                  </button>
                  <button type="button" className="reject-button" title="Reject" onClick={() => moderate(submission.id, "reject")}>
                    <X size={18} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function createControlSeed(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
