import Swal from 'sweetalert2';
import { ref as dbRef, get, runTransaction } from 'firebase/database';
import { db } from '../composables/useFirebase';
import { bookingItems, completeDeliveryState, deliveryUndoKey, undoDeliveryState } from './deliveryState';

export async function completeDelivery(customer) {
  const fallbackItems = {};
  // Capture identities for existing records created before item-level tracking.
  for (const [vid, session] of Object.entries(customer.sessions || {})) {
    if (session?.status !== 'done' && !session?.items) {
      const snapshot = await get(dbRef(db, `stock/${vid}`));
      fallbackItems[vid] = bookingItems(snapshot.val() || {}, customer.name);
      // History may have been pruned; count-only legacy records must remain shippable.
      if (snapshot.exists?.() && Object.keys(fallbackItems[vid]).length !== (session.count || 0)) {
        throw new Error('ข้อมูลสินค้าเปลี่ยนแปลง กรุณารอให้รายการอัปเดตแล้วตรวจสอบก่อนยืนยันอีกครั้ง');
      }
    }
  }
  const now = Date.now();
  const doneId = `${now}-${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))}`;
  const result = await runTransaction(dbRef(db, `delivery_customers/${customer.id}`),
    current => completeDeliveryState(current, customer, now, doneId, fallbackItems));
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
  const answer = await Swal.fire({
    title: `ส่งของ "${customer.name}" เสร็จแล้ว?`, icon: 'question',
    showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#10b981',
  });
  if (!answer.isConfirmed) return;
  try {
    await completeDelivery(customer);
    await Swal.fire({ icon: 'success', title: 'เสร็จเรียบร้อย!', toast: true,
      position: 'top-end', timer: 1500, showConfirmButton: false });
  } catch (error) { await notifyError(error); }
}

export async function undoDone(customer) {
  try { await restoreDelivery(customer); }
  catch (error) { await notifyError(error); }
}
