import React from 'react';

export interface CopilotWorkspaceProps {
  onNavigate?: (path: string) => void;
}

export default function CopilotWorkspace(
  _props: CopilotWorkspaceProps = {},
) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          ABANGCOLEK · Assistant
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Copilot workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          A shared assistant for your workspace and Pet companion.
        </p>
      </header>

      <section
        aria-labelledby="copilot-runtime-heading"
        className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="copilot-runtime-heading" className="text-lg font-semibold">
            Chat
          </h2>
          <span
            role="status"
            className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm font-medium text-foreground"
          >
            Runtime unavailable · Belum tersedia
          </span>
        </div>

        <div
          role="alert"
          className="mt-5 rounded-lg border border-border bg-muted/40 p-4"
        >
          <h3 className="font-medium">
            CopilotKit /v2 runtime belum tersedia
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            CopilotKit /v2 runtime is not available yet. Chat remains disabled
            until AGY provides the approved shared agent, thread and run
            contract. Pet and this workspace must use that same runtime.
          </p>
        </div>

        <form className="mt-5 space-y-3" aria-label="Copilot chat">
          <label
            htmlFor="copilot-message"
            className="block text-sm font-medium"
          >
            Message · Mesej
          </label>
          <textarea
            id="copilot-message"
            name="message"
            rows={3}
            disabled
            aria-describedby="copilot-chat-unavailable"
            placeholder="Chat will be available when the shared runtime is connected."
            className="block w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              id="copilot-chat-unavailable"
              className="text-sm text-muted-foreground"
            >
              No prompt has been sent. · Tiada prompt dihantar.
            </p>
            <button
              type="submit"
              disabled
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-60 disabled:cursor-not-allowed"
            >
              Send · Hantar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
