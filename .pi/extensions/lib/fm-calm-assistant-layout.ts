// Verified against Pi 0.81.1 and 0.82.0, which export AssistantMessageComponent with an
// updateContent method. installCalmAssistantLayout() probes that exact method and throws
// if it is missing; fm-calm.ts catches that and skips only this adapter with a diagnostic
// instead of blocking Calm or Pi.
// This layout removes collapsed thinking and the mid-turn assistant text blocks
// classified as "assistant-working-note" from a shallow presentation copy, and it
// removes such a block only when the block itself reads as routine working narration.
// The message itself, model context, session storage, and export rendering are never
// touched. ./fm-calm-visibility.ts owns which classes Calm hides.
import type { AssistantMessageComponent as PiAssistantMessageComponent } from "@earendil-works/pi-coding-agent";
import * as PiCodingAgent from "@earendil-works/pi-coding-agent";
import { calmPresentationHides } from "./fm-calm-visibility.ts";

type AssistantMessage = Parameters<PiAssistantMessageComponent["updateContent"]>[0];

type AssistantMessagePresentationState = {
  hiddenThinkingLabel: string;
  hideThinkingBlock: boolean;
  lastMessage?: AssistantMessage;
};

type CalmAssistantLayoutPatch = {
  hidesThinking: () => boolean;
  hidesWorkingNote: () => boolean;
};

// A mid-turn assistant message is one the model did not end its response with: Pi's
// agent loop runs its tool calls and then issues another assistant message. stopReason
// is intrinsic to each message and is already set while the message streams, so this
// layout never has to ask whether the turn ended. It stays "pending" until the tool
// call materializes, which is why a working note is briefly visible before it
// collapses; suppressing pending text would also stop a genuine reply from streaming.
function isMidTurnAssistantMessage(message: AssistantMessage): boolean {
  if (message.stopReason === "toolUse") return true;
  return (
    message.stopReason === "length" &&
    message.content.some((block) => block.type === "toolCall")
  );
}

// Working narration is the model narrating its own next step or reporting a routine
// monitoring state: the lines the mid-turn hide exists to drop. A tool call in the
// same assistant message is not proof that its text was disposable - the run can put a
// completed-work confirmation, its caveats, or the captain-facing report there and then
// keep working, or end on that message - so a text block is hidden only when every
// sentence in it reads as working narration. The check deliberately errs toward
// showing: unrecognized text is preserved, because hiding a reply is worse than
// briefly showing a line of narration. docs/calm.md owns the user-facing contract.
const WORKING_NARRATION_ADDRESS =
  /^(?:(?:ok(?:ay)?|alright|right|good|great|nice|perfect|aye|understood|noted|got it|sure|captain|so|and|but|well)[\s,.:;!—–-]+)+/i;
const WORKING_NARRATION_GERUNDS =
  "checking|looking|reading|running|searching|grepping|inspecting|examining|reviewing|analy[sz](?:ing|e)|testing|waiting|monitoring|preparing|refreshing|fetching|querying|scanning|verifying|confirming|comparing|updating|writing|editing|building|installing|draining|cleaning|restoring|sweeping|polling|pulling|merging|spawning|dispatching|filing|recording|drafting|filling|loading|opening|repairing|tracking|gathering|applying";
const WORKING_NARRATION_SENTENCE = [
  // Announcing the model's own next step, optionally behind an acknowledgment address.
  new RegExp(
    `^(?:let me(?! know\\b)|let's|let us|i'?ll|i will|i'?m going to|i am going to|i'?m about to|now let me|now i'?ll|now i will|now (?:${WORKING_NARRATION_GERUNDS})\\b|next,? (?:let me|i'?ll|i will)|then,? (?:let me|i'?ll|i will)|first,? (?:let me|i'?ll|i will)|finally,? (?:let me|i'?ll|i will)|time to|going to)\\b`,
    "i",
  ),
  // Ongoing progress.
  new RegExp(`^(?:${WORKING_NARRATION_GERUNDS})\\b`, "i"),
  // Routine monitoring state.
  /^(?:no (?:changes?|updates?|new information|action needed)|nothing (?:new|to report|further)|all (?:quiet|clear|good|green)|still (?:waiting|running|monitoring|pending|in progress)|continuing to (?:monitor|wait|watch)|waiting (?:on|for)|standing by|on track)\b/i,
];
const WORKING_NARRATION_TRAILING_VOCATIVE = /[\s,;—–-]*\bcaptain\b\s*[.!?…]*$/i;
const WORKING_NARRATION_OUTCOME_VERB = "confirms?|confirmed|shows?|showed|shown|finds?|found|reveals?|revealed|indicates?|indicated|proves?|proved|succeeds?|succeeded|works?|worked|fails?|failed";
const WORKING_NARRATION_OUTCOME_REPORT = new RegExp(`^\\w+ing\\b(?:\\s+(?:the|a|an|both|these|those|this|that|my|our|his|her|their|its|[A-Za-z0-9_-]+))*\\s+(?:${WORKING_NARRATION_OUTCOME_VERB})\\b`, "i");
const WORKING_NARRATION_ACK =
  /^(?:ok(?:ay)?|alright|right|good|great|nice|perfect|aye|understood|noted|got it|sure|on it|will do|sounds good|captain)[.!…]?$/i;
