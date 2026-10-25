import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/* tailwind-merge only knows Tailwind's default scale, so it read the custom
   type scale (text-footnote, text-title-2, …) as text *colors* and dropped
   one of e.g. `text-danger-strong text-footnote`. Keep in sync with
   theme.extend.fontSize in tailwind.config.ts. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["title-1", "title-2", "title-3", "body", "footnote", "caption", "eyebrow"] }],
      // Custom gradient + shadow tokens (backgroundImage / boxShadow in the config).
      "bg-image": [{ bg: ["brand", "brand-soft"] }],
      shadow: [{ shadow: ["brand"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
