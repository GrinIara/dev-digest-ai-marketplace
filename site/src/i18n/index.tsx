import { Fragment, type ReactNode } from 'react';
import { en, type Messages } from './en';

export type { Messages };

/** The active messages. To add a language, create a file with the same shape as en.ts and select it here. */
export const m: Messages = en;

/**
 * Fills the {name} placeholders of a message with markup, for sentences that contain links or code.
 * The whole sentence stays in one message, so a translation can reorder the words.
 */
export function rich(template: string, parts: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/g).map((segment, i) => {
    const name = /^\{(\w+)\}$/.exec(segment)?.[1];
    return name && name in parts ? <Fragment key={i}>{parts[name]}</Fragment> : segment;
  });
}
