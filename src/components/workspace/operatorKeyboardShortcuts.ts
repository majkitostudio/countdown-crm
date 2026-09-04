export type OperatorKeyboardAction =
  | "toggle_call"
  | "toggle_mute"
  | "call_later"
  | "schedule_callback"
  | "not_interested"
  | "create_order"
  | "focus_note";

export const OPERATOR_KEYBOARD_SHORTCUTS: ReadonlyArray<{
  action: OperatorKeyboardAction;
  key: string;
  label: string;
}> = [
  { action: "toggle_call", key: "C", label: "Call / end call" },
  { action: "toggle_mute", key: "M", label: "Mute / unmute" },
  { action: "call_later", key: "1", label: "No answer" },
  { action: "schedule_callback", key: "2", label: "Schedule callback" },
  { action: "not_interested", key: "3", label: "Not interested" },
  { action: "create_order", key: "4", label: "Create order" },
  { action: "focus_note", key: "N", label: "Focus lead note" },
];

type KeyboardShortcutEvent = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "defaultPrevented" | "key" | "metaKey" | "repeat" | "shiftKey" | "target"
>;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;

  const element = target as {
    tagName?: string;
    isContentEditable?: boolean;
    getAttribute?: (name: string) => string | null;
  };
  const tagName = element.tagName?.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable === true ||
    element.getAttribute?.("contenteditable") === "true"
  );
}

export function getOperatorKeyboardAction(
  event: KeyboardShortcutEvent,
): OperatorKeyboardAction | null {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isEditableTarget(event.target)
  ) {
    return null;
  }

  switch (event.key.toLowerCase()) {
    case "c":
      return "toggle_call";
    case "m":
      return "toggle_mute";
    case "1":
      return "call_later";
    case "2":
      return "schedule_callback";
    case "3":
      return "not_interested";
    case "4":
      return "create_order";
    case "n":
      return "focus_note";
    default:
      return null;
  }
}
