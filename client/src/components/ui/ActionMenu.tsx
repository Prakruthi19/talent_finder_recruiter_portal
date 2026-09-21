import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMoreVertical } from "react-icons/fi";
import type { IconType } from "react-icons";

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  icon?: IconType;
  destructive?: boolean;
}

interface Props {
  items: ActionMenuItem[];
}

// Sizes mirror the Tailwind classes below (w-40; py-2 + text-sm per item;
// py-1 + border on the box) so we can tell whether the menu fits under the button.
const MENU_WIDTH = 160;
const ITEM_HEIGHT = 36;
const MENU_PADDING = 10;
const GAP = 4;

interface MenuPosition {
  left: number;
  top?: number;
  bottom?: number;
}

export function ActionMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = items.length * ITEM_HEIGHT + MENU_PADDING;
    const fitsBelow = rect.bottom + GAP + menuHeight <= window.innerHeight;
    setPosition({
      // Right edge lines up with the button; never off the left of the screen.
      left: Math.max(8, rect.right - MENU_WIDTH),
      ...(fitsBelow ? { top: rect.bottom + GAP } : { bottom: window.innerHeight - rect.top + GAP }),
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      // The menu lives in a portal, so it is no longer inside this component's DOM.
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    // Fixed positioning detaches the menu from its row, so close it instead of
    // letting it float. `true` (capture) also catches scrolling inside the table.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div className="inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Row actions"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
      >
        <FiMoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {open &&
        // Portal to <body>: the table sits inside `overflow-x-auto` (and
        // overflow-hidden) containers, which clip an absolutely-positioned menu.
        createPortal(
          <div
            ref={menuRef}
            style={position}
            className="fixed z-50 w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  item.destructive ? "text-red-600" : "text-slate-700"
                }`}
              >
                {item.icon && <item.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
