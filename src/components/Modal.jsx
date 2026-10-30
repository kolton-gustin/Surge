function Modal({ title, children, onClose, onSubmit, submitLabel = "Save", busy = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <form className="modal" onSubmit={onSubmit}>
        <h2>{title}</h2>
        {children}
        <div className="modal-actions">
          <button type="button" className="button outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="button" type="submit" disabled={busy}>{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

export default Modal;
