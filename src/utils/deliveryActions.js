import Swal from 'sweetalert2';
import { ref as dbRef, get, runTransaction } from 'firebase/database';
import { db } from '../composables/useFirebase';
import { bookingItems, completeDeliveryState, deliveryUndoKey, undoDeliveryState } from './deliveryState';

class LegacyDeliveryReviewError extends Error {
  constructor(review, missingCount) {
    super('ข้อมูลสินค้าเปลี่ยนแปลง: รายการเก่าบางรอบเหลือเพียงยอดรวม กรุณาตรวจจำนวนสินค้าที่ส่งจริง');
    this.review = review;
    this.missingCount = missingCount;
  }
}

export async function completeDelivery(customer, reviewedLegacy = null) {
  const fallbackItems = {};
  const missingSessions = {};
  const evidence = [];
  // Capture identities for existing records created before item-level tracking.
  for (const [vid, session] of Object.entries(customer.sessions || {})) {
    if (session && session.status !== 'done' && !Object.keys(session.items || {}).length) {
      const snapshot = await get(dbRef(db, `stock/${vid}`));
      fallbackItems[vid] = Object.fromEntries(Object.entries(bookingItems(snapshot.val() || {}, customer.name))
        .filter(([id, item]) => session.fulfilledItems?.[id]?.bookingKey !== item.bookingKey));
      const found = Object.keys(fallbackItems[vid]).length;
      const count = Number(session.count) || 0;
      evidence.push([vid, count, Number(session.totalPrice) || 0, !!snapshot.exists?.(),
        Object.entries(fallbackItems[vid]).sort(([a], [b]) => a.localeCompare(b))]);
      // History may have been pruned; count-only legacy records must remain shippable.
      if (snapshot.exists?.() && found !== count) {
        missingSessions[vid] = count;
      }
    }
  }
  const review = JSON.stringify([customer.id, customer.name, evidence.sort(([a], [b]) => a.localeCompare(b))]);
  if (reviewedLegacy !== null && reviewedLegacy !== review) {
    throw new Error('ข้อมูลสินค้าเปลี่ยนแปลงระหว่างตรวจสอบ กรุณาเปิดรายการล่าสุดแล้วยืนยันใหม่');
  }
  if (Object.keys(missingSessions).length && reviewedLegacy !== review) {
    throw new LegacyDeliveryReviewError(review, Object.values(missingSessions).reduce((sum, count) => sum + count, 0));
  }
  const now = Date.now();
  const doneId = `${now}-${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))}`;
  const result = await runTransaction(dbRef(db, `delivery_customers/${customer.id}`),
    current => {
      const next = completeDeliveryState(current, customer, now, doneId, fallbackItems);
      if (next && Object.keys(missingSessions).length) {
        next.lastDoneSnapshot.legacyCountConfirmed = missingSessions;
      }
      return next;
    });
  if (!result.committed || result.snapshot.val()?.lastDoneId !== doneId) {
    throw new Error('ข้อมูลรายการเปลี่ยนแปลงหรือรอบนี้ส่งเสร็จแล้ว กรุณาตรวจสอบรายการล่าสุด');
  }
}

export async function restoreDelivery(customer) {
  const undoKey = deliveryUndoKey(customer);
  if (!undoKey) {
    throw new Error('รายการเก่านี้ไม่มีข้อมูลรอบสำหรับย้อนอย่างปลอดภัย กรุณาตรวจสอบและแก้รายการด้วยตนเอง');
  }
  const now = Date.now();
  const result = await runTransaction(dbRef(db, `delivery_customers/${customer.id}`),
    current => undoDeliveryState(current, undoKey, now));
  if (!result.committed || !result.snapshot.exists()) {
    throw new Error('รอบจัดส่งนี้เปลี่ยนแปลงหรือถูกย้อนแล้ว กรุณาตรวจสอบรายการล่าสุด');
  }
}

function notifyError(error) {
  return Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message || 'กรุณาลองอีกครั้ง' });
}

export async function markDone(customer) {
  // Freeze what the operator reviewed, including while either confirmation is open.
  customer = JSON.parse(JSON.stringify(customer));
  const answer = await Swal.fire({
    title: `ส่งของ "${customer.name}" เสร็จแล้ว?`, icon: 'question',
    showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#10b981',
  });
  if (!answer.isConfirmed) return;
  try {
    try {
      await completeDelivery(customer);
    } catch (error) {
      if (!(error instanceof LegacyDeliveryReviewError)) throw error;
      const reviewAnswer = await Swal.fire({
        icon: 'warning', title: 'ตรวจยอดสินค้าเก่าก่อนบันทึก',
        text: `รายการของ ${customer.name} รวม ${customer.itemCount || 0} ชิ้น มีสินค้าเก่า ${error.missingCount} ชิ้นที่ยอดค้างส่งไม่ตรงกับกระดานเดิม (เช่น เคยทยอยส่งบางส่วนไปแล้ว) หากตรวจพัสดุแล้วว่าส่งครบตามยอดนี้ ให้ยืนยัน ระบบจะเก็บยอดเดิมและประวัติไว้ หากจำนวนไม่ตรงให้ยกเลิกเพื่อตรวจสอบ`,
        showCancelButton: true, confirmButtonText: `ยืนยันส่งครบ ${customer.itemCount || 0} ชิ้น`,
        cancelButtonText: 'ยกเลิกเพื่อตรวจสอบ', confirmButtonColor: '#10b981',
      });
      if (!reviewAnswer.isConfirmed) return;
      // Re-read stock and retain the customer transaction guard after the second review.
      await completeDelivery(customer, error.review);
    }
    await Swal.fire({ icon: 'success', title: 'เสร็จเรียบร้อย!', toast: true,
      position: 'top-end', timer: 1500, showConfirmButton: false });
  } catch (error) { await notifyError(error); }
}

export async function undoDone(customer) {
  try { await restoreDelivery(customer); }
  catch (error) { await notifyError(error); }
}