// A second-person or captain-directed sentence is addressed to the reader rather than
// describing the model's own work, so it is never disposable narration even when it
// looks like one - an offer ("Let me know if you'd like that") and a wait on the
// captain ("Still waiting on your reply") are both replies the captain must be able
// to read.
const WORKING_NARRATION_CAPTAIN_DIRECTED = /\b(?:you|your|yours|you're|captain)\b/i;

function workingNarrationFragments(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+/))
    .map((fragment) => fragment.replace(/^[\s>]+/, "").trim())
    .filter((fragment) => fragment.length > 0);
}

function fragmentIsWorkingNarration(fragment: string): boolean {
  if (WORKING_NARRATION_ACK.test(fragment.replace(/[,;—–-]+$/, "").trim())) return true;
  const withoutAddress = fragment.replace(WORKING_NARRATION_ADDRESS, "").trim();
  if (withoutAddress.length === 0) return true;
  const withoutVocative = withoutAddress.replace(WORKING_NARRATION_TRAILING_VOCATIVE, "").trim();
  const directedTarget = withoutVocative.length > 0 ? withoutVocative : withoutAddress;
  if (WORKING_NARRATION_CAPTAIN_DIRECTED.test(directedTarget)) return false;
  for (const pattern of WORKING_NARRATION_SENTENCE) {
    if (!pattern.test(withoutAddress)) continue;
    if (pattern === WORKING_NARRATION_SENTENCE[1]) {
      const core = directedTarget;
      if (/:\s*\S/.test(core)) return false;
      if (WORKING_NARRATION_OUTCOME_REPORT.test(core)) return false;
    }
    return true;
  }
  return false;
}

function midTurnTextIsWorkingNarration(text: string): boolean {
  const fragments = workingNarrationFragments(text);
  return fragments.length > 0 && fragments.every(fragmentIsWorkingNarration);
}

// Keep the introduction-version symbol stable so a compatible upgrade cannot
// double-patch a live process.
const CALM_ASSISTANT_LAYOUT_PATCH = Symbol.for(
  "firstmate:calm-assistant-layout:pi-0.81.1",
);

export function installCalmAssistantLayout(): void {
  const registry = globalThis as typeof globalThis & {
    [key: symbol]: CalmAssistantLayoutPatch | undefined;
  };
  const hidesThinking = (): boolean => calmPresentationHides("assistant-thinking");
  const hidesWorkingNote = (): boolean => calmPresentationHides("assistant-working-note");
  const installed = registry[CALM_ASSISTANT_LAYOUT_PATCH];
  if (installed) {
    installed.hidesThinking = hidesThinking;
    installed.hidesWorkingNote = hidesWorkingNote;
    return;
  }

  const patch: CalmAssistantLayoutPatch = { hidesThinking, hidesWorkingNote };
  const AssistantMessageComponent = PiCodingAgent.AssistantMessageComponent;
  if (typeof AssistantMessageComponent !== "function") {
    throw new Error("Firstmate Calm requires Pi AssistantMessageComponent");
  }
  const originalUpdateContent = AssistantMessageComponent.prototype.updateContent;
  if (typeof originalUpdateContent !== "function") {
    throw new Error("Firstmate Calm requires Pi AssistantMessageComponent.updateContent");
  }

  AssistantMessageComponent.prototype.updateContent = function (
    message: AssistantMessage,
  ): void {
    const state = this as unknown as AssistantMessagePresentationState;
    const hideThinking =
      state.hiddenThinkingLabel === "" &&
      state.hideThinkingBlock &&
      patch.hidesThinking();
    const hideWorkingNote =
      patch.hidesWorkingNote() && isMidTurnAssistantMessage(message);
    const presentationMessage =
      hideThinking || hideWorkingNote
        ? {
            ...message,
            content: message.content.filter(
              (block) =>
                !(hideThinking && block.type === "thinking") &&
                !(
                  hideWorkingNote &&
                  block.type === "text" &&
                  midTurnTextIsWorkingNarration(block.text)
                ),
            ),
          }
        : message;

    originalUpdateContent.call(this, presentationMessage);
    if (presentationMessage !== message) state.lastMessage = message;
  };

  registry[CALM_ASSISTANT_LAYOUT_PATCH] = patch;
}
