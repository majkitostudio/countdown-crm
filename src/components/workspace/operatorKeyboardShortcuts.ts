export type OperatorKeyboardAction =
  | "toggle_call"
  | "toggle_mute"
  | "call_later"
  | "schedule_call"
  | "fail"
  | "create_order"
  | "focus_note";

export const OPERATOR_KEYBOARD_SHORTCUTS: ReadonlyArray<{
  action: OperatorKeyboardAction;
  key: string;
  label: string;
}> = [
  { action: "toggle_call", key: "C", label: "Zavolat / ukončit hovor" },
  { action: "toggle_mute", key: "M", label: "Ztlumit / zapnout mikrofon" },
  { action: "call_later", key: "1", label: "Nedostupný" },
  { action: "schedule_call", key: "2", label: "Naplánovat hovor" },
  { action: "fail", key: "3", label: "Neúspěšný" },
  { action: "create_order", key: "4", label: "Vytvořit objednávku" },
  { action: "focus_note", key: "N", label: "Přejít na poznámku k leadu" },
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
      return "schedule_call";
    case "3":
      return "fail";
    case "4":
      return "create_order";
    case "n":
      return "focus_note";
    default:
      return null;
  }
}
