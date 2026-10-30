import { computed } from 'vue';
import { resolveSmartAnswer } from '../utils/smartAnswerUtils';

// Each computed tracks the fields the resolver actually reads, including nested
// stock edits. Weak keys let trimmed chat messages and their answers be collected.
export function useSmartAnswerLookup(context, isBanned, resolve = resolveSmartAnswer) {
  const answers = new WeakMap();
  return chat => {
    if (!chat?.text || isBanned(chat) || chat.type === 'buy' || chat.type === 'cancel') return null;
    if (!answers.has(chat)) answers.set(chat, computed(() => resolve(chat, context())));
    return answers.get(chat).value;
  };
}
