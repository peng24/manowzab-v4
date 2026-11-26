/**
 * Global SweetAlert2 configuration helper.
 * Preserves SweetAlert2 v11 toast mixin metadata (`defaultParams`) so `Swal.mixin({ toast: true })`
 * never receives popup-only options (`allowOutsideClick`, `showCloseButton`, `heightAuto`, `returnFocus`).
 */
export function configureSwal(Swal) {
  if (!Swal || Swal.__manowzabConfigured) return Swal;
  Swal.__manowzabConfigured = true;

  const originalMixin = Swal.mixin;
  if (typeof originalMixin === "function") {
    Swal.mixin = function (mixinParams = {}) {
      const Mixed = originalMixin.call(this, mixinParams);
      Mixed.defaultParams = {
        ...(this && this.defaultParams ? this.defaultParams : {}),
        ...(mixinParams && typeof mixinParams === "object" ? mixinParams : {}),
      };
      return Mixed;
    };
  }

  const originalSwalFire = Swal.fire;
  Swal.fire = function (...args) {
    let opts = args[0];

    if (typeof opts === "string") {
      opts = {
        title: args[0],
        html: args[1],
        icon: args[2],
      };
      args = [opts];
    } else if (opts && typeof opts === "object") {
      // Clone to avoid mutating caller-owned option objects in place.
      opts = { ...opts };
      args = [opts, ...args.slice(1)];
    }

    const isToast = Boolean(
      (opts && opts.toast) ||
        (this && this.defaultParams && this.defaultParams.toast),
    );

    if (opts && typeof opts === "object") {
      if (!isToast) {
        if (opts.heightAuto === undefined) opts.heightAuto = false;
        if (opts.returnFocus === undefined) opts.returnFocus = false;
        if (opts.showCloseButton === undefined) opts.showCloseButton = true;
        if (opts.allowOutsideClick === undefined) opts.allowOutsideClick = true;
      } else {
        // Incompatible with toasts in SweetAlert2 v11
        delete opts.heightAuto;
        delete opts.returnFocus;
        delete opts.allowOutsideClick;
      }
    }

    return originalSwalFire.apply(this, args);
  };

  return Swal;
}
