import { describe, it, expect, vi } from 'vitest';
import { reactive, shallowRef } from 'vue';
import { useSmartAnswerLookup } from '../composables/useSmartAnswerLookup';
import { resolveSmartAnswer } from '../utils/smartAnswerUtils';

describe('reactive Smart Answer cache', () => {
  it('resolves once across repeated row/HUD reads and refreshes nested stock and chat edits', () => {
    const stock = reactive({ 1: { owner: 'Alice', uid: 'alice', price: 100, time: 1 } });
    const chat = reactive({ text: 'พี่ได้กี่ตัว', displayName: 'Alice', uid: 'alice', type: 'question' });
    const resolver = vi.fn(resolveSmartAnswer);
    const lookup = useSmartAnswerLookup(() => ({ stockData: stock, currentVideoId: 'live' }), () => false, resolver);
    const first = lookup(chat);
    expect(first).not.toBeNull();
    for (let i = 0; i < 12; i++) expect(lookup(chat)).toBe(first);
    expect(resolver).toHaveBeenCalledTimes(1);
    stock[1].price = 200;
    expect(lookup(chat)).not.toBe(first);
    expect(resolver).toHaveBeenCalledTimes(2);
    chat.text = 'มีที่อยู่ไหม';
    expect(lookup(chat)?.category).toBe('profile');
    expect(resolver).toHaveBeenCalledTimes(3);
  });
  it('updates replaced customer/address snapshots and never returns answers for banned/buy/cancel chats', () => {
    const addresses = shallowRef({});
    const customers = shallowRef({});
    const chat = reactive({ text: 'มีที่อยู่ไหม', displayName: 'Alice', uid: 'alice', type: 'question' });
    const banned = reactive({ value: false });
    const lookup = useSmartAnswerLookup(() => ({ addressBook: addresses.value, deliveryByNormKey: customers.value }), () => banned.value);
    const initial = lookup(chat);
    addresses.value = { alice: { address: '123 Bangkok', paymentType: 'cod' } };
    expect(lookup(chat)).not.toEqual(initial);
    customers.value = { alice: { name: 'Alice', itemCount: 4 } };
    expect(lookup(chat)).not.toBe(initial);
    banned.value = true; expect(lookup(chat)).toBeNull();
    banned.value = false; expect(lookup(chat)).not.toBeNull();
    chat.type = 'buy'; expect(lookup(chat)).toBeNull();
    chat.type = 'cancel'; expect(lookup(chat)).toBeNull();
  });
});
