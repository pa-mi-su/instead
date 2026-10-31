// Native <dialog> supplies focus trapping, Escape handling and a modal backdrop.
let activeDialog = null;
export function closeNotice() {
  activeDialog?.close();
}
export function dialog({
  title,
  message,
  confirm = 'OK',
  cancel = false,
  danger = false,
  reason = false,
}) {
  closeNotice();
  return new Promise(resolve => {
    const previous = document.activeElement;
    const modal = document.createElement('dialog');
    modal.className = 'admin-dialog';
    const heading = document.createElement('h2');
    heading.id = `dialog-${crypto.randomUUID()}`;
    heading.textContent = title;
    modal.setAttribute('aria-labelledby', heading.id);
    const body = document.createElement('p');
    body.textContent = message;
    body.id = `${heading.id}-body`;
    modal.setAttribute('aria-describedby', body.id);
    modal.append(heading, body);
    let input;
    let validation;
    if (reason) {
      const label = document.createElement('label');
      label.textContent = 'Action reason';
      input = document.createElement('textarea');
      input.id = `${heading.id}-reason`;
      label.htmlFor = input.id;
      input.required = true;
      input.minLength = 3;
      input.maxLength = 2000;
      markRequired(label, input);
      validation = document.createElement('p');
      validation.className = 'error';
      validation.setAttribute('role', 'alert');
      input.setAttribute('aria-describedby', `${heading.id}-validation`);
      validation.id = `${heading.id}-validation`;
      modal.append(label, input, validation);
    }
    const actions = document.createElement('div');
    actions.className = 'actions dialog-actions';
    let result = null;
    if (cancel) {
      const back = document.createElement('button');
      back.textContent = 'Cancel';
      back.type = 'button';
      back.autofocus = !reason;
      back.addEventListener('click', () => modal.close());
      actions.append(back);
    }
    const accept = document.createElement('button');
    accept.textContent = confirm;
    accept.type = 'button';
    accept.className = danger ? 'danger' : 'primary';
    accept.addEventListener('click', () => {
      if (input && input.value.trim().length < 3) {
        input.setCustomValidity('Enter a reason of at least 3 characters.');
        input.setAttribute('aria-invalid', 'true');
        validation.textContent = 'Enter a reason of at least 3 characters.';
        input.focus();
        return;
      }
      result = input ? input.value.trim() : true;
      modal.close();
    });
    input?.addEventListener('input', () => {
      input.setCustomValidity('');
      input.removeAttribute('aria-invalid');
      validation.textContent = '';
    });
    actions.append(accept);
    modal.append(actions);
    modal.addEventListener(
      'close',
      () => {
        if (activeDialog === modal) activeDialog = null;
        modal.remove();
        if (previous?.isConnected) previous.focus();
        resolve(result);
      },
      { once: true },
    );
    document.body.append(modal);
    activeDialog = modal;
    modal.showModal();
    (input || (cancel ? actions.firstChild : accept)).focus();
  });
}
export function confirmAction(message, title = 'Confirm action') {
  return dialog({
    title,
    message,
    confirm: 'Confirm',
    cancel: true,
    danger: true,
  });
}
export function requestReason(message) {
  return dialog({
    title: 'Recipe availability',
    message,
    confirm: 'Apply change',
    cancel: true,
    reason: true,
  });
}
export function markRequired(label, input) {
  input.setAttribute('aria-required', 'true');
  const star = document.createElement('span');
  star.className = 'required-mark';
  star.textContent = ' *';
  star.setAttribute('aria-hidden', 'true');
  label.append(star);
  const hint = document.createElement('span');
  hint.className = 'sr-only';
  hint.textContent = ' (required)';
  label.append(hint);
}
