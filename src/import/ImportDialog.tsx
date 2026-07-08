import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlert, CircleCheck, Copy, Check } from "lucide-react";
import type { DocumentType } from "@/documents/types";
import { isDirty } from "./spec";
import { buildImportPrompt } from "./buildPrompt";
import {
  parseImportJson,
  validateAgainstSpec,
  finalizeImport,
  summarize,
  type ImportError,
} from "./validate";

interface ImportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DocumentType<T>;
  currentData: T;
  container?: HTMLElement | null;
  onImport: (next: T, summary: string) => void;
}

type Result =
  | { kind: "idle" }
  | { kind: "parseError"; message: string }
  | { kind: "invalid"; errors: ImportError[] }
  | { kind: "valid"; value: Record<string, unknown>; summary: string };

export function ImportDialog<T>({
  open,
  onOpenChange,
  doc,
  currentData,
  container,
  onImport,
}: ImportDialogProps<T>) {
  const [step, setStep] = useState<"prompt" | "paste">("prompt");
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const prompt = useMemo(() => buildImportPrompt(doc as DocumentType<unknown>), [doc]);

  // Reset to a clean step 1 whenever the dialog closes.
  useEffect(() => {
    if (!open) {
      setStep("prompt");
      setRaw("");
      setCopied(false);
      setConfirming(false);
    }
  }, [open]);

  const result = useMemo<Result>(() => {
    if (!raw.trim()) return { kind: "idle" };
    const parsed = parseImportJson(raw);
    if (!parsed.ok) return { kind: "parseError", message: parsed.message };
    const validated = validateAgainstSpec(doc.importSpec, parsed.json);
    if (!validated.ok) return { kind: "invalid", errors: validated.errors };
    return { kind: "valid", value: validated.value, summary: summarize(doc.importSpec, validated.value) };
  }, [raw, doc]);

  const noun = doc.name.toLowerCase();

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false); // Fallback: the prompt is visible and selectable in the readonly box.
    }
  };

  const doImport = () => {
    if (result.kind !== "valid") return;
    onImport(finalizeImport(doc.importSpec, result.value) as T, result.summary);
  };

  const onImportClick = () => {
    if (result.kind !== "valid") return;
    if (isDirty(currentData, doc.defaultData)) {
      setConfirming(true);
      return;
    }
    doImport();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={container} className="max-w-xl">
        {confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>Replace current {noun}?</DialogTitle>
              <DialogDescription>
                You’ve edited it. Importing replaces everything with the pasted content and can’t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Keep editing</Button>
              <Button onClick={doImport}>Replace</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Import from AI</DialogTitle>
              <DialogDescription>Turn an existing {noun} into editable content in two steps.</DialogDescription>
            </DialogHeader>

            <div className="flex gap-1.5" role="tablist" aria-label="Import steps">
              <StepPill n={1} label="Get prompt" active={step === "prompt"} />
              <StepPill n={2} label="Paste JSON" active={step === "paste"} />
            </div>

            {step === "prompt" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Open ChatGPT, Claude, or Gemini, attach your {noun} PDF, paste this prompt, then copy the JSON it
                  replies with.
                </p>
                <div className="relative">
                  <Textarea readOnly value={prompt} rows={8} aria-label="Prompt" className="max-h-52 overflow-auto pr-20 font-mono text-xs" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="absolute right-2 top-2 gap-1.5"
                    onClick={copyPrompt}
                  >
                    {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={() => setStep("paste")}>Next: paste JSON ›</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  autoFocus
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  rows={8}
                  placeholder="Paste the JSON the AI returned…"
                  aria-label="Pasted JSON"
                  className="max-h-52 overflow-auto font-mono text-xs"
                />

                {result.kind === "valid" && (
                  <Alert>
                    <CircleCheck />
                    <AlertTitle>Looks good</AlertTitle>
                    <AlertDescription>Found {result.summary}.</AlertDescription>
                  </Alert>
                )}
                {result.kind === "parseError" && (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Can’t read that</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}
                {result.kind === "invalid" && (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>
                      {result.errors.length} problem{result.errors.length > 1 ? "s" : ""} — nothing imported yet
                    </AlertTitle>
                    <AlertDescription>
                      <ul className="mt-1 space-y-1">
                        {result.errors.slice(0, 12).map((e, i) => (
                          <li key={i}>
                            <code className="rounded bg-muted px-1">{e.path}</code> {e.message}
                          </li>
                        ))}
                        {result.errors.length > 12 && <li>…and {result.errors.length - 12} more</li>}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setStep("prompt")}>‹ Back</Button>
                  <Button onClick={onImportClick} disabled={result.kind !== "valid"}>Import &amp; replace</Button>
                </DialogFooter>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepPill({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div
      role="tab"
      aria-selected={active}
      className={
        "flex-1 rounded-md px-2 py-1.5 text-center text-xs font-semibold " +
        (active ? "bg-foreground text-background" : "bg-muted text-muted-foreground")
      }
    >
      {n} · {label}
    </div>
  );
}
